import ical from 'node-ical';
import { DateTime } from 'luxon';
import { log } from '../vite';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
}

function createStableId(summary: string = '', dtstart: string = ''): string {
  // Create a simple hash of the summary + dtstart for stable IDs
  let hash = 0;
  const str = `${summary}${dtstart}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function extractAttendees(event: any): string[] {
  const attendeeSet = new Set<string>();
  
  // Extract from ATTENDEE field
  if (event.attendee) {
    if (Array.isArray(event.attendee)) {
      event.attendee.forEach((att: any) => {
        if (typeof att === 'string') {
          const email = att.replace(/^mailto:/i, '').toLowerCase();
          if (email.includes('@')) attendeeSet.add(email);
        }
      });
    } else if (typeof event.attendee === 'string') {
      const email = event.attendee.replace(/^mailto:/i, '').toLowerCase();
      if (email.includes('@')) attendeeSet.add(email);
    }
  }
  
  // Extract from ORGANIZER field
  if (event.organizer) {
    let organizer = '';
    if (typeof event.organizer === 'string') {
      organizer = event.organizer;
    } else if (event.organizer && typeof event.organizer.val === 'string') {
      organizer = event.organizer.val;
    }
    if (organizer) {
      const email = organizer.replace(/^mailto:/i, '').toLowerCase();
      if (email.includes('@')) attendeeSet.add(email);
    }
  }
  
  return Array.from(attendeeSet).sort();
}

function normalizeDateTime(dt: Date | string | undefined): string {
  if (!dt) return new Date().toISOString();
  
  let dateTime: DateTime;
  
  if (dt instanceof Date) {
    dateTime = DateTime.fromJSDate(dt);
  } else if (typeof dt === 'string') {
    dateTime = DateTime.fromISO(dt);
  } else {
    dateTime = DateTime.now();
  }
  
  return dateTime.toUTC().toISO() || new Date().toISOString();
}

function eventOverlapsWindow(event: any, windowStart: DateTime, windowEnd: DateTime): boolean {
  const eventStart = event.start ? DateTime.fromJSDate(event.start) : windowStart;
  const eventEnd = event.end ? DateTime.fromJSDate(event.end) : eventStart.plus({ hours: 1 });
  
  // Check if event overlaps with the time window
  return eventStart < windowEnd && eventEnd > windowStart;
}

export async function fetchGoogleIcs(url: string, daysBack: number = 60): Promise<CalendarEvent[]> {
  try {
    // Fetch ICS data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ICS: ${response.status} ${response.statusText}`);
    }
    const icsData = await response.text();
    
    // Parse ICS data
    const parsed = ical.sync.parseICS(icsData);
    
    // Define time window (UTC)
    const now = DateTime.now().toUTC();
    const windowStart = now.minus({ days: daysBack });
    const windowEnd = now.plus({ days: 1 });
    
    const events: CalendarEvent[] = [];
    let rawEventCount = 0;
    
    // Process each component
    Object.values(parsed).forEach((component: any) => {
      if (component.type !== 'VEVENT') return;
      
      rawEventCount++;
      
      // Handle recurring events
      if (component.rrule) {
        try {
          // For recurring events, we need to expand them within the window
          // This is a simplified approach - node-ical should handle this better
          const rule = component.rrule;
          const startDate = DateTime.fromJSDate(component.start);
          
          // Generate occurrences (simplified - just generate weekly for now)
          if (rule.freq === 'WEEKLY' || rule.freq === 'DAILY') {
            const interval = rule.freq === 'DAILY' ? { days: rule.interval || 1 } : { weeks: rule.interval || 1 };
            let occurrenceDate = startDate;
            
            while (occurrenceDate <= windowEnd) {
              if (occurrenceDate >= windowStart) {
                const duration = component.end ? 
                  DateTime.fromJSDate(component.end).diff(DateTime.fromJSDate(component.start)) :
                  { hours: 1 };
                
                const occurrenceEnd = occurrenceDate.plus(duration);
                
                events.push({
                  id: component.uid || createStableId(component.summary, occurrenceDate.toISO()),
                  title: component.summary || '',
                  start: occurrenceDate.toUTC().toISO()!,
                  end: occurrenceEnd.toUTC().toISO()!,
                  attendees: extractAttendees(component)
                });
              }
              occurrenceDate = occurrenceDate.plus(interval);
            }
          }
        } catch (rruleError) {
          // If recurring event parsing fails, fall back to single event
          if (eventOverlapsWindow(component, windowStart, windowEnd)) {
            events.push({
              id: component.uid || createStableId(component.summary, normalizeDateTime(component.start)),
              title: component.summary || '',
              start: normalizeDateTime(component.start),
              end: normalizeDateTime(component.end),
              attendees: extractAttendees(component)
            });
          }
        }
      } else {
        // Single (non-recurring) event
        if (eventOverlapsWindow(component, windowStart, windowEnd)) {
          events.push({
            id: component.uid || createStableId(component.summary, normalizeDateTime(component.start)),
            title: component.summary || '',
            start: normalizeDateTime(component.start),
            end: normalizeDateTime(component.end),
            attendees: extractAttendees(component)
          });
        }
      }
    });
    
    // Sort by start date descending (newest first)
    events.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    
    // Remove duplicates by ID (in case of processing issues)
    const uniqueEvents = events.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );
    
    log(`calendar: fetched ${rawEventCount} raw, returned ${uniqueEvents.length} after window`);
    
    return uniqueEvents;
    
  } catch (error) {
    log(`calendar: error fetching ICS - ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}