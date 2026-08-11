import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { asegurarAcceso } from "@/lib/acceso.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const acceso = await asegurarAcceso({});
    if (acceso.estado !== "aprobado") throw redirect({ to: "/pendiente" });

    return { user: data.user, acceso };
  },
  component: () => <Outlet />,
});
