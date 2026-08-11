import { useState } from "react";

import { enlaceArchivoDrive, enlaceDirectoDrive } from "@/lib/drive";

/** Visor/carrusel de evidencias individuales dentro de la propia app. */
export function VisorEvidencias({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [indice, setIndice] = useState(0);
  const validas = fotos.map((f) => enlaceDirectoDrive(f)).filter((f): f is string => Boolean(f));
  if (validas.length === 0) return null;
  const actual = validas[Math.min(indice, validas.length - 1)] as string;
  const original = fotos[Math.min(indice, fotos.length - 1)];

  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-xl border border-border bg-black/30">
        <img
          src={actual}
          alt={`Evidencia ${indice + 1} de ${titulo}`}
          loading="lazy"
          className="h-56 w-full object-contain"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {validas.map((foto, i) => (
            <button
              key={foto}
              type="button"
              onClick={() => setIndice(i)}
              className={`size-12 shrink-0 overflow-hidden rounded-lg border ${
                i === indice ? "border-primary" : "border-border opacity-70"
              }`}
            >
              <img src={foto} alt={`Miniatura ${i + 1}`} className="size-full object-cover" />
            </button>
          ))}
        </div>
        <a
          href={enlaceArchivoDrive(original) ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs text-accent underline"
        >
          Ver original
        </a>
      </div>
    </div>
  );
}
