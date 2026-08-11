/**
 * Enlaces de renderizado directo para archivos de Google Drive.
 * El enlace de administración (`/file/d/ID/view` o `/drive/folders/ID`) NO sirve
 * dentro de una etiqueta <img>: hay que usar el ID y el stream público.
 */

export function idDeDrive(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const texto = valor.trim();
  if (!texto) return null;
  if (!texto.includes("/") && !texto.includes("?")) return texto;
  const patrones = [/\/file\/d\/([\w-]{10,})/, /[?&]id=([\w-]{10,})/, /\/d\/([\w-]{10,})/];
  for (const patron of patrones) {
    const encontrado = texto.match(patron);
    if (encontrado?.[1]) return encontrado[1];
  }
  return null;
}

/** Enlace público de renderizado directo (válido en <img src>). */
export function enlaceDirectoDrive(valor: string | null | undefined, ancho = 1600): string | null {
  const id = idDeDrive(valor);
  if (!id) return valor && /^https?:\/\//.test(valor) && !valor.includes("drive.google.com") ? valor : null;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${ancho}`;
}

/** Enlace para abrir el archivo individual en Drive (no la carpeta). */
export function enlaceArchivoDrive(valor: string | null | undefined): string | null {
  const id = idDeDrive(valor);
  return id ? `https://drive.google.com/file/d/${id}/view` : (valor ?? null);
}
