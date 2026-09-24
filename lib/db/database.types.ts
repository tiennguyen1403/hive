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
      addresses: {
        Row: {
          id: string
          is_default: boolean
          label: string
          line: string
          phone: string
          position: number
          profile_id: string
          province_code: string
          recipient: string
          ward_code: string
        }
        Insert: {
          id?: string
          is_default?: boolean
          label: string
          line: string
          phone: string
          position: number
          profile_id: string
          province_code: string
          recipient: string
          ward_code: string
        }
        Update: {
          id?: string
          is_default?: boolean
          label?: string
          line?: string
          phone?: string
          position?: number
          profile_id?: string
          province_code?: string
          recipient?: string
          ward_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      events: {
        Row: {
          actor: string
          actor_role: string
          at: string
          drop_no: number | null
          id: number
          kind: string
          order_code: string | null
          payload: Json
          product_id: string | null
          promo_code: string | null
        }
        Insert: {
          actor?: string
          actor_role: string
          at: string
          drop_no?: number | null
          id?: never
          kind: string
          order_code?: string | null
          payload?: Json
          product_id?: string | null
          promo_code?: string | null
        }
        Update: {
          actor?: string
          actor_role?: string
          at?: string
          drop_no?: number | null
          id?: never
          kind?: string
          order_code?: string | null
          payload?: Json
          product_id?: string | null
          promo_code?: string | null
        }
        Relationships: []
      }
      order_lines: {
        Row: {
          color: Database["public"]["Enums"]["color_key"]
          order_code: string
          position: number
          product_id: string
          qty: number
          size: Database["public"]["Enums"]["garment_size"]
          unit_price_vnd: number
        }
        Insert: {
          color: Database["public"]["Enums"]["color_key"]
          order_code: string
          position: number
          product_id: string
          qty: number
          size: Database["public"]["Enums"]["garment_size"]
          unit_price_vnd: number
        }
        Update: {
          color?: Database["public"]["Enums"]["color_key"]
          order_code?: string
          position?: number
          product_id?: string
          qty?: number
          size?: Database["public"]["Enums"]["garment_size"]
          unit_price_vnd?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_code_fkey"
            columns: ["order_code"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_key: string
          cancel_reason: string | null
          cancelled_at: string | null
          carrier: string | null
          cod_fee_vnd: number
          code: string
          customer_handle: string | null
          delivered_at: string | null
          delivery: Database["public"]["Enums"]["delivery_method"]
          discount_vnd: number
          due_at: string | null
          email: string
          line: string
          note: string
          paid_at: string | null
          payment: Database["public"]["Enums"]["payment_method"]
          phone: string
          placed_at: string
          profile_id: string | null
          promo_code: string | null
          province_code: string
          recipient: string
          shipped_at: string | null
          shipping_fee_vnd: number
          state: Database["public"]["Enums"]["order_state"]
          tracking_code: string | null
          ward_code: string
        }
        Insert: {
          access_key?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          cod_fee_vnd: number
          code: string
          customer_handle?: string | null
          delivered_at?: string | null
          delivery: Database["public"]["Enums"]["delivery_method"]
          discount_vnd: number
          due_at?: string | null
          email: string
          line: string
          note?: string
          paid_at?: string | null
          payment: Database["public"]["Enums"]["payment_method"]
          phone: string
          placed_at: string
          profile_id?: string | null
          promo_code?: string | null
          province_code: string
          recipient: string
          shipped_at?: string | null
          shipping_fee_vnd: number
          state: Database["public"]["Enums"]["order_state"]
          tracking_code?: string | null
          ward_code: string
        }
        Update: {
          access_key?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          cod_fee_vnd?: number
          code?: string
          customer_handle?: string | null
          delivered_at?: string | null
          delivery?: Database["public"]["Enums"]["delivery_method"]
          discount_vnd?: number
          due_at?: string | null
          email?: string
          line?: string
          note?: string
          paid_at?: string | null
          payment?: Database["public"]["Enums"]["payment_method"]
          phone?: string
          placed_at?: string
          profile_id?: string | null
          promo_code?: string | null
          province_code?: string
          recipient?: string
          shipped_at?: string | null
          shipping_fee_vnd?: number
          state?: Database["public"]["Enums"]["order_state"]
          tracking_code?: string | null
          ward_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_fkey"
            columns: ["promo_code"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["code"]
          },
        ]
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
      profiles: {
        Row: {
          email: string
          handle: string | null
          id: string
          joined_at: string
          name: string
          phone: string
        }
        Insert: {
          email: string
          handle?: string | null
          id: string
          joined_at?: string
          name: string
          phone: string
        }
        Update: {
          email?: string
          handle?: string | null
          id?: string
          joined_at?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          amount_vnd: number | null
          code: string
          ends_at: string
          kind: Database["public"]["Enums"]["promo_kind"]
          max_discount_vnd: number | null
          min_order_vnd: number | null
          paused: boolean
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
          paused?: boolean
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
          paused?: boolean
          percent?: number | null
          position?: number
          starts_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      rate_hits: {
        Row: {
          bucket: string
          hits: number
          subject: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits: number
          subject: string
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          subject?: string
          window_start?: string
        }
        Relationships: []
      }
      seed_addresses: {
        Row: {
          handle: string
          is_default: boolean
          label: string
          line: string
          phone: string
          position: number
          province_code: string
          recipient: string
          ward_code: string
        }
        Insert: {
          handle: string
          is_default: boolean
          label: string
          line: string
          phone: string
          position: number
          province_code: string
          recipient: string
          ward_code: string
        }
        Update: {
          handle?: string
          is_default?: boolean
          label?: string
          line?: string
          phone?: string
          position?: number
          province_code?: string
          recipient?: string
          ward_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "seed_addresses_handle_fkey"
            columns: ["handle"]
            isOneToOne: false
            referencedRelation: "seed_customers"
            referencedColumns: ["handle"]
          },
        ]
      }
      seed_customers: {
        Row: {
          email: string
          handle: string
          joined_at: string
          name: string
          phone: string
        }
        Insert: {
          email: string
          handle: string
          joined_at: string
          name: string
          phone: string
        }
        Update: {
          email?: string
          handle?: string
          joined_at?: string
          name?: string
          phone?: string
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
      seed_order_lines: {
        Row: {
          color: Database["public"]["Enums"]["color_key"]
          order_code: string
          position: number
          product_id: string
          qty: number
          size: Database["public"]["Enums"]["garment_size"]
          unit_price_vnd: number
        }
        Insert: {
          color: Database["public"]["Enums"]["color_key"]
          order_code: string
          position: number
          product_id: string
          qty: number
          size: Database["public"]["Enums"]["garment_size"]
          unit_price_vnd: number
        }
        Update: {
          color?: Database["public"]["Enums"]["color_key"]
          order_code?: string
          position?: number
          product_id?: string
          qty?: number
          size?: Database["public"]["Enums"]["garment_size"]
          unit_price_vnd?: number
        }
        Relationships: []
      }
      seed_orders: {
        Row: {
          access_key: string
          cancel_reason: string | null
          cancelled_at: string | null
          cod_fee_vnd: number
          code: string
          customer_handle: string | null
          delivered_at: string | null
          delivery: Database["public"]["Enums"]["delivery_method"]
          discount_vnd: number
          due_at: string | null
          email: string
          line: string
          note: string
          paid_at: string | null
          payment: Database["public"]["Enums"]["payment_method"]
          phone: string
          placed_at: string
          profile_id: string | null
          promo_code: string | null
          province_code: string
          recipient: string
          shipped_at: string | null
          shipping_fee_vnd: number
          state: Database["public"]["Enums"]["order_state"]
          tracking_code: string | null
          ward_code: string
        }
        Insert: {
          access_key?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cod_fee_vnd: number
          code: string
          customer_handle?: string | null
          delivered_at?: string | null
          delivery: Database["public"]["Enums"]["delivery_method"]
          discount_vnd: number
          due_at?: string | null
          email: string
          line: string
          note?: string
          paid_at?: string | null
          payment: Database["public"]["Enums"]["payment_method"]
          phone: string
          placed_at: string
          profile_id?: string | null
          promo_code?: string | null
          province_code: string
          recipient: string
          shipped_at?: string | null
          shipping_fee_vnd: number
          state: Database["public"]["Enums"]["order_state"]
          tracking_code?: string | null
          ward_code: string
        }
        Update: {
          access_key?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cod_fee_vnd?: number
          code?: string
          customer_handle?: string | null
          delivered_at?: string | null
          delivery?: Database["public"]["Enums"]["delivery_method"]
          discount_vnd?: number
          due_at?: string | null
          email?: string
          line?: string
          note?: string
          paid_at?: string | null
          payment?: Database["public"]["Enums"]["payment_method"]
          phone?: string
          placed_at?: string
          profile_id?: string | null
          promo_code?: string | null
          province_code?: string
          recipient?: string
          shipped_at?: string | null
          shipping_fee_vnd?: number
          state?: Database["public"]["Enums"]["order_state"]
          tracking_code?: string | null
          ward_code?: string
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
          paused: boolean
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
          paused?: boolean
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
          paused?: boolean
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
      add_address: {
        Args: {
          p_default: boolean
          p_label: string
          p_line: string
          p_phone: string
          p_province_code: string
          p_recipient: string
          p_ward_code: string
        }
        Returns: string
      }
      admin_add_drop: {
        Args: {
          p_closes_at: string
          p_no: number
          p_now: string
          p_opens_at: string
        }
        Returns: undefined
      }
      admin_add_product: {
        Args: { p_input: Json; p_now: string }
        Returns: string
      }
      admin_add_promo: {
        Args: { p_now: string; p_terms: Json }
        Returns: undefined
      }
      admin_add_teaser: {
        Args: {
          p_drop_no: number
          p_family: string
          p_garment: string
          p_name: string
          p_now: string
          p_photo_key: string
          p_slug: string
        }
        Returns: undefined
      }
      admin_adjust_stock: {
        Args: {
          p_cells: Json
          p_note: string
          p_now: string
          p_product_id: string
          p_reason: string
          p_ref: string
        }
        Returns: undefined
      }
      admin_cancel_order: {
        Args: {
          p_code: string
          p_note: string
          p_now: string
          p_reason: string
        }
        Returns: undefined
      }
      admin_edit_address: {
        Args: {
          p_code: string
          p_now: string
          p_reason: string
          p_ship_to: Json
        }
        Returns: undefined
      }
      admin_edit_promo: {
        Args: { p_code: string; p_now: string; p_terms: Json }
        Returns: undefined
      }
      admin_end_promo: {
        Args: { p_code: string; p_now: string }
        Returns: undefined
      }
      admin_hand_over: {
        Args: {
          p_carrier: string
          p_code: string
          p_note: string
          p_now: string
          p_tracking_code: string
        }
        Returns: undefined
      }
      admin_mark_delivered: {
        Args: { p_code: string; p_now: string }
        Returns: undefined
      }
      admin_mark_paid: {
        Args: { p_code: string; p_now: string }
        Returns: undefined
      }
      admin_note_order: {
        Args: { p_code: string; p_now: string; p_text: string }
        Returns: undefined
      }
      admin_orders: { Args: never; Returns: Json }
      admin_pause_promo: {
        Args: { p_code: string; p_now: string; p_paused: boolean }
        Returns: undefined
      }
      admin_raise_promo_limit: {
        Args: { p_after: number; p_code: string; p_now: string }
        Returns: undefined
      }
      admin_reorder_colors: {
        Args: {
          p_colors: Database["public"]["Enums"]["color_key"][]
          p_id: string
          p_now: string
        }
        Returns: undefined
      }
      admin_schedule_drop: {
        Args: {
          p_closes_at: string
          p_no: number
          p_now: string
          p_opens_at: string
        }
        Returns: undefined
      }
      admin_set_product_photo: {
        Args: {
          p_color: Database["public"]["Enums"]["color_key"]
          p_id: string
          p_now: string
          p_photo_key: string
        }
        Returns: string
      }
      admin_update_product: {
        Args: { p_id: string; p_now: string; p_patch: Json }
        Returns: undefined
      }
      assert_now: { Args: { p_now: string }; Returns: undefined }
      cancel_order: {
        Args: { p_code: string; p_now: string }
        Returns: undefined
      }
      catalog_snapshot: { Args: never; Returns: Json }
      demo_anchor: { Args: { p_at?: string }; Returns: string }
      expire_and_lock: {
        Args: {
          p_colors: Database["public"]["Enums"]["color_key"][]
          p_now: string
          p_pids: string[]
          p_sizes: Database["public"]["Enums"]["garment_size"][]
        }
        Returns: number
      }
      expire_transfers: { Args: { p_now: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      json_count: { Args: { p_value: Json }; Returns: number }
      my_orders: { Args: never; Returns: Json }
      order_json: { Args: { p_code: string }; Returns: Json }
      parse_vn_iso: { Args: { p_text: string }; Returns: string }
      photo_key_ok: { Args: { p_key: string }; Returns: boolean }
      place_order: { Args: { p_input: Json; p_now: string }; Returns: Json }
      read_promo_terms: { Args: { p_terms: Json }; Returns: Json }
      receipt_order: { Args: { p_code: string; p_key: string }; Returns: Json }
      remove_address: { Args: { p_id: string }; Returns: boolean }
      reset_demo: { Args: { p_anchor?: string }; Returns: undefined }
      set_default_address: { Args: { p_id: string }; Returns: boolean }
      sync_sold_out: {
        Args: { p_now: string; p_product_ids: string[] }
        Returns: undefined
      }
      take_rate: {
        Args: {
          p_bucket: string
          p_cost: number
          p_limit: number
          p_now?: string
          p_subject: string
          p_window_seconds: number
        }
        Returns: number
      }
      tidy_rate_hits: {
        Args: { p_clear?: string[]; p_now?: string }
        Returns: number
      }
      track_order: { Args: { p_code: string; p_phone: string }; Returns: Json }
      update_address: {
        Args: {
          p_default: boolean
          p_id: string
          p_label: string
          p_line: string
          p_phone: string
          p_province_code: string
          p_recipient: string
          p_ward_code: string
        }
        Returns: boolean
      }
      vn_iso: { Args: { p_at: string }; Returns: string }
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
      delivery_method: "STANDARD" | "EXPRESS"
      garment_size: "S" | "M" | "L" | "XL"
      order_state:
        | "AWAITING_TRANSFER"
        | "RECEIVED"
        | "PAID"
        | "SHIPPING"
        | "DELIVERED"
        | "CANCELLED"
      payment_method: "BANK_TRANSFER" | "CARD" | "COD"
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
      delivery_method: ["STANDARD", "EXPRESS"],
      garment_size: ["S", "M", "L", "XL"],
      order_state: [
        "AWAITING_TRANSFER",
        "RECEIVED",
        "PAID",
        "SHIPPING",
        "DELIVERED",
        "CANCELLED",
      ],
      payment_method: ["BANK_TRANSFER", "CARD", "COD"],
      product_family: ["TEE", "HOODIE", "JACKET", "VEST", "SHIRT", "PANTS"],
      product_fit: ["OVERSIZE", "REGULAR"],
      promo_kind: ["PERCENT", "AMOUNT", "FREE_SHIPPING"],
    },
  },
} as const

