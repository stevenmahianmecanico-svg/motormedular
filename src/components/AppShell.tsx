import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Car, LogOut, Plus, ShieldCheck, Users, Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { asegurarAcceso } from "@/lib/acceso.functions";

const enlaces = [
  { to: "/panel", icono: Car, texto: "Panel" },
  { to: "/vehiculos/nuevo", icono: Plus, texto: "Vehículo" },
  { to: "/mantenimientos/nuevo", icono: Wrench, texto: "Servicio" },
  { to: "/clientes", icono: Users, texto: "Clientes" },
];

export function AppShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const verificar = useServerFn(asegurarAcceso);
  const acceso = useQuery({ queryKey: ["acceso"], queryFn: () => verificar({}) });
  const navegacion = acceso.data?.esAdmin
    ? [...enlaces, { to: "/admin", icono: ShieldCheck, texto: "Admin" }]
    : enlaces;


  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 glass-overlay border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/panel" className="flex items-center gap-2.5">
            <span className="forja grid size-9 place-items-center rounded-xl">
              <CalendarClock className="size-5" />
            </span>
            <span>
              <span className="block font-display text-lg leading-none uppercase">
                Taller Medular
              </span>
              <span className="text-[11px] text-muted-foreground">Motos y carros</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              router.navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-5">
        <h1 className="font-display text-3xl uppercase leading-none">{titulo}</h1>
        {subtitulo ? <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p> : null}
        <div className="mt-5 space-y-5">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 glass-overlay border-t border-border">
        <div
          className="mx-auto grid max-w-3xl"
          style={{ gridTemplateColumns: `repeat(${navegacion.length}, minmax(0, 1fr))` }}
        >
          {navegacion.map(({ to, icono: Icono, texto }) => (

            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-3 text-[11px] text-muted-foreground transition-colors hover:text-primary [&.active]:text-primary"
            >
              <Icono className="size-5" />
              {texto}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
