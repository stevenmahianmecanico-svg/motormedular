import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Shield, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ModalConfirmacion } from "@/components/ModalConfirmacion";
import { Button } from "@/components/ui/button";
import {
  cambiarRol,
  decidirAcceso,
  listarAccesos,
  type Acceso,
  type Rol,
} from "@/lib/acceso.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administración de usuarios y roles | Taller Medular" },
      {
        name: "description",
        content:
          "Aprueba o rechaza solicitudes de acceso y administra los rangos de usuario y administrador del taller.",
      },
      { property: "og:title", content: "Administración de usuarios | Taller Medular" },
      {
        property: "og:description",
        content: "Control de acceso, aprobación de registros y asignación de roles del taller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type Accion =
  | { tipo: "aprobar" | "rechazar"; usuario: Acceso }
  | { tipo: "rol"; usuario: Acceso; rol: Rol };

function Admin() {
  const queryClient = useQueryClient();
  const cargar = useServerFn(listarAccesos);
  const decidir = useServerFn(decidirAcceso);
  const rolFn = useServerFn(cambiarRol);
  const [accion, setAccion] = useState<Accion | null>(null);

  const usuarios = useQuery({ queryKey: ["accesos"], queryFn: () => cargar({}) });

  const ejecutar = useMutation({
    mutationFn: async (orden: Accion) => {
      if (orden.tipo === "rol") {
        await rolFn({ data: { id: orden.usuario.id, rol: orden.rol } });
      } else {
        await decidir({
          data: {
            id: orden.usuario.id,
            estado: orden.tipo === "aprobar" ? "aprobado" : "rechazado",
          },
        });
      }
    },
    onSuccess: async () => {
      setAccion(null);
      await queryClient.invalidateQueries({ queryKey: ["accesos"] });
      toast.success("Cambio aplicado");
    },
    onError: (error) => {
      setAccion(null);
      toast.error(error instanceof Error ? error.message : "No fue posible aplicar el cambio");
    },
  });

  const lista = usuarios.data ?? [];
  const pendientes = lista.filter((u) => u.estado === "pendiente");
  const registrados = lista.filter((u) => u.estado !== "pendiente");

  if (usuarios.isError) {
    return (
      <AppShell titulo="Administración">
        <p className="text-sm text-destructive">
          {usuarios.error instanceof Error ? usuarios.error.message : "Acceso no autorizado"}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell titulo="Administración" subtitulo="Aprobación de ingresos y control de rangos">
      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Usuarios pendientes</h2>
        <ul className="mt-3 space-y-2">
          {pendientes.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3"
            >
              <div>
                <p className="font-semibold break-all">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  Registro con {u.metodo_registro === "google" ? "Google" : "correo y contraseña"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAccion({ tipo: "aprobar", usuario: u })}>
                  <Check className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setAccion({ tipo: "rechazar", usuario: u })}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
          {pendientes.length === 0 ? (
            <li className="text-sm text-muted-foreground">Sin solicitudes pendientes.</li>
          ) : null}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-xl uppercase">Usuarios registrados</h2>
        <ul className="mt-3 space-y-2">
          {registrados.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3"
            >
              <div>
                <p className="flex items-center gap-2 font-semibold break-all">
                  {u.protegido ? (
                    <ShieldCheck className="size-4 text-primary" />
                  ) : (
                    <Shield className="size-4 text-muted-foreground" />
                  )}
                  {u.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estado: {u.estado} · Rango: {u.rol}
                  {u.protegido ? " · superusuario protegido" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                  value={u.rol}
                  disabled={u.protegido}
                  onChange={(e) =>
                    setAccion({ tipo: "rol", usuario: u, rol: e.target.value as Rol })
                  }
                >
                  <option value="usuario">usuario</option>
                  <option value="administrador">administrador</option>
                </select>
                {u.estado === "aprobado" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={u.protegido}
                    onClick={() => setAccion({ tipo: "rechazar", usuario: u })}
                  >
                    <X className="size-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setAccion({ tipo: "aprobar", usuario: u })}>
                    <Check className="size-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
          {registrados.length === 0 ? (
            <li className="text-sm text-muted-foreground">Aún no hay usuarios registrados.</li>
          ) : null}
        </ul>
      </section>

      <ModalConfirmacion
        abierto={accion !== null}
        titulo={
          accion?.tipo === "rol"
            ? "Cambiar rango"
            : accion?.tipo === "rechazar"
              ? "Rechazar acceso"
              : "Aprobar acceso"
        }
        destructivo={accion?.tipo === "rechazar"}
        textoConfirmar="Sí, confirmar"
        descripcion={
          accion
            ? accion.tipo === "rol"
              ? `Se asignará el rango "${accion.rol}" a ${accion.usuario.email}.`
              : accion.tipo === "aprobar"
                ? `${accion.usuario.email} podrá ingresar a todos los módulos del taller.`
                : `${accion.usuario.email} quedará bloqueado y no podrá ver ninguna pantalla interna.`
            : ""
        }
        onCancelar={() => setAccion(null)}
        onConfirmar={() => {
          if (accion) ejecutar.mutate(accion);
        }}
      />
    </AppShell>
  );
}
