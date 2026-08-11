import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CORREO_SUPERUSUARIO = "josemedina4121@gmail.com";

export type Rol = "administrador" | "usuario";
export type EstadoAcceso = "pendiente" | "aprobado" | "rechazado";

export type Acceso = {
  id: string;
  email: string;
  metodo_registro: string;
  estado: EstadoAcceso;
  rol: Rol;
  protegido: boolean;
  created_at: string;
};

function esSuper(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === CORREO_SUPERUSUARIO;
}

/** Crea/normaliza el perfil del usuario autenticado y devuelve su estado y rol. */
export const asegurarAcceso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claims = context.claims as Record<string, unknown>;
    const email = String(claims["email"] ?? "");
    const metadata = (claims["app_metadata"] ?? {}) as Record<string, unknown>;
    const metodo = String(metadata["provider"] ?? "email");
    const superusuario = esSuper(email);

    const { data: existente } = await supabaseAdmin
      .from("perfiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();

    if (!existente) {
      await supabaseAdmin.from("perfiles").insert({
        id: context.userId,
        email,
        metodo_registro: metodo,
        estado: superusuario ? "aprobado" : "pendiente",
      });
    } else if (superusuario && existente.estado !== "aprobado") {
      await supabaseAdmin.from("perfiles").update({ estado: "aprobado" }).eq("id", context.userId);
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: superusuario ? "administrador" : "usuario" },
        { onConflict: "user_id,role" },
      );

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const esAdmin = superusuario || (roles ?? []).some((r) => r.role === "administrador");
    const estado: EstadoAcceso = superusuario
      ? "aprobado"
      : ((existente?.estado ?? "pendiente") as EstadoAcceso);

    return { estado, esAdmin, email, protegido: superusuario };
  });

async function exigirAdministrador(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: perfil } = await supabaseAdmin
    .from("perfiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (esSuper(perfil?.email)) return supabaseAdmin;

  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "administrador")
    .maybeSingle();
  if (!data) throw new Error("Solo un administrador puede realizar esta acción");
  return supabaseAdmin;
}

export const listarAccesos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Acceso[]> => {
    const admin = await exigirAdministrador(context.userId);
    const { data: perfiles, error } = await admin
      .from("perfiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const { data: roles } = await admin.from("user_roles").select("user_id, role");

    return (perfiles ?? []).map((p) => {
      const suyos = (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role);
      const protegido = esSuper(p.email);
      return {
        id: p.id,
        email: p.email,
        metodo_registro: p.metodo_registro,
        estado: p.estado as EstadoAcceso,
        rol: (protegido || suyos.includes("administrador") ? "administrador" : "usuario") as Rol,
        protegido,
        created_at: p.created_at,
      };
    });
  });

export const decidirAcceso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        estado: z.enum(["aprobado", "rechazado", "pendiente"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await exigirAdministrador(context.userId);
    const { data: perfil } = await admin
      .from("perfiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (esSuper(perfil?.email) && data.estado !== "aprobado") {
      throw new Error("El superusuario no puede ser rechazado ni bloqueado");
    }
    const { error } = await admin.from("perfiles").update({ estado: data.estado }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const cambiarRol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), rol: z.enum(["administrador", "usuario"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await exigirAdministrador(context.userId);
    const { data: perfil } = await admin
      .from("perfiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (esSuper(perfil?.email) && data.rol !== "administrador") {
      throw new Error("El superusuario siempre conserva el rol de administrador");
    }

    if (data.rol === "administrador") {
      await admin
        .from("user_roles")
        .upsert({ user_id: data.id, role: "administrador" }, { onConflict: "user_id,role" });
    } else {
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", data.id)
        .eq("role", "administrador");
      if (error) throw error;
      await admin
        .from("user_roles")
        .upsert({ user_id: data.id, role: "usuario" }, { onConflict: "user_id,role" });
    }
    return { ok: true };
  });
