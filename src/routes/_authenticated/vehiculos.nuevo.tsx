import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Campo, Seccion } from "@/components/Campo";
import { ModalConfirmacion } from "@/components/ModalConfirmacion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useBorrador } from "@/hooks/useBorrador";
import { listarClientes, TIPOS_DOCUMENTO_VEHICULO } from "@/lib/datos";
import { archivoABase64, limpiarTexto, normalizarPlaca } from "@/lib/formato";
import { guardarEventoCalendar, subirEvidenciaDrive } from "@/lib/google.functions";
import { extraerDatosLicencia } from "@/lib/ia.functions";

import { sumarDias } from "@/lib/telemetria";

export const Route = createFileRoute("/_authenticated/vehiculos/nuevo")({
  head: () => ({
    meta: [
      { title: "Registrar vehículo y documentos | Taller Medular" },
      {
        name: "description",
        content:
          "Registra la ficha técnica del vehículo, su propietario y las fechas de vencimiento de SOAT, técnico-mecánica y licencia.",
      },
      { property: "og:title", content: "Registrar vehículo y documentos | Taller Medular" },
      {
        property: "og:description",
        content: "Ficha técnica completa, propietario y control de vencimientos con recordatorios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NuevoVehiculo,
});

const selectClase =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

const inicial = {
  placa: "",
  tipo_vehiculo: "Motocicleta",
  marca: "",
  modelo_ano: "",
  cilindrada: "",
  color: "",
  numero_chasis: "",
  numero_motor: "",
  tipo_carroceria: "",
  tipo_combustible: "Gasolina",
  fecha_matricula: "",
  organismo_transito: "",
  km_intervalo_aceite: "3000",
  meses_intervalo_aceite: "3",
  cliente_id: "",
  nombre_completo: "",
  razon_social: "",
  tipo_documento: "CC",
  numero_documento: "",
  celular_principal: "+57",
  telefono_secundario: "",
  email: "",
  direccion: "",
  ciudad: "",
  departamento: "",
  soat_exp: "",
  soat_ven: "",
  tecno_exp: "",
  tecno_ven: "",
  licencia_cat: "",
  licencia_exp: "",
  licencia_ven: "",
  operacion_exp: "",
  operacion_ven: "",
};

function NuevoVehiculo() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { valores, actualizar, limpiar } = useBorrador("borrador_vehiculo", inicial);
  const [foto, setFoto] = useState<File | null>(null);
  const [licencia, setLicencia] = useState<File | null>(null);
  const [confirmarLimpieza, setConfirmarLimpieza] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const clientes = useQuery({ queryKey: ["clientes"], queryFn: listarClientes });
  const subirDrive = useServerFn(subirEvidenciaDrive);
  const agendar = useServerFn(guardarEventoCalendar);
  const leerDocumento = useServerFn(extraerDatosLicencia);

  const leerLicencia = useMutation({
    mutationFn: async () => {
      if (!licencia) throw new Error("Sube primero la foto del documento");
      return leerDocumento({
        data: { base64: await archivoABase64(licencia), mimeType: licencia.type || "image/jpeg" },
      });
    },
    onSuccess: (datos) => {
      const asignar = (campo: keyof typeof inicial, valor?: string) => {
        const limpio = limpiarTexto(valor ?? "");
        if (limpio) actualizar(campo, limpio);
      };
      if (datos["placa"]) actualizar("placa", normalizarPlaca(datos["placa"]));
      if (["Motocicleta", "Carro", "Camioneta"].includes(datos["tipo_vehiculo"] ?? ""))
        actualizar("tipo_vehiculo", datos["tipo_vehiculo"] as string);
      asignar("marca", datos["marca"]);
      asignar("modelo_ano", datos["modelo_ano"]);
      asignar("cilindrada", datos["cilindrada"]);
      asignar("color", datos["color"]);
      asignar("numero_chasis", datos["numero_chasis"]);
      asignar("numero_motor", datos["numero_motor"]);
      asignar("tipo_carroceria", datos["tipo_carroceria"]);
      if (["Gasolina", "Diésel", "Eléctrico", "Híbrido"].includes(datos["tipo_combustible"] ?? ""))
        actualizar("tipo_combustible", datos["tipo_combustible"] as string);
      asignar("fecha_matricula", datos["fecha_matricula"]);
      asignar("organismo_transito", datos["organismo_transito"]);
      asignar("nombre_completo", datos["nombre_completo"]);
      if (["CC", "CE", "PA", "NIT"].includes(datos["tipo_documento"] ?? ""))
        actualizar("tipo_documento", datos["tipo_documento"] as string);
      asignar("numero_documento", datos["numero_documento"]);
      asignar("licencia_cat", datos["licencia_categorias"]);
      asignar("licencia_ven", datos["licencia_vencimiento"]);
      toast.success("Datos extraídos del documento y autorellenados");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No fue posible leer el documento");
    },
  });


  const guardar = useMutation({
    mutationFn: async () => {
      const placa = normalizarPlaca(valores.placa);
      if (placa.length < 5) throw new Error("La placa debe tener al menos 5 caracteres");

      let clienteId = valores.cliente_id || null;
      let emailCliente = clientes.data?.find((c) => c.id === clienteId)?.email ?? "";

      if (!clienteId) {
        if (!limpiarTexto(valores.nombre_completo)) throw new Error("Falta el nombre del cliente");
        if (!/^\S+@\S+\.\S+$/.test(valores.email)) throw new Error("Correo del cliente inválido");
        if (!/^[0-9]{5,15}$/.test(valores.numero_documento))
          throw new Error("El número de identificación debe ser numérico");

        const { data: cliente, error } = await supabase
          .from("clientes")
          .insert({
            nombre_completo: limpiarTexto(valores.nombre_completo),
            razon_social: limpiarTexto(valores.razon_social) || null,
            tipo_documento: valores.tipo_documento,
            numero_documento: valores.numero_documento,
            celular_principal: limpiarTexto(valores.celular_principal),
            telefono_secundario: limpiarTexto(valores.telefono_secundario) || null,
            email: limpiarTexto(valores.email),
            direccion: limpiarTexto(valores.direccion) || null,
            ciudad: limpiarTexto(valores.ciudad) || null,
            departamento: limpiarTexto(valores.departamento) || null,
          })
          .select()
          .single();
        if (error) throw error;
        clienteId = cliente.id;
        emailCliente = cliente.email;
      }

      let fotoUrl: string | null = null;
      if (foto) {
        const subida = await subirDrive({
          data: {
            placa,
            archivos: [
              {
                nombre: `ficha-${placa}-${Date.now()}.${foto.name.split(".").pop() ?? "jpg"}`,
                mimeType: foto.type,
                base64: await archivoABase64(foto),
              },
            ],
          },
        });
        fotoUrl = subida.archivos[0]?.url ?? null;
      }

      const { data: vehiculo, error: errorVehiculo } = await supabase
        .from("vehiculos")
        .insert({
          placa,
          tipo_vehiculo: valores.tipo_vehiculo,
          marca: limpiarTexto(valores.marca) || null,
          modelo_ano: limpiarTexto(valores.modelo_ano) || null,
          cilindrada: limpiarTexto(valores.cilindrada) || null,
          color: limpiarTexto(valores.color) || null,
          numero_chasis: limpiarTexto(valores.numero_chasis) || null,
          numero_motor: limpiarTexto(valores.numero_motor) || null,
          tipo_carroceria: limpiarTexto(valores.tipo_carroceria) || null,
          tipo_combustible: valores.tipo_combustible,
          fecha_matricula: valores.fecha_matricula || null,
          organismo_transito: limpiarTexto(valores.organismo_transito) || null,
          foto_url: fotoUrl,
          cliente_id: clienteId,
          km_intervalo_aceite: Number(valores.km_intervalo_aceite) || 3000,
          meses_intervalo_aceite: Number(valores.meses_intervalo_aceite) || 3,
        })
        .select()
        .single();
      if (errorVehiculo) throw errorVehiculo;

      const documentos = [
        {
          tipo: TIPOS_DOCUMENTO_VEHICULO[0],
          exp: valores.soat_exp,
          ven: valores.soat_ven,
          categorias: null as string | null,
        },
        { tipo: TIPOS_DOCUMENTO_VEHICULO[1], exp: valores.tecno_exp, ven: valores.tecno_ven, categorias: null },
        {
          tipo: TIPOS_DOCUMENTO_VEHICULO[2],
          exp: valores.licencia_exp,
          ven: valores.licencia_ven,
          categorias: limpiarTexto(valores.licencia_cat) || null,
        },
        {
          tipo: TIPOS_DOCUMENTO_VEHICULO[3],
          exp: valores.operacion_exp,
          ven: valores.operacion_ven,
          categorias: null,
        },
      ].filter((d) => d.ven);

      for (const doc of documentos) {
        let eventId: string | null = null;
        if (emailCliente) {
          try {
            // Recordatorio automático 7 días antes del vencimiento.
            const resultado = await agendar({
              data: {
                titulo: `${doc.tipo} por vencer · ${placa}`,
                descripcion: `El ${doc.tipo} del vehículo ${placa} vence el ${doc.ven}. Agenda tu trámite con el taller.`,
                fecha: sumarDias(doc.ven, -7),
                emailCliente,
                eventId: null,
              },
            });
            eventId = resultado.eventId;
          } catch (error) {
            console.error("No se pudo agendar el recordatorio", error);
          }
        }
        const { error } = await supabase.from("documentos_vencimiento").insert({
          vehiculo_id: vehiculo.id,
          tipo_documento: doc.tipo,
          categorias: doc.categorias,
          fecha_expedicion: doc.exp || null,
          fecha_vencimiento: doc.ven,
          calendar_event_id: eventId,
        });
        if (error) throw error;
      }

      return placa;
    },
    onSuccess: async (placa) => {
      setGuardado(true);
      limpiar();
      await queryClient.invalidateQueries();
      toast.success("Vehículo guardado, foto subida a Drive y recordatorios agendados");
      router.navigate({ to: "/vehiculos/$placa", params: { placa } });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el vehículo");
    },
  });

  return (
    <AppShell titulo="Nuevo vehículo" subtitulo="Ficha técnica, propietario y documentos legales">
      <Seccion titulo="Lectura automática con IA">
        <Campo etiqueta="Foto de licencia de tránsito o de conducción">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setLicencia(e.target.files?.[0] ?? null)}
          />
        </Campo>
        <Campo etiqueta="Autorelleno">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!licencia || leerLicencia.isPending}
            onClick={() => leerLicencia.mutate()}
          >
            {leerLicencia.isPending ? "Leyendo documento…" : "Extraer datos con IA"}
          </Button>
        </Campo>
      </Seccion>

      <Seccion titulo="Ficha del vehículo">

        <Campo etiqueta="Placa" requerido ancho="half">
          <Input
            value={valores.placa}
            onChange={(e) => actualizar("placa", normalizarPlaca(e.target.value))}
            placeholder="ABC123"
            className="font-display text-xl tracking-widest uppercase"
          />
        </Campo>
        <Campo etiqueta="Tipo de vehículo" ancho="half">
          <select
            className={selectClase}
            value={valores.tipo_vehiculo}
            onChange={(e) => actualizar("tipo_vehiculo", e.target.value)}
          >
            {["Motocicleta", "Carro", "Camioneta"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Marca" ancho="half">
          <Input value={valores.marca} onChange={(e) => actualizar("marca", e.target.value)} />
        </Campo>
        <Campo etiqueta="Modelo (año)" ancho="half">
          <Input
            value={valores.modelo_ano}
            onChange={(e) => actualizar("modelo_ano", e.target.value)}
            placeholder="2021"
          />
        </Campo>
        <Campo etiqueta="Cilindrada (cc)" ancho="half">
          <Input
            value={valores.cilindrada}
            onChange={(e) => actualizar("cilindrada", e.target.value)}
            placeholder="150"
          />
        </Campo>
        <Campo etiqueta="Color" ancho="half">
          <Input value={valores.color} onChange={(e) => actualizar("color", e.target.value)} />
        </Campo>
        <Campo etiqueta="Número de chasis (VIN)" ancho="half">
          <Input
            value={valores.numero_chasis}
            onChange={(e) => actualizar("numero_chasis", e.target.value.toUpperCase())}
          />
        </Campo>
        <Campo etiqueta="Número de motor" ancho="half">
          <Input
            value={valores.numero_motor}
            onChange={(e) => actualizar("numero_motor", e.target.value.toUpperCase())}
          />
        </Campo>
        <Campo etiqueta="Tipo de carrocería" ancho="half">
          <Input
            value={valores.tipo_carroceria}
            onChange={(e) => actualizar("tipo_carroceria", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Tipo de combustible" ancho="half">
          <select
            className={selectClase}
            value={valores.tipo_combustible}
            onChange={(e) => actualizar("tipo_combustible", e.target.value)}
          >
            {["Gasolina", "Diésel", "Eléctrico", "Híbrido"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Fecha de matrícula inicial" ancho="half">
          <Input
            type="date"
            value={valores.fecha_matricula}
            onChange={(e) => actualizar("fecha_matricula", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Organismo de tránsito" ancho="half">
          <Input
            value={valores.organismo_transito}
            onChange={(e) => actualizar("organismo_transito", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Fotografía del vehículo">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          />
          {foto ? (
            <img
              src={URL.createObjectURL(foto)}
              alt="Previsualización del vehículo"
              className="mt-2 h-40 w-full rounded-xl object-cover"
            />
          ) : null}
        </Campo>
        <Campo etiqueta="Intervalo de aceite (km)" ancho="half">
          <Input
            type="number"
            value={valores.km_intervalo_aceite}
            onChange={(e) => actualizar("km_intervalo_aceite", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Vigencia por tiempo (meses)" ancho="half">
          <Input
            type="number"
            value={valores.meses_intervalo_aceite}
            onChange={(e) => actualizar("meses_intervalo_aceite", e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Dueño / cliente">
        <Campo etiqueta="Cliente existente">
          <select
            className={selectClase}
            value={valores.cliente_id}
            onChange={(e) => actualizar("cliente_id", e.target.value)}
          >
            <option value="">— Registrar cliente nuevo —</option>
            {(clientes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_completo} · {c.numero_documento}
              </option>
            ))}
          </select>
        </Campo>

        {!valores.cliente_id ? (
          <>
            <Campo etiqueta="Nombre completo" requerido ancho="half">
              <Input
                value={valores.nombre_completo}
                onChange={(e) => actualizar("nombre_completo", e.target.value)}
                placeholder="Yuli Murillo"
              />
            </Campo>
            <Campo etiqueta="Empresa o razón social" ancho="half">
              <Input
                value={valores.razon_social}
                onChange={(e) => actualizar("razon_social", e.target.value)}
                placeholder="Conjunto Residencial"
              />
            </Campo>
            <Campo etiqueta="Tipo de documento" ancho="half">
              <select
                className={selectClase}
                value={valores.tipo_documento}
                onChange={(e) => actualizar("tipo_documento", e.target.value)}
              >
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="PA">Pasaporte</option>
                <option value="NIT">NIT</option>
              </select>
            </Campo>
            <Campo etiqueta="Número de identificación" requerido ancho="half">
              <Input
                inputMode="numeric"
                value={valores.numero_documento}
                onChange={(e) =>
                  actualizar("numero_documento", e.target.value.replace(/[^0-9]/g, ""))
                }
              />
            </Campo>
            <Campo etiqueta="Celular principal (WhatsApp)" requerido ancho="half">
              <Input
                value={valores.celular_principal}
                onChange={(e) => actualizar("celular_principal", e.target.value)}
                placeholder="+57 300 000 0000"
              />
            </Campo>
            <Campo etiqueta="Teléfono secundario" ancho="half">
              <Input
                value={valores.telefono_secundario}
                onChange={(e) => actualizar("telefono_secundario", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Correo electrónico" requerido ancho="half">
              <Input
                type="email"
                value={valores.email}
                onChange={(e) => actualizar("email", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Dirección" ancho="half">
              <Input
                value={valores.direccion}
                onChange={(e) => actualizar("direccion", e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Ciudad" ancho="half">
              <Input value={valores.ciudad} onChange={(e) => actualizar("ciudad", e.target.value)} />
            </Campo>
            <Campo etiqueta="Departamento" ancho="half">
              <Input
                value={valores.departamento}
                onChange={(e) => actualizar("departamento", e.target.value)}
              />
            </Campo>
          </>
        ) : null}
      </Seccion>

      <Seccion titulo="Vencimiento de documentos">
        <Campo etiqueta="SOAT — expedición" ancho="half">
          <Input
            type="date"
            value={valores.soat_exp}
            onChange={(e) => actualizar("soat_exp", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="SOAT — vencimiento" ancho="half">
          <Input
            type="date"
            value={valores.soat_ven}
            onChange={(e) => actualizar("soat_ven", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Técnico-mecánica — expedición" ancho="half">
          <Input
            type="date"
            value={valores.tecno_exp}
            onChange={(e) => actualizar("tecno_exp", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Técnico-mecánica — vencimiento" ancho="half">
          <Input
            type="date"
            value={valores.tecno_ven}
            onChange={(e) => actualizar("tecno_ven", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Licencia — categorías" ancho="half">
          <Input
            value={valores.licencia_cat}
            onChange={(e) => actualizar("licencia_cat", e.target.value)}
            placeholder="A2, B1"
          />
        </Campo>
        <Campo etiqueta="Licencia — vencimiento" ancho="half">
          <Input
            type="date"
            value={valores.licencia_ven}
            onChange={(e) => actualizar("licencia_ven", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Tarjeta de operación — expedición" ancho="half">
          <Input
            type="date"
            value={valores.operacion_exp}
            onChange={(e) => actualizar("operacion_exp", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Tarjeta de operación — vencimiento" ancho="half">
          <Input
            type="date"
            value={valores.operacion_ven}
            onChange={(e) => actualizar("operacion_ven", e.target.value)}
          />
        </Campo>
      </Seccion>

      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={guardado || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardado
            ? "Guardado en la nube ✓"
            : guardar.isPending
              ? "Guardando…"
              : "Guardar vehículo"}
        </Button>
        <Button variant="outline" onClick={() => setConfirmarLimpieza(true)}>
          Borrar formulario
        </Button>
      </div>

      <ModalConfirmacion
        abierto={confirmarLimpieza}
        titulo="Borrar formulario"
        textoConfirmar="Sí, borrar"
        descripcion="Solo se limpiarán los datos locales de este formulario. Ningún registro existente será modificado."
        onCancelar={() => setConfirmarLimpieza(false)}
        onConfirmar={() => {
          limpiar();
          setConfirmarLimpieza(false);
          router.navigate({ to: "/panel" });
        }}
      />
    </AppShell>
  );
}
