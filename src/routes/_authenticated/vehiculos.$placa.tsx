import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gauge, Mail, MessageCircle } from "lucide-react";

import { AccionesCalendario } from "@/components/AccionesCalendario";
import { AppShell } from "@/components/AppShell";
import { SemaforoVigencia } from "@/components/SemaforoVigencia";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  listarDocumentos,
  listarMantenimientos,
  obtenerVehiculoPorPlaca,
} from "@/lib/datos";
import {
  enlaceCorreo,
  enlaceWhatsapp,
  fechaLegible,
  formatoCorchetes,
  listaLegible,
  moneda,
} from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/vehiculos/$placa")({
  head: ({ params }) => ({
    meta: [
      { title: `Ficha del vehículo ${params.placa} | Taller Medular` },
      {
        name: "description",
        content: `Historial de mantenimientos, telemetría de kilometraje y vencimientos de documentos del vehículo ${params.placa}.`,
      },
      { property: "og:title", content: `Ficha del vehículo ${params.placa}` },
      {
        property: "og:description",
        content: "Telemetría, historial de servicios y control de documentos del vehículo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FichaVehiculo,
});

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
      <p className="etiqueta-campo">{etiqueta}</p>
      <p className="font-display text-2xl text-primary">{valor}</p>
    </div>
  );
}

