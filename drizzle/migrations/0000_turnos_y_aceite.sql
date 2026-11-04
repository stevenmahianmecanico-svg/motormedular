CREATE TABLE public.registros_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id uuid NOT NULL,
  placa text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('salida','llegada')),
  fecha date NOT NULL DEFAULT current_date,
  kilometraje integer NOT NULL CHECK (kilometraje >= 0),
  confianza numeric,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_turno TO authenticated;
GRANT ALL ON public.registros_turno TO service_role;
ALTER TABLE public.registros_turno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turnos_aprobados" ON public.registros_turno FOR ALL TO authenticated
  USING (public.esta_aprobado(auth.uid())) WITH CHECK (public.esta_aprobado(auth.uid()));

CREATE TABLE public.config_aceite (
  tipo text PRIMARY KEY,
  km_vida integer NOT NULL CHECK (km_vida > 0),
  km_alerta integer NOT NULL DEFAULT 300,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_aceite TO authenticated;
GRANT ALL ON public.config_aceite TO service_role;
ALTER TABLE public.config_aceite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aceite_leer" ON public.config_aceite FOR SELECT TO authenticated USING (public.esta_aprobado(auth.uid()));
CREATE POLICY "aceite_admin" ON public.config_aceite FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrador')) WITH CHECK (public.has_role(auth.uid(),'administrador'));
INSERT INTO public.config_aceite (tipo, km_vida, km_alerta) VALUES
  ('Mineral',2500,300),('Semisintético',4500,300),('Sintético',6000,300);