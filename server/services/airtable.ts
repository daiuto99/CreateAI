import { IStorage } from '../storage';

// Airtable API Response Types
interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

interface AirtableError {
  error: {
    type: string;
    message: string;
  };
}

export class AirtableService {
  private apiKey: string;
  private baseId: string;
  private baseUrl: string;

  constructor(apiKey: string, baseId: string) {
    if (!apiKey || !baseId) {
      throw new Error('Airtable API key and base ID are required');
    }
    
    this.apiKey = apiKey;
    this.baseId = baseId;
    this.baseUrl = `https://api.airtable.com/v0/${baseId}`;
  }

  /**
   * Create AirtableService from user integration stored in database
   */
  static async createFromUserIntegration(storage: IStorage, userId: string): Promise<AirtableService | null> {
    try {
      console.log('🔧 [AirtableService] Creating service for user:', userId);
      
      const integrations = await storage.getUserIntegrations(userId);
      const airtableIntegration = integrations.find(i => i.provider === 'airtable');
      
      if (!airtableIntegration) {
        console.log('❌ [AirtableService] No Airtable integration found for user');
        return null;
      }
      
      if (airtableIntegration.status !== 'connected') {
        console.log('❌ [AirtableService] Airtable integration not connected. Status:', airtableIntegration.status);
        return null;
      }
      
      const credentials = airtableIntegration.credentials as any;
      if (!credentials?.apiKey || !credentials?.baseId) {
        console.log('❌ [AirtableService] Missing Airtable credentials');
        return null;
      }
      
      console.log('✅ [AirtableService] Creating service with credentials');
      return new AirtableService(credentials.apiKey, credentials.baseId);
      
    } catch (error: any) {
      console.error('🚨 [AirtableService] Error creating service:', error.message);
      return null;
    }
  }

