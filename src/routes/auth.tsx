import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({

    meta: [
      { title: "Ingreso al taller | Taller Medular" },
      {
        name: "description",
        content:
          "Accede al panel de gestión de mantenimientos, vencimientos y telemetría de vehículos del taller.",
      },
      { property: "og:title", content: "Ingreso al taller | Taller Medular" },
      {
        property: "og:description",
        content: "Panel privado de gestión para el taller automotriz y centro de mantenimiento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/panel" });
    });
  }, [router]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: "/panel" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) router.navigate({ to: "/panel" });
        else toast.success("Revisa tu correo para confirmar la cuenta.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible continuar");
    } finally {
      setCargando(false);
    }
  }

  async function google() {
    const resultado = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (resultado.error) {
      toast.error("No fue posible iniciar con Google");
      return;
    }
    if (resultado.redirected) return;
    router.navigate({ to: "/panel" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-sm p-7">
        <h1 className="font-display text-3xl uppercase leading-none">Taller Medular</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestión de mantenimientos, documentos y telemetría de motos y carros.
        </p>

        <form className="mt-6 space-y-4" onSubmit={enviar}>
          <div className="space-y-1.5">
            <Label className="etiqueta-campo">Correo</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="taller@correo.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="etiqueta-campo">Contraseña</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Procesando…" : modo === "login" ? "Ingresar" : "Crear cuenta"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={google}>
          Continuar con Google
        </Button>

        <button
          type="button"
          className="mt-4 w-full text-xs text-muted-foreground underline"
          onClick={() => setModo(modo === "login" ? "registro" : "login")}
        >
          {modo === "login" ? "No tengo cuenta, quiero registrarme" : "Ya tengo cuenta, ingresar"}
        </button>
      </div>
    </div>
  );
}
