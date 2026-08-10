import { estadoVencimiento, type EstadoVigencia } from "@/lib/telemetria";

const estilos: Record<EstadoVigencia, string> = {
  vigente: "bg-success/15 text-success border-success/40",
  por_vencer: "bg-warning/15 text-warning border-warning/40",
  vencido: "bg-destructive/15 text-destructive border-destructive/40",
};

const etiquetas: Record<EstadoVigencia, string> = {
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
};

export function SemaforoVigencia({ fecha }: { fecha: string }) {
  const { estado, dias } = estadoVencimiento(fecha);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${estilos[estado]}`}
    >
      <span className="size-2 rounded-full bg-current" />
      {etiquetas[estado]}
      <span className="opacity-70">
        {estado === "vencido" ? `hace ${Math.abs(dias)} d` : `en ${dias} d`}
      </span>
    </span>
  );
}
