import { archivoABase64 } from "@/lib/formato";
import { fechaHoraLocal } from "@/lib/jornadas";

export const TIPOS_OCR = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export async function prepararCaptura(archivo: File) {
  const mime =
    archivo.type ||
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      pdf: "application/pdf",
    }[archivo.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!TIPOS_OCR.some((t) => t === mime))
    throw new Error("Selecciona un archivo JPG, PNG, WEBP o PDF");
  if (!archivo.size) throw new Error("El archivo está vacío");
  if (archivo.size > 15 * 1024 * 1024) throw new Error("El archivo supera 15 MB");
  let fechaCaptura: string | null = null;
  if (mime !== "application/pdf") {
    const { parse } = await import("exifr");
    try {
      const exif = await parse(archivo, ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal"]);
      const date = exif?.DateTimeOriginal ?? exif?.CreateDate;
      if (date instanceof Date && Number.isFinite(date.getTime()))
        fechaCaptura = fechaHoraLocal(date);
    } catch {
      /* Fecha manual cuando no hay EXIF. */
    }
    return { images: [{ base64: await archivoABase64(archivo), mimeType: mime }], fechaCaptura };
  }
  // El modelo actual admite imágenes: el PDF se renderiza en memoria, nunca se sube ni se guarda.
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const loading = pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) });
  const doc = await loading.promise;
  try {
    if (doc.numPages > 10) throw new Error("Selecciona un PDF de hasta 10 páginas");
    const images: Array<{ base64: string; mimeType: string }> = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: Math.min(2, 1600 / Math.max(base.width, base.height)),
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo leer el PDF");
      try {
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        images.push({
          base64: canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "",
          mimeType: "image/jpeg",
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
    return { images, fechaCaptura };
  } finally {
    await loading.destroy();
  }
}
