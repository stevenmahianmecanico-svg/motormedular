import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function Campo({
  etiqueta,
  children,
  ancho = "full",
  requerido = false,
}: {
  etiqueta: string;
  children: ReactNode;
  ancho?: "full" | "half";
  requerido?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${ancho === "half" ? "" : "sm:col-span-2"}`}>
      <Label className="etiqueta-campo">
        {etiqueta}
        {requerido ? <span className="text-primary"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="panel p-4">
      <h2 className="font-display text-xl uppercase">{titulo}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
