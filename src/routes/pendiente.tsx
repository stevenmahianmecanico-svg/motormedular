import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { asegurarAcceso } from "@/lib/acceso.functions";

export const Route = createFileRoute("/pendiente")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso pendiente de aprobación | Taller Medular" },
      {
        name: "description",
        content:
          "Tu registro fue recibido y espera la aprobación de un administrador del taller para habilitar los módulos internos.",
      },
      { property: "og:title", content: "Acceso pendiente | Taller Medular" },
      {
        property: "og:description",
        content: "Solicitud de acceso al panel del taller en revisión por un administrador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pendiente,
});

function Pendiente() {
  const router = useRouter();
  const verificar = useServerFn(asegurarAcceso);
  const acceso = useQuery({ queryKey: ["acceso"], queryFn: () => verificar({}) });

  const rechazado = acceso.data?.estado === "rechazado";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-sm p-7 text-center">
        <h1 className="font-display text-3xl uppercase leading-none">
          {rechazado ? "Acceso rechazado" : "Acceso pendiente"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {rechazado
            ? "Un administrador rechazó esta solicitud. Comunícate con el taller si crees que es un error."
            : "Tu registro fue recibido correctamente. Un administrador debe aprobarlo antes de que puedas ver los módulos internos del taller."}
        </p>
        {acceso.data?.email ? (
          <p className="mt-2 text-xs text-muted-foreground">{acceso.data.email}</p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              const resultado = await acceso.refetch();
              if (resultado.data?.estado === "aprobado") router.navigate({ to: "/panel" });
            }}
          >
            Revisar de nuevo
          </Button>
          <Button
            className="flex-1"
            onClick={async () => {
              await supabase.auth.signOut();
              router.navigate({ to: "/auth", replace: true });
            }}
          >
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
}
