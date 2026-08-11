import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Campo, Seccion } from "@/components/Campo";
import { ModalConfirmacion } from "@/components/ModalConfirmacion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBorrador } from "@/hooks/useBorrador";
import { supabase } from "@/integrations/supabase/client";
import {
  listarMantenimientos,
  listarVehiculos,
  ROLES_PERSONAL,
  TIPOS_SERVICIO,
} from "@/lib/datos";
import { archivoABase64, formatoCorchetes, limpiarTexto, moneda } from "@/lib/formato";
import { guardarEventoCalendar, subirEvidenciaDrive } from "@/lib/google.functions";
import { calcularKmPorDia, proximoServicio, proyecciones } from "@/lib/telemetria";

export const Route = createFileRoute("/_authenticated/mantenimientos/nuevo")({
  head: () => ({
    meta: [
      { title: "Registrar mantenimiento y lubricación | Taller Medular" },
      {
        name: "description",
        content:
          "Registra el servicio, kilometraje, personal presente, costos con IVA y agenda el próximo mantenimiento automáticamente.",
      },
      { property: "og:title", content: "Registrar mantenimiento | Taller Medular" },
      {
        property: "og:description",
        content:
          "Servicio, evidencias en Drive, telemetría de kilometraje y agenda automática en Calendar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NuevoMantenimiento,
});

const selectClase =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

const hoy = new Date().toISOString().slice(0, 10);

const inicial = {
  vehiculo_id: "",
  fecha_servicio: hoy,
  hora_entrada: "08:00",
  kilometraje: "",
  tipos_servicio: [] as string[],
  diagnostico: "",
  procedimiento: "",
  repuestos_cambiados: "",
  costo_mano_obra: "",
  costo_repuestos: "",
  iva_porcentaje: "0",
  personal: [] as string[],
  nombres_personal: "",
  producto_nombre: "",
  producto_cantidad: "",
  producto_unidad: "Litros",

};

function NuevoMantenimiento() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { valores, actualizar, limpiar } = useBorrador("borrador_mantenimiento", inicial);
  const [fotos, setFotos] = useState<File[]>([]);
  const [productoFoto, setProductoFoto] = useState<File | null>(null);
  const [consulta, setConsulta] = useState("");
  const [recomendacion, setRecomendacion] = useState("");
  const [confirmarLimpieza, setConfirmarLimpieza] = useState(false);
  const [estado, setEstado] = useState<null | { drive: boolean; calendar: boolean }>(null);


  const vehiculos = useQuery({ queryKey: ["vehiculos"], queryFn: listarVehiculos });
  const historial = useQuery({
    queryKey: ["mantenimientos"],
    queryFn: () => listarMantenimientos(),
  });

  const subirDrive = useServerFn(subirEvidenciaDrive);
  const agendar = useServerFn(guardarEventoCalendar);

  const vehiculo = (vehiculos.data ?? []).find((v) => v.id === valores.vehiculo_id);

  const subtotal = (Number(valores.costo_mano_obra) || 0) + (Number(valores.costo_repuestos) || 0);
  const iva = subtotal * ((Number(valores.iva_porcentaje) || 0) / 100);
  const total = subtotal + iva;

  const anterior = useMemo(() => {
    if (!vehiculo) return null;
    return (
      (historial.data ?? [])
        .filter((m) => m.placa === vehiculo.placa)
        .sort((a, b) => (a.fecha_servicio < b.fecha_servicio ? 1 : -1))[0] ?? null
    );
  }, [historial.data, vehiculo]);

  const kmPorDia =
    vehiculo && valores.kilometraje
      ? calcularKmPorDia(
          { fecha_servicio: valores.fecha_servicio, kilometraje: Number(valores.kilometraje) },
          anterior,
        )
      : null;

  const guardar = useMutation({
    mutationFn: async () => {
      if (!vehiculo) throw new Error("Selecciona el vehículo");
      if (!valores.kilometraje) throw new Error("Registra el kilometraje de entrada");
      if (valores.tipos_servicio.length === 0) throw new Error("Selecciona al menos un servicio");

      const kilometraje = Number(valores.kilometraje);
      const metricas = proyecciones(kmPorDia);

      // 1) Evidencias directamente a Google Drive (/Mantenimientos/PLACA/)
      let fotosUrls: string[] = [];
      let carpeta: string | null = null;
      if (fotos.length > 0) {
        const subida = await subirDrive({
          data: {
            placa: vehiculo.placa,
            archivos: await Promise.all(
              fotos.map(async (file, indice) => ({
                nombre: `${vehiculo.placa}-${valores.fecha_servicio}-${indice + 1}.${file.name.split(".").pop() ?? "jpg"}`,
                mimeType: file.type,
                base64: await archivoABase64(file),
              })),
            ),
          },
        });
        fotosUrls = subida.archivos.map((a) => a.url);
        carpeta = subida.folderUrl;
      }
      setEstado({ drive: true, calendar: false });

      // 2) Predicción del próximo servicio (el límite que ocurra primero)
      const prediccion = proximoServicio({
        fechaServicio: valores.fecha_servicio,
        kilometraje,
        kmIntervalo: vehiculo.km_intervalo_aceite,
        mesesIntervalo: vehiculo.meses_intervalo_aceite,
        kmPorDia,
      });

      // 3) Registro en la base de datos
      const { data: mantenimiento, error } = await supabase
        .from("historial_mantenimientos")
        .insert({
          vehiculo_id: vehiculo.id,
          placa: vehiculo.placa,
          fecha_servicio: valores.fecha_servicio,
          hora_entrada: valores.hora_entrada,
          kilometraje,
          tipos_servicio: valores.tipos_servicio,
          diagnostico: limpiarTexto(valores.diagnostico) || null,
          procedimiento: limpiarTexto(valores.procedimiento) || null,
          repuestos_cambiados: limpiarTexto(valores.repuestos_cambiados) || null,
          costo_mano_obra: Number(valores.costo_mano_obra) || 0,
          costo_repuestos: Number(valores.costo_repuestos) || 0,
          iva_porcentaje: Number(valores.iva_porcentaje) || 0,
          valor_total: total,
          fotos_urls: fotosUrls,
          drive_folder_url: carpeta,
          km_promedio_dia: kmPorDia,
          proximo_km: prediccion.proximoKm,
          proxima_fecha: prediccion.proximaFecha,
        })
        .select()
        .single();
      if (error) throw error;

      if (valores.personal.length > 0) {
        const nombres = limpiarTexto(valores.nombres_personal);
        const { error: errorPersonal } = await supabase.from("personal_presente").insert(
          valores.personal.map((rol) => ({
            mantenimiento_id: mantenimiento.id,
            rol,
            nombre: nombres || null,
          })),
        );
        if (errorPersonal) throw errorPersonal;
      }

      // 4) Telemetría en la ficha del vehículo
      const { error: errorVehiculo } = await supabase
        .from("vehiculos")
        .update({
          km_promedio_dia: metricas.kmPorDia,
          km_semana: metricas.kmSemana,
          km_mes: metricas.kmMes,
          km_ano: metricas.kmAno,
        })
        .eq("id", vehiculo.id);
      if (errorVehiculo) throw errorVehiculo;

      // 5) Agenda directa en Google Calendar con el cliente como invitado
      const email = vehiculo.clientes?.email;
      if (email) {
        const descripcion = [
          `Vehículo ${vehiculo.placa} (${vehiculo.marca ?? ""} ${vehiculo.modelo_ano ?? ""}).`,
          `Servicios realizados: ${formatoCorchetes(valores.tipos_servicio)}.`,
          `Kilometraje de entrada: ${kilometraje} km. Próximo objetivo: ${prediccion.proximoKm} km.`,
          `Límite que ocurre primero: ${prediccion.motivo}.`,
          kmPorDia ? `Promedio de uso: ${kmPorDia} km/día.` : "",
          fotosUrls.length ? `Evidencias en Drive: ${fotosUrls.join(" | ")}` : "",
          carpeta ? `Carpeta: ${carpeta}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        try {
          const evento = await agendar({
            data: {
              titulo: `Mantenimiento preventivo · ${vehiculo.placa}`,
              descripcion,
              fecha: prediccion.proximaFecha,
              emailCliente: email,
              eventId: null,
            },
          });
          await supabase
            .from("historial_mantenimientos")
            .update({ calendar_event_id: evento.eventId })
            .eq("id", mantenimiento.id);
          setEstado({ drive: true, calendar: true });
        } catch (errorCalendar) {
          console.error(errorCalendar);
          toast.error("Guardado, pero no se pudo agendar en Calendar");
        }
      }

      return vehiculo.placa;
    },
    onSuccess: async (placa) => {
      limpiar();
      await queryClient.invalidateQueries();
      toast.success("Mantenimiento guardado, evidencias en Drive y cita agendada");
      router.navigate({ to: "/vehiculos/$placa", params: { placa } });
    },
    onError: (error) => {
      setEstado(null);
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el servicio");
    },
  });

  const bloqueado = guardar.isSuccess || guardar.isPending;

  return (
    <AppShell titulo="Nuevo servicio" subtitulo="Mantenimiento, lubricación y entrada del vehículo">
      <Seccion titulo="Entrada del vehículo">
        <Campo etiqueta="Vehículo (placa)" requerido>
          <select
            className={selectClase}
            value={valores.vehiculo_id}
            onChange={(e) => actualizar("vehiculo_id", e.target.value)}
          >
            <option value="">— Selecciona la placa —</option>
            {(vehiculos.data ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} · {v.marca ?? ""} {v.modelo_ano ?? ""}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Fecha del servicio" ancho="half">
          <Input
            type="date"
            value={valores.fecha_servicio}
            onChange={(e) => actualizar("fecha_servicio", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Hora de entrada" ancho="half">
          <Input
            type="time"
            value={valores.hora_entrada}
            onChange={(e) => actualizar("hora_entrada", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Kilometraje actual (odómetro)" requerido ancho="half">
          <Input
            type="number"
            inputMode="numeric"
            value={valores.kilometraje}
            onChange={(e) => actualizar("kilometraje", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Promedio calculado" ancho="half">
          <div className="flex h-10 items-center rounded-md border border-border bg-card px-3 text-sm">
            {kmPorDia ? `${kmPorDia} km/día` : "Sin registro anterior"}
          </div>
        </Campo>
      </Seccion>

      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Tipo de servicio</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TIPOS_SERVICIO.map((tipo) => {
            const activo = valores.tipos_servicio.includes(tipo);
            return (
              <label
                key={tipo}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                  activo ? "border-primary bg-primary/10" : "border-border bg-card/60"
                }`}
              >
                <Checkbox
                  checked={activo}
                  onCheckedChange={(marcado) =>
                    actualizar(
                      "tipos_servicio",
                      marcado
                        ? [...valores.tipos_servicio, tipo]
                        : valores.tipos_servicio.filter((t) => t !== tipo),
                    )
                  }
                />
                {tipo}
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Selección: {formatoCorchetes(valores.tipos_servicio)}
        </p>
      </section>

      <Seccion titulo="Diagnóstico y procedimiento">
        <Campo etiqueta="Diagnóstico técnico detallado">
          <Textarea
            rows={4}
            value={valores.diagnostico}
            onChange={(e) => actualizar("diagnostico", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Procedimiento ejecutado">
          <Textarea
            rows={4}
            value={valores.procedimiento}
            onChange={(e) => actualizar("procedimiento", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Repuestos / insumos cambiados">
          <Textarea
            rows={3}
            value={valores.repuestos_cambiados}
            onChange={(e) => actualizar("repuestos_cambiados", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Fotografías de evidencia (Google Drive)">
          <Input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
          />
          {fotos.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {fotos.length} archivo(s) listos para /Mantenimientos/{vehiculo?.placa ?? "PLACA"}/
            </p>
          ) : null}
        </Campo>
      </Seccion>

      <Seccion titulo="Productos e insumos con asistente de IA">
        <Campo etiqueta="Producto utilizado" ancho="half">
          <Input
            value={valores.producto_nombre}
            onChange={(e) => actualizar("producto_nombre", e.target.value)}
            placeholder="Aceite 20W-50 semisintético"
          />
        </Campo>
        <Campo etiqueta="Foto del producto" ancho="half">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setProductoFoto(e.target.files?.[0] ?? null)}
          />
        </Campo>
        <Campo etiqueta="Cantidad utilizada" ancho="half">
          <Input
            type="number"
            step="0.01"
            value={valores.producto_cantidad}
            onChange={(e) => actualizar("producto_cantidad", e.target.value)}
            placeholder="1.2"
          />
        </Campo>
        <Campo etiqueta="Unidad" ancho="half">
          <select
            className={selectClase}
            value={valores.producto_unidad}
            onChange={(e) => actualizar("producto_unidad", e.target.value)}
          >
            {["Litros", "Mililitros", "Galones", "Unidades"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Consulta al asistente técnico">
          <Textarea
            rows={2}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="¿Este aceite y esta cantidad son óptimos para este vehículo?"
          />
        </Campo>
        <Campo etiqueta="Recomendación">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={consultarIA.isPending || !vehiculo}
            onClick={() => consultarIA.mutate()}
          >
            {consultarIA.isPending ? "Analizando…" : "Consultar a la IA de lubricación"}
          </Button>
          {recomendacion ? (
            <div className="glass-card mt-3 rounded-xl p-3 text-sm whitespace-pre-wrap">
              {recomendacion}
            </div>
          ) : null}
        </Campo>
      </Seccion>


      <Seccion titulo="Desglose económico">
        <Campo etiqueta="Costo de mano de obra" ancho="half">
          <Input
            type="number"
            value={valores.costo_mano_obra}
            onChange={(e) => actualizar("costo_mano_obra", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Costo de los repuestos" ancho="half">
          <Input
            type="number"
            value={valores.costo_repuestos}
            onChange={(e) => actualizar("costo_repuestos", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="IVA (%)" ancho="half">
          <Input
            type="number"
            value={valores.iva_porcentaje}
            onChange={(e) => actualizar("iva_porcentaje", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Valor total neto" ancho="half">
          <div className="flex h-10 items-center rounded-md border border-primary/50 bg-primary/10 px-3 font-display text-xl text-primary">
            {moneda(total)}
          </div>
        </Campo>
      </Seccion>

      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Personal presente</h2>
        <div className="mt-3 space-y-2">
          {ROLES_PERSONAL.map((rol) => {
            const activo = valores.personal.includes(rol);
            return (
              <label
                key={rol}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                  activo ? "border-accent bg-accent/10" : "border-border bg-card/60"
                }`}
              >
                <Checkbox
                  checked={activo}
                  onCheckedChange={(marcado) =>
                    actualizar(
                      "personal",
                      marcado
                        ? [...valores.personal, rol]
                        : valores.personal.filter((r) => r !== rol),
                    )
                  }
                />
                {rol}
              </label>
            );
          })}
        </div>
        <div className="mt-3">
          <Campo etiqueta="Nombres de los operarios">
            <Input
              value={valores.nombres_personal}
              onChange={(e) => actualizar("nombres_personal", e.target.value)}
              placeholder="Yuli Murillo, Andrés Gómez"
            />
          </Campo>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Registro: {formatoCorchetes(valores.personal)}
        </p>
      </section>

      <div className="flex gap-3">
        <Button className="flex-1" disabled={bloqueado} onClick={() => guardar.mutate()}>
          {guardar.isSuccess
            ? "Guardado ✓ Drive ✓ Calendar ✓"
            : guardar.isPending
              ? estado?.drive
                ? "Agendando en Calendar…"
                : "Subiendo evidencias…"
              : "Guardar mantenimiento"}
        </Button>
        <Button variant="outline" disabled={bloqueado} onClick={() => setConfirmarLimpieza(true)}>
          Borrar formulario
        </Button>
      </div>

      <ModalConfirmacion
        abierto={confirmarLimpieza}
        titulo="Borrar formulario"
        textoConfirmar="Sí, borrar"
        descripcion="Se limpiarán únicamente los datos locales de este formulario. Los registros ya guardados en la base de datos no se modifican."
        onCancelar={() => setConfirmarLimpieza(false)}
        onConfirmar={() => {
          limpiar();
          setFotos([]);
          setConfirmarLimpieza(false);
          router.navigate({ to: "/panel" });
        }}
      />
    </AppShell>
  );
}
