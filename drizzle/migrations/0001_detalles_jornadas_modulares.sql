CREATE TABLE public.detalles_jornada (
 turno_id uuid PRIMARY KEY REFERENCES public.registros_turno(id) ON DELETE CASCADE,
 vehiculo_id uuid NOT NULL REFERENCES public.vehiculos(id),
 fecha date NOT NULL,
 tipo text NOT NULL CHECK (tipo IN ('salida','llegada')),
 registrado_en timestamptz NOT NULL,
 trayectos jsonb NOT NULL DEFAULT '[]',
 combustible jsonb,
 UNIQUE (vehiculo_id, fecha, tipo)
);
GRANT SELECT, INSERT ON public.detalles_jornada TO authenticated;
GRANT ALL ON public.detalles_jornada TO service_role;
ALTER TABLE public.detalles_jornada ENABLE ROW LEVEL SECURITY;
CREATE POLICY detalles_aprobados ON public.detalles_jornada FOR SELECT TO authenticated USING (public.esta_aprobado(auth.uid()));
CREATE POLICY detalles_insertar ON public.detalles_jornada FOR INSERT TO authenticated WITH CHECK (public.esta_aprobado(auth.uid()));
CREATE TABLE public.odometro_estado_ia (user_id uuid PRIMARY KEY, motivo text NOT NULL);
GRANT SELECT, INSERT, UPDATE ON public.odometro_estado_ia TO authenticated;
GRANT ALL ON public.odometro_estado_ia TO service_role;
ALTER TABLE public.odometro_estado_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY ocr_estado_leer ON public.odometro_estado_ia FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY ocr_estado_escribir ON public.odometro_estado_ia FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ocr_estado_actualizar ON public.odometro_estado_ia FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.guardar_jornada(p_id uuid, p_vehiculo uuid, p_tipo text, p_fecha date, p_instante timestamptz, p_km integer, p_confianza numeric DEFAULT NULL, p_trayectos jsonb DEFAULT '[]', p_combustible jsonb DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_placa text; v_apertura integer; v_cierre integer; v_viaje jsonb;
BEGIN
 IF NOT public.esta_aprobado(auth.uid()) THEN RAISE EXCEPTION 'Acceso no aprobado'; END IF;
 IF EXISTS (SELECT 1 FROM public.detalles_jornada WHERE turno_id=p_id) THEN RETURN p_id; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_vehiculo::text));
 IF p_tipo NOT IN ('salida','llegada') OR p_km < 0 OR p_km IS NULL OR p_fecha > CURRENT_DATE + 1 OR p_instante > now() + interval '5 minutes' THEN RAISE EXCEPTION 'Fecha o kilometraje inválido'; END IF;
 IF jsonb_typeof(p_trayectos) <> 'array' OR jsonb_array_length(p_trayectos)>50 THEN RAISE EXCEPTION 'Trayectos inválidos'; END IF;
 FOR v_viaje IN SELECT * FROM jsonb_array_elements(p_trayectos) LOOP
 IF length(trim(v_viaje->>'origen')) NOT BETWEEN 1 AND 200 OR length(trim(v_viaje->>'destino')) NOT BETWEEN 1 AND 200 OR (v_viaje->>'km')::numeric <= 0 THEN RAISE EXCEPTION 'Trayecto inválido'; END IF;
 END LOOP;
 IF p_combustible IS NOT NULL AND ((p_combustible->>'volumen')::numeric <= 0 OR (p_combustible->>'valor')::numeric < 0 OR (p_combustible->>'kilometraje')::integer < 0 OR p_combustible->>'unidad' NOT IN ('galones','litros') OR jsonb_typeof(p_combustible->'completo') <> 'boolean') THEN RAISE EXCEPTION 'Tanqueo inválido'; END IF;
 SELECT placa INTO v_placa FROM public.vehiculos WHERE id=p_vehiculo;
 IF v_placa IS NULL THEN RAISE EXCEPTION 'Vehículo no encontrado'; END IF;
 IF EXISTS (SELECT 1 FROM public.registros_turno WHERE vehiculo_id=p_vehiculo AND fecha=p_fecha AND tipo=p_tipo) THEN RAISE EXCEPTION 'Ya existe este registro para la fecha seleccionada'; END IF;
 SELECT kilometraje INTO v_apertura FROM public.registros_turno WHERE vehiculo_id=p_vehiculo AND fecha=p_fecha AND tipo='salida' ORDER BY created_at DESC LIMIT 1;
 SELECT kilometraje INTO v_cierre FROM public.registros_turno WHERE vehiculo_id=p_vehiculo AND fecha=p_fecha AND tipo='llegada' ORDER BY created_at DESC LIMIT 1;
 IF p_tipo='llegada' AND v_apertura IS NULL THEN RAISE EXCEPTION 'Registra primero la salida de esta jornada'; END IF;
 IF (p_tipo='llegada' AND p_km<v_apertura) OR (p_tipo='salida' AND v_cierre IS NOT NULL AND p_km>v_cierre) THEN RAISE EXCEPTION 'El cierre no puede ser menor que la apertura'; END IF;
 IF p_tipo='llegada' AND EXISTS (SELECT 1 FROM jsonb_array_elements(p_trayectos) x WHERE (x->>'km')::numeric>p_km-v_apertura) THEN RAISE EXCEPTION 'El trayecto supera la distancia de la jornada'; END IF;
 INSERT INTO public.registros_turno (id,vehiculo_id,placa,tipo,fecha,kilometraje,confianza,created_at) VALUES (p_id,p_vehiculo,v_placa,p_tipo,p_fecha,p_km,p_confianza,p_instante);
 INSERT INTO public.detalles_jornada (turno_id,vehiculo_id,fecha,tipo,registrado_en,trayectos,combustible) VALUES (p_id,p_vehiculo,p_fecha,p_tipo,p_instante,p_trayectos,p_combustible);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.guardar_jornada(uuid,uuid,text,date,timestamptz,integer,numeric,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_jornada(uuid,uuid,text,date,timestamptz,integer,numeric,jsonb,jsonb) TO authenticated;