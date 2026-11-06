import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { registrarPwa } from "@/lib/pwa";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstalarAplicacion() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  useEffect(() => {
    void registrarPwa().catch(() => {});
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone
    ) {
      setOculto(true);
      return;
    }
    setIos(
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    const alInstalar = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const instalado = () => {
      setPrompt(null);
      setOculto(true);
    };
    window.addEventListener("beforeinstallprompt", alInstalar);
    window.addEventListener("appinstalled", instalado);
    return () => {
      window.removeEventListener("beforeinstallprompt", alInstalar);
      window.removeEventListener("appinstalled", instalado);
    };
  }, []);
  if (oculto || (!prompt && !ios)) return null;
  return (
    <>
      <aside className="mx-auto flex w-full max-w-6xl items-center gap-2 border-b border-border bg-secondary px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto flex-1 justify-start whitespace-normal text-left"
          onClick={async () => {
            if (ios) {
              setAyuda(true);
              return;
            }
            if (!prompt) return;
            await prompt.prompt();
            const choice = await prompt.userChoice;
            setPrompt(null);
            if (choice.outcome === "accepted") setOculto(true);
          }}
        >
          <Download className="size-4 shrink-0" />
          Instalar aplicación en tu pantalla de inicio
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ocultar aviso de instalación"
          onClick={() => setOculto(true)}
        >
          <X className="size-4" />
        </Button>
      </aside>
      <Dialog open={ayuda} onOpenChange={setAyuda}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar Taller Medular</DialogTitle>
          </DialogHeader>
          <p>
            Abre esta página en Safari, pulsa Compartir y selecciona «Añadir a pantalla de inicio».
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
