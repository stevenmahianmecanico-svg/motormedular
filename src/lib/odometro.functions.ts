import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROMPT =
  'Eres un extractor OCR especializado en tableros de instrumentos de motocicletas. Analiza la imagen y extrae el kilometraje total acumulado, ya sea en odómetro análogo de tambor o pantalla digital. Ignora los parciales (Trip A / Trip B) y las marcas de velocidad (km/h). Responde estrictamente en formato JSON: { "mileage": number, "confidence": number }';

function parsear(texto: string): { mileage: number; confidence: number } {
  const limpio = texto.replace(/```json|```/g, "").trim();
  const json = JSON.parse(limpio.slice(limpio.indexOf("{"), limpio.lastIndexOf("}") + 1)) as {
    mileage?: unknown;
    confidence?: unknown;
  };
  const mileage = Math.round(Number(String(json.mileage ?? "").replace(/[^\d.]/g, "")));
  if (!Number.isFinite(mileage) || mileage <= 0) throw new Error("No se pudo leer el odómetro");
  const c = Number(json.confidence ?? 0);
  return { mileage, confidence: c > 1 ? c / 100 : c };
}

/** scan-odometer: lee el kilometraje total desde una foto del tablero. */
export const scanOdometer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ base64: z.string().min(10), mimeType: z.string().max(120).default("image/jpeg") })
      .parse(input),
  )
  .handler(async ({ data }) => {
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
                  { inline_data: { mime_type: data.mimeType, data: data.base64 } },
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      const t = await r.text();
      if (!r.ok) {
        console.error(`[scan-odometer] Gemini ${r.status}: ${t}`);
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
                { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.base64}` } },
              ],
            },
          ],
        }),
      });
      const t = await r.text();
      if (!r.ok) {
        console.error(`[scan-odometer] ${r.status}: ${t}`);
        if (r.status === 429) throw new Error("Límite de uso de IA alcanzado, intenta más tarde");
        if (r.status === 402) throw new Error("Se agotaron los créditos de IA del proyecto");
        throw new Error(`La IA respondió ${r.status}`);
      }
      texto =
        (JSON.parse(t) as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]
          ?.message?.content ?? "";
    }
    try {
      return parsear(texto);
    } catch {
      throw new Error("No se pudo leer el odómetro, intenta con otra foto o escríbelo manualmente");
    }
  });
