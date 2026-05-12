export interface Job {
  id: string;
  source: string;
  external_job_id: string | null;
  source_url: string | null;
  company_name: string;
  title: string;
  location: string | null;
  work_mode: "remote" | "hybrid" | "onsite" | null;
  employment_type: "full-time" | "part-time" | "contract" | "freelance" | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  description_raw: string;
  description_clean: string | null;
  requirements: string[] | null;
  responsibilities: string[] | null;
  benefits: string[] | null;
  posted_at: string | null;
  ingested_at: string;
  is_active: boolean;
}

export interface ParsedJob {
  company_name: string;
  title: string;
  location: string;
  work_mode: string;
  employment_type: string;
  seniority: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  summary: string;
  requirements: string[];
  responsibilities: string[];
  required_skills: string[];
  optional_skills: string[];
  keywords: string[];
  benefits: string[];
  years_experience_required: number | null;
  education_required: string | null;
}

export interface JobAnalysisInput {
  job_description: string;
  job_url?: string;
  profile_id: string;
}
