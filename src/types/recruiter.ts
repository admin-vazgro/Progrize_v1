export interface Company {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  website: string | null;
  size: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  company_id: string;
  recruiter_id: string;
  title: string;
  location: string | null;
  work_mode: "remote" | "hybrid" | "onsite" | null;
  employment_type: "full-time" | "part-time" | "contract" | "freelance" | null;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string;
  requirements: string[];
  required_skills: string[];
  nice_to_have_skills: string[];
  is_active: boolean;
  posted_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
  application_count?: number;
}

export interface Application {
  id: string;
  job_posting_id: string;
  applicant_id: string;
  status: "applied" | "reviewing" | "shortlisted" | "interview" | "offered" | "rejected";
  fit_score: number | null;
  ats_score: number | null;
  cover_note: string | null;
  recruiter_notes: string | null;
  applied_at: string;
  updated_at: string;
  applicant?: CandidateProfile;
  job_posting?: JobPosting;
}

export interface CandidateProfile {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  email: string | null;
  summary: string | null;
  years_experience: number | null;
  avatar_url: string | null;
  skills: string[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
}

export interface CandidateExperience {
  id: string;
  company_name: string;
  job_title: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  description: string | null;
}

export interface CandidateEducation {
  id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CandidateSuggestion {
  profile: CandidateProfile;
  fit_score: number;
  matching_skills: string[];
  missing_skills: string[];
  job_posting_id: string;
  job_title: string;
}
