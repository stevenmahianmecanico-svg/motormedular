import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { jornadaSchema } from "@/lib/jornadas";

export const guardarJornada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => jornadaSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (new Date(data.fechaHora).getTime() > Date.now() + 300000)
      throw new Error("La jornada no puede estar en el futuro");
    const { data: id, error } = await context.supabase.rpc("guardar_jornada", {
      p_id: data.id,
      p_vehiculo: data.vehiculoId,
      p_tipo: data.tipo,
      p_fecha: data.fecha,
      p_instante: data.fechaHora,
      p_km: data.kilometraje,
      ...(data.confianza !== null ? { p_confianza: data.confianza } : {}),
      p_trayectos: data.trayectos,
      ...(data.combustible ? { p_combustible: data.combustible } : {}),
    });
    if (error) throw new Error(error.message);
    return { id };
  });
