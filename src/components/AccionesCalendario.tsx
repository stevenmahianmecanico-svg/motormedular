import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ModalConfirmacion } from "@/components/ModalConfirmacion";
import { Button } from "@/components/ui/button";
import { eliminarEventoCalendar, guardarEventoCalendar } from "@/lib/google.functions";

type Props = {
  eventId: string | null;
  titulo: string;
  descripcion: string;
  fecha: string;
  emailCliente: string | null | undefined;
  onCambio: (eventId: string | null) => Promise<void> | void;
};

/** Envío forzado (sendUpdates=all) y borrado físico del evento en Google Calendar. */
export function AccionesCalendario({
  eventId,
  titulo,
  descripcion,
  fecha,
  emailCliente,
  onCambio,
}: Props) {
  const enviar = useServerFn(guardarEventoCalendar);
  const eliminar = useServerFn(eliminarEventoCalendar);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={ocupado || !emailCliente}
        onClick={async () => {
          if (!emailCliente) {
            toast.error("El cliente no tiene correo registrado");
            return;
          }
          setOcupado(true);
          try {
            const resultado = await enviar({
              data: { titulo, descripcion, fecha, emailCliente, eventId },
            });
            await onCambio(resultado.eventId);
            toast.success("Invitación enviada al correo del cliente");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error con Google Calendar");
          } finally {
            setOcupado(false);
          }
        }}
      >
        <CalendarPlus className="size-4" />
        {eventId ? "Reenviar invitación" : "Enviar invitación"}
      </Button>

      {eventId ? (
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado}
          onClick={() => setConfirmando(true)}
          className="text-destructive"
        >
          <Trash2 className="size-4" />
          Eliminar del Calendario
        </Button>
      ) : null}

      <ModalConfirmacion
        abierto={confirmando}
        destructivo
        titulo="Eliminar del Calendario"
        textoConfirmar="Sí, eliminar"
        descripcion={
          <>
            El evento se borrará de tu calendario y del calendario personal del cliente de forma
            simultánea. Esta acción no se puede deshacer.
          </>
        }
        onCancelar={() => setConfirmando(false)}
        onConfirmar={async () => {
          if (!eventId) return;
          setOcupado(true);
          try {
            await eliminar({ data: { eventId } });
            await onCambio(null);
            toast.success("Evento eliminado del calendario");
            setConfirmando(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el evento");
          } finally {
            setOcupado(false);
          }
        }}
      />
    </div>
  );
}
