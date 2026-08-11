import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODELO = "google/gemini-3.6-flash";

type RespuestaIA = { choices?: Array<{ message?: { content?: string } }> };

async function llamarIA(body: Record<string, unknown>): Promise<string> {
  const clave = process.env["LOVABLE_API_KEY"];
  if (!clave) throw new Error("Falta LOVABLE_API_KEY en el servidor");

  const respuesta = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": clave },
    body: JSON.stringify({ model: MODELO, ...body }),
  });
  const texto = await respuesta.text();
  if (!respuesta.ok) {
    console.error(`[IA] ${respuesta.status}: ${texto}`);
    if (respuesta.status === 429) throw new Error("Límite de uso de IA alcanzado, intenta más tarde");
    if (respuesta.status === 402) throw new Error("Se agotaron los créditos de IA del proyecto");
    throw new Error(`La IA respondió ${respuesta.status}`);
  }
  const json = JSON.parse(texto) as RespuestaIA;
  return json.choices?.[0]?.message?.content ?? "";
}

const imagenSchema = z.object({
  base64: z.string().min(10),
  mimeType: z.string().max(120).default("image/jpeg"),
});

/** OCR con Vision AI de la licencia de tránsito / tarjeta de propiedad o licencia de conducción. */
export const extraerDatosLicencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => imagenSchema.parse(input))
  .handler(async ({ data }) => {
    const contenido = await llamarIA({
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en lectura de documentos vehiculares colombianos (licencia de tránsito, tarjeta de propiedad y licencia de conducción). Devuelve SOLO un objeto JSON con las claves: placa, tipo_vehiculo, marca, modelo_ano, cilindrada, color, numero_chasis, numero_motor, tipo_carroceria, tipo_combustible, fecha_matricula (YYYY-MM-DD), organismo_transito, nombre_completo, tipo_documento (CC, CE, PA o NIT), numero_documento, licencia_categorias, licencia_vencimiento (YYYY-MM-DD). Usa cadena vacía cuando el dato no aparezca. Conserva espacios y tildes en los nombres.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrae los datos de este documento vehicular." },
            {
              type: "image_url",
              image_url: { url: `data:${data.mimeType};base64,${data.base64}` },
            },
          ],
        },
      ],
    });

    try {
      return JSON.parse(contenido) as Record<string, string>;
    } catch {
      throw new Error("La IA no devolvió datos legibles, intenta con otra fotografía");
    }
  });

/** Asistente técnico de lubricación: analiza el envase del producto y el vehículo. */
export const recomendarLubricacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        pregunta: z.string().max(600).default(""),
        vehiculo: z.string().max(400),
        servicios: z.string().max(600).default(""),
        producto: z.string().max(200).default(""),
        cantidad: z.string().max(60).default(""),
        imagen: imagenSchema.nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const texto = [
      `Vehículo: ${data.vehiculo}.`,
      data.servicios ? `Servicios en ejecución: ${data.servicios}.` : "",
      data.producto ? `Producto declarado: ${data.producto}.` : "",
      data.cantidad ? `Cantidad utilizada: ${data.cantidad}.` : "",
      data.pregunta ? `Consulta del técnico: ${data.pregunta}` : "",
      "Indica si el lubricante y la cantidad son adecuados, la viscosidad y especificación API/JASO recomendada, y el intervalo de cambio sugerido.",
    ]
      .filter(Boolean)
      .join("\n");

    const contenido: Array<Record<string, unknown>> = [{ type: "text", text: texto }];
    if (data.imagen) {
      contenido.push({
        type: "image_url",
        image_url: { url: `data:${data.imagen.mimeType};base64,${data.imagen.base64}` },
      });
    }

    const respuesta = await llamarIA({
      messages: [
        {
          role: "system",
          content:
            "Eres un ingeniero mecánico especialista en lubricación de motocicletas y automóviles. Responde en español, en menos de 180 palabras, con viñetas concretas: idoneidad del producto, viscosidad y especificación recomendada (API/JASO/ACEA), cantidad correcta en litros y próximo intervalo. Si la información es insuficiente, dilo y pide el dato faltante.",
        },
        { role: "user", content: contenido },
      ],
    });

    return { respuesta };
  });
