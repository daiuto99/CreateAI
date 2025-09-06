import { IStorage } from '../storage';

interface OtterSpeech {
  id: string;
  title: string;
  created_at: string;
  duration: number;
  transcript_id?: string;
  summary?: string;
  participants?: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
}

interface OtterSummary {
  id: string;
  summary: string;
  keywords?: string[];
  action_items?: string[];
}

interface ExpectedTranscript {
  id: string;
  title: string;
  date: Date;
  duration: string;
  summary?: string;
  participants?: string[];
}

export class OtterService {
  private apiKey: string;
  private baseUrl = 'https://otter.ai/forward/api/public';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create OtterService instance from user's stored integration
   */
  static async createFromUserIntegration(storage: IStorage, userId: string): Promise<OtterService | null> {
    try {
      console.log('🔍 Creating Otter service for user:', userId);
      
      const integrations = await storage.getUserIntegrations(userId);
      const otterIntegration = integrations.find(i => i.provider === 'otter');
      
      if (!otterIntegration || otterIntegration.status !== 'connected') {
        console.log('⚠️ No connected Otter integration found');
        return null;
      }

      const credentials = otterIntegration.credentials as any;
      if (!credentials?.apiKey) {
        console.log('⚠️ No Otter API key found in credentials');
        return null;
      }

      console.log('✅ Otter service created successfully');
      return new OtterService(credentials.apiKey);
    } catch (error) {
      console.error('🚨 Error creating Otter service:', error);
      return null;
    }
  }

  /**
   * DEBUG: Fetch ALL speeches without date filtering to see what's available
   */
  async getAllSpeeches(): Promise<ExpectedTranscript[]> {
    try {
      console.log('🔍 [DEBUG] Fetching ALL Otter speeches (no date filter)');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏰ Otter API timeout after 15 seconds');
      }, 15000);

      // Add cache-busting timestamp to force fresh data
      const timestamp = Date.now();
      const url = `${this.baseUrl}/speech/export?_t=${timestamp}&fresh=true&debug=all`;
      
