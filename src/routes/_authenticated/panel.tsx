import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShieldAlert, Wrench } from "lucide-react";

import { AccionesCalendario } from "@/components/AccionesCalendario";
import { AppShell } from "@/components/AppShell";
import { SemaforoVigencia } from "@/components/SemaforoVigencia";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { enlaceDirectoDrive } from "@/lib/drive";

import {
  listarDocumentos,
  listarMantenimientos,
  listarVehiculos,
  type Vehiculo,
} from "@/lib/datos";
import { coincide, fechaLegible, listaLegible, moneda } from "@/lib/formato";
import { estadoVencimiento } from "@/lib/telemetria";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel del taller | Taller Medular" },
      {
        name: "description",
        content:
          "Busca vehículos, clientes y mantenimientos en tiempo real y controla vencimientos de SOAT y técnico-mecánica.",
      },
      { property: "og:title", content: "Panel del taller | Taller Medular" },
      {
        property: "og:description",
        content: "Control de mantenimientos, vencimientos y telemetría de motos y carros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panel,
});

function Panel() {
  const queryClient = useQueryClient();
  const [consulta, setConsulta] = useState("");

  const vehiculos = useQuery({ queryKey: ["vehiculos"], queryFn: listarVehiculos });
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: listarDocumentos });
  const mantenimientos = useQuery({
    queryKey: ["mantenimientos"],
    queryFn: () => listarMantenimientos(),
  });

  const actualizarEvento = useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string | null }) => {
      const { error } = await supabase
        .from("documentos_vencimiento")
        .update({ calendar_event_id: eventId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documentos"] }),
  });

  const porId = useMemo(() => {
    const mapa = new Map<string, Vehiculo>();
    (vehiculos.data ?? []).forEach((v) => mapa.set(v.id, v));
    return mapa;
  }, [vehiculos.data]);

  const vehiculosFiltrados = (vehiculos.data ?? []).filter((v) =>
    coincide(
      consulta,
      v.placa,
      v.marca,
      v.modelo_ano,
      v.tipo_vehiculo,
      v.color,
      v.clientes?.nombre_completo,
      v.clientes?.razon_social,
      v.clientes?.numero_documento,
      v.clientes?.email,
    ),
  );

  const alertas = (documentos.data ?? [])
    .map((doc) => ({ doc, vehiculo: porId.get(doc.vehiculo_id) }))
    .filter(({ doc, vehiculo }) =>
      coincide(
        consulta,
        vehiculo?.placa,
        doc.tipo_documento,
        vehiculo?.clientes?.nombre_completo,
        vehiculo?.clientes?.numero_documento,
      ),
    )
    .filter(({ doc }) => estadoVencimiento(doc.fecha_vencimiento).estado !== "vigente")
    .slice(0, 12);

  const serviciosFiltrados = (mantenimientos.data ?? [])
    .filter((m) => coincide(consulta, m.placa, listaLegible(m.tipos_servicio), m.diagnostico))
    .slice(0, 12);

  return (
    <AppShell titulo="Panel de control" subtitulo="Búsqueda instantánea sobre todo el taller">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={consulta}
          onInput={(e) => setConsulta((e.target as HTMLInputElement).value)}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Placa, cliente, NIT, marca o modelo…"
          className="h-12 pl-9 text-base"
          autoComplete="off"
        />
      </div>

      <section className="panel p-4">
        <h2 className="flex items-center gap-2 font-display text-xl uppercase">
          <ShieldAlert className="size-5 text-warning" /> Alertas de documentos
        </h2>
        {alertas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sin vencimientos próximos ni vencidos.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {alertas.map(({ doc, vehiculo }) => (
              <li key={doc.id} className="rounded-xl border border-border bg-card/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-lg uppercase">
                      {vehiculo?.placa ?? "—"} · {doc.tipo_documento}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {fechaLegible(doc.fecha_vencimiento)} ·{" "}
                      {vehiculo?.clientes?.nombre_completo ?? "Sin cliente"}
                    </p>
                  </div>
                  <SemaforoVigencia fecha={doc.fecha_vencimiento} />
                </div>
                <div className="mt-3">
                  <AccionesCalendario
                    eventId={doc.calendar_event_id}
                    titulo={`${doc.tipo_documento} · ${vehiculo?.placa ?? ""}`}
                    descripcion={`Recordatorio de vencimiento de ${doc.tipo_documento} del vehículo ${vehiculo?.placa ?? ""}. Vence el ${doc.fecha_vencimiento}.`}
                    fecha={doc.fecha_vencimiento}
                    emailCliente={vehiculo?.clientes?.email}
                    onCambio={(eventId) =>
                      actualizarEvento.mutateAsync({ id: doc.id, eventId })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Vehículos ({vehiculosFiltrados.length})</h2>
        <ul className="mt-3 space-y-2">
          {vehiculosFiltrados.map((v) => (
            <li key={v.id}>
              <Link
                to="/vehiculos/$placa"
                params={{ placa: v.placa }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 transition-colors hover:border-primary/60"
              >
                {enlaceDirectoDrive(v.foto_url, 400) ? (
                  <img
                    src={enlaceDirectoDrive(v.foto_url, 400) as string}

                    alt={`Vehículo de placa ${v.placa}`}
                    loading="lazy"
                    className="size-14 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid size-14 place-items-center rounded-lg bg-secondary text-muted-foreground">
                    <Wrench className="size-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block font-display text-xl uppercase">{v.placa}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {listaLegible([v.tipo_vehiculo, v.marca, v.modelo_ano, v.color])}
                  </span>
                  <span className="block truncate text-xs text-primary">
                    {v.clientes?.nombre_completo ?? "Sin cliente asignado"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {vehiculosFiltrados.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              No hay vehículos que coincidan con la búsqueda.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Últimos servicios</h2>
        <ul className="mt-3 space-y-2">
          {serviciosFiltrados.map((m) => (
            <li key={m.id} className="rounded-xl border border-border bg-card/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg uppercase">{m.placa}</span>
                <span className="text-sm text-primary">{moneda(m.valor_total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {fechaLegible(m.fecha_servicio)} · {m.kilometraje.toLocaleString("es-CO")} km
              </p>
              <p className="mt-1 text-xs">{listaLegible(m.tipos_servicio)}</p>
            </li>
          ))}
          {serviciosFiltrados.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aún no hay mantenimientos.</li>
          ) : null}
        </ul>
      </section>
    </AppShell>
  );
}
