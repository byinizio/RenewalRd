// src/lib/linkedin.ts
// LinkedIn API — development tier
// Free tier: organization follower count, basic page stats
// Note: Deeper analytics require Marketing Developer Platform approval

import { ClientMetricsData } from '@/types';

export async function getLinkedInMetrics(
  handle: string,
  accessToken: string
): Promise<ClientMetricsData | null> {
  try {
    // Get organization by vanity name
    const orgRes = await fetch(
      `https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${encodeURIComponent(handle)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202304',
        },
      }
    );

    if (!orgRes.ok) {
      console.error(`LinkedIn org lookup failed for ${handle}:`, await orgRes.text());
      return null;
    }

    const orgData = await orgRes.json();
    const orgId = orgData.elements?.[0]?.id;
    if (!orgId) return null;

    // Get follower count
    const followersRes = await fetch(
      `https://api.linkedin.com/v2/networkSizes/${orgId}?edgeType=CompanyFollowedByMember`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    let followers = 0;
    if (followersRes.ok) {
      const followersData = await followersRes.json();
      followers = followersData.firstDegreeSize || 0;
    }

    // Try to get share statistics (requires r_organization_social permission)
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const statsRes = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${sevenDaysAgo}&timeIntervals.timeRange.end=${now}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    let impressions = 0;
    let engagement_rate = 0;
    let clicks = 0;
    let posts_count = 0;

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const elements = statsData.elements || [];
      impressions = elements.reduce(
        (sum: number, e: any) => sum + (e.totalShareStatistics?.impressionCount || 0),
        0
      );
      clicks = elements.reduce(
        (sum: number, e: any) => sum + (e.totalShareStatistics?.clickCount || 0),
        0
      );
      const likes = elements.reduce(
        (sum: number, e: any) => sum + (e.totalShareStatistics?.likeCount || 0),
        0
      );
      const comments = elements.reduce(
        (sum: number, e: any) => sum + (e.totalShareStatistics?.commentCount || 0),
        0
      );
      const shares = elements.reduce(
        (sum: number, e: any) => sum + (e.totalShareStatistics?.shareCount || 0),
        0
      );
      posts_count = elements.length;
      const totalEngagements = likes + comments + shares + clicks;
      engagement_rate = impressions > 0 ? totalEngagements / impressions : 0;
    }

    return { followers, impressions, engagement_rate, clicks, posts_count };
  } catch (err) {
    console.error(`getLinkedInMetrics error for ${handle}:`, err);
    return null;
  }
}
