import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, FileUp, Fuel, Plus, Route as RutaIcono, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ModalConfirmacion } from "@/components/ModalConfirmacion";
import { supabase } from "@/integrations/supabase/client";
import type { Vehiculo } from "@/lib/datos";
import { moneda } from "@/lib/formato";
import {
  combustibleSchema,
  distanciaJornada,
  eficienciaCombustible,
  fechaHoraLocal,
  sugerirApertura,
  trayectoSchema,
  type Trayecto,
} from "@/lib/jornadas";
import { guardarJornada } from "@/lib/jornadas.functions";
import { scanOdometer } from "@/lib/odometro.functions";
import { prepararCaptura } from "@/lib/ocr-archivo";

export function RegistroJornada({ vehiculo }: { vehiculo: Vehiculo }) {
  const qc = useQueryClient();
  const escanear = useServerFn(scanOdometer);
  const guardarFn = useServerFn(guardarJornada);
  const camara = useRef<HTMLInputElement>(null);
  const archivos = useRef<HTMLInputElement>(null);
  const intento = useRef<string | null>(null);
  const [tipo, setTipo] = useState<"salida" | "llegada">("salida");
  const [fechaHora, setFechaHora] = useState("");
  const [km, setKm] = useState("");
  const [editado, setEditado] = useState(false);
  const [confianza, setConfianza] = useState<number | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [quitar, setQuitar] = useState<number | null>(null);
  const [trayectos, setTrayectos] = useState<Trayecto[]>([]);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [kmTrayecto, setKmTrayecto] = useState("");
  const [tanqueo, setTanqueo] = useState(false);
  const [volumen, setVolumen] = useState("");
  const [unidad, setUnidad] = useState<"galones" | "litros">("galones");
  const [valor, setValor] = useState("");
  const [kmTanqueo, setKmTanqueo] = useState("");
  const [completo, setCompleto] = useState(false);
  useEffect(() => {
    setFechaHora(fechaHoraLocal(new Date()));
  }, []);

  const turnos = useQuery({
    queryKey: ["turnos", vehiculo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_turno")
        .select("*")
        .eq("vehiculo_id", vehiculo.id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const detalles = useQuery({
    queryKey: ["detalles-jornada", vehiculo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detalles_jornada")
        .select("*")
        .eq("vehiculo_id", vehiculo.id)
        .order("registrado_en", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const fecha = fechaHora.slice(0, 10);
  const salida = turnos.data?.find((t) => t.tipo === "salida" && t.fecha === fecha);
  const llegada = turnos.data?.find((t) => t.tipo === "llegada" && t.fecha === fecha);
  const existente = tipo === "salida" ? salida : llegada;
  const sugerido = sugerirApertura(turnos.data ?? [], fecha);
  useEffect(() => {
    if (editado) return;
    setKm(
      existente
        ? String(existente.kilometraje)
        : tipo === "salida" && sugerido !== null
          ? String(sugerido)
          : "",
    );
  }, [editado, existente, tipo, sugerido]);
  const kmNumero = km.trim() === "" ? null : Number(km);
  const neto = distanciaJornada(
    salida?.kilometraje ?? (tipo === "salida" ? kmNumero : null),
    llegada?.kilometraje ?? (tipo === "llegada" ? kmNumero : null),
  );
  const combustibleActual =
    tanqueo && volumen && valor !== "" && kmTanqueo
      ? {
          volumen: Number(volumen),
          unidad,
          valor: Number(valor),
          kilometraje: Number(kmTanqueo),
          completo,
        }
      : null;
  const instante = new Date(fechaHora);
  const instanteIso = Number.isFinite(instante.getTime()) ? instante.toISOString() : "";
  const combustibleAnterior = (detalles.data ?? [])
    .filter((d) => d.combustible && d.registrado_en < instanteIso)
    .map((d) => combustibleSchema.safeParse(d.combustible))
    .find((r) => r.success);
  const rendimiento = eficienciaCombustible(
    combustibleAnterior?.success ? combustibleAnterior.data : null,
    combustibleActual,
  );

  const guardar = useMutation({
    mutationFn: async () => {
      if (!instanteIso || kmNumero === null || !Number.isInteger(kmNumero) || kmNumero < 0)
        throw new Error("Ingresa fecha y kilometraje válidos");
      if (origen || destino || kmTrayecto)
        throw new Error("Añade el trayecto pendiente o vacía sus campos");
      if (tanqueo && !combustibleActual)
        throw new Error("Completa volumen, valor y kilometraje del tanqueo");
      if (combustibleActual) combustibleSchema.parse(combustibleActual);
      intento.current ??= crypto.randomUUID();
      return guardarFn({
        data: {
          id: intento.current,
          vehiculoId: vehiculo.id,
          tipo,
          fecha,
          fechaHora: new Date(fechaHora).toISOString(),
          kilometraje: kmNumero,
          confianza,
          trayectos,
          combustible: combustibleActual,
        },
      });
    },
    onSuccess: async () => {
      toast.success(tipo === "salida" ? "Salida registrada" : "Llegada registrada");
      setConfirmar(false);
      setTrayectos([]);
      setTanqueo(false);
      setVolumen("");
      setValor("");
      setKmTanqueo("");
      setCompleto(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["turnos", vehiculo.id] }),
        qc.invalidateQueries({ queryKey: ["detalles-jornada", vehiculo.id] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar la jornada"),
  });
  const bloqueado = leyendo || guardar.isPending || !!existente || guardar.isSuccess;
  function cambiarSeleccion(nuevoTipo: "salida" | "llegada", nuevaFecha: string) {
    setTipo(nuevoTipo);
    setFechaHora(nuevaFecha);
    setEditado(false);
    setConfianza(null);
    intento.current = null;
    guardar.reset();
    setTrayectos([]);
    setOrigen("");
    setDestino("");
    setKmTrayecto("");
    setTanqueo(false);
    setVolumen("");
    setValor("");
    setKmTanqueo("");
    setCompleto(false);
  }
  async function capturar(archivo?: File) {
    if (!archivo) return;
    setLeyendo(true);
    let captura: Awaited<ReturnType<typeof prepararCaptura>> | null = null;
    try {
      captura = await prepararCaptura(archivo);
      const r = await escanear({ data: { images: captura.images } });
      if (captura.fechaCaptura) {
        setFechaHora(captura.fechaCaptura);
        guardar.reset();
        intento.current = null;
      }
      setKm(String(r.mileage));
      setEditado(true);
      setConfianza(r.confidence);
      toast.success(`Odómetro leído: ${r.mileage.toLocaleString("es-CO")} km`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer el archivo");
    } finally {
      if (captura) {
        captura.images.forEach((i) => {
          i.base64 = "";
        });
        captura.images.length = 0;
      }
      captura = null;
      if (camara.current) camara.current.value = "";
      if (archivos.current) archivos.current.value = "";
      setLeyendo(false);
    }
  }
  return (
    <section className="panel min-w-0 p-4">
      <h2 className="flex items-center gap-2 font-display text-xl uppercase">
        <RutaIcono className="size-5 shrink-0 text-primary" />
        Registro de ruta / turno diario
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["salida", "llegada"] as const).map((t) => (
          <Button
            key={t}
            type="button"
            className="h-auto min-h-10 whitespace-normal"
            variant={tipo === t ? "default" : "outline"}
            disabled={guardar.isPending || leyendo}
            onClick={() => cambiarSeleccion(t, fechaHora)}
          >
            {t === "salida" ? "Salida (Mañana)" : "Llegada (Noche)"}
          </Button>
        ))}
      </div>
      <label className="mt-3 block min-w-0">
        <span className="etiqueta-campo">Fecha y hora de la jornada</span>
        <Input
          aria-label="Fecha y hora de la jornada"
          className="min-w-0 max-w-full"
          type="datetime-local"
          value={fechaHora}
          disabled={guardar.isPending || leyendo}
          onChange={(e) => cambiarSeleccion(tipo, e.target.value)}
        />
      </label>
      {tipo === "salida" && sugerido !== null ? (
        <p className="mt-2 text-sm text-primary">
          KM inicial sugerido: {sugerido.toLocaleString("es-CO")}
        </p>
      ) : null}
      <input
        ref={camara}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => void capturar(e.target.files?.[0])}
      />
      <input
        ref={archivos}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
        onChange={(e) => void capturar(e.target.files?.[0])}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="h-auto min-h-10 whitespace-normal"
          disabled={bloqueado}
          onClick={() => camara.current?.click()}
        >
          <Camera className="size-4 shrink-0" />
          Capturar Odómetro
        </Button>
        <Button
          variant="outline"
          className="h-auto min-h-10 whitespace-normal"
          disabled={bloqueado}
          onClick={() => archivos.current?.click()}
        >
          <FileUp className="size-4 shrink-0" />
          Foto / PDF
        </Button>
      </div>
      {leyendo ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Leyendo odómetro…
        </p>
      ) : null}
      <label className="mt-3 block">
        <span className="etiqueta-campo">Kilometraje (puedes corregirlo)</span>
        <Input
          aria-label="Kilometraje de la jornada"
          inputMode="numeric"
          value={km}
          disabled={guardar.isPending || leyendo}
          onChange={(e) => {
            setKm(e.target.value.replace(/\D/g, ""));
            setEditado(true);
            setConfianza(null);
            intento.current = null;
          }}
          placeholder="Ej: 15230"
        />
      </label>
      {confianza !== null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Confianza de la lectura: {Math.round(confianza * 100)}%
        </p>
      ) : null}
      <div className="mt-3 border-y border-border py-3">
        <p className="etiqueta-campo">Distancia neta de la jornada</p>
        <p
          className={`font-display text-2xl ${neto !== null && neto < 0 ? "text-destructive" : "text-primary"}`}
        >
          {neto === null ? "— km" : `${neto.toLocaleString("es-CO")} km`}
        </p>
        <p className="text-xs text-muted-foreground">
          Apertura: {salida?.kilometraje.toLocaleString("es-CO") ?? "—"} km · Cierre:{" "}
          {llegada?.kilometraje.toLocaleString("es-CO") ?? "—"} km
        </p>
      </div>
      {tipo === "llegada" && !salida ? (
        <p className="mt-2 text-sm text-warning">Aún no hay salida registrada para esta fecha.</p>
      ) : null}
      <fieldset disabled={bloqueado} className="min-w-0">
        <details className="mt-3 border-b border-border pb-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Añadir Trayecto / Viaje Puntual
          </summary>
          <div className="mt-3 grid gap-2">
            <Input
              aria-label="Punto de origen"
              placeholder="Punto de Origen"
              value={origen}
              maxLength={200}
              onChange={(e) => setOrigen(e.target.value)}
            />
            <Input
              aria-label="Punto de destino"
              placeholder="Punto de Destino"
              value={destino}
              maxLength={200}
              onChange={(e) => setDestino(e.target.value)}
            />
            <Input
              aria-label="Kilómetros del trayecto"
              placeholder="Kilómetros del trayecto"
              type="number"
              min="0"
              step="0.1"
              value={kmTrayecto}
              onChange={(e) => setKmTrayecto(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const r = trayectoSchema.safeParse({ origen, destino, km: Number(kmTrayecto) });
                if (!r.success) {
                  toast.error("Completa origen, destino y kilómetros mayores que cero");
                  return;
                }
                setTrayectos((v) => [...v, r.data]);
                setOrigen("");
                setDestino("");
                setKmTrayecto("");
              }}
            >
              <Plus className="size-4" />
              Añadir trayecto
            </Button>
          </div>
          <ul className="mt-2 space-y-2">
            {trayectos.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 break-words">
                  {t.origen} → {t.destino} · {t.km} km
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar trayecto ${i + 1}`}
                  onClick={() => setQuitar(i)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </details>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Fuel className="size-4 shrink-0 text-primary" />
            ¿Tanqueaste en esta jornada?
          </span>
          <Switch
            aria-label="¿Tanqueaste en esta jornada?"
            checked={tanqueo}
            onCheckedChange={setTanqueo}
          />
        </label>
        {tanqueo ? (
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3">
            <label>
              <span className="etiqueta-campo">Volumen</span>
              <Input
                aria-label="Volumen de combustible"
                type="number"
                min="0"
                step="0.01"
                value={volumen}
                onChange={(e) => setVolumen(e.target.value)}
              />
            </label>
            <label>
              <span className="etiqueta-campo">Unidad</span>
              <select
                aria-label="Unidad de combustible"
                className="h-10 w-full rounded-md border border-input bg-card px-2 text-sm"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value as "galones" | "litros")}
              >
                <option value="galones">Galones</option>
                <option value="litros">Litros</option>
              </select>
            </label>
            <label className="col-span-2">
              <span className="etiqueta-campo">Valor total pagado (COP)</span>
              <Input
                aria-label="Valor del tanqueo"
                type="number"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </label>
            <label className="col-span-2">
              <span className="etiqueta-campo">KM al momento del tanqueo</span>
              <Input
                aria-label="Kilometraje del tanqueo"
                inputMode="numeric"
                value={kmTanqueo}
                onChange={(e) => setKmTanqueo(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="col-span-2 flex items-center justify-between text-sm">
              Tanque lleno
              <Switch aria-label="Tanque lleno" checked={completo} onCheckedChange={setCompleto} />
            </label>
            <p className="col-span-2 text-sm text-primary">
              Rendimiento estimado:{" "}
              {rendimiento === null
                ? "—"
                : rendimiento.toLocaleString("es-CO", { maximumFractionDigits: 2 })}{" "}
              km / galón
            </p>
          </div>
        ) : null}
      </fieldset>
      {turnos.error || detalles.error ? (
        <p className="mt-2 text-sm text-destructive">
          No se pudieron cargar los registros.{" "}
          <Button
            variant="link"
            onClick={() => {
              void turnos.refetch();
              void detalles.refetch();
            }}
          >
            Reintentar
          </Button>
        </p>
      ) : null}
      <Button
        className="mt-4 w-full"
        disabled={
          bloqueado ||
          kmNumero === null ||
          !fechaHora ||
          (tipo === "llegada" && !salida) ||
          (neto !== null && neto < 0) ||
          turnos.isPending ||
          detalles.isPending ||
          !!turnos.error ||
          !!detalles.error
        }
        onClick={() => setConfirmar(true)}
      >
        {guardar.isPending
          ? "Guardando…"
          : existente || guardar.isSuccess
            ? "Registro guardado"
            : "Guardar registro"}
      </Button>
      <h3 className="mt-4 font-semibold">Últimas jornadas</h3>
      <ul className="mt-2 divide-y divide-border text-xs">
        {(turnos.data ?? []).slice(0, 10).map((t) => {
          const d = detalles.data?.find((v) => v.turno_id === t.id);
          const fuel = combustibleSchema.safeParse(d?.combustible);
          const trips = Array.isArray(d?.trayectos)
            ? d.trayectos
                .map((v) => trayectoSchema.safeParse(v))
                .filter((v) => v.success)
                .map((v) => v.data)
            : [];
          const apertura = turnos.data?.find((v) => v.fecha === t.fecha && v.tipo === "salida");
          const distancia =
            t.tipo === "llegada"
              ? distanciaJornada(apertura?.kilometraje ?? null, t.kilometraje)
              : null;
          const previo = (detalles.data ?? [])
            .filter((v) => v.combustible && v.registrado_en < (d?.registrado_en ?? ""))
            .map((v) => combustibleSchema.safeParse(v.combustible))
            .find((v) => v.success);
          const eficiencia = eficienciaCombustible(
            previo?.success ? previo.data : null,
            fuel.success ? fuel.data : null,
          );
          return (
            <li key={t.id} className="py-2">
              <p>
                {t.fecha} ·{" "}
                {new Date(t.created_at).toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {t.tipo === "salida" ? "Salida" : "Llegada"} ·{" "}
                {t.kilometraje.toLocaleString("es-CO")} km
              </p>
              {distancia !== null ? (
                <p className="mt-1 text-primary">
                  Distancia neta: {distancia.toLocaleString("es-CO")} km
                </p>
              ) : null}
              {trips.map((v, i) => (
                <p className="mt-1 break-words text-muted-foreground" key={i}>
                  {v.origen} → {v.destino}: {v.km} km
                </p>
              ))}
              {fuel.success ? (
                <p className="mt-1 text-muted-foreground">
                  Tanqueo: {fuel.data.volumen} {fuel.data.unidad} · {moneda(fuel.data.valor)} ·{" "}
                  {fuel.data.kilometraje} km{fuel.data.completo ? " · Lleno" : " · Parcial"}
                  {eficiencia !== null ? ` · ${eficiencia.toFixed(2)} km/galón` : ""}
                </p>
              ) : null}
            </li>
          );
        })}
        {turnos.data?.length === 0 ? (
          <li className="py-2 text-muted-foreground">Sin jornadas registradas.</li>
        ) : null}
      </ul>
      <ModalConfirmacion
        abierto={confirmar}
        titulo="Guardar jornada"
        descripcion={`${tipo === "salida" ? "Salida" : "Llegada"} del ${fecha} a las ${fechaHora.slice(11)} · ${km} km${trayectos.length ? ` · ${trayectos.length} trayecto(s)` : ""}${tanqueo ? " · con tanqueo" : ""}`}
        textoConfirmar="Guardar"
        onCancelar={() => setConfirmar(false)}
        onConfirmar={async () => {
          try {
            await guardar.mutateAsync();
          } catch {
            /* La mutación muestra el error. */
          }
        }}
      />
      <ModalConfirmacion
        abierto={quitar !== null}
        titulo="Quitar trayecto"
        descripcion="Se quitará el trayecto pendiente de esta jornada."
        destructivo
        textoConfirmar="Quitar"
        onCancelar={() => setQuitar(null)}
        onConfirmar={() => {
          setTrayectos((v) => v.filter((_, i) => i !== quitar));
          setQuitar(null);
        }}
      />
    </section>
  );
}
