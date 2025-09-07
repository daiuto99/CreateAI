const crypto = require('crypto');

/**
 * OtterEmailParser - Parses Otter.AI meeting emails to extract transcript data
 * Replaces unreliable API calls with email-based data ingestion
 */
class OtterEmailParser {
  /**
   * Parse an Otter email to extract meeting transcript data
   * @param {string} emailBody - Raw email body content
   * @param {string} subject - Email subject line
   * @returns {object} Parsed meeting data
   */
  static parseOtterEmail(emailBody, subject) {
    try {
      // Extract meeting title from subject line
      const title = subject
        .replace(/^(Re:|Fwd:|\[Otter\]|\[Otter\.ai\])/i, '')
        .replace(/meeting recap|meeting summary|transcript/i, '')
        .trim();
      
      // Parse email body for key data
      const participants = this.extractParticipants(emailBody);
      const summary = this.extractSummary(emailBody);
      const actionItems = this.extractActionItems(emailBody);
      const meetingDate = this.extractMeetingDate(emailBody);
      const duration = this.extractDuration(emailBody);
      const otterLink = this.extractOtterLink(emailBody);
      
      return {
        id: crypto.createHash('md5').update(subject + meetingDate + emailBody.substring(0, 100)).digest('hex'),
        title: title || 'Untitled Meeting',
        date: meetingDate,
        participants: participants || [],
        summary: summary || '',
        actionItems: actionItems || [],
        duration: duration || 0,
        otterLink: otterLink || null,
        source: 'otter_email',
        raw: {
          subject,
          emailBody: emailBody.substring(0, 500) // Keep first 500 chars for debugging
        },
        parsedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('🚨 [OTTER EMAIL] Parse error:', error.message);
      return null;
    }
  }

  /**
   * Extract participants from email body
   */
  static extractParticipants(emailBody) {
    const participants = [];
    
    // Common patterns in Otter emails
    const patterns = [
      /Participants?:\s*(.+?)(?:\n|$)/i,
      /Attendees?:\s*(.+?)(?:\n|$)/i,
      /Present:\s*(.+?)(?:\n|$)/i,
      /In this meeting:\s*(.+?)(?:\n|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = emailBody.match(pattern);
      if (match) {
        const participantText = match[1];
        // Split by common delimiters
        const names = participantText
          .split(/[,;]\s*|and\s+/)
          .map(name => name.trim())
          .filter(name => name.length > 0 && !name.match(/^\d+$/));
        participants.push(...names);
        break;
      }
    }
    
    // Remove duplicates and clean up
    return [...new Set(participants)].slice(0, 10); // Limit to 10 participants
  }

  /**
   * Extract meeting summary from email body
   */
  static extractSummary(emailBody) {
    const patterns = [
      /Summary:\s*(.+?)(?:\n\n|\nAction|$)/s,
      /Meeting Summary:\s*(.+?)(?:\n\n|\nAction|$)/s,
      /Key Points:\s*(.+?)(?:\n\n|\nAction|$)/s,
      /Overview:\s*(.+?)(?:\n\n|\nAction|$)/s
    ];
    
    for (const pattern of patterns) {
      const match = emailBody.match(pattern);
      if (match) {
        return match[1].trim().substring(0, 1000); // Limit length
      }
    }
    
    return '';
  }

  /**
   * Extract action items from email body
   */
  static extractActionItems(emailBody) {
    const actionItems = [];
    
    const patterns = [
      /Action Items?:\s*(.+?)(?:\n\n|$)/s,
      /To-Do:\s*(.+?)(?:\n\n|$)/s,
      /Next Steps:\s*(.+?)(?:\n\n|$)/s,
      /Follow-up:\s*(.+?)(?:\n\n|$)/s
    ];
    
    for (const pattern of patterns) {
      const match = emailBody.match(pattern);
      if (match) {
        const actionText = match[1];
        // Split by bullet points or numbers
        const actions = actionText
          .split(/\n[-•*]\s*|\n\d+\.\s*/)
          .map(action => action.trim())
          .filter(action => action.length > 0);
        actionItems.push(...actions);
        break;
      }
    }
    
    return actionItems.slice(0, 20); // Limit to 20 action items
  }

  /**
   * Extract meeting date from email body or subject
   */
  static extractMeetingDate(emailBody) {
    const patterns = [
      /Date:\s*(.+?)(?:\n|$)/i,
      /Meeting Date:\s*(.+?)(?:\n|$)/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i
    ];
    
    for (const pattern of patterns) {
      const match = emailBody.match(pattern);
      if (match) {
        const dateStr = match[1] || match[0];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
    }
    
    // Fallback to today's date
    return new Date().toISOString();
  }

  /**
   * Extract meeting duration from email body
   */
  static extractDuration(emailBody) {
    const patterns = [
      /Duration:\s*(\d+)\s*min/i,
      /Length:\s*(\d+)\s*min/i,
      /(\d+)\s*minutes?/i
    ];
    
    for (const pattern of patterns) {
      const match = emailBody.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return 0;
  }

  /**
   * Extract Otter.ai link from email body
   */
  static extractOtterLink(emailBody) {
    const linkPattern = /https?:\/\/otter\.ai\/[^\s]+/i;
    const match = emailBody.match(linkPattern);
    return match ? match[0] : null;
  }

  /**
   * Validate if email is likely from Otter.ai
   */
  static isOtterEmail(sender, subject, emailBody) {
    const otterIndicators = [
      sender.includes('otter.ai'),
      sender.includes('noreply@otter'),
      subject.includes('[Otter]'),
      subject.includes('meeting'),
      subject.includes('transcript'),
      emailBody.includes('otter.ai'),
      emailBody.includes('meeting summary')
    ];
    
    return otterIndicators.filter(Boolean).length >= 2;
  }
}

module.exports = OtterEmailParser;