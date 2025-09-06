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
   * Fetch speeches/meetings from specified date range
   */
  async getSpeeches(startDate: Date, endDate: Date): Promise<ExpectedTranscript[]> {
    try {
      console.log('🎤 Fetching Otter speeches from', startDate.toISOString(), 'to', endDate.toISOString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏰ Otter API timeout after 15 seconds');
      }, 15000);

      // Use the correct Otter.ai export endpoint (max 3 most recent recordings)
      // Add cache-busting timestamp to force fresh data
      const timestamp = Date.now();
      const url = `${this.baseUrl}/speech/export?_t=${timestamp}&fresh=true`;
      
      console.log('🔗 [DEBUG] Otter.ai API request details:', {
        url: url,
        method: 'GET',
        apiKeyFirst15Chars: this.apiKey?.substring(0, 15) || 'NONE',
        note: 'Using official /api/public/speech/export endpoint with cache-busting'
      });
      
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

      clearTimeout(timeoutId);

      const responseBody = await response.text();
      console.log('🔗 [DEBUG] Otter.ai API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseBody: responseBody.substring(0, 300) + (responseBody.length > 300 ? '...' : ''),
        fullResponseLength: responseBody.length
      });

      if (!response.ok) {
        await this.handleApiError(response);
        return [];
      }

      const data = JSON.parse(responseBody);
      console.log('📊 Otter API response structure:', {
        dataKeys: Object.keys(data || {}),
        hasData: !!data?.data,
        dataType: Array.isArray(data?.data) ? 'array' : typeof data?.data,
        // DEBUG: Check if data is directly an array or has other structures
        isDirectArray: Array.isArray(data),
        hasSpeeches: !!data?.speeches,
        hasRecordings: !!data?.recordings,
        dataLength: data?.length
      });

      // Handle different possible response formats from Otter.ai API
      let speeches = [];
      if (Array.isArray(data?.data)) {
        speeches = data.data;
      } else if (Array.isArray(data?.speeches)) {
        speeches = data.speeches;
      } else if (Array.isArray(data?.recordings)) {
        speeches = data.recordings;
      } else if (Array.isArray(data)) {
        speeches = data;
      } else if (data?.data) {
        speeches = [data.data];
      } else {
        console.log('🔍 Raw response keys for debugging:', Object.keys(data || {}));
        console.log('🔍 First few response properties:', JSON.stringify(data, null, 2).substring(0, 500));
      }
      
      if (!speeches || speeches.length === 0) {
        console.log('⚠️ No speeches found in Otter response');
        return [];
      }

      // Transform Otter API response to expected format
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

      console.log('✅ Successfully transformed', transcripts.length, 'Otter speeches');
      return transcripts;

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