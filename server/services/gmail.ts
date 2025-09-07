import { google } from 'googleapis';

/**
 * Gmail API Service for fetching email content
 * Used by Otter email webhook to retrieve full email content
 */
export class GmailService {
  private gmail: any;
  private auth: any;

  constructor(credentials: any) {
    // Initialize OAuth2 client
    this.auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    // Set access token
    this.auth.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    // Initialize Gmail API
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  /**
   * Get email content by message ID
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<object>} Email data including subject, body, sender
   */
  async getEmailContent(messageId: string) {
    try {
      console.log('📧 [GMAIL] Fetching email content for message:', messageId);

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;

      // Extract headers
      const subject = this.getHeader(headers, 'Subject') || '';
      const sender = this.getHeader(headers, 'From') || '';
      const date = this.getHeader(headers, 'Date') || '';
      const messageId_header = this.getHeader(headers, 'Message-ID') || '';

      // Extract body content
      const bodyData = this.extractBodyFromPayload(message.payload);

      console.log('📧 [GMAIL] Successfully fetched email:', {
        subject: subject.substring(0, 50) + '...',
        sender,
        bodyLength: bodyData.length
      });

      return {
        messageId,
        subject,
        sender,
        date,
        messageId_header,
        body: bodyData,
        raw: message // Keep raw message for debugging
      };

    } catch (error: any) {
      console.error('🚨 [GMAIL] Error fetching email:', error.message);
      throw new Error(`Failed to fetch email content: ${error.message}`);
    }
  }

  /**
   * Extract specific header value from email headers
   */
  private getHeader(headers: any[], name: string): string | null {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }

  /**
   * Extract body text from email payload (handles multipart and plain text)
   */
  private extractBodyFromPayload(payload: any): string {
    let body = '';

    if (payload.parts) {
      // Multipart email - extract from parts
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body?.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            body += decoded + '\n';
          }
        } else if (part.parts) {
          // Nested parts
          body += this.extractBodyFromPayload(part);
        }
      }
    } else if (payload.body?.data) {
      // Single part email
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return body.trim();
  }

  /**
   * List recent emails matching criteria
   * @param {object} criteria - Search criteria
   * @returns {Promise<Array>} Array of message IDs
   */
  async listEmails(criteria: { 
    from?: string, 
    subject?: string, 
    maxResults?: number,
    newer_than?: string 
  } = {}) {
    try {
      let query = '';
      
      if (criteria.from) {
        query += `from:${criteria.from} `;
      }
      
      if (criteria.subject) {
        query += `subject:"${criteria.subject}" `;
      }

      if (criteria.newer_than) {
        query += `newer_than:${criteria.newer_than} `;
      }

      console.log('📧 [GMAIL] Searching emails with query:', query);

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query.trim(),
        maxResults: criteria.maxResults || 50
      });

      const messages = response.data.messages || [];
      console.log('📧 [GMAIL] Found', messages.length, 'emails matching criteria');

      return messages.map((msg: any) => msg.id);

    } catch (error: any) {
      console.error('🚨 [GMAIL] Error listing emails:', error.message);
      throw new Error(`Failed to list emails: ${error.message}`);
    }
  }

  /**
   * Test Gmail API connection
   */
  async testConnection() {
    try {
      const profile = await this.gmail.users.getProfile({ userId: 'me' });
      console.log('📧 [GMAIL] Connection test successful:', profile.data.emailAddress);
      return {
        success: true,
        email: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal
      };
    } catch (error: any) {
      console.error('🚨 [GMAIL] Connection test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Create Gmail service instance from user credentials
 */
export function createGmailService(credentials: any): GmailService {
  return new GmailService(credentials);
}