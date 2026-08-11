-- Roles
CREATE TYPE public.app_role AS ENUM ('administrador','usuario');
CREATE TYPE public.estado_acceso AS ENUM ('pendiente','aprobado','rechazado');

CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  metodo_registro text NOT NULL DEFAULT 'email',
  estado public.estado_acceso NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfiles TO authenticated;
GRANT ALL ON public.perfiles TO service_role;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.esta_aprobado(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.perfiles WHERE id = _user_id AND estado = 'aprobado')
$$;

CREATE POLICY "perfiles_propio_select" ON public.perfiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'administrador'));
CREATE POLICY "perfiles_admin_update" ON public.perfiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'administrador')) WITH CHECK (public.has_role(auth.uid(),'administrador'));
CREATE POLICY "perfiles_admin_delete" ON public.perfiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'administrador'));

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'administrador'));

-- Superusuario protegido
CREATE OR REPLACE FUNCTION public.proteger_superusuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE correo text;
BEGIN
  IF TG_TABLE_NAME = 'user_roles' THEN
    SELECT email INTO correo FROM public.perfiles WHERE id = COALESCE(OLD.user_id, NEW.user_id);
    IF lower(coalesce(correo,'')) = 'josemedina4121@gmail.com' THEN
      IF TG_OP = 'DELETE' AND OLD.role = 'administrador' THEN
        RAISE EXCEPTION 'El superusuario no puede perder el rol de administrador';
      END IF;
      IF TG_OP = 'UPDATE' AND OLD.role = 'administrador' AND NEW.role <> 'administrador' THEN
        RAISE EXCEPTION 'El superusuario no puede ser degradado';
      END IF;
    END IF;
  ELSE
    IF lower(coalesce(OLD.email,'')) = 'josemedina4121@gmail.com' THEN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'El superusuario no puede ser eliminado';
      END IF;
      NEW.email := OLD.email;
      NEW.estado := 'aprobado';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_roles_super BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_superusuario();
CREATE TRIGGER trg_perfiles_super BEFORE UPDATE OR DELETE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_superusuario();
CREATE TRIGGER trg_perfiles_updated BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Productos e imágenes
ALTER TABLE public.historial_mantenimientos
  ADD COLUMN producto_nombre text,
  ADD COLUMN producto_foto_url text,
  ADD COLUMN producto_cantidad numeric,
  ADD COLUMN producto_unidad text DEFAULT 'Litros',
  ADD COLUMN recomendacion_ia text;

ALTER TABLE public.vehiculos
  ADD COLUMN licencia_foto_url text,
  ADD COLUMN licencia_texto text;

ALTER TABLE public.documentos_vencimiento
  ADD COLUMN foto_url text;