function FichaVehiculo() {
  const { placa } = Route.useParams();
  const queryClient = useQueryClient();

  const vehiculo = useQuery({
    queryKey: ["vehiculo", placa],
    queryFn: () => obtenerVehiculoPorPlaca(placa),
  });
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: listarDocumentos });
  const mantenimientos = useQuery({
    queryKey: ["mantenimientos", placa],
    queryFn: () => listarMantenimientos(placa),
  });

  const eventoDocumento = useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string | null }) => {
      const { error } = await supabase
        .from("documentos_vencimiento")
        .update({ calendar_event_id: eventId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documentos"] }),
  });

  const eventoMantenimiento = useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string | null }) => {
      const { error } = await supabase
        .from("historial_mantenimientos")
        .update({ calendar_event_id: eventId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mantenimientos", placa] }),
  });

  const v = vehiculo.data;
  if (vehiculo.isLoading) {
    return (
      <AppShell titulo={placa}>
        <p className="text-sm text-muted-foreground">Cargando ficha…</p>
      </AppShell>
    );
  }
  if (!v) {
    return (
      <AppShell titulo="Vehículo no encontrado">
        <Link to="/panel" className="text-primary underline">
          Volver al panel
        </Link>
      </AppShell>
    );
  }

  const docsVehiculo = (documentos.data ?? []).filter((d) => d.vehiculo_id === v.id);
  const cliente = v.clientes;
  const proximo = mantenimientos.data?.[0];
  const mensajeWhatsapp = `Hola ${cliente?.nombre_completo ?? ""}, te escribimos del taller. Tu ${v.tipo_vehiculo.toLowerCase()} de placa ${v.placa} (${listaLegible([v.marca, v.modelo_ano])}) tiene su próximo mantenimiento proyectado para el ${proximo?.proxima_fecha ?? "por confirmar"}${
    docsVehiculo.length
      ? `. Vencimientos registrados: ${docsVehiculo.map((d) => `${d.tipo_documento} el ${d.fecha_vencimiento}`).join(", ")}`
      : ""
  }.`;

  return (
    <AppShell titulo={v.placa} subtitulo={listaLegible([v.tipo_vehiculo, v.marca, v.modelo_ano, v.color])}>
      <section className="panel overflow-hidden">
        {v.foto_url ? (
          <img
            src={v.foto_url}
            alt={`Fotografía del vehículo de placa ${v.placa}`}
            className="h-48 w-full object-cover"
          />
        ) : null}
        <div className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3">
          {[
            ["Cilindrada", v.cilindrada],
            ["Combustible", v.tipo_combustible],
            ["Carrocería", v.tipo_carroceria],
            ["VIN", v.numero_chasis],
            ["Motor", v.numero_motor],
            ["Matrícula", fechaLegible(v.fecha_matricula)],
            ["Organismo", v.organismo_transito],
          ].map(([etiqueta, valor]) => (
            <div key={String(etiqueta)}>
              <p className="etiqueta-campo">{etiqueta}</p>
              <p className="break-words">{valor || "—"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="flex items-center gap-2 font-display text-xl uppercase">
          <Gauge className="size-5 text-primary" /> Telemetría de uso
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metrica
            etiqueta="Km / día"
            valor={v.km_promedio_dia ? String(v.km_promedio_dia) : "—"}
          />
          <Metrica etiqueta="Km / semana" valor={v.km_semana ? String(v.km_semana) : "—"} />
          <Metrica etiqueta="Km / mes" valor={v.km_mes ? String(v.km_mes) : "—"} />
          <Metrica etiqueta="Km / año" valor={v.km_ano ? String(v.km_ano) : "—"} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Parámetros preventivos: {formatoCorchetes([`${v.km_intervalo_aceite} km`, `${v.meses_intervalo_aceite} meses`])}
        </p>
      </section>

      {cliente ? (
        <section className="panel p-4">
          <h2 className="font-display text-xl uppercase">Propietario</h2>
          <p className="mt-2 font-semibold">{cliente.nombre_completo}</p>
          <p className="text-sm text-muted-foreground">
            {listaLegible([
              cliente.razon_social,
              `${cliente.tipo_documento} ${cliente.numero_documento}`,
              cliente.ciudad,
              cliente.departamento,
            ])}
          </p>
          <p className="text-sm text-muted-foreground">{cliente.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a
                href={enlaceWhatsapp(cliente.celular_principal, mensajeWhatsapp)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a
                href={enlaceCorreo(
                  cliente.email,
                  `Taller · Vehículo ${v.placa}`,
                  mensajeWhatsapp,
                )}
              >
                <Mail className="size-4" /> Correo
              </a>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Documentos</h2>
        <ul className="mt-3 space-y-3">
          {docsVehiculo.map((doc) => (
            <li key={doc.id} className="rounded-xl border border-border bg-card/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{doc.tipo_documento}</p>
                  <p className="text-xs text-muted-foreground">
                    Expedido {fechaLegible(doc.fecha_expedicion)} · Vence{" "}
                    {fechaLegible(doc.fecha_vencimiento)}
                    {doc.categorias ? ` · Categorías ${doc.categorias}` : ""}
                  </p>
                </div>
                <SemaforoVigencia fecha={doc.fecha_vencimiento} />
              </div>
              <div className="mt-3">
                <AccionesCalendario
                  eventId={doc.calendar_event_id}
                  titulo={`${doc.tipo_documento} por vencer · ${v.placa}`}
                  descripcion={`El ${doc.tipo_documento} del vehículo ${v.placa} vence el ${doc.fecha_vencimiento}.`}
                  fecha={doc.fecha_vencimiento}
                  emailCliente={cliente?.email}
                  onCambio={(eventId) => eventoDocumento.mutateAsync({ id: doc.id, eventId })}
                />
              </div>
            </li>
          ))}
          {docsVehiculo.length === 0 ? (
            <li className="text-sm text-muted-foreground">Sin documentos registrados.</li>
          ) : null}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Historial de mantenimientos</h2>
        <ul className="mt-3 space-y-3">
          {(mantenimientos.data ?? []).map((m) => (
            <li key={m.id} className="rounded-xl border border-border bg-card/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {fechaLegible(m.fecha_servicio)} · {m.kilometraje.toLocaleString("es-CO")} km
                </p>
                <p className="text-primary">{moneda(m.valor_total)}</p>
              </div>
              <p className="mt-1 text-xs">{formatoCorchetes(m.tipos_servicio)}</p>
              {m.diagnostico ? (
                <p className="mt-1 text-xs text-muted-foreground">{m.diagnostico}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Próximo: {m.proximo_km?.toLocaleString("es-CO") ?? "—"} km ·{" "}
                {fechaLegible(m.proxima_fecha)}
              </p>
              {m.drive_folder_url ? (
                <a
                  href={m.drive_folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-accent underline"
                >
                  Evidencias en Google Drive
                </a>
              ) : null}
              {m.proxima_fecha ? (
                <div className="mt-3">
                  <AccionesCalendario
                    eventId={m.calendar_event_id}
                    titulo={`Mantenimiento preventivo · ${v.placa}`}
                    descripcion={`Servicio programado para el vehículo ${v.placa}. Kilometraje objetivo: ${m.proximo_km ?? "—"} km. Servicios previos: ${formatoCorchetes(m.tipos_servicio)}. Evidencias: ${m.fotos_urls.join(" | ") || m.drive_folder_url || "sin fotos"}`}
                    fecha={m.proxima_fecha}
                    emailCliente={cliente?.email}
                    onCambio={(eventId) => eventoMantenimiento.mutateAsync({ id: m.id, eventId })}
                  />
                </div>
              ) : null}
            </li>
          ))}
          {(mantenimientos.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">Sin mantenimientos registrados.</li>
          ) : null}
        </ul>
      </section>
    </AppShell>
  );
}
