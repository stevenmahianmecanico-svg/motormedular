import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROMPT =
  'Eres un extractor OCR de odómetros de motos y carros, facturas y recibos escaneados. Extrae el kilometraje total acumulado. Ignora Trip A/B, velocidad km/h, importes y números de factura. Examina todas las imágenes del documento. Nunca inventes un kilometraje: si no es legible devuelve mileage:null. Extrae documentDate solo si hay fecha y hora explícitas con formato YYYY-MM-DDTHH:mm, o null. No confundas la fecha de factura con fecha de captura. Responde estrictamente JSON: { "mileage": number|null, "confidence": number, "documentDate": string|null }';

function parsear(texto: string): {
  mileage: number;
  confidence: number;
  documentDate: string | null;
} {
  const limpio = texto.replace(/```json|```/g, "").trim();
  const json = JSON.parse(limpio.slice(limpio.indexOf("{"), limpio.lastIndexOf("}") + 1)) as {
    mileage?: unknown;
    confidence?: unknown;
    documentDate?: unknown;
  };
  if (json.mileage === null || json.mileage === undefined || json.mileage === "")
    throw new Error("No se pudo leer el odómetro");
  const mileage = Math.round(Number(json.mileage));
  if (!Number.isFinite(mileage) || mileage < 0) throw new Error("No se pudo leer el odómetro");
  const c = Number(json.confidence ?? 0);
  return {
    mileage,
    confidence: Number.isFinite(c) ? Math.max(0, Math.min(1, c > 1 ? c / 100 : c)) : 0,
    documentDate:
      typeof json.documentDate === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(json.documentDate)
        ? json.documentDate
        : null,
  };
}

/** scan-odometer: lee el kilometraje total desde una foto del tablero. */
export const scanOdometer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        images: z
          .array(
            z.object({
              base64: z
                .string()
                .min(10)
                .max(22000000)
                .regex(/^[A-Za-z0-9+/=]+$/),
              mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
            }),
          )
          .min(1)
          .max(10),
      })
      .refine(
        (v) => v.images.reduce((n, i) => n + i.base64.length, 0) <= 28000000,
        "El documento es demasiado grande",
      )
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: bloqueo, error: errorEstado } = await context.supabase
      .from("odometro_estado_ia")
      .select("motivo")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (errorEstado) throw new Error("No se pudo comprobar el acceso a la lectura");
    if (bloqueo) throw new Error(bloqueo.motivo);
    async function detener(motivo: string) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("odometro_estado_ia")
        .upsert({ user_id: context.userId, motivo });
      if (error)
        throw new Error("La lectura está bloqueada; no se pudo registrar el estado de acceso");
    }
    const gemini = process.env["GEMINI_API_KEY"];
    let texto = "";
    if (gemini) {
      // gemini-1.5-flash fue retirado por Google; se usa su sucesor directo.
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": gemini },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: PROMPT }] },
            contents: [
              {
                parts: [
                  { text: "Extrae el kilometraje total." },
                  ...data.images.map((image) => ({
                    inline_data: { mime_type: image.mimeType, data: image.base64 },
                  })),
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      const t = await r.text();
      if (!r.ok) {
        if (r.status === 403)
          await detener(
            "Google ha denegado el acceso a la lectura de odómetros. Restablece el acceso antes de volver a capturar.",
          );
        throw new Error(`Gemini respondió ${r.status}`);
      }
      const j = JSON.parse(t) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      texto = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      const clave = process.env["LOVABLE_API_KEY"];
      if (!clave) throw new Error("Falta la clave de IA en el servidor");
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": clave },
        body: JSON.stringify({
          model: "google/gemini-3.8-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Extrae el kilometraje total en json." },
                ...data.images.map((image) => ({
                  type: "image_url",
                  image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
                })),
              ],
            },
          ],
        }),
      });
      const t = await r.text();
      if (!r.ok) {
        let mensaje = `La IA respondió ${r.status}`;
        let tipo = "";
        try {
          const error = JSON.parse(t) as {
            message?: string;
            error?: { message?: string; type?: string };
            type?: string;
          };
          mensaje = error.message ?? error.error?.message ?? mensaje;
          tipo = error.type ?? error.error?.type ?? "";
        } catch {
          /* No se muestran cuerpos de error sin formato. */
        }
        if (
          r.status === 403 &&
          ![
            "credit_limit_reached",
            "model_requires_retention_consent",
            "model_vendor_not_enabled",
            "provider_not_available_in_region",
          ].includes(tipo)
        )
          await detener(mensaje);
        throw new Error(mensaje);
      }
      const respuesta = JSON.parse(t) as {
        choices?: Array<{ message?: { content?: string; refusal?: string } }>;
      };
      const message = respuesta.choices?.[0]?.message;
      if (message?.refusal || !message?.content)
        throw new Error(
          message?.refusal ||
            "La IA no pudo analizar este archivo. El kilometraje sigue disponible para ingreso manual.",
        );
      texto = message.content;
    }
    try {
      return parsear(texto);
    } catch {
      throw new Error("No se pudo extraer un kilometraje válido. Escríbelo manualmente.");
    }
  });
