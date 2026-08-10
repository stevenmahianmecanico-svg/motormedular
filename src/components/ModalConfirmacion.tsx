import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  abierto: boolean;
  titulo: string;
  descripcion: ReactNode;
  textoConfirmar?: string;
  destructivo?: boolean;
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
};

/** Modal flotante con desenfoque profundo del fondo (glassmorphism). */
export function ModalConfirmacion({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  destructivo = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!abierto) setOcupado(false);
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCancelar}
        className="glass-overlay absolute inset-0 cursor-default"
      />
      <div className="glass-card relative w-full max-w-sm rounded-2xl p-6 text-center">
        <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">{titulo}</h2>
        <div className="mt-3 text-sm text-muted-foreground">{descripcion}</div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
          <Button
            variant={destructivo ? "destructive" : "default"}
            className="flex-1"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              try {
                await onConfirmar();
              } finally {
                setOcupado(false);
              }
            }}
          >
            {ocupado ? "Procesando…" : textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
