export type LeadSource = 'github-search' | 'manual' | 'referral' | 'website' | 'competitor';

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'trial' | 'converted' | 'closed';

export type LeadTier = 'hot' | 'warm' | 'cold';

export interface Lead {
  id: string;
  name: string;
  repo?: string;
  url: string;
  source: LeadSource;
  status: LeadStatus;
  tier: LeadTier;
  email?: string;
  notes: string;
  competitor?: string;
  score: number;
  contactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachMessage {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  type: 'initial' | 'follow-up-1' | 'follow-up-2' | 'follow-up-3';
  createdAt: string;
  sent: boolean;
  sentAt?: string;
}

export interface PipelineMetrics {
  totalLeads: number;
  byStatus: Record<LeadStatus, number>;
  byTier: Record<LeadTier, number>;
  bySource: Record<LeadSource, number>;
  conversionRate: number;
  contactedRate: number;
  averageScore: number;
}

export interface SalesReport {
  generatedAt: string;
  pipeline: PipelineMetrics;
  topLeads: Lead[];
  pendingFollowUps: OutreachMessage[];
  dailyNewLeads: number;
  weeklyNewLeads: number;
}
