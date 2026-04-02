import { pgTable, text, integer, timestamp, jsonb, uniqueIndex, index, real, boolean, uuid } from "drizzle-orm/pg-core";

export const gameAccounts = pgTable("game_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameType: text("game_type").notNull(), // "valorant" | "lol"
  gameName: text("game_name").notNull(),
  tagLine: text("tag_line").notNull(),
  puuid: text("puuid"),
  currentTier: text("current_tier"),
  currentRank: text("current_rank"),
  currentPoints: integer("current_points").default(0),
  tierNumeric: integer("tier_numeric").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  winRate: real("win_rate").default(0),
  rawRankData: jsonb("raw_rank_data"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("game_accounts_game_id_idx").on(table.gameType, table.gameName, table.tagLine),
  index("game_accounts_tier_numeric_idx").on(table.gameType, table.tierNumeric),
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().default("school"),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  schoolCode: text("school_code"),
  schoolLevel: text("school_level"), // "middle" | "high" | "university"
  regionSido: text("region_sido"),
  regionSigungu: text("region_sigungu"),
  memberCount: integer("member_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("organizations_name_idx").on(table.type, table.normalizedName),
  index("organizations_region_idx").on(table.regionSido, table.regionSigungu),
  index("organizations_school_code_idx").on(table.schoolCode),
]);

export const accountOrganizations = pgTable("account_organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameAccountId: uuid("game_account_id").notNull().references(() => gameAccounts.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("account_org_unique_idx").on(table.gameAccountId, table.organizationId),
  index("account_org_org_idx").on(table.organizationId),
]);

export const rankingCache = pgTable("ranking_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  scopeType: text("scope_type").notNull(), // "school" | "region"
  scopeId: text("scope_id").notNull(),
  gameType: text("game_type").notNull(),
  rankings: jsonb("rankings"),
  totalParticipants: integer("total_participants").default(0),
  computedAt: timestamp("computed_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isStale: boolean("is_stale").default(false),
}, (table) => [
  uniqueIndex("ranking_cache_scope_idx").on(table.scopeType, table.scopeId, table.gameType),
]);

export const shareEvents = pgTable("share_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameAccountId: uuid("game_account_id").references(() => gameAccounts.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  shareChannel: text("share_channel").notNull(), // "kakao" | "instagram" | "discord" | "link_copy"
  shareUrl: text("share_url"),
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
