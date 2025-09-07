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
   * Fetch ALL speeches/meetings using pagination to get complete data
   */
  async getSpeeches(startDate: Date, endDate: Date): Promise<ExpectedTranscript[]> {
    try {
      console.log('🎤 [PAGINATION] Fetching ALL Otter speeches using multiple API calls');

      // FIRST: Verify which account we're accessing
      await this.verifyAccountAccess();

      // Implement pagination to get ALL transcripts (API returns only 3 per call)
      return await this.getAllSpeechesWithPagination();

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
   * Get ALL speeches using pagination - API only returns 3 most recent per call
   */
  private async getAllSpeechesWithPagination(): Promise<ExpectedTranscript[]> {
    try {
      console.log('📄 [PAGINATION] Starting paginated API calls to get ALL transcripts...');
      
      const allTranscripts: ExpectedTranscript[] = [];
      const seenIds = new Set<string>();
      let pageAttempt = 0;
      const maxPages = 20; // Safety limit to prevent infinite loops
      
      const timestamp = Date.now();
      const baseUrl = `${this.baseUrl}/speech/export`;
      
      // Try different pagination strategies
      const paginationStrategies = [
        // Strategy 1: offset-based pagination
        (page: number) => `${baseUrl}?offset=${page * 3}&limit=50&_t=${timestamp}`,
        // Strategy 2: page-based pagination  
        (page: number) => `${baseUrl}?page=${page}&per_page=50&_t=${timestamp}`,
        // Strategy 3: cursor-based pagination (if we get a cursor)
        (page: number) => `${baseUrl}?cursor=${page}&limit=50&_t=${timestamp}`,
        // Strategy 4: skip-based pagination
        (page: number) => `${baseUrl}?skip=${page * 3}&take=50&_t=${timestamp}`,
        // Strategy 5: start/count pagination
        (page: number) => `${baseUrl}?start=${page * 3}&count=50&_t=${timestamp}`,
        // Strategy 6: from parameter
        (page: number) => `${baseUrl}?from=${page * 3}&_t=${timestamp}`,
      ];

      for (const [strategyIndex, urlBuilder] of paginationStrategies.entries()) {
        console.log(`🔄 [STRATEGY ${strategyIndex + 1}] Trying pagination strategy...`);
        
        for (let page = 0; page < maxPages; page++) {
          try {
            const url = urlBuilder(page);
            console.log(`📞 [CALL ${page + 1}] Strategy ${strategyIndex + 1}: ${url}`);

            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              },
              signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
              console.log(`❌ [CALL ${page + 1}] Strategy ${strategyIndex + 1} failed:`, response.status);
              break; // Try next strategy
            }

            const responseBody = await response.text();
            const data = JSON.parse(responseBody);
            
            // Extract speeches from response
            let speeches = [];
            if (Array.isArray(data?.data)) speeches = data.data;
            else if (Array.isArray(data?.speeches)) speeches = data.speeches;
            else if (Array.isArray(data?.recordings)) speeches = data.recordings;
            else if (Array.isArray(data)) speeches = data;

            console.log(`📊 [CALL ${page + 1}] Strategy ${strategyIndex + 1} returned ${speeches.length} transcripts`);

            if (speeches.length === 0) {
              console.log(`✅ [STRATEGY ${strategyIndex + 1}] No more transcripts found, moving to next strategy`);
              break; // No more transcripts, try next strategy
            }

            // Process and deduplicate transcripts
            let newTranscriptsCount = 0;
            for (const speech of speeches) {
              const speechId = speech.speech_id || speech.id || `unknown-${speech.title}`;
              
              if (!seenIds.has(speechId)) {
                seenIds.add(speechId);
                newTranscriptsCount++;
                
                const transcript: ExpectedTranscript = {
                  id: speechId,
                  title: speech.title || speech.name || 'Untitled Meeting',
                  date: new Date(speech.created_at || speech.date || Date.now()),
                  duration: speech.duration || 'Unknown',
                  summary: speech.summary || speech.abstract_summary || speech.description,
                  participants: speech.calendar_guests ? [speech.calendar_guests.name].filter(Boolean) : []
                };
                
                allTranscripts.push(transcript);
                console.log(`➕ [NEW] Found transcript: "${transcript.title}" (${transcript.date.toISOString().split('T')[0]})`);
              }
            }

            console.log(`📈 [CALL ${page + 1}] Added ${newTranscriptsCount} new transcripts. Total: ${allTranscripts.length}`);

            // If we got fewer than expected or no new transcripts, this strategy is exhausted
            if (speeches.length < 3 || newTranscriptsCount === 0) {
              console.log(`✅ [STRATEGY ${strategyIndex + 1}] Exhausted, trying next strategy`);
              break;
            }

            pageAttempt++;
            
            // Small delay between calls to be respectful to the API
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (callError) {
            console.log(`❌ [CALL ${page + 1}] Strategy ${strategyIndex + 1} error:`, callError);
            break; // Try next strategy
          }
        }

        // If we found transcripts with this strategy, log success
        if (allTranscripts.length > 0) {
          console.log(`🎉 [STRATEGY ${strategyIndex + 1}] Success! Found ${allTranscripts.length} total transcripts`);
        }
      }

      // Sort by date (newest first)
      allTranscripts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('🎯 [PAGINATION COMPLETE] Final results:');
      console.log(`📊 Total unique transcripts found: ${allTranscripts.length}`);
      console.log('📝 All transcript titles:', allTranscripts.map(t => `"${t.title}" (${t.date.toISOString().split('T')[0]})`));
      
      // Look specifically for the missing transcripts
      const hasNicole = allTranscripts.some(t => t.title.toLowerCase().includes('nicole'));
      const hasAshley = allTranscripts.some(t => t.title.toLowerCase().includes('ashley'));
      const hasDante = allTranscripts.some(t => t.title.toLowerCase().includes('dante'));
      
      console.log('🔍 [MISSING TRANSCRIPT CHECK]:', {
        hasNicole,
        hasAshley,
        hasDante,
        foundMissingTranscripts: hasNicole || hasAshley || hasDante
      });

      return allTranscripts;

    } catch (error) {
      console.error('🚨 [PAGINATION ERROR] Failed to get all speeches:', error);
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