// =============================================================================
// types.gen.ts — tipos do schema de negócio (espelham 0001_business_schema.sql).
// Mesmo formato dos tipos gerados pelo gateway: Database["public"]["Tables"][...].
//
// Convenções do modo genérico (Importantdoc §B5):
//   • owner_id é OPCIONAL no Insert/Update — o gateway o seta pela sessão.
//     NUNCA mande owner_id do front.
//   • Sem org_id em lugar nenhum (1 Neon por tenant).
// Arquivo PROTEGIDO no template final (contrato com o gateway) — no scaffold real
// ele é regenerado a partir do schema; aqui serve de fonte pros repos/telas.
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ContactStatus = "lead" | "prospect" | "customer" | "churned";
export type DealStatus = "open" | "won" | "lost";
export type ActivityType = "call" | "email" | "meeting" | "note" | "task";

// Forma do JSON de qualificação BANT em deals.qualification
export interface DealQualification {
  budget: boolean | null;
  authority: boolean | null;
  need: boolean | null;
  timeline: boolean | null;
  budget_notes: string;
  authority_notes: string;
  need_notes: string;
  timeline_notes: string;
}

export interface Database {
  public: {
    Tables: {
      // ---------------- LOOKUPS (sem owner_id) ----------------
      pipelines: {
        Row: {
          id: string;
          name: string;
          currency: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pipelines"]["Insert"]>;
      };

      pipeline_stages: {
        Row: {
          id: string;
          pipeline_id: string;
          name: string;
          sort_order: number;
          color: string | null;
          win_probability: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          name: string;
          sort_order?: number;
          color?: string | null;
          win_probability?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pipeline_stages"]["Insert"]>;
      };

      tags: {
        Row: {
          id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
      };

      loss_reasons: {
        Row: {
          id: string;
          label: string;
          is_active: boolean;
          usage_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          is_active?: boolean;
          usage_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["loss_reasons"]["Insert"]>;
      };

      // ---------------- DADOS DO REP (owner_id opcional no Insert) ----------------
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          domain: string | null;
          industry: string | null;
          size: string | null;
          revenue: number | null;
          website: string | null;
          linkedin_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string; // setado pelo gateway
          name: string;
          domain?: string | null;
          industry?: string | null;
          size?: string | null;
          revenue?: number | null;
          website?: string | null;
          linkedin_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
      };

      contacts: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string | null;
          first_name: string;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          title: string | null;
          linkedin_url: string | null;
          avatar_url: string | null;
          status: ContactStatus;
          lead_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          first_name: string;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          title?: string | null;
          linkedin_url?: string | null;
          avatar_url?: string | null;
          status?: ContactStatus;
          lead_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
      };

      deals: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          value: number;
          currency: string;
          stage_id: string | null;
          contact_id: string | null;
          company_id: string | null;
          close_date: string | null;
          probability: number;
          status: DealStatus;
          loss_reason: string | null;
          qualification: DealQualification;
          qualification_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          title: string;
          value?: number;
          currency?: string;
          stage_id?: string | null;
          contact_id?: string | null;
          company_id?: string | null;
          close_date?: string | null;
          probability?: number;
          status?: DealStatus;
          loss_reason?: string | null;
          qualification?: DealQualification;
          qualification_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
      };

      activities: {
        Row: {
          id: string;
          owner_id: string;
          type: ActivityType;
          title: string;
          body: string | null;
          contact_id: string | null;
          deal_id: string | null;
          company_id: string | null;
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          type: ActivityType;
          title: string;
          body?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
          company_id?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
      };

      contact_tags: {
        Row: {
          id: string;
          owner_id: string;
          contact_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          contact_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_tags"]["Insert"]>;
      };

      deal_tags: {
        Row: {
          id: string;
          owner_id: string;
          deal_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          deal_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deal_tags"]["Insert"]>;
      };

      sales_goals: {
        Row: {
          id: string;
          owner_id: string;
          goal_type: string;
          target_value: number;
          current_value: number;
          period_month: number;
          period_year: number;
          deal_id: string | null;
          company_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          goal_type?: string;
          target_value?: number;
          current_value?: number;
          period_month: number;
          period_year: number;
          deal_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sales_goals"]["Insert"]>;
      };

    };
    Enums: {
      contact_status: ContactStatus;
      deal_status: DealStatus;
      activity_type: ActivityType;
    };
  };
}
