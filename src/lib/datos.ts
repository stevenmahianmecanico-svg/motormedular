import { supabase } from "@/integrations/supabase/client";

export type Cliente = {
  id: string;
  nombre_completo: string;
  razon_social: string | null;
  tipo_documento: string;
  numero_documento: string;
  celular_principal: string;
  telefono_secundario: string | null;
  email: string;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
};

export type Vehiculo = {
  id: string;
  placa: string;
  tipo_vehiculo: string;
  marca: string | null;
  modelo_ano: string | null;
  cilindrada: string | null;
  color: string | null;
  numero_chasis: string | null;
  numero_motor: string | null;
  tipo_carroceria: string | null;
  tipo_combustible: string | null;
  fecha_matricula: string | null;
  organismo_transito: string | null;
  foto_url: string | null;
  cliente_id: string | null;
  km_intervalo_aceite: number;
  meses_intervalo_aceite: number;
  km_promedio_dia: number | null;
  km_semana: number | null;
  km_mes: number | null;
  km_ano: number | null;
  clientes?: Cliente | null;
};

export type Documento = {
  id: string;
  vehiculo_id: string;
  tipo_documento: string;
  numero_documento: string | null;
  categorias: string | null;
  fecha_expedicion: string | null;
  fecha_vencimiento: string;
  calendar_event_id: string | null;
};

export type Mantenimiento = {
  id: string;
  vehiculo_id: string;
  placa: string;
  fecha_servicio: string;
  hora_entrada: string | null;
  kilometraje: number;
  tipos_servicio: string[];
  diagnostico: string | null;
  procedimiento: string | null;
  repuestos_cambiados: string | null;
  costo_mano_obra: number;
  costo_repuestos: number;
  iva_porcentaje: number;
  valor_total: number;
  fotos_urls: string[];
  drive_folder_url: string | null;
  km_promedio_dia: number | null;
  proximo_km: number | null;
  proxima_fecha: string | null;
  calendar_event_id: string | null;
};

export const TIPOS_SERVICIO = [
  "Cambio de Aceite de Motor",
  "Cambio de Aceite de Transmisión/Caja",
  "Pastillas/Bandas de Freno",
  "Kit de Arrastre/Correa de Distribución",
  "Sincronización de Motor",
  "Mantenimiento General",
  "Líquido de Frenos/Embrague",
  "Suspensión",
] as const;

export const ROLES_PERSONAL = ["Mecánico Líder", "Técnico Auxiliar", "Supervisor de Calidad"] as const;

export const TIPOS_DOCUMENTO_VEHICULO = [
  "SOAT",
  "Revisión Técnico-Mecánica",
  "Licencia de Conducción",
  "Tarjeta de Operación",
] as const;

export async function listarVehiculos(): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("*, clientes(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Vehiculo[];
}

export async function obtenerVehiculoPorPlaca(placa: string): Promise<Vehiculo | null> {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("*, clientes(*)")
    .eq("placa", placa)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Vehiculo) ?? null;
}

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nombre_completo", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Cliente[];
}

export async function listarDocumentos(): Promise<Documento[]> {
  const { data, error } = await supabase
    .from("documentos_vencimiento")
    .select("*")
    .order("fecha_vencimiento", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Documento[];
}

export async function listarMantenimientos(placa?: string): Promise<Mantenimiento[]> {
  let query = supabase
    .from("historial_mantenimientos")
    .select("*")
    .order("fecha_servicio", { ascending: false });
  if (placa) query = query.eq("placa", placa);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Mantenimiento[];
}
