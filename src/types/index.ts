// src/types/index.ts
// ============================================
// RENEWALRADAR — SHARED TYPES
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AgencyStatus = 'trial' | 'active' | 'paused' | 'cancelled';
export type ClientStatus = 'active' | 'at_risk' | 'churned' | 'saved';
export type Platform = 'twitter' | 'linkedin' | 'instagram';
export type FeedbackOutcome = 'saved' | 'lost' | 'no_action' | 'false_alarm';

export interface Agency {
  id: string;
  name: string;
  owner_email: string;
  owner_phone?: string;
  timezone: string;
  send_time: string;
  status: AgencyStatus;
  trial_ends_at: string;
  total_clients: number;
  total_saved: number;
  total_lost: number;
  created_at: string;
  clients?: Client[];
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  industry: string;
  contact_email?: string;
  contact_phone?: string;
  monthly_retainer_cents: number;
  contract_end_date?: string;
  status: ClientStatus;
  risk_score: number;
  risk_reason?: string;
  last_interaction_at?: string;
  created_at: string;
  social_accounts?: SocialAccount[];
}

export interface SocialAccount {
  id: string;
  client_id: string;
  platform: Platform;
  account_handle: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyMetrics {
  id: string;
  client_id: string;
  platform: string;
  followers: number;
  impressions: number;
  engagement_rate: number;
  clicks: number;
  posts_count: number;
  logged_at: string;
}

export interface RiskSnapshot {
  id: string;
  client_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  risk_factors: string[];
  metrics_snapshot: ClientMetricsData;
  predicted_churn_date?: string;
  created_at: string;
}

export interface DailyDigest {
  id: string;
  agency_id: string;
  sent_at: string;
  email_status: string;
  email_subject: string;
  short_summary: string;
  full_analysis: DigestAnalysis;
  clients_at_risk: number;
  clients_saved: number;
  revenue_at_risk_cents: number;
  agencies?: Agency;
}

export interface DigestAnalysis {
  clients: ClientAnalysisResult[];
}

export interface ClientAnalysisResult {
  client: Client;
  risk: RiskResult;
  metrics: ClientMetricsData;
  analysis: AIAnalysis | null;
}

export interface ClientMetricsData {
  followers: number;
  impressions: number;
  engagement_rate: number;
  clicks: number;
  posts_count: number;
}

export interface HistoricalMetrics {
  followers_7d_avg: number;
  impressions_7d_avg: number;
  engagement_7d_avg: number;
  posts_7d_avg: number;
  followers_30d_avg: number;
  impressions_30d_avg: number;
  engagement_30d_avg: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: string[];
}

export interface AIAnalysis {
  keep_doing: string;
  stop_doing: string;
  intervention_script: string;
  upsell_opportunity: string | null;
}

export interface Feedback {
  id: string;
  client_id: string;
  digest_id: string;
  outcome: FeedbackOutcome;
  notes?: string;
  created_at: string;
}
