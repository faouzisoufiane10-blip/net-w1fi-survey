import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { surveys } from "../../db/schema.js";
import { sql, avg, count, eq, and } from "drizzle-orm";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const groupBy = url.searchParams.get("group_by");

  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
  }

  const totalsRow = await db
    .select({
      total: count(),
      avgReliability: avg(surveys.reliabilityRating),
      avgSpeed: avg(surveys.speedRating),
      avgValue: avg(surveys.valueRating),
      avgSupport: avg(surveys.supportRating),
      avgDownload: avg(surveys.downloadSpeed),
      avgUpload: avg(surveys.uploadSpeed),
      avgCost: avg(surveys.monthlyCost),
    })
    .from(surveys);

  const recommendRow = await db
    .select({ count: count() })
    .from(surveys)
    .where(eq(surveys.wouldRecommend, true));

  const totals = totalsRow[0];
  const totalResponses = Number(totals?.total ?? 0);

  const summary = {
    totalResponses,
    recommendCount: Number(recommendRow[0]?.count ?? 0),
    recommendPct: totalResponses > 0 ? Math.round((Number(recommendRow[0]?.count ?? 0) / totalResponses) * 1000) / 10 : 0,
    averages: {
      reliability: Number(totals?.avgReliability ?? 0),
      speed: Number(totals?.avgSpeed ?? 0),
      value: Number(totals?.avgValue ?? 0),
      support: Number(totals?.avgSupport ?? 0),
      downloadMbps: Number(totals?.avgDownload ?? 0),
      uploadMbps: Number(totals?.avgUpload ?? 0),
      monthlyCost: Number(totals?.avgCost ?? 0),
    },
  };

  if (groupBy === "isp") {
    const byIsp = await db
      .select({
        isp: surveys.isp,
        count: count(),
        avgReliability: avg(surveys.reliabilityRating),
        avgSpeed: avg(surveys.speedRating),
        avgValue: avg(surveys.valueRating),
        avgDownload: avg(surveys.downloadSpeed),
        avgCost: avg(surveys.monthlyCost),
        recommendCount: sql<number>`sum(case when ${surveys.wouldRecommend} then 1 else 0 end)`,
      })
      .from(surveys)
      .groupBy(surveys.isp)
      .orderBy(sql`count(*) desc`);

    return Response.json(
      {
        ...summary,
        byIsp: byIsp.map((row) => ({
          isp: row.isp,
          count: Number(row.count),
          avgReliability: Number(row.avgReliability ?? 0),
          avgSpeed: Number(row.avgSpeed ?? 0),
          avgValue: Number(row.avgValue ?? 0),
          avgDownload: Number(row.avgDownload ?? 0),
          avgCost: Number(row.avgCost ?? 0),
          recommendCount: Number(row.recommendCount ?? 0),
        })),
      },
      { headers: CORS_HEADERS },
    );
  }

  if (groupBy === "location") {
    const byLocation = await db
      .select({
        location: surveys.location,
        count: count(),
        avgReliability: avg(surveys.reliabilityRating),
        avgSpeed: avg(surveys.speedRating),
      })
      .from(surveys)
      .groupBy(surveys.location)
      .orderBy(sql`count(*) desc`);

    return Response.json(
      {
        ...summary,
        byLocation: byLocation.map((row) => ({
          location: row.location,
          count: Number(row.count),
          avgReliability: Number(row.avgReliability ?? 0),
          avgSpeed: Number(row.avgSpeed ?? 0),
        })),
      },
      { headers: CORS_HEADERS },
    );
  }

  return Response.json(summary, { headers: CORS_HEADERS });
};

export const config: Config = {
  path: "/api/summary",
};
