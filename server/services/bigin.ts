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
      console.log('🔍 [DEBUG] Creating Bigin service for user:', userId);
      
      const integrations = await storage.getUserIntegrations(userId);
      console.log('🔍 [DEBUG] Found', integrations.length, 'total integrations for user');
      console.log('🔍 [DEBUG] Available integrations:', integrations.map(i => ({ provider: i.provider, status: i.status })));
      
      const biginIntegration = integrations.find(i => i.provider === 'bigin');
      console.log('🔍 [DEBUG] Bigin integration found:', !!biginIntegration);
      
      if (!biginIntegration) {
        console.log('❌ [DEBUG] No Bigin integration found at all');
        return null;
      }
      
      if (biginIntegration.status !== 'connected') {
        console.log('❌ [DEBUG] Bigin integration exists but not connected. Status:', biginIntegration.status);
        return null;
      }

      console.log('✅ [DEBUG] Bigin integration is connected, checking credentials...');
      const credentials = biginIntegration.credentials as BiginOAuthCredentials;
      
      console.log('🔍 [DEBUG] Credentials check:', {
        hasCredentials: !!credentials,
        hasAccessToken: !!credentials?.access_token,
        hasRefreshToken: !!credentials?.refresh_token,
        hasClientId: !!credentials?.client_id,
        hasClientSecret: !!credentials?.client_secret,
        accessTokenLength: credentials?.access_token?.length || 0,
        refreshTokenLength: credentials?.refresh_token?.length || 0
      });
      
      if (!credentials?.access_token || !credentials?.refresh_token) {
        console.log('❌ [DEBUG] Missing required OAuth credentials');
        return null;
      }

      console.log('✅ [DEBUG] Credentials validated, creating service instance...');
      const service = new BiginService(credentials, storage, userId);
      
      // Test connection and refresh token if needed
      console.log('🧪 [DEBUG] Testing Bigin API connection...');
      const connectionTest = await service.testConnection();
      
      console.log('🧪 [DEBUG] Connection test result:', {
        success: connectionTest.success,
        error: connectionTest.error
      });
      
      if (!connectionTest.success) {
        console.log('❌ [DEBUG] Bigin connection test failed:', connectionTest.error);
        return null;
      }

      console.log('✅ [DEBUG] Bigin service created and tested successfully');
      return service;
    } catch (error: any) {
      console.error('🚨 [DEBUG] Error creating Bigin service:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      return null;
    }
  }

  /**
   * Search for contacts by name, email, or company with enhanced criteria
   */
  async searchContacts(query: string): Promise<BiginContact[]> {
    try {
      console.log('🔍 Searching Bigin contacts for:', query);

      const searchUrl = `${this.baseUrl}/Contacts/search`;
      
      // ENHANCED: Multiple search strategies for better matching
      const searchCriteria = [
        `(Full_Name:starts_with:${query})`,  // Exact start match
        `(Full_Name:contains:${query})`,     // Contains anywhere
        `(Email:starts_with:${query})`,      // Email prefix
        `(Email:contains:${query})`          // Email contains
      ].join(' or ');
      
      const finalCriteria = `(${searchCriteria})`;
      
      console.log('🔍 [DEBUG] Exact search criteria being sent to Bigin API:', finalCriteria);
      console.log('🔍 [DEBUG] Full API request details:', {
        url: searchUrl,
        method: 'GET',
        criteria: finalCriteria,
        per_page: 50
      });

      const response = await this.makeAuthenticatedRequest(searchUrl, {
        method: 'GET',
        params: {
          criteria: finalCriteria,
          per_page: 50  // Increased from 20 to get more results
        }
      });

      if (!response.ok) {
        await this.handleApiError(response);
        return [];
      }

      const data = await response.json();
      console.log('📊 Bigin contact search response:', {
        query,
        contactCount: data.data?.length || 0,
        foundContacts: data.data?.map((c: any) => c.Full_Name || c.Name) || []
      });

      if (!data.data || !Array.isArray(data.data)) {
        console.log('⚠️ No contacts found for query:', query);
        return [];
      }

      // Transform and SORT by relevance
      const contacts: BiginContact[] = data.data.map((contact: any) => ({
        id: contact.id,
        name: contact.Full_Name || contact.Name || 'Unknown',
        email: contact.Email || '',
        company: contact.Account_Name?.Account_Name || '',
        phone: contact.Phone || contact.Mobile || ''
      }));

      // SORT by name relevance (exact matches first, then partial)
      contacts.sort((a, b) => {
        const aExact = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
        const bExact = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
        return bExact - aExact; // Exact matches first
      });

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
          ...(biginIntegration.credentials as object),
          access_token: this.credentials.access_token,
          expires_at: this.credentials.expires_at
        };

        await this.storage.upsertUserIntegration({
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
      console.log('🧪 [DEBUG] Testing Bigin API connection...');
      console.log('🧪 [DEBUG] Testing with base URL:', this.baseUrl);
      console.log('🧪 [DEBUG] Access token length:', this.credentials.access_token?.length || 0);

      const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/Contacts`, {
        method: 'GET',
        params: { per_page: 1 }
      });

      console.log('🧪 [DEBUG] Connection test response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [DEBUG] Bigin API connection test successful, sample data:', {
          hasData: !!data.data,
          dataType: typeof data.data,
          sampleCount: Array.isArray(data.data) ? data.data.length : 'not array'
        });
        return { success: true };
      }

      // Try to get response body for more details
      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch {
        responseBody = 'Could not read response body';
      }

      const errorMessage = `API returned ${response.status}: ${response.statusText}`;
      console.log('❌ [DEBUG] Bigin API connection test failed:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: responseBody,
        url: response.url
      });
      return { success: false, error: `${errorMessage}. Response: ${responseBody}` };

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown connection error';
      console.error('🚨 [DEBUG] Bigin API connection test exception:', {
        error: errorMessage,
        name: error?.name,
        code: error?.code,
        stack: error?.stack,
        isNetworkError: error?.name === 'TypeError' && error?.message?.includes('fetch')
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Enhanced contact search with multiple variations for better matching
   */
  async findContactByVariations(name: string): Promise<BiginContact[]> {
    console.log('🔍 Trying contact search variations for:', name);
    
    const searchVariations = [
      name,                           // "Mark"
      `${name}*`,                    // "Mark*" (wildcard)
      name.toLowerCase(),            // "mark"
      name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()  // "Mark"
    ];
    
    const allResults: BiginContact[] = [];
    
    for (const variation of searchVariations) {
      try {
        console.log(`  🔍 [DEBUG] Trying variation: "${variation}"`);
        const results = await this.searchContacts(variation);
        allResults.push(...results);
        
        console.log(`  📊 [DEBUG] Variation "${variation}" returned:`, {
          count: results.length,
          contacts: results.map(c => ({ name: c.name, id: c.id }))
        });
        
        if (results.length > 0) {
          console.log(`  ✅ Found ${results.length} contacts with variation: "${variation}"`);
          
          // Check if any result contains "Murphy"
          const murphyContacts = results.filter(c => c.name.toLowerCase().includes('murphy'));
          if (murphyContacts.length > 0) {
            console.log(`  🎯 [DEBUG] MURPHY CONTACTS found with variation "${variation}":`, murphyContacts);
          }
        } else {
          console.log(`  ⚪ [DEBUG] No contacts found for variation: "${variation}"`);
        }
      } catch (error: any) {
        console.error(`  🚨 [DEBUG] Search failed for variation "${variation}":`, error.message);
      }
    }
    
    // Remove duplicates by ID
    const uniqueResults = allResults.filter((contact, index, self) => 
      index === self.findIndex(c => c.id === contact.id)
    );
    
    console.log('📊 Total unique contacts found:', uniqueResults.length);
    return uniqueResults;
  }

  /**
   * Get multiple contacts by performing smart searches
   */
  async getContactsForMeetings(meetings: Array<{ title: string; attendees?: string[] }>): Promise<BiginContact[]> {
    try {
      console.log('🔍 [DEBUG] Getting contacts for', meetings.length, 'meetings');
      console.log('🔍 [DEBUG] Meeting titles:', meetings.map(m => m.title));

      const searchQueries = new Set<string>();
      
      // Extract search terms from meetings
      for (const meeting of meetings) {
        console.log(`🔍 [DEBUG] Processing meeting: "${meeting.title}"`);
        
        // Add attendee email prefixes
        if (meeting.attendees) {
          console.log(`🔍 [DEBUG] Processing ${meeting.attendees.length} attendees:`, meeting.attendees);
          for (const email of meeting.attendees) {
            const emailPrefix = email.split('@')[0];
            if (emailPrefix.length > 2) {
              searchQueries.add(emailPrefix);
              console.log(`  ➕ [DEBUG] Added email prefix: "${emailPrefix}"`);
            }
          }
        }

        // Add first words from meeting titles
        const titleWords = meeting.title.split(/[\s\-|/]/).filter(word => 
          word.length > 2 && !['the', 'and', 'with', 'meeting', 'call', 'chat'].includes(word.toLowerCase())
        );
        console.log(`🔍 [DEBUG] Title words from "${meeting.title}":`, titleWords);
        titleWords.slice(0, 2).forEach(word => {
          searchQueries.add(word);
          console.log(`  ➕ [DEBUG] Added title word: "${word}"`);
        });
      }

      console.log('📋 [DEBUG] Final search queries:', Array.from(searchQueries));

      const allContacts: BiginContact[] = [];
      const maxSearches = 5; // Limit API calls
      const searchTerms = Array.from(searchQueries).slice(0, maxSearches);
      
      console.log('🔍 [DEBUG] Will perform', searchTerms.length, 'searches:', searchTerms);
      
      for (const query of searchTerms) {
        try {
          console.log(`🔍 [DEBUG] ========== SEARCHING FOR: "${query}" ==========`);
          const contacts = await this.searchContacts(query);
          console.log(`📊 [DEBUG] Search "${query}" returned ${contacts.length} contacts:`, contacts.map(c => c.name));
          allContacts.push(...contacts);
        } catch (searchError: any) {
          console.error(`🚨 [DEBUG] Search failed for "${query}":`, {
            error: searchError.message,
            name: searchError.name,
            code: searchError.code,
            stack: searchError.stack
          });
        }
      }

      console.log('📊 [DEBUG] Total contacts from all searches:', allContacts.length);

      // Remove duplicates by ID
      const uniqueContacts = allContacts.filter((contact, index, self) => 
        index === self.findIndex(c => c.id === contact.id)
      );

      console.log('✅ [DEBUG] Found', uniqueContacts.length, 'unique Bigin contacts');
      console.log('📋 [DEBUG] Unique contact names:', uniqueContacts.map(c => c.name));
      return uniqueContacts;

    } catch (error: any) {
      console.error('🚨 [DEBUG] Error getting contacts for meetings:', {
        error: error?.message,
        name: error?.name,
        code: error?.code,
        stack: error?.stack
      });
      return [];
    }
  }
}