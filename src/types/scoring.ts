export interface FitScore {
  overall: number;
  skill_overlap: number;
  experience_relevance: number;
  title_similarity: number;
  seniority_match: number;
  location_match: number;
  semantic_similarity: number;
}

export interface ATSScore {
  overall: number;
  keyword_coverage: number;
  required_skill_coverage: number;
  section_completeness: number;
  measurable_impact: number;
  role_title_alignment: number;
}

export interface ScoreBreakdown {
  fit_score: FitScore;
  ats_score: ATSScore;
  missing_required_skills: string[];
  missing_optional_skills: string[];
  missing_keywords: string[];
  matching_skills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  explanation: string;
}

export interface JobMatch {
  id: string;
  user_id: string;
  profile_id: string;
  job_id: string;
  fit_score: number;
  ats_score: number;
  score_breakdown: ScoreBreakdown;
  computed_at: string;
}
