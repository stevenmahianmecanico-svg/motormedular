import { useQuery } from "@tanstack/react-query";
import { Droplets } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { vidaAceite } from "@/lib/aceite";
import type { Mantenimiento, Vehiculo } from "@/lib/datos";
import { RegistroJornada } from "@/components/RegistroJornada";

export function TurnoOdometro({
  vehiculo,
  mantenimientos,
}: {
  vehiculo: Vehiculo;
  mantenimientos: Mantenimiento[];
}) {
  const turnos = useQuery({
    queryKey: ["turnos", vehiculo.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_turno")
        .select("*")
        .eq("vehiculo_id", vehiculo.id)
        .order("fecha", { ascending: false })
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
      <RegistroJornada vehiculo={vehiculo} />

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
