export interface Profile {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  summary: string | null;
  years_experience: number | null;
  target_roles: string[] | null;
  target_locations: string[] | null;
  work_preferences: WorkPreferences | null;
  salary_preferences: SalaryPreferences | null;
}

export interface WorkPreferences {
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  willing_to_relocate: boolean;
}

export interface SalaryPreferences {
  min: number | null;
  max: number | null;
  currency: string;
  period: "annual" | "monthly" | "hourly";
}

export interface ExperienceItem {
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
  achievements: string[] | null;
  sort_order: number | null;
}

export interface EducationItem {
  id: string;
  user_id: string;
  profile_id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  aliases: string[] | null;
}

export interface ProfileSkill {
  id: string;
  profile_id: string;
  skill_id: string;
  skill_name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert" | null;
  years_used: number | null;
}

export interface ParsedResume {
  full_name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  portfolio_url: string;
  summary: string;
  years_experience: number;
  experience: Array<{
    company_name: string;
    job_title: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    location: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    start_date: string;
    end_date: string;
  }>;
  skills: Array<{
    name: string;
    category: string;
    level: string;
    years_used: number;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issue_date: string;
  }>;
}
