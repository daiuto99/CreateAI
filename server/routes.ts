import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { openaiService } from "./services/openai";
import { 
  insertContentProjectSchema,
  insertContentItemSchema,
  insertUserIntegrationSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    const startTime = Date.now();
    try {
      const userId = req.user.claims.sub;
      console.log('🔍 [/api/auth/user] Fetching user data for userId:', userId);
      
      const user = await storage.getUser(userId);
      console.log('🔍 [/api/auth/user] User query result:', {
        found: !!user,
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName
      });
      
      if (!user) {
        console.warn('🔍 [/api/auth/user] User not found in database for userId:', userId);
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user organizations
      console.log('🔍 [/api/auth/user] Fetching organizations for userId:', userId);
      const userOrgs = await storage.getUserOrganizations(userId);
      console.log('🔍 [/api/auth/user] Organizations query result:', {
        count: userOrgs.length,
        organizations: userOrgs.map(uo => ({
          id: uo.organization.id,
          name: uo.organization.name,
          role: uo.role
        }))
      });
      
      const responseData = { 
        ...user, 
        organizations: userOrgs.map(uo => ({
          ...uo.organization,
          role: uo.role
        }))
      };
      
      console.log('🔍 [/api/auth/user] Sending response:', {
        userId: responseData.id,
        email: responseData.email,
        organizationsCount: responseData.organizations?.length || 0,
        duration: Date.now() - startTime + 'ms'
      });
      
      res.json(responseData);
    } catch (error: any) {
      console.error('🚨 [/api/auth/user] Error fetching user:', {
        error: error?.message || error,
        stack: error?.stack,
        userId: req.user?.claims?.sub,
        duration: Date.now() - startTime + 'ms'
      });
      res.status(500).json({ message: "Failed to fetch user", error: error?.message || 'Unknown error' });
    }
  });

  // Organization routes
  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, billingPlan = 'starter' } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Organization name is required" });
      }
      
      const organization = await storage.createOrganization(
        { name, billingPlan, settings: {} },
        userId
      );
      
      res.json(organization);
    } catch (error: any) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Content Project routes
  app.get('/api/content-projects', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId, type } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      
      const projects = await storage.getContentProjects(organizationId, type);
      
      // Get content items count for each project
      const projectsWithCounts = await Promise.all(
        projects.map(async (project) => {
          const items = await storage.getContentItems(project.id);
          return {
            ...project,
            itemCount: items.length,
            latestItem: items[0] || null
          };
        })
      );
      
      res.json(projectsWithCounts);
    } catch (error: any) {
      console.error("Error fetching content projects:", error);
      res.status(500).json({ message: "Failed to fetch content projects" });
    }
  });

  app.post('/api/content-projects', isAuthenticated, async (req: any, res) => {
    const startTime = Date.now();
    try {
      const userId = req.user.claims.sub;
      console.log('📁 [/api/content-projects] POST - Creating project:', {
        userId,
        requestBody: req.body,
        timestamp: new Date().toISOString()
      });
      
      const projectData = insertContentProjectSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      console.log('📁 [/api/content-projects] Parsed project data:', projectData);
      
      const project = await storage.createContentProject(projectData);
      
      console.log('📁 [/api/content-projects] Project created successfully:', {
        projectId: project.id,
        name: project.name,
        organizationId: project.organizationId,
        duration: Date.now() - startTime + 'ms'
      });
      
      res.json(project);
    } catch (error: any) {
      console.error('🚨 [/api/content-projects] Error creating project:', {
        error: error?.message || error,
        stack: error?.stack,
        userId: req.user?.claims?.sub,
        requestBody: req.body,
        duration: Date.now() - startTime + 'ms'
      });
      
      if (error instanceof z.ZodError) {
        console.error('🚨 [/api/content-projects] Validation errors:', error.errors);
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: error.errors,
          receivedData: req.body 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to create content project",
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Get individual project details
  app.get('/api/content-projects/:projectId', isAuthenticated, async (req: any, res) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;
      const userId = req.user.claims.sub;
      
      console.log('🔍 [/api/content-projects/:id] Fetching project details:', {
        projectId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      const project = await storage.getContentProject(projectId);
      
      if (!project) {
        console.log('🔍 [/api/content-projects/:id] Project not found:', projectId);
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get content items count for the project
      const items = await storage.getContentItems(project.id);
      const projectWithDetails = {
        ...project,
        itemCount: items.length,
        latestItem: items[0] || null
      };
      
      console.log('🔍 [/api/content-projects/:id] Project details fetched:', {
        projectId: project.id,
        name: project.name,
        itemCount: items.length,
        duration: Date.now() - startTime + 'ms'
      });
      
      res.json(projectWithDetails);
    } catch (error: any) {
      console.error('🚨 [/api/content-projects/:id] Error fetching project:', {
        error: error?.message || error,
        stack: error?.stack,
        projectId: req.params?.projectId,
        userId: req.user?.claims?.sub,
        duration: Date.now() - startTime + 'ms'
      });
      
      res.status(500).json({ 
        message: "Failed to fetch project details",
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Content Item routes
  app.get('/api/content-projects/:projectId/items', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const items = await storage.getContentItems(projectId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching content items:", error);
      res.status(500).json({ message: "Failed to fetch content items" });
    }
  });

  app.post('/api/content-projects/:projectId/items', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.claims.sub;
      
      const itemData = insertContentItemSchema.parse({
        ...req.body,
        projectId,
        createdBy: userId
      });
      
      const item = await storage.createContentItem(itemData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      console.error("Error creating content item:", error);
      res.status(500).json({ message: "Failed to create content item" });
    }
  });

  app.put('/api/content-items/:itemId', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.params;
      const updates = req.body;
      
      const item = await storage.updateContentItem(itemId, updates);
      res.json(item);
    } catch (error) {
      console.error("Error updating content item:", error);
      res.status(500).json({ message: "Failed to update content item" });
    }
  });

  // AI Content Generation routes
  app.post('/api/ai/generate-outline', isAuthenticated, async (req, res) => {
    try {
      const { type, prompt, settings = {} } = req.body;
      
      if (!type || !prompt) {
        return res.status(400).json({ message: "Content type and prompt are required" });
      }
      
      const outline = await openaiService.generateContentOutline(type, prompt, settings);
      res.json(outline);
    } catch (error) {
      console.error("Error generating outline:", error);
      res.status(500).json({ message: "Failed to generate outline" });
    }
  });

  app.post('/api/ai/generate-blog-draft', isAuthenticated, async (req, res) => {
    try {
      const { outline, settings = {} } = req.body;
      
      if (!outline) {
        return res.status(400).json({ message: "Outline is required" });
      }
      
      const draft = await openaiService.generateBlogDraft(outline, settings);
      res.json(draft);
    } catch (error) {
      console.error("Error generating blog draft:", error);
      res.status(500).json({ message: "Failed to generate blog draft" });
    }
  });

  app.post('/api/ai/generate-podcast-script', isAuthenticated, async (req, res) => {
    try {
      const { outline, hostType, hostProfile } = req.body;
      
      if (!outline || !hostType) {
        return res.status(400).json({ message: "Outline and host type are required" });
      }
      
      const script = await openaiService.generatePodcastScript(outline, hostType, hostProfile);
      res.json(script);
    } catch (error) {
      console.error("Error generating podcast script:", error);
      res.status(500).json({ message: "Failed to generate podcast script" });
    }
  });

  app.post('/api/ai/generate-ebook-chapter', isAuthenticated, async (req, res) => {
    try {
      const { outline, chapterIndex, settings = {} } = req.body;
      
      if (!outline || chapterIndex === undefined) {
        return res.status(400).json({ message: "Outline and chapter index are required" });
      }
      
      const chapter = await openaiService.generateEbookChapter(outline, chapterIndex, settings);
      res.json(chapter);
    } catch (error) {
      console.error("Error generating ebook chapter:", error);
      res.status(500).json({ message: "Failed to generate ebook chapter" });
    }
  });

  // Integration routes
  app.get('/api/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrations = await storage.getUserIntegrations(userId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  app.post('/api/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const integrationData = insertUserIntegrationSchema.parse({
        ...req.body,
        userId
      });
      
      const integration = await storage.upsertUserIntegration(integrationData);
      res.json(integration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid integration data", errors: error.errors });
      }
      console.error("Error creating integration:", error);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  app.post('/api/integrations/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({ message: "Provider is required" });
      }

      // Get the integration for this user and provider
      const integrations = await storage.getUserIntegrations(userId);
      const integration = integrations.find(i => i.provider === provider);

      if (!integration || !integration.credentials) {
        return res.status(404).json({ message: "Integration not found or no credentials stored" });
      }

      let testResult = { success: false, message: '', error: '' };

      try {
        switch (provider) {
          case 'openai':
            // Test OpenAI API key
            const credentials = integration.credentials as any;
            const openaiResponse = await fetch('https://api.openai.com/v1/models', {
              headers: {
                'Authorization': `Bearer ${credentials.apiKey}`,
              }
            });
            if (openaiResponse.ok) {
              testResult = { success: true, message: 'OpenAI API key is valid and working!', error: '' };
              await storage.upsertUserIntegration({ ...integration, status: 'connected' as any });
            } else {
              const error = await openaiResponse.text();
              testResult = { success: false, message: '', error: 'Invalid OpenAI API key' };
              await storage.upsertUserIntegration({ ...integration, status: 'error' as any });
            }
            break;

          case 'elevenlabs':
            // Test ElevenLabs API key
            const elevenCreds = integration.credentials as any;
            const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/user', {
              headers: {
                'xi-api-key': elevenCreds.apiKey,
              }
            });
            if (elevenlabsResponse.ok) {
              testResult = { success: true, message: 'ElevenLabs API key is valid and working!', error: '' };
              await storage.upsertUserIntegration({ ...integration, status: 'connected' as any });
            } else {
              testResult = { success: false, message: '', error: 'Invalid ElevenLabs API key' };
              await storage.upsertUserIntegration({ ...integration, status: 'error' as any });
            }
            break;

          case 'bigin':
            // Test Bigin by Zoho credentials - simplified test
            const biginCreds = integration.credentials as any;
            
            // For now, just validate that we have the required credentials
            if (biginCreds.clientId && biginCreds.clientSecret) {
              testResult = { success: true, message: 'Bigin by Zoho credentials saved successfully! Connection will be tested during actual API usage.', error: '' };
              await storage.upsertUserIntegration({ ...integration, status: 'connected' as any });
            } else {
              testResult = { success: false, message: '', error: 'Missing Client ID or Client Secret' };
              await storage.upsertUserIntegration({ ...integration, status: 'error' as any });
            }
            break;

          default:
            testResult = { success: false, message: '', error: 'Connection testing not implemented for this provider yet' };
        }
      } catch (error) {
        console.error(`Error testing ${provider} connection:`, error);
        testResult = { success: false, message: '', error: 'Connection test failed due to network error' };
        await storage.upsertUserIntegration({ ...integration, status: 'error' as any });
      }

      res.json(testResult);
    } catch (error) {
      console.error("Error testing integration:", error);
      res.status(500).json({ message: "Failed to test integration" });
    }
  });

  // Sync routes
  app.post('/api/crm/extract-fields', isAuthenticated, async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text content is required" });
      }
      
      const extracted = await openaiService.extractCRMFields(text);
      res.json(extracted);
    } catch (error) {
      console.error("Error extracting CRM fields:", error);
      res.status(500).json({ message: "Failed to extract CRM fields" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/snapshots', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId, source } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      
      const snapshots = await storage.getAnalyticsSnapshots(organizationId, source);
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching analytics snapshots:", error);
      res.status(500).json({ message: "Failed to fetch analytics snapshots" });
    }
  });

  app.post('/api/analytics/snapshots', isAuthenticated, async (req, res) => {
    try {
      const snapshot = await storage.createAnalyticsSnapshot(req.body);
      res.json(snapshot);
    } catch (error) {
      console.error("Error creating analytics snapshot:", error);
      res.status(500).json({ message: "Failed to create analytics snapshot" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
