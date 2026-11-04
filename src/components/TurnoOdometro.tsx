import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Droplets, Route as RutaIcono } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { vidaAceite } from "@/lib/aceite";
import type { Mantenimiento, Vehiculo } from "@/lib/datos";
import { scanOdometer } from "@/lib/odometro.functions";

function aBase64(archivo: File): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = mal;
    r.readAsDataURL(archivo);
  });
}

const hoy = () => new Date().toLocaleDateString("en-CA");

export function TurnoOdometro({
  vehiculo,
  mantenimientos,
}: {
  vehiculo: Vehiculo;
  mantenimientos: Mantenimiento[];
}) {
  const qc = useQueryClient();
  const escanear = useServerFn(scanOdometer);
  const camara = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<"salida" | "llegada">("salida");
  const [km, setKm] = useState("");
  const [confianza, setConfianza] = useState<number | null>(null);
  const [leyendo, setLeyendo] = useState(false);

  const turnos = useQuery({
    queryKey: ["turnos", vehiculo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_turno")
        .select("*")
        .eq("vehiculo_id", vehiculo.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
  const config = useQuery({
    queryKey: ["config_aceite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_aceite").select("*").order("km_vida");
      if (error) throw error;
      return data;
    },
  });

  const salidaHoy = (turnos.data ?? []).find((t) => t.tipo === "salida" && t.fecha === hoy());
  const llegadaHoy = (turnos.data ?? []).find((t) => t.tipo === "llegada" && t.fecha === hoy());
  const kmNum = Number(km);
  const recorridoHoy =
    tipo === "llegada" && salidaHoy && kmNum > 0 ? kmNum - salidaHoy.kilometraje : null;

  const guardar = useMutation({
    mutationFn: async () => {
      if (!kmNum || kmNum <= 0) throw new Error("Ingresa un kilometraje válido");
      const { error } = await supabase.from("registros_turno").insert({
        vehiculo_id: vehiculo.id,
        placa: vehiculo.placa,
        tipo,
        fecha: hoy(),
        kilometraje: Math.round(kmNum),
        confianza,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(tipo === "salida" ? "Salida registrada" : "Llegada registrada");
      setKm("");
      setConfianza(null);
      await qc.invalidateQueries({ queryKey: ["turnos", vehiculo.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  async function alCapturar(archivo?: File) {
    if (!archivo) return;
    setLeyendo(true);
    try {
      const r = await escanear({
        data: { base64: await aBase64(archivo), mimeType: archivo.type || "image/jpeg" },
      });
      setKm(String(r.mileage));
      setConfianza(r.confidence);
      toast.success(`Odómetro leído: ${r.mileage.toLocaleString("es-CO")} km`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer la foto");
    } finally {
      setLeyendo(false);
      if (camara.current) camara.current.value = "";
    }
  }

  // ---- Recomendador de aceite ----
  const claveLocal = `aceite:${vehiculo.id}`;
  const [marcaAceite, setMarcaAceite] = useState("");
  const [tipoAceite, setTipoAceite] = useState("Semisintético");
  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem(claveLocal) ?? "{}") as {
        marca?: string;
        tipo?: string;
      };
      if (g.marca) setMarcaAceite(g.marca);
      if (g.tipo) setTipoAceite(g.tipo);
    } catch {
      /* sin datos */
    }
  }, [claveLocal]);
  useEffect(() => {
    localStorage.setItem(claveLocal, JSON.stringify({ marca: marcaAceite, tipo: tipoAceite }));
  }, [claveLocal, marcaAceite, tipoAceite]);

  const ultimoCambio = mantenimientos.find((m) =>
    m.tipos_servicio.includes("Cambio de Aceite de Motor"),
  );
  const kmActual = Math.max(
    turnos.data?.[0]?.kilometraje ?? 0,
    mantenimientos[0]?.kilometraje ?? 0,
  );
  const cfg = (config.data ?? []).find((c) => c.tipo === tipoAceite);
  const vida =
    ultimoCambio && cfg
      ? vidaAceite({
          kmActual,
          kmUltimoCambio: ultimoCambio.kilometraje,
          kmVida: cfg.km_vida,
          kmAlerta: cfg.km_alerta,
        })
      : null;

  return (
    <>
      <section className="panel p-4">
        <h2 className="flex items-center gap-2 font-display text-xl uppercase">
          <RutaIcono className="size-5 text-primary" /> Registro de ruta / turno diario
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["salida", "llegada"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={tipo === t ? "default" : "outline"}
              onClick={() => setTipo(t)}
            >
              {t === "salida" ? "Salida (Mañana)" : "Llegada (Noche)"}
            </Button>
          ))}
        </div>
        <input
          ref={camara}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => alCapturar(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          disabled={leyendo}
          onClick={() => camara.current?.click()}
        >
          <Camera className="size-4" /> {leyendo ? "Leyendo odómetro…" : "Capturar Odómetro"}
        </Button>
        <label className="mt-3 block">
          <span className="etiqueta-campo">Kilometraje (puedes corregirlo)</span>
          <Input
            inputMode="numeric"
            value={km}
            onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 15230"
          />
        </label>
        {confianza !== null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Confianza de la lectura: {Math.round(confianza * 100)}%
          </p>
        ) : null}
        {tipo === "llegada" ? (
          <p className="mt-2 font-display text-lg text-primary">
            {salidaHoy
              ? recorridoHoy !== null
                ? `Recorrido hoy: ${recorridoHoy.toLocaleString("es-CO")} km`
                : `Salida de hoy: ${salidaHoy.kilometraje.toLocaleString("es-CO")} km`
              : "Aún no hay salida registrada hoy"}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-3 w-full"
          disabled={guardar.isPending || !km}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? "Guardando…" : "Guardar registro"}
        </Button>
        {salidaHoy && llegadaHoy ? (
          <p className="mt-2 text-sm">
            Hoy: {(llegadaHoy.kilometraje - salidaHoy.kilometraje).toLocaleString("es-CO")} km
            recorridos
          </p>
        ) : null}
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {(turnos.data ?? []).slice(0, 6).map((t) => (
            <li key={t.id}>
              {t.fecha} · {t.tipo === "salida" ? "Salida" : "Llegada"} ·{" "}
              {t.kilometraje.toLocaleString("es-CO")} km
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="flex items-center gap-2 font-display text-xl uppercase">
          <Droplets className="size-5 text-primary" /> Vida útil del aceite
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input
            value={marcaAceite}
            onChange={(e) => setMarcaAceite(e.target.value)}
            placeholder="Marca de aceite"
          />
          <select
            className="h-10 rounded-md border border-input bg-card px-2 text-sm"
            value={tipoAceite}
            onChange={(e) => setTipoAceite(e.target.value)}
          >
            {(config.data ?? []).map((c) => (
              <option key={c.tipo} value={c.tipo}>
                {c.tipo} ({c.km_vida.toLocaleString("es-CO")} km)
              </option>
            ))}
          </select>
        </div>
        {vida ? (
          <div className="mt-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full ${vida.alerta ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${vida.porcentaje}%` }}
              />
            </div>
            <p className={`mt-2 text-sm ${vida.alerta ? "font-semibold text-destructive" : ""}`}>
              {vida.porcentaje}% restante · {vida.recorrido.toLocaleString("es-CO")} km desde el
              último cambio ({ultimoCambio?.kilometraje.toLocaleString("es-CO")} km) ·{" "}
              {vida.restante > 0
                ? `faltan ${vida.restante.toLocaleString("es-CO")} km`
                : `excedido por ${Math.abs(vida.restante).toLocaleString("es-CO")} km`}
            </p>
            {vida.alerta ? (
              <p className="mt-1 text-sm font-bold text-destructive">
                ¡Alerta! Cambio de aceite inminente{marcaAceite ? ` (${marcaAceite})` : ""}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Registra un mantenimiento de “Cambio de Aceite de Motor” para comparar.
          </p>
        )}
      </section>
    </>
  );
}
