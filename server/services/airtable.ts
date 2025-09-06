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
      
      const response = await fetch(`${this.baseUrl}?maxRecords=1`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ [AirtableService] Connection test successful');
        return { success: true };
      } else {
        const errorData = await response.json() as AirtableError;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        console.log('❌ [AirtableService] Connection test failed:', errorMessage);
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
      const tablesResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${this.baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
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
      const recordsResponse = await fetch(`${this.baseUrl}/${encodeURIComponent(firstTable.name)}?maxRecords=100`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
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
   * Create a new contact record in the first table
   */
  async createContact(contactData: { name: string; email: string; description?: string }): Promise<any> {
    try {
      console.log('➕ [AirtableService] Creating contact:', contactData.name);
      
      // Get the first table name
      const tablesResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${this.baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!tablesResponse.ok) {
        throw new Error('Failed to fetch base schema');
      }

      const tablesData = await tablesResponse.json();
      const firstTable = tablesData.tables?.[0];
      
      if (!firstTable) {
        throw new Error('No tables found in base');
      }

      // Create the record
      const recordData = {
        records: [
          {
            fields: this.buildContactFields(contactData, firstTable.fields)
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(firstTable.name)}`, {
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