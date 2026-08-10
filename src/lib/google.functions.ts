import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const archivoSchema = z.object({
  nombre: z.string().min(1).max(200),
  mimeType: z.string().max(120),
  base64: z.string().min(1),
});

export const subirEvidenciaDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        placa: z.string().min(3).max(10),
        archivos: z.array(archivoSchema).min(1).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { uploadFilesToDrive } = await import("./google.server");
    return uploadFilesToDrive(data.placa, data.archivos);
  });

export const guardarEventoCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        titulo: z.string().min(3).max(300),
        descripcion: z.string().max(6000).default(""),
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        emailCliente: z.string().email().max(255),
        eventId: z.string().max(300).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { upsertCalendarEvent } = await import("./google.server");
    return upsertCalendarEvent(data);
  });

export const eliminarEventoCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ eventId: z.string().min(3).max(300) }).parse(input))
  .handler(async ({ data }) => {
    const { deleteCalendarEvent } = await import("./google.server");
    await deleteCalendarEvent(data.eventId);
    return { ok: true };
  });
