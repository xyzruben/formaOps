export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          plan: 'FREE' | 'PRO' | 'ENTERPRISE';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
          created_at?: string;
          updated_at?: string;
        };
      };
      prompts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          template: string;
          variables: Json;
          version: number;
          status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          tags: string[];
          created_at: string;
          updated_at: string;
          published_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          template: string;
          variables: Json;
          version?: number;
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          template?: string;
          variables?: Json;
          version?: number;
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          user_id?: string;
        };
      };
      executions: {
        Row: {
          id: string;
          inputs: Json;
          context: Json | null;
          status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
          priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
          edge_function_id: string | null;
          output: string | null;
          validated_output: Json | null;
          validation_status: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
          token_usage: Json | null;
          latency_ms: number | null;
          cost_usd: number | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          user_id: string;
          prompt_id: string;
        };
        Insert: {
          id?: string;
          inputs: Json;
          context?: Json | null;
          status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
          priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
          edge_function_id?: string | null;
          output?: string | null;
          validated_output?: Json | null;
          validation_status?: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
          token_usage?: Json | null;
          latency_ms?: number | null;
          cost_usd?: number | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          user_id: string;
          prompt_id: string;
        };
        Update: {
          id?: string;
          inputs?: Json;
          context?: Json | null;
          status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
          priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
          edge_function_id?: string | null;
          output?: string | null;
          validated_output?: Json | null;
          validation_status?: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
          token_usage?: Json | null;
          latency_ms?: number | null;
          cost_usd?: number | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          user_id?: string;
          prompt_id?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
