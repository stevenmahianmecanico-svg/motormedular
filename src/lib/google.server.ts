/**
 * Conexiones directas y nativas a las APIs de Google Drive y Google Calendar
 * a traves del gateway de conexiones de Lovable (sin webhooks ni intermediarios).
 * Server-only: nunca importar desde el navegador.
 */

const GATEWAY = "https://connector-gateway.lovable.dev";

function gatewayHeaders(connectorKeyEnv: string): Record<string, string> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env[connectorKeyEnv];
  if (!lovableKey) throw new Error("Falta LOVABLE_API_KEY en el servidor");
  if (!connectionKey) throw new Error(`Falta ${connectorKeyEnv}: conecta la cuenta de Google`);
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
  };
}

async function callGoogle(
  connector: "google_drive" | "google_calendar",
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const envName = connector === "google_drive" ? "GOOGLE_DRIVE_API_KEY" : "GOOGLE_CALENDAR_API_KEY";
  const response = await fetch(`${GATEWAY}/${connector}${path}`, {
    ...init,
    headers: {
      ...gatewayHeaders(envName),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`[${connector}] ${response.status}: ${text}`);
    throw new Error(`Google ${connector} respondio ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

/* ------------------------------- Google Drive ------------------------------ */

type DriveFile = { id: string; name?: string; webViewLink?: string };
type DriveList = { files?: DriveFile[] };

async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const escaped = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const query = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${escaped}'${parentClause}`,
  );
  const found = (await callGoogle(
    "google_drive",
    `/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,
  )) as DriveList;
  const existing = found.files?.[0];
  if (existing?.id) return existing.id;

  const created = (await callGoogle("google_drive", "/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  })) as DriveFile;
  return created.id;
}

/** Estructura obligatoria: /Mantenimientos/PLACA_VEHICULO/ */
export async function ensurePlacaFolder(placa: string): Promise<string> {
  const root = await findOrCreateFolder("Mantenimientos");
  return findOrCreateFolder(placa.toUpperCase(), root);
}

function multipartBody(
  metadata: Record<string, unknown>,
  mimeType: string,
  base64: string,
): { body: string; boundary: string } {
  const boundary = `lovable${Math.random().toString(36).slice(2)}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n` +
    `${base64}\r\n--${boundary}--`;
  return { body, boundary };
}

export type SubidaDrive = { nombre: string; url: string; id: string };

/** Sube archivos directamente a Google Drive y devuelve enlaces publicos. */
export async function uploadFilesToDrive(
  placa: string,
  archivos: Array<{ nombre: string; mimeType: string; base64: string }>,
): Promise<{ folderId: string; folderUrl: string; archivos: SubidaDrive[] }> {
  const folderId = await ensurePlacaFolder(placa);
  const subidas: SubidaDrive[] = [];

  for (const archivo of archivos) {
    const { body, boundary } = multipartBody(
      { name: archivo.nombre, parents: [folderId] },
      archivo.mimeType || "application/octet-stream",
      archivo.base64,
    );
    const file = (await callGoogle(
      "google_drive",
      "/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    )) as DriveFile;

    // Enlace publico para poder inyectarlo en la descripcion del evento de Calendar.
    await callGoogle("google_drive", `/drive/v3/files/${file.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }).catch((error: unknown) => {
      console.error("No se pudo hacer publico el archivo de Drive", error);
    });

    subidas.push({
      nombre: file.name ?? archivo.nombre,
      id: file.id,
      url: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
    });
  }

  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
    archivos: subidas,
  };
}

/* ------------------------------ Google Calendar --------------------------- */

type CalendarEvent = { id: string; htmlLink?: string };

export type EventoInput = {
  titulo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD (evento de dia completo)
  emailCliente: string;
  eventId?: string | null;
};

function eventBody(input: EventoInput) {
  const fin = new Date(`${input.fecha}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return {
    summary: input.titulo,
    description: input.descripcion,
    start: { date: input.fecha },
    end: { date: fin.toISOString().slice(0, 10) },
    attendees: input.emailCliente ? [{ email: input.emailCliente }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 60 },
      ],
    },
  };
}

/** Crea o actualiza el evento notificando al cliente de inmediato (sendUpdates=all). */
export async function upsertCalendarEvent(
  input: EventoInput,
): Promise<{ eventId: string; htmlLink: string }> {
  const base = "/calendar/v3/calendars/primary/events";
  const payload = JSON.stringify(eventBody(input));
  const evento = (await callGoogle(
    "google_calendar",
    input.eventId
      ? `${base}/${encodeURIComponent(input.eventId)}?sendUpdates=all`
      : `${base}?sendUpdates=all`,
    {
      method: input.eventId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    },
  )) as CalendarEvent;

  return {
    eventId: evento.id,
    htmlLink: evento.htmlLink ?? "https://calendar.google.com",
  };
}

/** Borrado fisico del evento en tu calendario y en el del cliente. */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await callGoogle(
    "google_calendar",
    `/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE" },
  );
}
