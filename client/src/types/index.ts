// Frontend types for API responses and components
import type { 
  User as DbUser, 
  Organization, 
  UserOrganization,
  ContentProject,
  UserIntegration 
} from '@shared/schema';

// Extend User type with organizations for frontend
export interface User extends DbUser {
  organizations?: Array<UserOrganization & { 
    organization: Organization;
    role?: string;
  }>;
}

// API response types
export interface ProjectsResponse extends Array<ContentProject> {}
export interface IntegrationsResponse extends Array<UserIntegration> {}

// Form types
export interface ProjectFormData {
  name: string;
  type: 'podcast' | 'blog' | 'ebook';
  hostType?: 'single' | 'morning_show' | 'interview';
  description?: string;
}