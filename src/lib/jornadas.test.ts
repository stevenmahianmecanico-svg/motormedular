import { describe, expect, it } from "vitest";
import {
  distanciaJornada,
  eficienciaCombustible,
  sugerirApertura,
  type Combustible,
} from "./jornadas";
import { rechazarServiceWorker } from "./pwa";

const fuel = (
  kilometraje: number,
  completo = true,
  volumen = 5,
  unidad: "litros" | "galones" = "galones",
): Combustible => ({ kilometraje, completo, volumen, unidad, valor: 100000 });
describe("Reglas de jornadas", () => {
  it("sugiere el cierre anterior incluso después de días de ausencia", () => {
    expect(
      sugerirApertura(
        [
          {
            id: "1",
            tipo: "llegada",
            fecha: "2026-11-01",
            kilometraje: 15230,
            created_at: "2026-11-01T22:00:00Z",
          },
          {
            id: "2",
            tipo: "salida",
            fecha: "2026-11-02",
            kilometraje: 15230,
            created_at: "2026-11-02T10:00:00Z",
          },
          {
            id: "3",
            tipo: "llegada",
            fecha: "2026-11-05",
            kilometraje: 16000,
            created_at: "2026-11-05T22:00:00Z",
          },
        ],
        "2026-11-04",
      ),
    ).toBe(15230);
  });
  it("distancia neta es cierre menos apertura sin sumar trayectos", () => {
    expect(distanciaJornada(15230, 15330)).toBe(100);
  });
  it("no inventa distancia antes del cierre", () => {
    expect(distanciaJornada(15230, null)).toBeNull();
  });
  it("calcula km por galón entre dos llenos consecutivos", () => {
    expect(eficienciaCombustible(fuel(10000), fuel(10250))).toBe(50);
  });
  it("un tanqueo parcial intermedio interrumpe la estimación", () => {
    expect(eficienciaCombustible(fuel(10000, false), fuel(10250))).toBeNull();
  });
  it("convierte litros a galones para el rendimiento", () => {
    expect(
      eficienciaCombustible(fuel(10000), fuel(10250, true, 18.92705892, "litros")),
    ).toBeCloseTo(50);
  });
});
describe("Protección PWA", () => {
  it("no registra service workers en desarrollo ni en marcos", () => {
    expect(rechazarServiceWorker("motormedular.lovable.app", false, false, false)).toBe(true);
    expect(rechazarServiceWorker("motormedular.lovable.app", true, true, false)).toBe(true);
  });
  it("bloquea previews y permite la aplicación publicada", () => {
    expect(rechazarServiceWorker("id-preview--69f51f96.lovable.app", true, false, false)).toBe(
      true,
    );
    expect(rechazarServiceWorker("69f51f96.lovableproject.com", true, false, false)).toBe(true);
    expect(rechazarServiceWorker("motormedular.lovable.app", true, false, false)).toBe(false);
  });
});