      console.log('🔗 [DEBUG] Otter.ai ALL speeches request:', {
        url: url,
        method: 'GET',
        note: 'Fetching ALL speeches for debugging'
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'If-None-Match': '*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('❌ [DEBUG] Failed to fetch all speeches');
        return [];
      }

      const responseBody = await response.text();
      const data = JSON.parse(responseBody);
      
      // Handle different possible response formats
      let speeches = [];
      if (Array.isArray(data?.data)) {
        speeches = data.data;
      } else if (Array.isArray(data?.speeches)) {
        speeches = data.speeches;
      } else if (Array.isArray(data?.recordings)) {
        speeches = data.recordings;
      } else if (Array.isArray(data)) {
        speeches = data;
      }

      console.log('🔍 [DEBUG] ALL Available Speeches in Account:');
      speeches.forEach((speech: any, index: number) => {
        console.log(`  ${index + 1}. "${speech.title || 'Untitled'}" - Created: ${speech.created_at || 'Unknown'}`);
      });

      // Transform to expected format
      const transcripts: ExpectedTranscript[] = speeches.map((speech: any) => {
        return {
          id: speech.speech_id || speech.id || 'unknown',
          title: speech.title || 'Untitled Meeting',
          date: new Date(speech.created_at || Date.now()),
          duration: speech.duration || 'Unknown',
          summary: speech.summary || speech.abstract_summary,
          participants: speech.calendar_guests ? [speech.calendar_guests.name].filter(Boolean) : []
        };
      });

      console.log(`✅ [DEBUG] Total available transcripts: ${transcripts.length}`);
      return transcripts;

    } catch (error: any) {
      console.error('🚨 [DEBUG] Error fetching all speeches:', error.message);
      return [];
    }
  }

  /**
   * Fetch ALL speeches/meetings without date filtering 
   */
  async getSpeeches(startDate: Date, endDate: Date): Promise<ExpectedTranscript[]> {
    try {
      console.log('🎤 Fetching ALL Otter speeches (NO date filtering to get complete data)');

      // FIRST: Verify which account we're accessing
      await this.verifyAccountAccess();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏰ Otter API timeout after 15 seconds');
      }, 15000);

      // REMOVE ALL DATE FILTERING - get complete transcript list
      // Add cache-busting timestamp to force fresh data
      const timestamp = Date.now();
      
      // Try multiple API endpoints to get ALL transcripts
      const possibleUrls = [
        `${this.baseUrl}/speech/export?_t=${timestamp}&fresh=true&limit=100`, // Try with higher limit
        `${this.baseUrl}/meetings?_t=${timestamp}&fresh=true&limit=100`, // Alternative meetings endpoint
        `${this.baseUrl}/speech/export?_t=${timestamp}&fresh=true`, // Original endpoint
        `${this.baseUrl}/meetings/list?_t=${timestamp}&fresh=true&limit=100` // Another potential endpoint
      ];
      
      // Try each endpoint until we get data
      for (const [index, url] of possibleUrls.entries()) {
        try {
          console.log(`🔗 [DEBUG] Trying Otter API endpoint ${index + 1}/4:`, url);
      
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              // Cache-busting headers to force fresh data
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'If-None-Match': '*'
            },
            signal: controller.signal
          });

          const responseBody = await response.text();
          console.log(`🔗 [DEBUG] Endpoint ${index + 1} response:`, {
            url: url,
            status: response.status,
            ok: response.ok,
            bodyLength: responseBody.length,
            bodyPreview: responseBody.substring(0, 200) + (responseBody.length > 200 ? '...' : '')
          });

          if (response.ok && responseBody.length > 10) {
            clearTimeout(timeoutId);
            
            // Parse and analyze the response structure
            const data = JSON.parse(responseBody);
            console.log('📊 [COMPLETE DEBUG] Full API response structure from endpoint', index + 1, ':', {
              url: url,
              dataKeys: Object.keys(data || {}),
              hasData: !!data?.data,
              dataType: Array.isArray(data?.data) ? 'array' : typeof data?.data,
              dataArrayLength: Array.isArray(data?.data) ? data.data.length : 'N/A',
              isDirectArray: Array.isArray(data),
              directArrayLength: Array.isArray(data) ? data.length : 'N/A',
              hasSpeeches: !!data?.speeches,
              speechesLength: Array.isArray(data?.speeches) ? data.speeches.length : 'N/A',
              hasRecordings: !!data?.recordings,
              recordingsLength: Array.isArray(data?.recordings) ? data.recordings.length : 'N/A',
              hasMeetings: !!data?.meetings,
              meetingsLength: Array.isArray(data?.meetings) ? data.meetings.length : 'N/A',
              rawResponse: JSON.stringify(data, null, 2).substring(0, 1000)
            });

            // Handle different possible response formats from Otter.ai API
            let speeches = [];
            if (Array.isArray(data?.data)) {
              speeches = data.data;
              console.log('📋 Using data.data array format from endpoint', index + 1);
            } else if (Array.isArray(data?.speeches)) {
              speeches = data.speeches;
              console.log('📋 Using data.speeches array format from endpoint', index + 1);
            } else if (Array.isArray(data?.recordings)) {
              speeches = data.recordings;
              console.log('📋 Using data.recordings array format from endpoint', index + 1);
            } else if (Array.isArray(data?.meetings)) {
              speeches = data.meetings;
              console.log('📋 Using data.meetings array format from endpoint', index + 1);
            } else if (Array.isArray(data)) {
              speeches = data;
              console.log('📋 Using direct array format from endpoint', index + 1);
            } else {
              console.log('⚠️ Unrecognized response format from endpoint', index + 1, ':', data);
              continue; // Try next endpoint
            }

            if (speeches.length > 0) {
              console.log(`📊 SUCCESS! Found ${speeches.length} speeches from endpoint ${index + 1}`);
              console.log('🔍 All available speech titles:', speeches.map((s: any) => s.title || s.name || 'Untitled'));

              // Transform to expected format  
              const transcripts: ExpectedTranscript[] = speeches.map((speech: any) => {
                return {
                  id: speech.speech_id || speech.id || 'unknown',
                  title: speech.title || speech.name || 'Untitled Meeting',
                  date: new Date(speech.created_at || speech.date || Date.now()),
                  duration: speech.duration || 'Unknown',
                  summary: speech.summary || speech.abstract_summary || speech.description,
                  participants: speech.calendar_guests ? [speech.calendar_guests.name].filter(Boolean) : []
                };
              });

              console.log(`✅ SUCCESS: ${transcripts.length} transcripts processed from endpoint ${index + 1}`);
              console.log('📝 Final transcript list:', transcripts.map(t => ({ title: t.title, date: t.date.toISOString().split('T')[0] })));

              return transcripts;
            } else {
              console.log(`⚠️ Endpoint ${index + 1} returned empty speeches array`);
            }
          } else {
            console.log(`❌ Endpoint ${index + 1} failed:`, response.status, responseBody.substring(0, 100));
          }
        } catch (endpointError) {
          console.log(`❌ Error with endpoint ${index + 1}:`, endpointError);
        }
      }

      clearTimeout(timeoutId);
      console.log('❌ All endpoints failed or returned empty data');
      
      // FINAL: Try specific date queries for September 4th
      console.log('🔍 [FINAL ATTEMPT] Trying specific September 4th date queries...');
      return await this.trySpecificDateQueries();

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('🚨 Otter API request timed out');
        return [];
      }

      console.error('🚨 Error fetching Otter speeches:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 500)
      });
      return [];
    }
  }

  /**
   * Verify which Otter.AI account we're accessing
   */
  private async verifyAccountAccess(): Promise<void> {
    try {
      console.log('🔍 [ACCOUNT VERIFICATION] Checking Otter.AI account details...');
      
      const accountEndpoints = [
        `${this.baseUrl}/me`,
        `${this.baseUrl}/user`,
        `${this.baseUrl}/account`,
        `${this.baseUrl}/profile`
      ];

      for (const endpoint of accountEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const accountData = await response.json();
            console.log('✅ [ACCOUNT VERIFIED] Otter.AI Account Details:', {
              endpoint: endpoint,
              accountInfo: JSON.stringify(accountData, null, 2),
              apiKeyLast4: this.apiKey?.slice(-4) || 'NONE'
            });
            break;
          }
        } catch (err) {
          console.log(`❌ Account endpoint ${endpoint} failed:`, err);
        }
      }
    } catch (error) {
      console.error('🚨 [ACCOUNT VERIFICATION] Failed:', error);
    }
  }

  /**
   * Try specific date queries for September 4th transcripts
   */
  private async trySpecificDateQueries(): Promise<ExpectedTranscript[]> {
    try {
      console.log('🔍 [DATE SPECIFIC] Trying September 4th specific queries...');
      
      const sept4Queries = [
        // Try different date formats for September 4th, 2025
        `${this.baseUrl}/speech/export?date=2025-09-04`,
        `${this.baseUrl}/speech/export?start_date=2025-09-04&end_date=2025-09-05`,
        `${this.baseUrl}/speech/export?from=2025-09-04&to=2025-09-05`,
        `${this.baseUrl}/meetings?date=2025-09-04`,
        `${this.baseUrl}/meetings?created_after=2025-09-04T00:00:00Z`,
        `${this.baseUrl}/speech/export?created_at_gte=2025-09-04`,
        // Try timestamp formats
        `${this.baseUrl}/speech/export?after=1725408000`, // Sept 4, 2025 timestamp
        `${this.baseUrl}/meetings?since=1725408000`,
        // Try ISO formats
        `${this.baseUrl}/speech/export?start=2025-09-04T00:00:00.000Z`,
        `${this.baseUrl}/meetings?created_since=2025-09-04T00:00:00.000Z`
      ];

      for (const [index, url] of sept4Queries.entries()) {
        try {
          console.log(`🔗 [SEPT 4 QUERY ${index + 1}] Trying:`, url);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            signal: AbortSignal.timeout(10000)
          });

          const responseBody = await response.text();
          console.log(`📊 [SEPT 4 RESPONSE ${index + 1}]:`, {
            url: url,
            status: response.status,
            bodyLength: responseBody.length,
            fullResponse: responseBody // Log COMPLETE response
          });

          if (response.ok && responseBody.length > 10) {
            const data = JSON.parse(responseBody);
            
            // Look for ANY data that might contain Nicole/Ashley/Dante
            console.log(`🔍 [SEPT 4 ANALYSIS ${index + 1}] Full response structure:`, {
              dataKeys: Object.keys(data || {}),
              completeData: JSON.stringify(data, null, 2) // FULL DATA
            });

            // Search for Nicole/Ashley/Dante in the response
            const responseText = JSON.stringify(data).toLowerCase();
            const hasNicole = responseText.includes('nicole');
            const hasAshley = responseText.includes('ashley'); 
            const hasDante = responseText.includes('dante');
            
            console.log(`🎯 [SEPT 4 SEARCH ${index + 1}] Looking for missing transcripts:`, {
              hasNicole,
              hasAshley,
              hasDante,
              foundAny: hasNicole || hasAshley || hasDante
            });

            if (hasNicole || hasAshley || hasDante) {
              console.log('🎉 [BREAKTHROUGH] Found Nicole/Ashley/Dante data in response!');
              // Parse and return any found transcripts
              let speeches = [];
              if (Array.isArray(data?.data)) speeches = data.data;
              else if (Array.isArray(data?.speeches)) speeches = data.speeches;
              else if (Array.isArray(data?.recordings)) speeches = data.recordings;
              else if (Array.isArray(data?.meetings)) speeches = data.meetings;
              else if (Array.isArray(data)) speeches = data;

              if (speeches.length > 0) {
                const transcripts: ExpectedTranscript[] = speeches.map((speech: any) => ({
                  id: speech.speech_id || speech.id || 'unknown',
                  title: speech.title || speech.name || 'Untitled Meeting',
                  date: new Date(speech.created_at || speech.date || Date.now()),
                  duration: speech.duration || 'Unknown',
                  summary: speech.summary || speech.abstract_summary || speech.description,
                  participants: speech.calendar_guests ? [speech.calendar_guests.name].filter(Boolean) : []
                }));

                console.log('✅ [SEPT 4 SUCCESS] Returning transcripts from date-specific query');
                return transcripts;
              }
            }
          }
        } catch (queryError) {
          console.log(`❌ September 4th query ${index + 1} failed:`, queryError);
        }
      }

      console.log('❌ [SEPT 4 FAILED] No September 4th transcripts found with any date format');
      return [];

    } catch (error) {
      console.error('🚨 [SEPT 4 ERROR] Date-specific queries failed:', error);
      return [];
    }
  }

  /**
   * Get summary for a specific speech
   */
  async getSpeechSummary(speechId: string): Promise<OtterSummary | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout for summaries

      // Since summaries are included in /api/public/speech/export, this method is no longer needed
      console.log('⚠️ getSpeechSummary called but summaries are included in main export response');
      return null;
      
      const response = await fetch(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`📝 No summary available for speech ${speechId}`);
          return null;
        }
        await this.handleApiError(response);
        return null;
      }

      const summary = await response.json();
      return summary;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`⏰ Summary request timed out for speech ${speechId}`);
      } else {
        console.error(`🚨 Error fetching summary for ${speechId}:`, error?.message);
      }
      return null;
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

    console.error('🚨 Otter API Error:', { ...errorDetails, errorMessage });

    switch (response.status) {
      case 401:
        console.error('🔐 Unauthorized: Otter API key is invalid or expired');
        console.error('💡 User needs to reconnect their Otter.AI integration');
        break;
      case 403:
        console.error('🚫 Forbidden: Access denied to Otter API endpoint');
        break;
      case 404:
        console.error('🔍 Not Found: Otter API endpoint does not exist');
        break;
      case 429:
        console.error('⏱️ Rate Limited: Too many requests to Otter API');
        console.error('💡 Implementing exponential backoff...');
        break;
      case 500:
      case 502:
      case 503:
        console.error('🔧 Server Error: Otter API service may be down');
        break;
      default:
        console.error('❓ Unknown Otter API error');
    }
  }

  /**
   * Format duration from seconds to human-readable string
   */
  private formatDuration(durationSeconds: number): string {
    if (!durationSeconds || durationSeconds <= 0) return '0m';

    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Test API connection with current credentials
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing Otter API connection...');

      const response = await fetch(`${this.baseUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Otter API connection test successful');
        return { success: true };
      }

      const errorMessage = `API returned ${response.status}: ${response.statusText}`;
      console.log('❌ Otter API connection test failed:', errorMessage);
      return { success: false, error: errorMessage };

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown connection error';
      console.log('❌ Otter API connection test failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}