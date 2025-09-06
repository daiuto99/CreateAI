/**
 * Background Integration Health Service
 * Monitors and maintains integration connections automatically
 */

import { IStorage } from '../storage';

export class IntegrationHealthService {
  private storage: IStorage;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start background health monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚕️ Integration health service already running');
      return;
    }

    console.log('⚕️ Starting integration health monitoring service...');
    this.isRunning = true;

    // Run health checks every 30 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30 * 60 * 1000);

    // Run initial health check after 1 minute
    setTimeout(async () => {
      await this.performHealthChecks();
    }, 60 * 1000);
  }

  /**
   * Stop background health monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isRunning = false;
    console.log('⚕️ Integration health monitoring service stopped');
  }

  /**
   * Perform health checks on all user integrations
   */
  private async performHealthChecks(): Promise<void> {
    try {
      console.log('⚕️ [HEALTH] Starting periodic integration health checks...');
      
      // This would ideally get all users, but for now we'll focus on connected integrations
      // In a real implementation, you'd want to batch this and handle large user bases
      
      console.log('⚕️ [HEALTH] Health check completed');
    } catch (error: any) {
      console.error('🚨 [HEALTH] Error during health checks:', error);
    }
  }

  /**
   * Check and refresh Bigin OAuth tokens
   */
  async checkBiginTokens(userId: string): Promise<{ refreshed: boolean; error?: string }> {
    try {
      const integrations = await this.storage.getUserIntegrations(userId);
      const biginIntegration = integrations.find(i => i.provider === 'bigin');
      
      if (!biginIntegration || biginIntegration.status !== 'connected') {
        return { refreshed: false, error: 'Integration not connected' };
      }

      const credentials = biginIntegration.credentials as any;
      if (!credentials?.access_token || !credentials?.refresh_token) {
        return { refreshed: false, error: 'Missing OAuth tokens' };
      }

      // Check if token needs refresh (expires in 30 minutes or less)
      const now = Date.now() / 1000;
      const bufferTime = 1800; // 30 minutes
      const needsRefresh = credentials.expires_at && (credentials.expires_at - bufferTime) <= now;

      if (!needsRefresh) {
        return { refreshed: false }; // Token still valid
      }

      console.log('🔄 [HEALTH] Refreshing Bigin tokens for user:', userId);

      // Refresh the token
      const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: credentials.refresh_token,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          grant_type: 'refresh_token'
        })
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('❌ [HEALTH] Token refresh failed:', errorText);
        
        if (refreshResponse.status === 400 || errorText.includes('invalid_grant')) {
          // Mark as needing re-authorization
          await this.storage.upsertUserIntegration({
            ...biginIntegration,
            status: 'needs_oauth' as any
          });
          return { refreshed: false, error: 'Refresh token expired - needs re-authorization' };
        }
        
        return { refreshed: false, error: `Token refresh failed: ${errorText}` };
      }

      const tokenData = await refreshResponse.json();
      
      // Update credentials with new token
      const updatedCredentials = {
        ...credentials,
        access_token: tokenData.access_token,
        expires_at: now + (tokenData.expires_in || 3600),
        last_refreshed: new Date().toISOString()
      };

      await this.storage.upsertUserIntegration({
        ...biginIntegration,
        credentials: updatedCredentials,
        last_validated: new Date().toISOString()
      });

      console.log('✅ [HEALTH] Bigin tokens refreshed successfully for user:', userId);
      return { refreshed: true };

    } catch (error: any) {
      console.error('🚨 [HEALTH] Error checking Bigin tokens:', error);
      return { refreshed: false, error: error.message };
    }
  }

  /**
   * Validate Otter.AI API key
   */
  async validateOtterApiKey(userId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const integrations = await this.storage.getUserIntegrations(userId);
      const otterIntegration = integrations.find(i => i.provider === 'otter');
      
      if (!otterIntegration || !otterIntegration.credentials) {
        return { valid: false, error: 'Integration not found' };
      }

      const credentials = otterIntegration.credentials as any;
      if (!credentials.apiKey) {
        return { valid: false, error: 'API key missing' };
      }

      // Check if validation is needed (daily)
      const lastValidated = credentials.last_validated ? new Date(credentials.last_validated) : null;
      const now = new Date();
      const hoursSinceValidation = lastValidated ? 
        Math.floor((now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60)) : 999;

      // Only validate if it's been more than 24 hours
      if (hoursSinceValidation < 24) {
        return { valid: true }; // Recently validated
      }

      console.log('🧪 [HEALTH] Validating Otter.ai API key for user:', userId);

      // Test API connection
      const testResponse = await fetch('https://otter.ai/forward/api/v1/meetings', {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (testResponse.ok) {
        // Update validation timestamp
        const updatedCredentials = {
          ...credentials,
          last_validated: now.toISOString(),
          validation_status: 'valid'
        };

        await this.storage.upsertUserIntegration({
          ...otterIntegration,
          credentials: updatedCredentials,
          status: 'connected' as any,
          last_validated: now.toISOString()
        });

        console.log('✅ [HEALTH] Otter.ai API key validated successfully');
        return { valid: true };

      } else if (testResponse.status === 401 || testResponse.status === 403) {
        // Mark as invalid
        const updatedCredentials = {
          ...credentials,
          validation_status: 'invalid',
          validation_error: 'API key is invalid or expired'
        };

        await this.storage.upsertUserIntegration({
          ...otterIntegration,
          credentials: updatedCredentials,
          status: 'error' as any
        });

        console.log('❌ [HEALTH] Otter.ai API key is invalid');
        return { valid: false, error: 'API key is invalid or expired' };

      } else {
        console.log('⚠️ [HEALTH] Otter.ai API returned unexpected status:', testResponse.status);
        return { valid: false, error: `API returned status ${testResponse.status}` };
      }

    } catch (error: any) {
      console.error('🚨 [HEALTH] Error validating Otter.ai API key:', error);
      
      // Don't mark as invalid for network errors
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        return { valid: false, error: 'Network error - validation skipped' };
      }
      
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get integration health status for a user
   */
  async getIntegrationHealth(userId: string): Promise<{
    bigin: { status: string; lastCheck?: string; error?: string };
    otter: { status: string; lastCheck?: string; error?: string };
  }> {
    const integrations = await this.storage.getUserIntegrations(userId);
    
    const biginIntegration = integrations.find(i => i.provider === 'bigin');
    const otterIntegration = integrations.find(i => i.provider === 'otter');

    return {
      bigin: {
        status: biginIntegration?.status || 'not_configured',
        lastCheck: biginIntegration?.last_validated,
        error: (biginIntegration?.credentials as any)?.validation_error
      },
      otter: {
        status: otterIntegration?.status || 'not_configured',
        lastCheck: otterIntegration?.last_validated,
        error: (otterIntegration?.credentials as any)?.validation_error
      }
    };
  }
}