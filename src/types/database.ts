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
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          headline: string | null;
          location: string | null;
          email: string | null;
          phone: string | null;
          linkedin_url: string | null;
          portfolio_url: string | null;
          summary: string | null;
          avatar_url: string | null;
          cover_url: string | null;
          years_experience: number | null;
          target_roles: string[] | null;
          target_locations: string[] | null;
          work_preferences: Json | null;
          salary_preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          headline?: string | null;
          location?: string | null;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          summary?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          years_experience?: number | null;
          target_roles?: string[] | null;
          target_locations?: string[] | null;
          work_preferences?: Json | null;
          salary_preferences?: Json | null;
        };
        Update: {
          full_name?: string | null;
          headline?: string | null;
          location?: string | null;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          summary?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          years_experience?: number | null;
          target_roles?: string[] | null;
          target_locations?: string[] | null;
          work_preferences?: Json | null;
          salary_preferences?: Json | null;
        };
      };
      resume_files: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string | null;
          file_size_bytes: number | null;
          parse_status: "pending" | "processing" | "completed" | "failed";
          uploaded_at: string;
          parsed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          parse_status?: "pending" | "processing" | "completed" | "failed";
          parsed_at?: string | null;
        };
        Update: {
          parse_status?: "pending" | "processing" | "completed" | "failed";
          parsed_at?: string | null;
        };
      };
      experience_items: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string;
          company_name: string;
          job_title: string;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
          location: string | null;
          description: string | null;
          achievements: Json | null;
          sort_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id: string;
          company_name: string;
          job_title: string;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          location?: string | null;
          description?: string | null;
          achievements?: Json | null;
          sort_order?: number | null;
        };
        Update: {
          company_name?: string;
          job_title?: string;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          location?: string | null;
          description?: string | null;
          achievements?: Json | null;
          sort_order?: number | null;
        };
      };
      education_items: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string;
          institution: string;
          degree: string | null;
          field_of_study: string | null;
          start_date: string | null;
          end_date: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id: string;
          institution: string;
          degree?: string | null;
          field_of_study?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          description?: string | null;
        };
        Update: {
          institution?: string;
          degree?: string | null;
          field_of_study?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          description?: string | null;
        };
      };
      certifications: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string;
          name: string;
          issuer: string | null;
          issue_date: string | null;
          expiration_date: string | null;
          credential_id: string | null;
          credential_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id: string;
          name: string;
          issuer?: string | null;
          issue_date?: string | null;
          expiration_date?: string | null;
          credential_id?: string | null;
          credential_url?: string | null;
        };
        Update: {
          name?: string;
          issuer?: string | null;
        };
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          aliases: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          aliases?: string[] | null;
        };
        Update: {
          name?: string;
          category?: string | null;
          aliases?: string[] | null;
        };
      };
      profile_skills: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string;
          skill_id: string;
          level: string | null;
          years_used: number | null;
          evidence: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id: string;
          skill_id: string;
          level?: string | null;
          years_used?: number | null;
          evidence?: Json | null;
        };
        Update: {
          level?: string | null;
          years_used?: number | null;
        };
      };
      jobs: {
        Row: {
          id: string;
          source: string;
          external_job_id: string | null;
          source_url: string | null;
          company_name: string;
          company_domain: string | null;
          title: string;
          location: string | null;
          work_mode: string | null;
          employment_type: string | null;
          seniority: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
          description_raw: string;
          description_clean: string | null;
          requirements: Json | null;
          responsibilities: Json | null;
          benefits: Json | null;
          posted_at: string | null;
          ingested_at: string;
          expires_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          source: string;
          external_job_id?: string | null;
          source_url?: string | null;
          company_name: string;
          company_domain?: string | null;
          title: string;
          location?: string | null;
          work_mode?: string | null;
          employment_type?: string | null;
          seniority?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          description_raw: string;
          description_clean?: string | null;
          requirements?: Json | null;
          responsibilities?: Json | null;
          benefits?: Json | null;
          posted_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          is_active?: boolean;
          description_clean?: string | null;
        };
      };
      job_skills: {
        Row: {
          id: string;
          job_id: string;
          skill_id: string;
          importance: string | null;
          is_required: boolean;
        };
        Insert: {
          id?: string;
          job_id: string;
          skill_id: string;
          importance?: string | null;
          is_required?: boolean;
        };
        Update: {
          importance?: string | null;
          is_required?: boolean;
        };
      };
      job_matches: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string;
          job_id: string;
          fit_score: number;
          ats_score: number;
          skill_overlap_score: number | null;
          experience_score: number | null;
          title_similarity_score: number | null;
          seniority_score: number | null;
          location_score: number | null;
          semantic_score: number | null;
          missing_skills: Json | null;
          missing_keywords: Json | null;
          strengths: Json | null;
          weaknesses: Json | null;
          explanation: Json | null;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id: string;
          job_id: string;
          fit_score: number;
          ats_score: number;
          skill_overlap_score?: number | null;
          experience_score?: number | null;
          title_similarity_score?: number | null;
          seniority_score?: number | null;
          location_score?: number | null;
          semantic_score?: number | null;
          missing_skills?: Json | null;
          missing_keywords?: Json | null;
          strengths?: Json | null;
          weaknesses?: Json | null;
          explanation?: Json | null;
        };
        Update: {
          fit_score?: number;
          ats_score?: number;
          explanation?: Json | null;
        };
      };
      tailored_resumes: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string;
          job_id: string | null;
          source_resume_file_id: string | null;
          version_name: string | null;
          content_json: Json | null;
          exported_storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id: string;
          job_id?: string | null;
          source_resume_file_id?: string | null;
          version_name?: string | null;
          content_json?: Json | null;
          exported_storage_path?: string | null;
        };
        Update: {
          version_name?: string | null;
          content_json?: Json | null;
          exported_storage_path?: string | null;
        };
      };
      analysis_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_type: string;
          input_payload: Json | null;
          status: "pending" | "processing" | "completed" | "failed";
          output_payload: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_type: string;
          input_payload?: Json | null;
          status?: "pending" | "processing" | "completed" | "failed";
          output_payload?: Json | null;
          error_message?: string | null;
          completed_at?: string | null;
        };
        Update: {
          status?: "pending" | "processing" | "completed" | "failed";
          output_payload?: Json | null;
          error_message?: string | null;
          completed_at?: string | null;
        };
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}
