import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Inicio | Taller Medular" },
    { name: "description", content: "Accede al taller para registrar jornadas, vehículos y servicios." },
    { property: "og:title", content: "Inicio | Taller Medular" },
    { property: "og:description", content: "Control de jornadas y gestión de tu taller automotriz." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/panel" });
  },
});
