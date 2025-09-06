import { IStorage } from '../storage';

interface BiginContact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
}

interface BiginMeetingRecord {
  Subject: string;
  Start_DateTime: string;
  Description: string;
  What_Id?: string; // Contact ID if found
  Duration: number;
  Meeting_Type: string;
}

interface BiginOAuthCredentials {
  access_token: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  expires_at?: number;
}

export class BiginService {
  private credentials: BiginOAuthCredentials;
  private baseUrl = 'https://www.zohoapis.com/bigin/v1';
  private storage: IStorage;
  private userId: string;

  constructor(credentials: BiginOAuthCredentials, storage: IStorage, userId: string) {
    this.credentials = credentials;
    this.storage = storage;
    this.userId = userId;
  }

  /**
   * Create BiginService instance from user's stored integration
   */
  static async createFromUserIntegration(storage: IStorage, userId: string): Promise<BiginService | null> {
    try {
      console.log('🔍 Creating Bigin service for user:', userId);
      
      const integrations = await storage.getUserIntegrations(userId);
      const biginIntegration = integrations.find(i => i.provider === 'bigin');
      
      if (!biginIntegration || biginIntegration.status !== 'connected') {
        console.log('⚠️ No connected Bigin integration found');
        return null;
      }

      const credentials = biginIntegration.credentials as BiginOAuthCredentials;
      if (!credentials?.access_token || !credentials?.refresh_token) {
        console.log('⚠️ No Bigin OAuth credentials found');
        return null;
      }

      const service = new BiginService(credentials, storage, userId);
      
      // Test connection and refresh token if needed
      const connectionTest = await service.testConnection();
      if (!connectionTest.success) {
        console.log('⚠️ Bigin connection test failed:', connectionTest.error);
        return null;
      }

      console.log('✅ Bigin service created successfully');
      return service;
    } catch (error) {
      console.error('🚨 Error creating Bigin service:', error);
      return null;
    }
  }

  /**
   * Search for contacts by name, email, or company
   */
  async searchContacts(query: string): Promise<BiginContact[]> {
    try {
      console.log('🔍 Searching Bigin contacts for:', query);

      const searchUrl = `${this.baseUrl}/Contacts/search`;
      const searchCriteria = `((Full_Name:contains:${query}) or (Email:contains:${query}) or (Account_Name.Account_Name:contains:${query}))`;

      const response = await this.makeAuthenticatedRequest(searchUrl, {
        method: 'GET',
        params: {
          criteria: searchCriteria,
          per_page: 20
        }
      });

      if (!response.ok) {
        await this.handleApiError(response);
        return [];
      }

      const data = await response.json();
      console.log('📊 Bigin contact search response:', {
        query,
        contactCount: data.data?.length || 0
      });

      if (!data.data || !Array.isArray(data.data)) {
        console.log('⚠️ No contacts found for query:', query);
        return [];
      }

      // Transform Bigin API response to our format
      const contacts: BiginContact[] = data.data.map((contact: any) => ({
        id: contact.id,
        name: contact.Full_Name || contact.Name || 'Unknown',
        email: contact.Email || '',
        company: contact.Account_Name?.Account_Name || '',
        phone: contact.Phone || contact.Mobile || ''
      }));

      console.log('✅ Found', contacts.length, 'Bigin contacts for query:', query);
      console.log('📋 Contact names:', contacts.map(c => c.name));

      return contacts;

    } catch (error: any) {
      console.error('🚨 Error searching Bigin contacts:', {
        query,
        error: error?.message,
        code: error?.code
      });
      return [];
    }
  }

