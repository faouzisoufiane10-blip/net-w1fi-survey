import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { surveys } from "../../db/schema.js";

type SurveyPayload = {
  respondentName: string;
  email?: string;
  location: string;
  isp: string;
  downloadSpeed?: number | null;
  uploadSpeed?: number | null;
  monthlyCost?: number | null;
  connectionType: string;
  reliabilityRating: number;
  speedRating: number;
  valueRating: number;
  supportRating: number;
  wouldRecommend: boolean;
  primaryUse?: string | null;
  painPoints?: string | null;
  suggestions?: string | null;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function validate(payload: Partial<SurveyPayload>): string | null {
  if (!payload.respondentName || !payload.respondentName.trim()) return "Name is required";
  if (!payload.location || !payload.location.trim()) return "Location is required";
  if (!payload.isp || !payload.isp.trim()) return "ISP is required";
  if (!payload.connectionType) return "Connection type is required";
  const requiredRatings = ["reliabilityRating", "speedRating", "valueRating", "supportRating"] as const;
  for (const key of requiredRatings) {
    const value = payload[key];
    if (typeof value !== "number" || value < 1 || value > 5) {
      return `${key} must be between 1 and 5`;
    }
  }
  return null;
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method === "POST") {
    let body: Partial<SurveyPayload>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
    }

    const error = validate(body);
    if (error) {
      return Response.json({ error }, { status: 400, headers: CORS_HEADERS });
    }

    const [created] = await db
      .insert(surveys)
      .values({
        respondentName: body.respondentName!.trim(),
        email: body.email?.trim() || null,
        location: body.location!.trim(),
        isp: body.isp!.trim(),
        downloadSpeed: body.downloadSpeed ?? null,
        uploadSpeed: body.uploadSpeed ?? null,
        monthlyCost: body.monthlyCost ?? null,
        connectionType: body.connectionType!,
        reliabilityRating: body.reliabilityRating!,
        speedRating: body.speedRating!,
        valueRating: body.valueRating!,
        supportRating: body.supportRating!,
        wouldRecommend: Boolean(body.wouldRecommend),
        primaryUse: body.primaryUse?.trim() || null,
        painPoints: body.painPoints?.trim() || null,
        suggestions: body.suggestions?.trim() || null,
      })
      .returning();

    return Response.json(created, { status: 201, headers: CORS_HEADERS });
  }

  if (req.method === "GET") {
    const all = await db.select().from(surveys);
    return Response.json(all, { headers: CORS_HEADERS });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405, headers: CORS_HEADERS });
};

export const config: Config = {
  path: "/api/surveys",
};
