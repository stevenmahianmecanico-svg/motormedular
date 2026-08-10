/** Motor de telemetria y control predictivo de kilometraje (calculo local). */

export type RegistroKm = { fecha_servicio: string; kilometraje: number };

export type Proyecciones = {
  kmPorDia: number | null;
  kmSemana: number | null;
  kmMes: number | null;
  kmAno: number | null;
};

export function diasEntre(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`).getTime();
  const b = new Date(`${hasta}T00:00:00`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

/** Compara el registro actual con el inmediatamente anterior de la misma placa. */
export function calcularKmPorDia(actual: RegistroKm, anterior?: RegistroKm | null): number | null {
  if (!anterior) return null;
  const dias = diasEntre(anterior.fecha_servicio, actual.fecha_servicio);
  const deltaKm = actual.kilometraje - anterior.kilometraje;
  if (deltaKm <= 0) return null;
  return Number((deltaKm / dias).toFixed(2));
}

export function proyecciones(kmPorDia: number | null): Proyecciones {
  if (!kmPorDia || kmPorDia <= 0) {
    return { kmPorDia: null, kmSemana: null, kmMes: null, kmAno: null };
  }
  return {
    kmPorDia,
    kmSemana: Math.round(kmPorDia * 7),
    kmMes: Math.round(kmPorDia * 30),
    kmAno: Math.round(kmPorDia * 365),
  };
}

export function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00`);
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
}

export function sumarMeses(fecha: string, meses: number): string {
  const base = new Date(`${fecha}T00:00:00`);
  base.setMonth(base.getMonth() + meses);
  return base.toISOString().slice(0, 10);
}

/**
 * Elige el limite que ocurra primero: vencimiento por tiempo o el
 * kilometraje proyectado con el promedio de consumo diario.
 */
export function proximoServicio(params: {
  fechaServicio: string;
  kilometraje: number;
  kmIntervalo: number;
  mesesIntervalo: number;
  kmPorDia: number | null;
}): { proximoKm: number; proximaFecha: string; motivo: "kilometraje" | "tiempo" } {
  const proximoKm = params.kilometraje + params.kmIntervalo;
  const fechaTiempo = sumarMeses(params.fechaServicio, params.mesesIntervalo);
  if (!params.kmPorDia || params.kmPorDia <= 0) {
    return { proximoKm, proximaFecha: fechaTiempo, motivo: "tiempo" };
  }
  const diasProyectados = Math.max(1, Math.round(params.kmIntervalo / params.kmPorDia));
  const fechaKm = sumarDias(params.fechaServicio, diasProyectados);
  const usaKm = fechaKm < fechaTiempo;
  return {
    proximoKm,
    proximaFecha: usaKm ? fechaKm : fechaTiempo,
    motivo: usaKm ? "kilometraje" : "tiempo",
  };
}

export type EstadoVigencia = "vigente" | "por_vencer" | "vencido";

export function estadoVencimiento(fechaVencimiento: string): {
  estado: EstadoVigencia;
  dias: number;
} {
  const hoy = new Date().toISOString().slice(0, 10);
  const dias = Math.round(
    (new Date(`${fechaVencimiento}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()) /
      86_400_000,
  );
  if (dias < 0) return { estado: "vencido", dias };
  if (dias <= 30) return { estado: "por_vencer", dias };
  return { estado: "vigente", dias };
}
