/** Cálculo de vida útil del aceite (solo comparación y análisis). */
export function vidaAceite(params: {
  kmActual: number;
  kmUltimoCambio: number;
  kmVida: number;
  kmAlerta: number;
}) {
  const recorrido = Math.max(0, params.kmActual - params.kmUltimoCambio);
  const restante = params.kmVida - recorrido;
  const porcentaje = Math.max(0, Math.min(100, Math.round((restante / params.kmVida) * 100)));
  return { recorrido, restante, porcentaje, alerta: restante < params.kmAlerta };
}