  /**
   * Test the Airtable API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 [AirtableService] Testing connection to base:', this.baseId);
      console.log('🔗 [AirtableService] Testing URL: https://api.airtable.com/v0/meta/bases/' + this.baseId + '/tables');
      console.log('🔑 [AirtableService] API Key exists:', !!this.apiKey);
      console.log('🔑 [AirtableService] API Key length:', this.apiKey?.length || 0);
      console.log('🔑 [AirtableService] API Key first 10 chars:', this.apiKey?.substring(0, 10) || 'NONE');
      console.log('🔑 [AirtableService] Full Authorization header:', `Bearer ${this.apiKey}`);
      
      // Test connection by fetching base metadata (this doesn't require a table name)
      const response = await fetch(`https://api.airtable.com/v0/meta/bases/${this.baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🧪 [AirtableService] Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [AirtableService] Connection test successful - found', data.tables?.length || 0, 'tables');
        return { success: true };
      } else {
        const errorText = await response.text();
        console.log('❌ [AirtableService] Connection test failed - Response body:', errorText);
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText) as AirtableError;
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('🚨 [AirtableService] Connection test error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contacts from the first table in the base
   */
  async getContacts(): Promise<any[]> {
    try {
      console.log('📇 [AirtableService] Fetching contacts from base:', this.baseId);
      
      // First, get the base schema to find the first table
      // Add cache-busting timestamp to force fresh data
      const timestamp = Date.now();
      const tablesResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${this.baseId}/tables?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // Cache-busting headers to force fresh data
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'If-None-Match': '*'
        }
      });

      if (!tablesResponse.ok) {
        console.log('❌ [AirtableService] Failed to fetch base schema');
        return [];
      }

      const tablesData = await tablesResponse.json();
      const firstTable = tablesData.tables?.[0];
      
      if (!firstTable) {
        console.log('❌ [AirtableService] No tables found in base');
        return [];
      }

      console.log('📊 [AirtableService] Using table:', firstTable.name);

      // Fetch records from the first table
      // Add cache-busting timestamp to force fresh data
      const recordsTimestamp = Date.now();
      const recordsResponse = await fetch(`${this.baseUrl}/${encodeURIComponent(firstTable.name)}?maxRecords=100&_t=${recordsTimestamp}&fresh=true`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // Cache-busting headers to force fresh data
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'If-None-Match': '*'
        }
      });

      if (!recordsResponse.ok) {
        console.log('❌ [AirtableService] Failed to fetch records');
        return [];
      }

      const data = await recordsResponse.json() as AirtableResponse;
      
      // Transform Airtable records to a standard contact format
      const contacts = data.records.map(record => ({
        id: record.id,
        name: this.extractName(record.fields),
        email: this.extractEmail(record.fields),
        company: this.extractCompany(record.fields),
        phone: this.extractPhone(record.fields),
        created: record.createdTime,
        source: 'airtable',
        rawFields: record.fields
      }));

      console.log(`✅ [AirtableService] Fetched ${contacts.length} contacts`);
      return contacts;

    } catch (error: any) {
      console.error('🚨 [AirtableService] Error fetching contacts:', error.message);
      return [];
    }
  }

  /**
   * Create a new contact record in the Contacts table
   */
  async createContact(contactData: any): Promise<any> {
    try {
      console.log('➕ [AirtableService] Creating contact:', contactData.Name || contactData.name);
      
      // Create the record in the Contacts table directly
      const recordData = {
        records: [
          {
            fields: contactData
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}/Contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
      });

      if (!response.ok) {
        const errorData = await response.json() as AirtableError;
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json() as AirtableResponse;
      const createdRecord = result.records[0];
      
      console.log('✅ [AirtableService] Contact created with ID:', createdRecord.id);
      return {
        id: createdRecord.id,
        name: contactData.name,
        email: contactData.email,
        fields: createdRecord.fields
      };

    } catch (error: any) {
      console.error('🚨 [AirtableService] Error creating contact:', error.message);
      throw error;
    }
  }

  /**
   * Extract name from Airtable record fields (tries common field names)
   */
  private extractName(fields: Record<string, any>): string {
    const nameFields = ['Name', 'Full Name', 'Contact Name', 'First Name', 'Title'];
    for (const field of nameFields) {
      if (fields[field] && typeof fields[field] === 'string') {
        return fields[field];
      }
    }
    return 'Unknown Contact';
  }

  /**
   * Extract email from Airtable record fields (tries common field names)
   */
  private extractEmail(fields: Record<string, any>): string {
    const emailFields = ['Email', 'Email Address', 'Contact Email', 'Primary Email'];
    for (const field of emailFields) {
      if (fields[field] && typeof fields[field] === 'string') {
        return fields[field];
      }
    }
    return '';
  }

  /**
   * Extract company from Airtable record fields (tries common field names)
   */
  private extractCompany(fields: Record<string, any>): string {
    const companyFields = ['Company', 'Organization', 'Company Name', 'Business'];
    for (const field of companyFields) {
      if (fields[field] && typeof fields[field] === 'string') {
        return fields[field];
      }
    }
    return '';
  }

  /**
   * Extract phone from Airtable record fields (tries common field names)
   */
  private extractPhone(fields: Record<string, any>): string {
    const phoneFields = ['Phone', 'Phone Number', 'Mobile', 'Contact Number'];
    for (const field of phoneFields) {
      if (fields[field] && typeof fields[field] === 'string') {
        return fields[field];
      }
    }
    return '';
  }

  /**
   * Build contact fields for creation based on available table fields
   */
  private buildContactFields(contactData: { name: string; email: string; description?: string }, tableFields: any[]): Record<string, any> {
    const fields: Record<string, any> = {};
    
    // Map data to the most appropriate fields
    const fieldMap = new Map(tableFields.map((f: any) => [f.name.toLowerCase(), f.name]));
    
    // Name field
    const nameField = this.findBestFieldMatch(fieldMap, ['name', 'full name', 'contact name', 'title']);
    if (nameField) {
      fields[nameField] = contactData.name;
    }
    
    // Email field
    const emailField = this.findBestFieldMatch(fieldMap, ['email', 'email address', 'contact email']);
    if (emailField) {
      fields[emailField] = contactData.email;
    }
    
    // Description/Notes field
    if (contactData.description) {
      const notesField = this.findBestFieldMatch(fieldMap, ['notes', 'description', 'comments', 'details']);
      if (notesField) {
        fields[notesField] = contactData.description;
      }
    }
    
    return fields;
  }

  /**
   * Get transcripts with Processing Status = 'complete' from Transcripts table
   */
  async getTranscripts(): Promise<any[]> {
    try {
      console.log('📝 [AirtableService] Fetching completed transcripts from Transcripts table');
      
      const filterFormula = "{Processing Status} = 'complete'";
      const url = `${this.baseUrl}/Transcripts?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=100`;
      
      console.log('🌐 [AirtableService] Transcripts URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ [AirtableService] Transcripts query failed:', response.status, errorText);
        return [];
      }

      const data = await response.json() as AirtableResponse;
      
      const transcripts = data.records.map(record => ({
        id: record.id,
        title: record.fields.Title || record.fields.title || 'Untitled Transcript',
        status: record.fields['Processing Status'],
        content: record.fields['Transcript Content'] || record.fields.transcript || '',
        meetingDate: record.fields['Meeting Date'],
        duration: record.fields.Duration,
        participants: record.fields.Participants || [],
        otterId: record.fields['Otter ID'],
        created: record.createdTime,
        source: 'airtable-transcripts',
        rawFields: record.fields
      }));

      console.log(`✅ [AirtableService] Fetched ${transcripts.length} completed transcripts`);
      return transcripts;

    } catch (error: any) {
      console.error('🚨 [AirtableService] Error fetching transcripts:', error.message);
      return [];
    }
  }

  /**
   * Get all contacts from Contacts table (for debugging)
   */
  async getContactsRaw(): Promise<any[]> {
    try {
      console.log('👥 [AirtableService] Fetching all contacts from Contacts table');
      
      const url = `${this.baseUrl}/Contacts?maxRecords=100`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ [AirtableService] Contacts query failed:', response.status, errorText);
        return [];
      }

      const data = await response.json() as AirtableResponse;
      
      const contacts = data.records.map(record => ({
        id: record.id,
        name: record.fields.Name || 'Unknown Contact',
        company: record.fields.Company || '',
        email: record.fields.Email || '',
        phone: record.fields.Phone || '',
        lastContacted: record.fields['Last Contacted'],
        relationshipType: record.fields['Relationship Type'],
        notes: record.fields.Notes || '',
        created: record.createdTime,
        source: 'airtable-contacts',
        rawFields: record.fields
      }));

      console.log(`✅ [AirtableService] Fetched ${contacts.length} contacts from Contacts table`);
      return contacts;

    } catch (error: any) {
      console.error('🚨 [AirtableService] Error fetching contacts:', error.message);
      return [];
    }
  }

  /**
   * Get contacts for specific meetings - now uses proper Contacts table
   */
  async getContactsForMeetings(meetings: any[]): Promise<any[]> {
    try {
      console.log(`📇 [AirtableService] Getting contacts for ${meetings.length} meetings`);
      
      // Use the new getContactsRaw method that properly queries the Contacts table
      const allContacts = await this.getContactsRaw();
      
      console.log(`✅ [AirtableService] Retrieved ${allContacts.length} contacts for meetings`);
      return allContacts;
      
    } catch (error: any) {
      console.error('🚨 [AirtableService] Error getting contacts for meetings:', error.message);
      return [];
    }
  }

  /**
   * Find the best matching field name from available options
   */
  private findBestFieldMatch(fieldMap: Map<string, string>, candidates: string[]): string | null {
    for (const candidate of candidates) {
      if (fieldMap.has(candidate)) {
        return fieldMap.get(candidate)!;
      }
    }
    return null;
  }
}

// ⬇️ ADD factory helper for request-scoped usage
import type { Request } from 'express';
import { extractAuth } from '../auth/context';
import { storage } from '../storage';

export async function createAirtableServiceForRequest(req: Request) {
  const a = extractAuth(req);
  const userId = a.userId || (req.headers['x-user-id'] as string) || (req.query.userId as string) || (req as any).body?.userId || process.env.AUTH_DEV_USER_ID;
  if (!userId) throw new Error('[Airtable] No authenticated user on request');
  return AirtableService.createFromUserIntegration(storage, userId);
}

// For completed transcripts:
export async function listCompletedTranscripts(base: any) {
  const filterByFormula = "({Transcript Processing Status} = 'complete')";
  return base('Transcripts').select({ filterByFormula, pageSize: 100 }).all();
}