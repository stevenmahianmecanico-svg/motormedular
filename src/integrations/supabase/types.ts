export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          celular_principal: string
          ciudad: string | null
          created_at: string
          departamento: string | null
          direccion: string | null
          email: string
          id: string
          nombre_completo: string
          numero_documento: string
          razon_social: string | null
          telefono_secundario: string | null
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          celular_principal: string
          ciudad?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          email: string
          id?: string
          nombre_completo: string
          numero_documento: string
          razon_social?: string | null
          telefono_secundario?: string | null
          tipo_documento?: string
          updated_at?: string
        }
        Update: {
          celular_principal?: string
          ciudad?: string | null
          created_at?: string
          departamento?: string | null
          direccion?: string | null
          email?: string
          id?: string
          nombre_completo?: string
          numero_documento?: string
          razon_social?: string | null
          telefono_secundario?: string | null
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_aceite: {
        Row: {
          km_alerta: number
          km_vida: number
          tipo: string
          updated_at: string
        }
        Insert: {
          km_alerta?: number
          km_vida: number
          tipo: string
          updated_at?: string
        }
        Update: {
          km_alerta?: number
          km_vida?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_vencimiento: {
        Row: {
          calendar_event_id: string | null
          categorias: string | null
          created_at: string
          fecha_expedicion: string | null
          fecha_vencimiento: string
          foto_url: string | null
          id: string
          numero_documento: string | null
          tipo_documento: string
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          categorias?: string | null
          created_at?: string
          fecha_expedicion?: string | null
          fecha_vencimiento: string
          foto_url?: string | null
          id?: string
          numero_documento?: string | null
          tipo_documento: string
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          calendar_event_id?: string | null
          categorias?: string | null
          created_at?: string
          fecha_expedicion?: string | null
          fecha_vencimiento?: string
          foto_url?: string | null
          id?: string
          numero_documento?: string | null
          tipo_documento?: string
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_vencimiento_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_mantenimientos: {
        Row: {
          calendar_event_id: string | null
          costo_mano_obra: number
          costo_repuestos: number
          created_at: string
          diagnostico: string | null
          drive_folder_url: string | null
          fecha_servicio: string
          fotos_urls: string[]
          hora_entrada: string | null
          id: string
          iva_porcentaje: number
          kilometraje: number
          km_promedio_dia: number | null
          placa: string
          procedimiento: string | null
          producto_cantidad: number | null
          producto_foto_url: string | null
          producto_nombre: string | null
          producto_unidad: string | null
          proxima_fecha: string | null
          proximo_km: number | null
          recomendacion_ia: string | null
          repuestos_cambiados: string | null
          tipos_servicio: string[]
          updated_at: string
          valor_total: number
          vehiculo_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          costo_mano_obra?: number
          costo_repuestos?: number
          created_at?: string
          diagnostico?: string | null
          drive_folder_url?: string | null
          fecha_servicio: string
          fotos_urls?: string[]
          hora_entrada?: string | null
          id?: string
          iva_porcentaje?: number
          kilometraje: number
          km_promedio_dia?: number | null
          placa: string
          procedimiento?: string | null
          producto_cantidad?: number | null
          producto_foto_url?: string | null
          producto_nombre?: string | null
          producto_unidad?: string | null
          proxima_fecha?: string | null
          proximo_km?: number | null
          recomendacion_ia?: string | null
          repuestos_cambiados?: string | null
          tipos_servicio?: string[]
          updated_at?: string
          valor_total?: number
          vehiculo_id: string
        }
        Update: {
          calendar_event_id?: string | null
          costo_mano_obra?: number
          costo_repuestos?: number
          created_at?: string
          diagnostico?: string | null
          drive_folder_url?: string | null
          fecha_servicio?: string
          fotos_urls?: string[]
          hora_entrada?: string | null
          id?: string
          iva_porcentaje?: number
          kilometraje?: number
          km_promedio_dia?: number | null
          placa?: string
          procedimiento?: string | null
          producto_cantidad?: number | null
          producto_foto_url?: string | null
          producto_nombre?: string | null
          producto_unidad?: string | null
          proxima_fecha?: string | null
          proximo_km?: number | null
          recomendacion_ia?: string | null
          repuestos_cambiados?: string | null
          tipos_servicio?: string[]
          updated_at?: string
          valor_total?: number
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_mantenimientos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          created_at: string
          email: string
          estado: Database["public"]["Enums"]["estado_acceso"]
          id: string
          metodo_registro: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          estado?: Database["public"]["Enums"]["estado_acceso"]
          id: string
          metodo_registro?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          estado?: Database["public"]["Enums"]["estado_acceso"]
          id?: string
          metodo_registro?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_presente: {
        Row: {
          created_at: string
          id: string
          mantenimiento_id: string
          nombre: string | null
          rol: string
        }
        Insert: {
          created_at?: string
          id?: string
          mantenimiento_id: string
          nombre?: string | null
          rol: string
        }
        Update: {
          created_at?: string
          id?: string
          mantenimiento_id?: string
          nombre?: string | null
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_presente_mantenimiento_id_fkey"
            columns: ["mantenimiento_id"]
            isOneToOne: false
            referencedRelation: "historial_mantenimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_turno: {
        Row: {
          confianza: number | null
          creado_por: string | null
          created_at: string
          fecha: string
          id: string
          kilometraje: number
          placa: string
          tipo: string
          vehiculo_id: string
        }
        Insert: {
          confianza?: number | null
          creado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          kilometraje: number
          placa: string
          tipo: string
          vehiculo_id: string
        }
        Update: {
          confianza?: number | null
          creado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          kilometraje?: number
          placa?: string
          tipo?: string
          vehiculo_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          cilindrada: string | null
          cliente_id: string | null
          color: string | null
          created_at: string
          fecha_matricula: string | null
          foto_url: string | null
          id: string
          km_ano: number | null
          km_intervalo_aceite: number
          km_mes: number | null
          km_promedio_dia: number | null
          km_semana: number | null
          licencia_foto_url: string | null
          licencia_texto: string | null
          marca: string | null
          meses_intervalo_aceite: number
          modelo_ano: string | null
          numero_chasis: string | null
          numero_motor: string | null
          organismo_transito: string | null
          placa: string
          tipo_carroceria: string | null
          tipo_combustible: string | null
          tipo_vehiculo: string
          updated_at: string
        }
        Insert: {
          cilindrada?: string | null
          cliente_id?: string | null
          color?: string | null
          created_at?: string
          fecha_matricula?: string | null
          foto_url?: string | null
          id?: string
          km_ano?: number | null
          km_intervalo_aceite?: number
          km_mes?: number | null
          km_promedio_dia?: number | null
          km_semana?: number | null
          licencia_foto_url?: string | null
          licencia_texto?: string | null
          marca?: string | null
          meses_intervalo_aceite?: number
          modelo_ano?: string | null
          numero_chasis?: string | null
          numero_motor?: string | null
          organismo_transito?: string | null
          placa: string
          tipo_carroceria?: string | null
          tipo_combustible?: string | null
          tipo_vehiculo?: string
          updated_at?: string
        }
        Update: {
          cilindrada?: string | null
          cliente_id?: string | null
          color?: string | null
          created_at?: string
          fecha_matricula?: string | null
          foto_url?: string | null
          id?: string
          km_ano?: number | null
          km_intervalo_aceite?: number
          km_mes?: number | null
          km_promedio_dia?: number | null
          km_semana?: number | null
          licencia_foto_url?: string | null
          licencia_texto?: string | null
          marca?: string | null
          meses_intervalo_aceite?: number
          modelo_ano?: string | null
          numero_chasis?: string | null
          numero_motor?: string | null
          organismo_transito?: string | null
          placa?: string
          tipo_carroceria?: string | null
          tipo_combustible?: string | null
          tipo_vehiculo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      esta_aprobado: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "administrador" | "usuario"
      estado_acceso: "pendiente" | "aprobado" | "rechazado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "usuario"],
      estado_acceso: ["pendiente", "aprobado", "rechazado"],
    },
  },
} as const
