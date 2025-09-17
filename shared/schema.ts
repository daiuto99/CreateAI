import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  pgEnum,
  boolean,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  meetingEnrichmentPreferences: jsonb("meeting_enrichment_preferences").default({
    auto_categorize: true,
    require_outcome: true,
    default_meeting_type: null,
    notification_preferences: {
      immediate: true,
      daily_digest: false
    }
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User role enum
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'editor', 'contributor', 'viewer']);

// Billing plan enum
export const billingPlanEnum = pgEnum('billing_plan', ['starter', 'professional', 'enterprise']);

// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  billingPlan: billingPlanEnum("billing_plan").default('starter'),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User organization memberships
export const userOrganizations = pgTable("user_organizations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  role: userRoleEnum("role").default('contributor'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Content type enum
export const contentTypeEnum = pgEnum('content_type', ['podcast', 'blog', 'ebook']);

// Content status enum
export const contentStatusEnum = pgEnum('content_status', [
  'outline', 'draft', 'review', 'published', 'archived'
]);

// Host type enum for podcasts
export const hostTypeEnum = pgEnum('host_type', ['single', 'morning_show', 'interview']);

// Content projects table
export const contentProjects = pgTable("content_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name").notNull(),
  type: contentTypeEnum("type").notNull(),
  status: contentStatusEnum("status").default('outline'),
  hostType: hostTypeEnum("host_type"), // Only for podcasts
  settings: jsonb("settings").default({}),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content items (episodes, posts, chapters)
export const contentItems = pgTable("content_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => contentProjects.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  status: contentStatusEnum("status").default('outline'),
  content: jsonb("content").default({}), // Outline, script, draft content
  metadata: jsonb("metadata").default({}), // Duration, guest info, etc.
  progress: integer("progress").default(0), // 0-100 percentage
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Integration provider enum
export const integrationProviderEnum = pgEnum('integration_provider', [
  'airtable', 'wordpress', 'transistor', 'elevenlabs', 'openai', 'adobe_stock', 'outlook'
]);

// Integration status enum
export const integrationStatusEnum = pgEnum('integration_status', [
  'connected', 'needs_oauth', 'error', 'expired', 'disabled', 'setup_required'
]);

// User integrations
export const userIntegrations = pgTable("user_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  provider: integrationProviderEnum("provider").notNull(),
  status: integrationStatusEnum("status").default('setup_required'),
  credentials: jsonb("credentials"), // Encrypted tokens, API keys
  settings: jsonb("settings").default({}),
  quotaUsage: jsonb("quota_usage").default({}),
  lastSync: timestamp("last_sync"),
  last_validated: timestamp("last_validated"), // When connection was last validated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint: each user can only have one integration per provider
  userProviderUnique: uniqueIndex("user_provider_unique").on(table.userId, table.provider),
}));

// Analytics snapshots
export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  source: varchar("source").notNull(), // 'podcast', 'blog', 'social', etc.
  metrics: jsonb("metrics").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Airtable sync logs for enhanced meeting enrichment tracking
export const airtableSyncLogs = pgTable("airtable_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  operationType: varchar("operation_type").notNull(), // 'fetch', 'enrich', 'sync'
  status: varchar("status").notNull(), // 'pending', 'completed', 'failed'
  enrichmentData: jsonb("enrichment_data").default({}),
  meetingMetadata: jsonb("meeting_metadata").default({}),
  recordId: varchar("record_id"), // Airtable record ID
  errorDetails: text("error_details"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_airtable_enrichment_status").on(table.status, table.operationType),
  index("idx_airtable_sync_user").on(table.userId, table.createdAt),
]);

// Dismissed meetings table for persistent user preferences
export const dismissedMeetings = pgTable("dismissed_meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  meetingId: varchar("meeting_id").notNull(), // ID of the dismissed meeting
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Unique constraint: each user can only dismiss a meeting once
  uniqueIndex("user_meeting_unique").on(table.userId, table.meetingId),
  index("idx_dismissed_meetings_user").on(table.userId),
]);

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  userOrganizations: many(userOrganizations),
  integrations: many(userIntegrations),
  contentProjects: many(contentProjects),
  contentItems: many(contentItems),
  dismissedMeetings: many(dismissedMeetings),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  userOrganizations: many(userOrganizations),
  contentProjects: many(contentProjects),
  analyticsSnapshots: many(analyticsSnapshots),
}));

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  user: one(users, {
    fields: [userOrganizations.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id],
  }),
}));

export const contentProjectsRelations = relations(contentProjects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contentProjects.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [contentProjects.createdBy],
    references: [users.id],
  }),
  contentItems: many(contentItems),
}));

export const contentItemsRelations = relations(contentItems, ({ one }) => ({
  project: one(contentProjects, {
    fields: [contentItems.projectId],
    references: [contentProjects.id],
  }),
  createdByUser: one(users, {
    fields: [contentItems.createdBy],
    references: [users.id],
  }),
}));

export const userIntegrationsRelations = relations(userIntegrations, ({ one }) => ({
  user: one(users, {
    fields: [userIntegrations.userId],
    references: [users.id],
  }),
}));

export const analyticsSnapshotsRelations = relations(analyticsSnapshots, ({ one }) => ({
  organization: one(organizations, {
    fields: [analyticsSnapshots.organizationId],
    references: [organizations.id],
  }),
}));

export const airtableSyncLogsRelations = relations(airtableSyncLogs, ({ one }) => ({
  user: one(users, {
    fields: [airtableSyncLogs.userId],
    references: [users.id],
  }),
}));

export const dismissedMeetingsRelations = relations(dismissedMeetings, ({ one }) => ({
  user: one(users, {
    fields: [dismissedMeetings.userId],
    references: [users.id],
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = typeof userOrganizations.$inferInsert;

export type ContentProject = typeof contentProjects.$inferSelect;
export type InsertContentProject = typeof contentProjects.$inferInsert;

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;

export type UserIntegration = typeof userIntegrations.$inferSelect;
export type InsertUserIntegration = typeof userIntegrations.$inferInsert;

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type InsertAnalyticsSnapshot = typeof analyticsSnapshots.$inferInsert;

export type AirtableSyncLog = typeof airtableSyncLogs.$inferSelect;
export type InsertAirtableSyncLog = typeof airtableSyncLogs.$inferInsert;

export type DismissedMeeting = typeof dismissedMeetings.$inferSelect;
export type InsertDismissedMeeting = typeof dismissedMeetings.$inferInsert;

// Zod schemas for validation
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentProjectSchema = createInsertSchema(contentProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentItemSchema = createInsertSchema(contentItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserIntegrationSchema = createInsertSchema(userIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
