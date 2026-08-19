import { pgTable, serial, text, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";

export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  respondentName: text("respondent_name").notNull(),
  email: text("email"),
  location: text("location").notNull(),
  isp: text("isp").notNull(),
  downloadSpeed: real("download_speed"),
  uploadSpeed: real("upload_speed"),
  monthlyCost: real("monthly_cost"),
  connectionType: text("connection_type").notNull(),
  reliabilityRating: integer("reliability_rating").notNull(),
  speedRating: integer("speed_rating").notNull(),
  valueRating: integer("value_rating").notNull(),
  supportRating: integer("support_rating").notNull(),
  wouldRecommend: boolean("would_recommend").notNull().default(false),
  primaryUse: text("primary_use"),
  painPoints: text("pain_points"),
  suggestions: text("suggestions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
