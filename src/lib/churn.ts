// src/lib/churn.ts
// ============================================
// RENEWALRADAR — CHURN RISK ALGORITHM
// The "secret sauce" — updated scoring logic
// ============================================

import { ClientMetricsData, HistoricalMetrics, RiskLevel, RiskResult } from '@/types';

// Weight map — tune these as you gather real data
const WEIGHTS = {
  engagementDropSevere: 25,    // >30% drop
  engagementDropMild: 15,      // 15-30% drop
  impressionCrash: 20,         // >40% drop
  impressionDecline: 10,       // 20-40% drop
  followerLoss: 15,            // Negative follower growth
  contentSilenceSevere: 20,    // No posts in 7+ days
  contentSilenceMild: 10,      // No posts in 3-7 days
  postFrequencyHalved: 10,     // Posts dropped 50%+ vs avg
  contractEndingSoon: 15,      // Contract ends in <30 days
} as const;

export function calculateRiskScore(
  current: ClientMetricsData,
  history: HistoricalMetrics,
  daysSinceLastPost: number,
  daysUntilContractEnd?: number
): RiskResult {
  let score = 0;
  const factors: string[] = [];

  // ─── 1. Engagement Drop vs 7-day average (HIGHEST SIGNAL) ───
  if (history.engagement_7d_avg > 0 && current.engagement_rate >= 0) {
    const engagementChange =
      (current.engagement_rate - history.engagement_7d_avg) / history.engagement_7d_avg;

    if (engagementChange < -0.30) {
      score += WEIGHTS.engagementDropSevere;
      factors.push(
        `Engagement crashed ${Math.abs(Math.round(engagementChange * 100))}% vs last week (${(current.engagement_rate * 100).toFixed(2)}% → ${(history.engagement_7d_avg * 100).toFixed(2)}%)`
      );
    } else if (engagementChange < -0.15) {
      score += WEIGHTS.engagementDropMild;
      factors.push(
        `Engagement slipping ${Math.abs(Math.round(engagementChange * 100))}% vs last week`
      );
    }
  }

  // ─── 2. Impressions Crash ───
  if (history.impressions_7d_avg > 0 && current.impressions >= 0) {
    const impressionChange =
      (current.impressions - history.impressions_7d_avg) / history.impressions_7d_avg;

    if (impressionChange < -0.40) {
      score += WEIGHTS.impressionCrash;
      factors.push(
        `Impressions fell ${Math.abs(Math.round(impressionChange * 100))}% — content reach collapsing`
      );
    } else if (impressionChange < -0.20) {
      score += WEIGHTS.impressionDecline;
      factors.push(
        `Impressions down ${Math.abs(Math.round(impressionChange * 100))}% from baseline`
      );
    }
  }

  // ─── 3. Follower Decline ───
  if (history.followers_7d_avg > 0 && current.followers >= 0) {
    const followerChange =
      (current.followers - history.followers_7d_avg) / history.followers_7d_avg;

    if (followerChange < -0.10) {
      score += WEIGHTS.followerLoss;
      factors.push(
        `Audience shrinking: lost ${Math.abs(Math.round(followerChange * 100))}% of followers`
      );
    }
  }

  // ─── 4. Content Silence ───
  if (daysSinceLastPost > 7) {
    score += WEIGHTS.contentSilenceSevere;
    factors.push(`Content blackout: no posts in ${daysSinceLastPost} days`);
  } else if (daysSinceLastPost > 3) {
    score += WEIGHTS.contentSilenceMild;
    factors.push(`Content gap: ${daysSinceLastPost} days since last post`);
  }

  // ─── 5. Post Frequency Drop ───
  if (history.posts_7d_avg > 1 && current.posts_count < history.posts_7d_avg * 0.5) {
    score += WEIGHTS.postFrequencyHalved;
    factors.push(
      `Posting frequency dropped 50%+ (avg: ${history.posts_7d_avg.toFixed(1)}/wk, this week: ${current.posts_count})`
    );
  }

  // ─── 6. Contract Ending Soon ───
  if (daysUntilContractEnd !== undefined && daysUntilContractEnd > 0 && daysUntilContractEnd <= 30) {
    score += WEIGHTS.contractEndingSoon;
    factors.push(`Contract renews in ${daysUntilContractEnd} days — renewal window open`);
  }

  // ─── Cap and classify ───
  score = Math.min(100, Math.round(score));

  let level: RiskLevel = 'low';
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';

  return { score, level, factors };
}

// Predict when client will churn based on current risk trajectory
export function predictChurnDate(
  riskScore: number,
  currentDate: Date = new Date()
): Date | null {
  if (riskScore < 50) return null;

  // Critical = 14 days, High = 30 days (historically accurate for agencies)
  const days = riskScore >= 75 ? 14 : 30;
  const predicted = new Date(currentDate);
  predicted.setDate(predicted.getDate() + days);
  return predicted;
}

// Get risk color for UI rendering
export function getRiskColor(level: RiskLevel): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  switch (level) {
    case 'critical':
      return {
        bg: '#fef2f2',
        border: '#ef4444',
        text: '#991b1b',
        badge: '#ef4444',
      };
    case 'high':
      return {
        bg: '#fff7ed',
        border: '#f97316',
        text: '#9a3412',
        badge: '#f97316',
      };
    case 'medium':
      return {
        bg: '#fefce8',
        border: '#eab308',
        text: '#713f12',
        badge: '#eab308',
      };
    default:
      return {
        bg: '#f0fdf4',
        border: '#22c55e',
        text: '#14532d',
        badge: '#22c55e',
      };
  }
}

// Urgency message for email subject line
export function getEmailSubject(
  criticalCount: number,
  highCount: number,
  totalCount: number
): string {
  if (criticalCount > 0) {
    return `🚨 ${criticalCount} client${criticalCount > 1 ? 's' : ''} at CRITICAL churn risk — act today`;
  }
  if (highCount > 0) {
    return `⚠️ ${highCount} client${highCount > 1 ? 's' : ''} showing churn signals — check analysis`;
  }
  return `✅ All ${totalCount} clients stable — RenewalRadar daily report`;
}
