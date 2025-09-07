import {
  users,
  organizations,
  userOrganizations,
  contentProjects,
  contentItems,
  userIntegrations,
  analyticsSnapshots,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type UserOrganization,
  type InsertUserOrganization,
  type ContentProject,
  type InsertContentProject,
  type ContentItem,
  type InsertContentItem,
  type UserIntegration,
  type InsertUserIntegration,
  type AnalyticsSnapshot,
  type InsertAnalyticsSnapshot,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  getUserOrganizations(userId: string): Promise<(UserOrganization & { organization: Organization })[]>;
  createOrganization(org: InsertOrganization, ownerId: string): Promise<Organization>;
  
  // Content operations
  getContentProjects(organizationId: string, type?: string): Promise<ContentProject[]>;
  createContentProject(project: InsertContentProject): Promise<ContentProject>;
  updateContentProject(id: string, updates: Partial<ContentProject>): Promise<ContentProject>;
  
  getContentItems(projectId: string): Promise<ContentItem[]>;
  createContentItem(item: InsertContentItem): Promise<ContentItem>;
  updateContentItem(id: string, updates: Partial<ContentItem>): Promise<ContentItem>;
  
  // Integration operations
  getUserIntegrations(userId: string): Promise<UserIntegration[]>;
  upsertUserIntegration(integration: InsertUserIntegration): Promise<UserIntegration>;
  deleteUserIntegration(userId: string, provider: string): Promise<void>;
  
  // Analytics operations
  getAnalyticsSnapshots(organizationId: string, source?: string): Promise<AnalyticsSnapshot[]>;
  createAnalyticsSnapshot(snapshot: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async getUserOrganizations(userId: string): Promise<(UserOrganization & { organization: Organization })[]> {
    const result = await db
      .select()
      .from(userOrganizations)
      .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(eq(userOrganizations.userId, userId));
    
    return result.map(row => ({ 
      ...row.user_organizations, 
      organization: row.organizations 
    }));
  }

  async createOrganization(orgData: InsertOrganization, ownerId: string): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(orgData)
      .returning();
    
    // Add owner membership
    await db
      .insert(userOrganizations)
      .values({
        userId: ownerId,
        organizationId: org.id,
        role: 'owner',
      });
    
    return org;
  }

  // Content operations
  async getContentProjects(organizationId: string, type?: string): Promise<ContentProject[]> {
    const conditions = [eq(contentProjects.organizationId, organizationId)];
    
    if (type) {
      conditions.push(eq(contentProjects.type, type as any));
    }
    
    return await db
      .select()
      .from(contentProjects)
      .where(and(...conditions))
      .orderBy(desc(contentProjects.updatedAt));
  }

  async getContentProject(projectId: string): Promise<ContentProject | null> {
    const [project] = await db
      .select()
      .from(contentProjects)
      .where(eq(contentProjects.id, projectId))
      .limit(1);
    
    return project || null;
  }

  async createContentProject(project: InsertContentProject): Promise<ContentProject> {
    const [newProject] = await db
      .insert(contentProjects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateContentProject(id: string, updates: Partial<ContentProject>): Promise<ContentProject> {
    const [updated] = await db
      .update(contentProjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentProjects.id, id))
      .returning();
    return updated;
  }

  async getContentItems(projectId: string): Promise<ContentItem[]> {
    return await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.projectId, projectId))
      .orderBy(desc(contentItems.updatedAt));
  }

  async createContentItem(item: InsertContentItem): Promise<ContentItem> {
    const [newItem] = await db
      .insert(contentItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateContentItem(id: string, updates: Partial<ContentItem>): Promise<ContentItem> {
    const [updated] = await db
      .update(contentItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentItems.id, id))
      .returning();
    return updated;
  }

  // Integration operations
  async getUserIntegrations(userId: string): Promise<UserIntegration[]> {
    return await db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, userId))
      .orderBy(desc(userIntegrations.updatedAt));
  }

  async upsertUserIntegration(integration: InsertUserIntegration): Promise<UserIntegration> {
    const [result] = await db
      .insert(userIntegrations)
      .values(integration)
      .onConflictDoUpdate({
        target: [userIntegrations.userId, userIntegrations.provider],
        set: {
          ...integration,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async deleteUserIntegration(userId: string, provider: string): Promise<void> {
    await db
      .delete(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider)
        )
      );
  }

  // Analytics operations
  async getAnalyticsSnapshots(organizationId: string, source?: string): Promise<AnalyticsSnapshot[]> {
    const conditions = [eq(analyticsSnapshots.organizationId, organizationId)];
    
    if (source) {
      conditions.push(eq(analyticsSnapshots.source, source));
    }
    
    return await db
      .select()
      .from(analyticsSnapshots)
      .where(and(...conditions))
      .orderBy(desc(analyticsSnapshots.timestamp));
  }

  async createAnalyticsSnapshot(snapshot: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot> {
    const [newSnapshot] = await db
      .insert(analyticsSnapshots)
      .values(snapshot)
      .returning();
    return newSnapshot;
  }
}

export const storage = new DatabaseStorage();
