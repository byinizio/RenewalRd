// src/lib/twitter.ts
// X API v2 — free tier: 500K tweets/month read
// Strategy: Pull ONCE daily at 8am, cache in Supabase. Never hit twice.

import { ClientMetricsData } from '@/types';

export async function getTwitterMetrics(
  handle: string,
  bearerToken: string
): Promise<ClientMetricsData | null> {
  try {
    // Step 1: Get user ID from handle
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=public_metrics,created_at`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        next: { revalidate: 0 }, // No cache
      }
    );

    if (!userRes.ok) {
      const err = await userRes.text();
      console.error(`Twitter user lookup failed for @${handle}:`, err);
      return null;
    }

    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) return null;

    // Step 2: Get tweets from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?` +
        new URLSearchParams({
          max_results: '100',
          'tweet.fields': 'public_metrics,created_at',
          start_time: sevenDaysAgo,
        }),
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        next: { revalidate: 0 },
      }
    );

    if (!tweetsRes.ok) {
      console.error(`Twitter tweets fetch failed for @${handle}`);
      // Return follower data only, without engagement
      return {
        followers: userData.data.public_metrics?.followers_count || 0,
        impressions: 0,
        engagement_rate: 0,
        clicks: 0,
        posts_count: 0,
      };
    }

    const tweetsData = await tweetsRes.json();
    const tweets = tweetsData.data || [];

    // Aggregate metrics across all tweets
    const totalImpressions = tweets.reduce(
      (sum: number, t: any) => sum + (t.public_metrics?.impression_count || 0),
      0
    );
    const totalLikes = tweets.reduce(
      (sum: number, t: any) => sum + (t.public_metrics?.like_count || 0),
      0
    );
    const totalRetweets = tweets.reduce(
      (sum: number, t: any) => sum + (t.public_metrics?.retweet_count || 0),
      0
    );
    const totalReplies = tweets.reduce(
      (sum: number, t: any) => sum + (t.public_metrics?.reply_count || 0),
      0
    );
    const totalClicks = tweets.reduce(
      (sum: number, t: any) => sum + (t.public_metrics?.url_link_clicks || 0),
      0
    );

    const totalEngagements = totalLikes + totalRetweets + totalReplies;
    const engagementRate =
      totalImpressions > 0 ? totalEngagements / totalImpressions : 0;

    return {
      followers: userData.data.public_metrics?.followers_count || 0,
      impressions: totalImpressions,
      engagement_rate: engagementRate,
      clicks: totalClicks,
      posts_count: tweets.length,
    };
  } catch (err) {
    console.error(`getTwitterMetrics error for @${handle}:`, err);
    return null;
  }
}

// Check if rate limit is hit — back off gracefully
export function isTwitterRateLimitError(statusCode: number): boolean {
  return statusCode === 429;
}
