export interface JobResult {
  job_title: string;
  company_name: string;
  job_url: string;
  organisation_tier: 'startup' | 'midlevel' | 'enterprise';
  description: string;
  posted_date: string | null; // ISO date string or null
}

export interface ValidatedJobResult extends JobResult {
  alignment_score: number; // 0–100
  justification: string;
}

export interface UnscoredJobResult extends JobResult {}

export type PipelineEventType = 'progress' | 'result' | 'warning' | 'error' | 'done';

export interface PipelineEvent {
  event: PipelineEventType;
  message?: string;
  data?: unknown;
}

export interface PipelineResponse {
  validated: ValidatedJobResult[];
  unscored: UnscoredJobResult[];
  warnings: string[];
}
