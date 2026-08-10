import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageCircle, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listarClientes, listarVehiculos } from "@/lib/datos";
import { coincide, enlaceCorreo, enlaceWhatsapp, listaLegible } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes del taller | Taller Medular" },
      {
        name: "description",
        content:
          "Directorio de clientes con contacto directo por WhatsApp y correo, y sus vehículos asociados.",
      },
      { property: "og:title", content: "Clientes del taller | Taller Medular" },
      {
        property: "og:description",
        content: "Directorio CRM con enlaces directos de WhatsApp y correo para cada propietario.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const [consulta, setConsulta] = useState("");
  const clientes = useQuery({ queryKey: ["clientes"], queryFn: listarClientes });
  const vehiculos = useQuery({ queryKey: ["vehiculos"], queryFn: listarVehiculos });

  const filtrados = (clientes.data ?? []).filter((c) =>
    coincide(
      consulta,
      c.nombre_completo,
      c.razon_social,
      c.numero_documento,
      c.email,
      c.celular_principal,
      c.ciudad,
    ),
  );

  return (
    <AppShell titulo="Clientes" subtitulo="Contacto directo y vehículos asociados">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={consulta}
          onInput={(e) => setConsulta((e.target as HTMLInputElement).value)}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Nombre, NIT, correo o ciudad…"
          className="h-12 pl-9"
        />
      </div>

      <ul className="space-y-3">
        {filtrados.map((c) => {
          const placas = (vehiculos.data ?? [])
            .filter((v) => v.cliente_id === c.id)
            .map((v) => v.placa);
          const mensaje = `Hola ${c.nombre_completo}, te escribimos del taller sobre tus vehículos ${JSON.stringify(placas)}. Queremos confirmar la fecha de tu próximo mantenimiento y revisar los vencimientos de SOAT y técnico-mecánica.`;
          return (
            <li key={c.id} className="panel p-4">
              <p className="font-display text-xl uppercase">{c.nombre_completo}</p>
              <p className="text-sm text-muted-foreground">
                {listaLegible([
                  c.razon_social,
                  `${c.tipo_documento} ${c.numero_documento}`,
                  c.ciudad,
                  c.departamento,
                ])}
              </p>
              <p className="text-sm text-muted-foreground">{c.email}</p>
              <p className="mt-1 text-xs text-primary">
                Vehículos: {placas.length ? JSON.stringify(placas) : "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a
                    href={enlaceWhatsapp(c.celular_principal, mensaje)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <a href={enlaceCorreo(c.email, "Taller Medular · Recordatorio", mensaje)}>
                    <Mail className="size-4" /> Correo
                  </a>
                </Button>
              </div>
            </li>
          );
        })}
        {filtrados.length === 0 ? (
          <li className="text-sm text-muted-foreground">Sin clientes que coincidan.</li>
        ) : null}
      </ul>
    </AppShell>
  );
}
