CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  razon_social text,
  tipo_documento text NOT NULL DEFAULT 'CC',
  numero_documento text NOT NULL,
  celular_principal text NOT NULL,
  telefono_secundario text,
  email text NOT NULL,
  direccion text,
  ciudad text,
  departamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_auth_all" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL UNIQUE,
  tipo_vehiculo text NOT NULL DEFAULT 'Motocicleta',
  marca text,
  modelo_ano text,
  cilindrada text,
  color text,
  numero_chasis text,
  numero_motor text,
  tipo_carroceria text,
  tipo_combustible text DEFAULT 'Gasolina',
  fecha_matricula date,
  organismo_transito text,
  foto_url text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  km_intervalo_aceite integer NOT NULL DEFAULT 3000,
  meses_intervalo_aceite integer NOT NULL DEFAULT 3,
  km_promedio_dia numeric,
  km_semana numeric,
  km_mes numeric,
  km_ano numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehiculos TO authenticated;
GRANT ALL ON public.vehiculos TO service_role;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehiculos_auth_all" ON public.vehiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_vehiculos_updated BEFORE UPDATE ON public.vehiculos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.documentos_vencimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id uuid NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  numero_documento text,
  categorias text,
  fecha_expedicion date,
  fecha_vencimiento date NOT NULL,
  calendar_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_vencimiento TO authenticated;
GRANT ALL ON public.documentos_vencimiento TO service_role;
ALTER TABLE public.documentos_vencimiento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_auth_all" ON public.documentos_vencimiento FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_documentos_updated BEFORE UPDATE ON public.documentos_vencimiento FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.historial_mantenimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id uuid NOT NULL REFERENCES public.vehiculos(id) ON DELETE CASCADE,
  placa text NOT NULL,
  fecha_servicio date NOT NULL,
  hora_entrada text,
  kilometraje integer NOT NULL,
  tipos_servicio text[] NOT NULL DEFAULT '{}',
  diagnostico text,
  procedimiento text,
  repuestos_cambiados text,
  costo_mano_obra numeric NOT NULL DEFAULT 0,
  costo_repuestos numeric NOT NULL DEFAULT 0,
  iva_porcentaje numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  fotos_urls text[] NOT NULL DEFAULT '{}',
  drive_folder_url text,
  km_promedio_dia numeric,
  proximo_km integer,
  proxima_fecha date,
  calendar_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historial_mantenimientos TO authenticated;
GRANT ALL ON public.historial_mantenimientos TO service_role;
ALTER TABLE public.historial_mantenimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mantenimientos_auth_all" ON public.historial_mantenimientos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_mant_updated BEFORE UPDATE ON public.historial_mantenimientos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.personal_presente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mantenimiento_id uuid NOT NULL REFERENCES public.historial_mantenimientos(id) ON DELETE CASCADE,
  rol text NOT NULL,
  nombre text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_presente TO authenticated;
GRANT ALL ON public.personal_presente TO service_role;
ALTER TABLE public.personal_presente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personal_auth_all" ON public.personal_presente FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_mant_placa ON public.historial_mantenimientos(placa);
CREATE INDEX idx_docs_vehiculo ON public.documentos_vencimiento(vehiculo_id);