  /**
   * Create a meeting/activity record in Bigin CRM
   */
  async createMeetingRecord(meetingData: {
    title: string;
    date: Date;
    summary?: string;
    attendees?: string[];
    contactId?: string;
  }): Promise<{ id: string; success: boolean }> {
    try {
      console.log('📝 Creating Bigin meeting record:', meetingData.title);

      const meetingRecord: BiginMeetingRecord = {
        Subject: meetingData.title,
        Start_DateTime: meetingData.date.toISOString(),
        Description: this.buildMeetingDescription(meetingData),
        Duration: 60, // Default 1 hour
        Meeting_Type: 'Meeting'
      };

      // Link to contact if found
      if (meetingData.contactId) {
        meetingRecord.What_Id = meetingData.contactId;
      }

      const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/Events`, {
        method: 'POST',
        body: JSON.stringify({
          data: [meetingRecord]
        })
      });

      if (!response.ok) {
        await this.handleApiError(response);
        throw new Error(`Failed to create meeting record: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.data?.[0]?.code === 'SUCCESS') {
        const recordId = result.data[0].details.id;
        console.log('✅ Created Bigin meeting record:', recordId);
        return { id: recordId, success: true };
      } else {
        console.error('❌ Bigin record creation failed:', result);
        throw new Error('Record creation failed');
      }

    } catch (error: any) {
      console.error('🚨 Error creating Bigin meeting record:', {
        title: meetingData.title,
        error: error?.message
      });
      throw error;
    }
  }

  /**
   * Build comprehensive meeting description
   */
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

  /**
   * Make authenticated API request with automatic token refresh
   */
  private async makeAuthenticatedRequest(url: string, options: {
    method: string;
    params?: Record<string, any>;
    body?: string;
  }): Promise<Response> {
    const headers: Record<string, string> = {
      'Authorization': `Zoho-oauthtoken ${this.credentials.access_token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CreateAI-BiginIntegration/1.0'
    };

    let finalUrl = url;
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      finalUrl += `?${searchParams.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      body: options.body
    };

    let response = await fetch(finalUrl, fetchOptions);

    // Handle token refresh if unauthorized
    if (response.status === 401) {
      console.log('🔄 Access token expired, attempting refresh...');
      
      const refreshSuccess = await this.refreshAccessToken();
      if (refreshSuccess) {
        // Update authorization header and retry
        headers['Authorization'] = `Zoho-oauthtoken ${this.credentials.access_token}`;
        fetchOptions.headers = headers;
        response = await fetch(finalUrl, fetchOptions);
      } else {
        console.error('❌ Token refresh failed, request will fail');
      }
    }

    return response;
  }

  /**
   * Refresh OAuth access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      console.log('🔄 Refreshing Bigin access token...');

      const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
      const tokenData = new URLSearchParams({
        refresh_token: this.credentials.refresh_token,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        grant_type: 'refresh_token'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenData
      });

      if (!response.ok) {
        console.error('❌ Token refresh failed:', response.status, response.statusText);
        return false;
      }

      const tokenResponse = await response.json();
      
      if (tokenResponse.access_token) {
        // Update credentials with new access token
        this.credentials.access_token = tokenResponse.access_token;
        this.credentials.expires_at = Date.now() + (tokenResponse.expires_in * 1000);

        // Update stored credentials
        await this.updateStoredCredentials();
        
        console.log('✅ Successfully refreshed Bigin access token');
        return true;
      } else {
        console.error('❌ No access token in refresh response:', tokenResponse);
        return false;
      }

    } catch (error: any) {
      console.error('🚨 Error refreshing Bigin access token:', error?.message);
      return false;
    }
  }

  /**
   * Update stored credentials in database
   */
  private async updateStoredCredentials(): Promise<void> {
    try {
      const integrations = await this.storage.getUserIntegrations(this.userId);
      const biginIntegration = integrations.find(i => i.provider === 'bigin');
      
      if (biginIntegration) {
        const updatedCredentials = {
          ...biginIntegration.credentials,
          access_token: this.credentials.access_token,
          expires_at: this.credentials.expires_at
        };

        await this.storage.updateUserIntegration(this.userId, biginIntegration.id, {
          ...biginIntegration,
          credentials: updatedCredentials
        });

        console.log('✅ Updated stored Bigin credentials');
      }
    } catch (error) {
      console.error('⚠️ Failed to update stored credentials:', error);
    }
  }

  /**
   * Handle API errors with specific messaging
   */
  private async handleApiError(response: Response): Promise<void> {
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      timestamp: new Date().toISOString()
    };

    let errorMessage = '';
    try {
      const errorBody = await response.text();
      errorMessage = errorBody;
    } catch {
      // Ignore parsing errors
    }

    console.error('🚨 Bigin API Error:', { ...errorDetails, errorMessage });

    switch (response.status) {
      case 401:
        console.error('🔐 Unauthorized: Bigin OAuth token is invalid or expired');
        break;
      case 403:
        console.error('🚫 Forbidden: Access denied to Bigin API endpoint');
        break;
      case 404:
        console.error('🔍 Not Found: Bigin API endpoint does not exist');
        break;
      case 429:
        console.error('⏱️ Rate Limited: Too many requests to Bigin API');
        break;
      case 500:
      case 502:
      case 503:
        console.error('🔧 Server Error: Bigin API service may be down');
        break;
      default:
        console.error('❓ Unknown Bigin API error');
    }
  }

  /**
   * Test API connection with current credentials
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing Bigin API connection...');

      const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/Contacts`, {
        method: 'GET',
        params: { per_page: 1 }
      });

      if (response.ok) {
        console.log('✅ Bigin API connection test successful');
        return { success: true };
      }

      const errorMessage = `API returned ${response.status}: ${response.statusText}`;
      console.log('❌ Bigin API connection test failed:', errorMessage);
      return { success: false, error: errorMessage };

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown connection error';
      console.log('❌ Bigin API connection test failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get multiple contacts by performing smart searches
   */
  async getContactsForMeetings(meetings: Array<{ title: string; attendees?: string[] }>): Promise<BiginContact[]> {
    try {
      console.log('🔍 Getting contacts for', meetings.length, 'meetings');

      const searchQueries = new Set<string>();
      
      // Extract search terms from meetings
      for (const meeting of meetings) {
        // Add attendee email prefixes
        if (meeting.attendees) {
          for (const email of meeting.attendees) {
            const emailPrefix = email.split('@')[0];
            if (emailPrefix.length > 2) {
              searchQueries.add(emailPrefix);
            }
          }
        }

        // Add first words from meeting titles
        const titleWords = meeting.title.split(/[\s\-|/]/).filter(word => 
          word.length > 2 && !['the', 'and', 'with', 'meeting', 'call', 'chat'].includes(word.toLowerCase())
        );
        titleWords.slice(0, 2).forEach(word => searchQueries.add(word));
      }

      console.log('📋 Search queries:', Array.from(searchQueries));

      const allContacts: BiginContact[] = [];
      const maxSearches = 5; // Limit API calls
      
      for (const query of Array.from(searchQueries).slice(0, maxSearches)) {
        try {
          const contacts = await this.searchContacts(query);
          allContacts.push(...contacts);
        } catch (searchError: any) {
          console.warn(`⚠️ Search failed for "${query}":`, searchError.message);
        }
      }

      // Remove duplicates by ID
      const uniqueContacts = allContacts.filter((contact, index, self) => 
        index === self.findIndex(c => c.id === contact.id)
      );

      console.log('✅ Found', uniqueContacts.length, 'unique Bigin contacts');
      return uniqueContacts;

    } catch (error: any) {
      console.error('🚨 Error getting contacts for meetings:', error?.message);
      return [];
    }
  }
}