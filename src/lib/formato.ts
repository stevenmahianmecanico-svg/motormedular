/** Utilidades de formato de cadenas y colecciones estructuradas. */

export function limpiarTexto(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Empaqueta colecciones en arreglos limpios: preserva los espacios internos
 * ("Yuli Murillo", "Conjunto Residencial") y elimina vacios/duplicados.
 */
export function arregloLimpio(valores: Array<string | null | undefined>): string[] {
  const limpio = valores.map(limpiarTexto).filter((v) => v.length > 0);
  return Array.from(new Set(limpio));
}

/** Representacion legible entre corchetes: ["Aceite de Motor", "Frenos"] */
export function formatoCorchetes(valores: Array<string | null | undefined>): string {
  return JSON.stringify(arregloLimpio(valores));
}

export function listaLegible(valores: Array<string | null | undefined>): string {
  const arr = arregloLimpio(valores);
  return arr.length ? arr.join(", ") : "—";
}

export function moneda(valor: number | null | undefined): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor ?? 0);
}

export function fechaLegible(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(`${fecha}T00:00:00`),
  );
}

export function normalizarPlaca(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export function coincide(consulta: string, ...campos: Array<string | null | undefined>): boolean {
  const q = limpiarTexto(consulta).toLowerCase();
  if (!q) return true;
  return campos.some((campo) => (campo ?? "").toLowerCase().includes(q));
}

export function archivoABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function enlaceWhatsapp(celular: string, mensaje: string): string {
  const numero = (celular ?? "").replace(/[^0-9]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function enlaceCorreo(email: string, asunto: string, cuerpo: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
