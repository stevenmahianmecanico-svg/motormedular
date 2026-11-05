import { z } from "zod";

export const LITROS_POR_GALON = 3.785411784;
export const trayectoSchema = z.object({ origen: z.string().trim().min(1).max(200), destino: z.string().trim().min(1).max(200), km: z.number().positive().finite() });
export const combustibleSchema = z.object({ volumen: z.number().positive().finite(), unidad: z.enum(["galones", "litros"]), valor: z.number().nonnegative().finite(), kilometraje: z.number().int().nonnegative(), completo: z.boolean() });
export const jornadaSchema = z.object({
  id: z.string().uuid(), vehiculoId: z.string().uuid(), tipo: z.enum(["salida", "llegada"]),
  fechaHora: z.string().datetime({ offset: true }), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kilometraje: z.number().int().nonnegative(), confianza: z.number().min(0).max(1).nullable(),
  trayectos: z.array(trayectoSchema).max(50), combustible: combustibleSchema.nullable(),
});
export type Combustible = z.infer<typeof combustibleSchema>;
export type Trayecto = z.infer<typeof trayectoSchema>;
export type RegistroTurno = { id: string; fecha: string; tipo: string; kilometraje: number; created_at: string };

export function fechaHoraLocal(fecha: Date) {
  const p = (v: number) => String(v).padStart(2, "0");
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}T${p(fecha.getHours())}:${p(fecha.getMinutes())}`;
}
export function sugerirApertura(turnos: RegistroTurno[], fecha: string): number | null {
  return [...turnos].filter(t => t.tipo === "llegada" && t.fecha < fecha)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))[0]?.kilometraje ?? null;
}
export function distanciaJornada(apertura: number | null, cierre: number | null): number | null {
  if (apertura === null || cierre === null) return null;
  return cierre - apertura;
}
export function eficienciaCombustible(anterior: Combustible | null, actual: Combustible | null): number | null {
  if (!anterior?.completo || !actual?.completo || actual.volumen <= 0 || actual.kilometraje <= anterior.kilometraje) return null;
  const galones = actual.unidad === "litros" ? actual.volumen / LITROS_POR_GALON : actual.volumen;
  return (actual.kilometraje - anterior.kilometraje) / galones;
}