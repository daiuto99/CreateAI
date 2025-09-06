import { IStorage } from '../storage';

interface FreshdeskContact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
}

export class FreshdeskService {
  private apiKey: string;
  private domain: string;
  private baseUrl: string;

  constructor(apiKey: string, domain: string) {
    this.apiKey = apiKey;
    this.domain = domain;
    this.baseUrl = `https://${domain}.freshdesk.com/api/v2`;
  }

  static async createFromUserIntegration(storage: IStorage, userId: string): Promise<FreshdeskService | null> {
    const integrations = await storage.getUserIntegrations(userId);
    const freshdeskIntegration = integrations.find(i => i.provider === 'freshdesk');
    
    if (!freshdeskIntegration?.credentials) return null;
    
    const credentials = freshdeskIntegration.credentials as any;
    if (!credentials.apiKey || !credentials.domain) return null;
    
    return new FreshdeskService(credentials.apiKey, credentials.domain);
  }

  async searchContacts(query: string): Promise<FreshdeskContact[]> {
    try {
      console.log('Searching Freshdesk contacts for:', query);
      
      // Search by email first
      let contacts = [];
      
      // Freshdesk API uses basic auth with API key
      const auth = Buffer.from(`${this.apiKey}:X`).toString('base64');
      
      // Search contacts by name or email
      const searchUrl = `${this.baseUrl}/contacts?email=${encodeURIComponent(query)}`;
      
      let response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const emailResults = await response.json();
        contacts.push(...emailResults);
      }

      // If no results by email, try searching by name (requires different endpoint)
      if (contacts.length === 0) {
        const nameSearchUrl = `${this.baseUrl}/search/contacts?query=name:${encodeURIComponent(query)}`;
        
        response = await fetch(nameSearchUrl, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const searchResults = await response.json();
          contacts = searchResults.results || [];
        }
      }

      console.log('Found', contacts.length, 'Freshdesk contacts for query:', query);
      return contacts.map(this.transformContact);

    } catch (error) {
      console.error('Freshdesk search error:', error);
      return [];
    }
  }

  async createTicketFromMeeting(meetingData: {
    title: string;
    date: Date;
    summary?: string;
    contactId?: string;
    attendees?: string[];
  }): Promise<{ id: string; success: boolean }> {
    try {
      console.log('Creating Freshdesk ticket for meeting:', meetingData.title);

      const auth = Buffer.from(`${this.apiKey}:X`).toString('base64');
      
      const ticketData = {
        subject: `Meeting: ${meetingData.title}`,
        description: this.buildMeetingDescription(meetingData),
        priority: 1,
        status: 5, // Closed since meeting is completed
        source: 2, // Email source
        type: 'Incident',
        requester_id: meetingData.contactId || undefined
      };

      const response = await fetch(`${this.baseUrl}/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData)
      });

      if (!response.ok) {
        throw new Error(`Freshdesk ticket creation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Created Freshdesk ticket:', result.id);
      return { id: result.id.toString(), success: true };

    } catch (error) {
      console.error('Freshdesk ticket creation error:', error);
      throw error;
    }
  }

  private transformContact(contact: any): FreshdeskContact {
    return {
      id: contact.id?.toString() || '',
      name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      email: contact.email || '',
      company: contact.company_name || '',
      phone: contact.phone || contact.mobile || ''
    };
  }

  private buildMeetingDescription(meetingData: {
    title: string;
    date: Date;
    summary?: string;
    attendees?: string[];
  }): string {
    let description = `Meeting: ${meetingData.title}\n`;
    description += `Date: ${meetingData.date.toLocaleDateString()}\n`;
    
    if (meetingData.attendees && meetingData.attendees.length > 0) {
      description += `Attendees: ${meetingData.attendees.join(', ')}\n`;
    }
    
    if (meetingData.summary) {
      description += `\nSummary:\n${meetingData.summary}`;
    }
    
    description += '\n\nCreated by CreateAI Meeting Intelligence';
    return description;
  }

  async getContacts(): Promise<FreshdeskContact[]> {
    try {
      const auth = Buffer.from(`${this.apiKey}:X`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/contacts?per_page=50`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const contacts = await response.json();
        return contacts.map(this.transformContact);
      }

      return [];
    } catch (error) {
      console.error('Error fetching Freshdesk contacts:', error);
      return [];
    }
  }

  async createContact(contactData: { name: string; email: string; description?: string }): Promise<FreshdeskContact> {
    try {
      const auth = Buffer.from(`${this.apiKey}:X`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: contactData.name,
          email: contactData.email,
          description: contactData.description || ''
        })
      });

      if (response.ok) {
        const contact = await response.json();
        return this.transformContact(contact);
      }

      throw new Error(`Failed to create contact: ${response.status}`);
    } catch (error) {
      console.error('Error creating Freshdesk contact:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = Buffer.from(`${this.apiKey}:X`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/contacts?per_page=1`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true };
      }

      const errorMessage = `API returned ${response.status}: ${response.statusText}`;
      return { success: false, error: errorMessage };

    } catch (error: any) {
      const errorMessage = error?.message || 'Connection test failed';
      return { success: false, error: errorMessage };
    }
  }
}