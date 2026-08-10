import { useEffect, useRef, useState } from "react";

/**
 * Persistencia local de predatos: guarda el formulario en localStorage mientras
 * se escribe y lo recupera al volver a entrar para ahorrar tiempo de escritura.
 */
export function useBorrador<T extends Record<string, unknown>>(clave: string, inicial: T) {
  const [valores, setValores] = useState<T>(inicial);
  const hidratado = useRef(false);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(clave);
      if (guardado) setValores({ ...inicial, ...(JSON.parse(guardado) as Partial<T>) });
    } catch {
      /* borrador corrupto: se ignora */
    }
    hidratado.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  useEffect(() => {
    if (!hidratado.current) return;
    try {
      window.localStorage.setItem(clave, JSON.stringify(valores));
    } catch {
      /* almacenamiento lleno */
    }
  }, [clave, valores]);

  function actualizar<K extends keyof T>(campo: K, valor: T[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  function limpiar() {
    try {
      window.localStorage.removeItem(clave);
    } catch {
      /* ignorar */
    }
    setValores(inicial);
  }

  return { valores, setValores, actualizar, limpiar };
}
