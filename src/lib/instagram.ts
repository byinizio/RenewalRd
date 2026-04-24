// src/lib/instagram.ts
// Instagram Graph API — 200 requests/hour on free tier
// Requires Business or Creator account
// Access token must be long-lived (60 days) — refresh before expiry

import { ClientMetricsData } from '@/types';

export async function getInstagramMetrics(
  userId: string, // Instagram User ID (not handle)
  accessToken: string
): Promise<ClientMetricsData | null> {
  try {
    // Get account basic info + follower count
    const accountRes = await fetch(
      `https://graph.instagram.com/v18.0/${userId}?fields=id,username,followers_count,media_count&access_token=${accessToken}`
    );

    if (!accountRes.ok) {
      console.error(`Instagram account fetch failed:`, await accountRes.text());
      return null;
    }

    const accountData = await accountRes.json();

    // Get recent media from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const mediaRes = await fetch(
      `https://graph.instagram.com/v18.0/${userId}/media?` +
        new URLSearchParams({
          fields: 'id,caption,media_type,timestamp,like_count,comments_count,reach,impressions',
          since: sevenDaysAgo,
          limit: '50',
          access_token: accessToken,
        })
    );

    if (!mediaRes.ok) {
      // Return follower data only if media fetch fails
      return {
        followers: accountData.followers_count || 0,
        impressions: 0,
        engagement_rate: 0,
        clicks: 0,
        posts_count: 0,
      };
    }

    const mediaData = await mediaRes.json();
    const media = mediaData.data || [];

    // Aggregate 7-day metrics
    const totalImpressions = media.reduce(
      (sum: number, m: any) => sum + (m.impressions || 0),
      0
    );
    const totalReach = media.reduce(
      (sum: number, m: any) => sum + (m.reach || 0),
      0
    );
    const totalLikes = media.reduce(
      (sum: number, m: any) => sum + (m.like_count || 0),
      0
    );
    const totalComments = media.reduce(
      (sum: number, m: any) => sum + (m.comments_count || 0),
      0
    );

    // Use reach as impressions fallback
    const effectiveImpressions = totalImpressions || totalReach || media.length * 500;
    const totalEngagements = totalLikes + totalComments;
    const engagementRate =
      effectiveImpressions > 0 ? totalEngagements / effectiveImpressions : 0;

    return {
      followers: accountData.followers_count || 0,
      impressions: effectiveImpressions,
      engagement_rate: engagementRate,
      clicks: 0, // Instagram Graph doesn't expose link clicks easily
      posts_count: media.length,
    };
  } catch (err) {
    console.error(`getInstagramMetrics error:`, err);
    return null;
  }
}

// Exchange short-lived token for long-lived (60 days)
export async function refreshInstagramToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/access_token?` +
        new URLSearchParams({
          grant_type: 'ig_exchange_token',
          client_secret: appSecret,
          access_token: shortLivedToken,
        })
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}
