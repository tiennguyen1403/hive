export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      drops: {
        Row: {
          closes_at: string
          no: number
          opens_at: string
        }
        Insert: {
          closes_at: string
          no: number
          opens_at: string
        }
        Update: {
          closes_at?: string
          no?: number
          opens_at?: string
        }
        Relationships: []
      }
      product_colors: {
        Row: {
          color: Database["public"]["Enums"]["color_key"]
          photo_key: string
          position: number
          product_id: string
        }
        Insert: {
          color: Database["public"]["Enums"]["color_key"]
          photo_key: string
          position: number
          product_id: string
        }
        Update: {
          color?: Database["public"]["Enums"]["color_key"]
          photo_key?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cut_units: number
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          fit: Database["public"]["Enums"]["product_fit"]
          id: string
          kind: string
          material: string
          name: string
          position: number
          price_vnd: number
          slug: string
          sold_out_at: string | null
        }
        Insert: {
          cut_units: number
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          fit: Database["public"]["Enums"]["product_fit"]
          id: string
          kind: string
          material: string
          name: string
          position: number
          price_vnd: number
          slug: string
          sold_out_at?: string | null
        }
        Update: {
          cut_units?: number
          drop_no?: number
          family?: Database["public"]["Enums"]["product_family"]
          fit?: Database["public"]["Enums"]["product_fit"]
          id?: string
          kind?: string
          material?: string
          name?: string
          position?: number
          price_vnd?: number
          slug?: string
          sold_out_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_drop_no_fkey"
            columns: ["drop_no"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["no"]
          },
        ]
      }
      promotions: {
        Row: {
          amount_vnd: number | null
          code: string
          ends_at: string
          kind: Database["public"]["Enums"]["promo_kind"]
          max_discount_vnd: number | null
          min_order_vnd: number | null
          percent: number | null
          position: number
          starts_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          amount_vnd?: number | null
          code: string
          ends_at: string
          kind: Database["public"]["Enums"]["promo_kind"]
          max_discount_vnd?: number | null
          min_order_vnd?: number | null
          percent?: number | null
          position: number
          starts_at: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          amount_vnd?: number | null
          code?: string
          ends_at?: string
          kind?: Database["public"]["Enums"]["promo_kind"]
          max_discount_vnd?: number | null
          min_order_vnd?: number | null
          percent?: number | null
          position?: number
          starts_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      seed_drops: {
        Row: {
          closes_at: string
          no: number
          opens_at: string
        }
        Insert: {
          closes_at: string
          no: number
          opens_at: string
        }
        Update: {
          closes_at?: string
          no?: number
          opens_at?: string
        }
        Relationships: []
      }
      seed_product_colors: {
        Row: {
          color: Database["public"]["Enums"]["color_key"]
          photo_key: string
          position: number
          product_id: string
        }
        Insert: {
          color: Database["public"]["Enums"]["color_key"]
          photo_key: string
          position: number
          product_id: string
        }
        Update: {
          color?: Database["public"]["Enums"]["color_key"]
          photo_key?: string
          position?: number
          product_id?: string
        }
        Relationships: []
      }
      seed_products: {
        Row: {
          cut_units: number
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          fit: Database["public"]["Enums"]["product_fit"]
          id: string
          kind: string
          material: string
          name: string
          position: number
          price_vnd: number
          slug: string
          sold_out_at: string | null
        }
        Insert: {
          cut_units: number
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          fit: Database["public"]["Enums"]["product_fit"]
          id: string
          kind: string
          material: string
          name: string
          position: number
          price_vnd: number
          slug: string
          sold_out_at?: string | null
        }
        Update: {
          cut_units?: number
          drop_no?: number
          family?: Database["public"]["Enums"]["product_family"]
          fit?: Database["public"]["Enums"]["product_fit"]
          id?: string
          kind?: string
          material?: string
          name?: string
          position?: number
          price_vnd?: number
          slug?: string
          sold_out_at?: string | null
        }
        Relationships: []
      }
      seed_promotions: {
        Row: {
          amount_vnd: number | null
          code: string
          ends_at: string
          kind: Database["public"]["Enums"]["promo_kind"]
          max_discount_vnd: number | null
          min_order_vnd: number | null
          percent: number | null
          position: number
          starts_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          amount_vnd?: number | null
          code: string
          ends_at: string
          kind: Database["public"]["Enums"]["promo_kind"]
          max_discount_vnd?: number | null
          min_order_vnd?: number | null
          percent?: number | null
          position: number
          starts_at: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          amount_vnd?: number | null
          code?: string
          ends_at?: string
          kind?: Database["public"]["Enums"]["promo_kind"]
          max_discount_vnd?: number | null
          min_order_vnd?: number | null
          percent?: number | null
          position?: number
          starts_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      seed_stock_cells: {
        Row: {
          color: Database["public"]["Enums"]["color_key"]
          on_hand: number
          product_id: string
          size: Database["public"]["Enums"]["garment_size"]
        }
        Insert: {
          color: Database["public"]["Enums"]["color_key"]
          on_hand: number
          product_id: string
          size: Database["public"]["Enums"]["garment_size"]
        }
        Update: {
          color?: Database["public"]["Enums"]["color_key"]
          on_hand?: number
          product_id?: string
          size?: Database["public"]["Enums"]["garment_size"]
        }
        Relationships: []
      }
      seed_teasers: {
        Row: {
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          kind: string
          name: string
          photo_key: string
          position: number
          slug: string
        }
        Insert: {
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          kind: string
          name: string
          photo_key: string
          position: number
          slug: string
        }
        Update: {
          drop_no?: number
          family?: Database["public"]["Enums"]["product_family"]
          kind?: string
          name?: string
          photo_key?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      stock_cells: {
        Row: {
          color: Database["public"]["Enums"]["color_key"]
          on_hand: number
          product_id: string
          size: Database["public"]["Enums"]["garment_size"]
        }
        Insert: {
          color: Database["public"]["Enums"]["color_key"]
          on_hand: number
          product_id: string
          size: Database["public"]["Enums"]["garment_size"]
        }
        Update: {
          color?: Database["public"]["Enums"]["color_key"]
          on_hand?: number
          product_id?: string
          size?: Database["public"]["Enums"]["garment_size"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_cells_product_id_color_fkey"
            columns: ["product_id", "color"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["product_id", "color"]
          },
        ]
      }
      teasers: {
        Row: {
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          kind: string
          name: string
          photo_key: string
          position: number
          slug: string
        }
        Insert: {
          drop_no: number
          family: Database["public"]["Enums"]["product_family"]
          kind: string
          name: string
          photo_key: string
          position: number
          slug: string
        }
        Update: {
          drop_no?: number
          family?: Database["public"]["Enums"]["product_family"]
          kind?: string
          name?: string
          photo_key?: string
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "teasers_drop_no_fkey"
            columns: ["drop_no"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["no"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      catalog_snapshot: { Args: never; Returns: Json }
      reset_demo: { Args: { p_anchor?: string }; Returns: undefined }
    }
    Enums: {
      color_key:
        | "black"
        | "cream"
        | "grey"
        | "moss"
        | "brown"
        | "white"
        | "navy"
      garment_size: "S" | "M" | "L" | "XL"
      product_family: "TEE" | "HOODIE" | "JACKET" | "VEST" | "SHIRT" | "PANTS"
      product_fit: "OVERSIZE" | "REGULAR"
      promo_kind: "PERCENT" | "AMOUNT" | "FREE_SHIPPING"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      color_key: ["black", "cream", "grey", "moss", "brown", "white", "navy"],
      garment_size: ["S", "M", "L", "XL"],
      product_family: ["TEE", "HOODIE", "JACKET", "VEST", "SHIRT", "PANTS"],
      product_fit: ["OVERSIZE", "REGULAR"],
      promo_kind: ["PERCENT", "AMOUNT", "FREE_SHIPPING"],
    },
  },
} as const

