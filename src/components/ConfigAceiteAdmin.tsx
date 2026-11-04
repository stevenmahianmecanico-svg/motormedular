import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function ConfigAceiteAdmin() {
  const qc = useQueryClient();
  const [cambios, setCambios] = useState<Record<string, { km_vida?: string; km_alerta?: string }>>(
    {},
  );
  const config = useQuery({
    queryKey: ["config_aceite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_aceite").select("*").order("km_vida");
      if (error) throw error;
      return data;
    },
  });
  const guardar = useMutation({
    mutationFn: async (tipo: string) => {
      const c = cambios[tipo] ?? {};
      const actual = config.data?.find((x) => x.tipo === tipo);
      const { error } = await supabase
        .from("config_aceite")
        .update({
          km_vida: Number(c.km_vida ?? actual?.km_vida),
          km_alerta: Number(c.km_alerta ?? actual?.km_alerta),
          updated_at: new Date().toISOString(),
        })
        .eq("tipo", tipo);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Intervalo actualizado");
      qc.invalidateQueries({ queryKey: ["config_aceite"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  return (
    <section className="panel p-4">
      <h2 className="font-display text-xl uppercase">Intervalos de aceite</h2>
      <ul className="mt-3 space-y-2">
        {(config.data ?? []).map((c) => (
          <li key={c.tipo} className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2">
            <span className="font-semibold">{c.tipo}</span>
            <label>
              <span className="etiqueta-campo">Vida km</span>
              <Input
                inputMode="numeric"
                defaultValue={c.km_vida}
                onChange={(e) =>
                  setCambios((p) => ({ ...p, [c.tipo]: { ...p[c.tipo], km_vida: e.target.value } }))
                }
              />
            </label>
            <label>
              <span className="etiqueta-campo">Alerta km</span>
              <Input
                inputMode="numeric"
                defaultValue={c.km_alerta}
                onChange={(e) =>
                  setCambios((p) => ({
                    ...p,
                    [c.tipo]: { ...p[c.tipo], km_alerta: e.target.value },
                  }))
                }
              />
            </label>
            <Button size="sm" disabled={guardar.isPending} onClick={() => guardar.mutate(c.tipo)}>
              Guardar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
