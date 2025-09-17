// server/calendar/googleIcs.ts
import crypto from "crypto";
import ical from 'node-ical';
import { DateTime, Duration } from "luxon";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;   // ISO UTC
  end: string;     // ISO UTC
  attendees: string[];
}

/** Extract unique, lowercased emails from ATTENDEE / ORGANIZER values */
function extractEmails(obj: any): string[] {
  const out = new Set<string>();
  const pushEmail = (val: unknown) => {
    if (typeof val !== "string") return;
    // support "MAILTO:foo@bar", "mailto:foo@bar", or raw email
    const m = val.match(/mailto:([^;>\s]+)/i);
    const email = (m ? m[1] : val).trim().toLowerCase();
    if (email && /\S+@\S+\.\S+/.test(email)) out.add(email);
  };

  // ATTENDEE can be array/object/string across feeds
  const att = (obj?.attendee ?? obj?.attendees) as any;
  if (Array.isArray(att)) {
    for (const a of att) {
      if (typeof a === "string") pushEmail(a);
      else if (a && typeof a.val === "string") pushEmail(a.val);
      else if (a && typeof a === "object") {
        if (typeof a.mailto === "string") pushEmail(a.mailto);
        if (typeof a.value === "string") pushEmail(a.value);
      }
    }
  } else if (att) {
    if (typeof att === "string") pushEmail(att);
    else if (typeof att?.val === "string") pushEmail(att.val);
    else if (typeof att?.mailto === "string") pushEmail(att.mailto);
  }

  // ORGANIZER sometimes carries the host
  const org = obj?.organizer as any;
  if (org) {
    if (typeof org === "string") pushEmail(org);
    else if (typeof org?.val === "string") pushEmail(org.val);
    else if (typeof org?.mailto === "string") pushEmail(org.mailto);
  }

  return Array.from(out);
}

/** Stable hash fallback for id */
function hashId(parts: string[]): string {
  const h = crypto.createHash("sha1");
  h.update(parts.join("|"));
  return h.digest("hex").slice(0, 16);
}

/** True if two ranges overlap */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

/** Normalize JS Date to ISO UTC string */
function toISOUTC(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "utc" }).toUTC().toISO();
}

/** Return instances expanded within window (handles EXDATE and simple overrides) */
function expandRecurring(e: any, winStart: Date, winEnd: Date): Array<{ start: Date; end: Date }> {
  const out: Array<{ start: Date; end: Date }> = [];
  if (!e.rrule) return out;

  // Base duration from original event
  const durMs = (e.end?.getTime?.() ?? 0) - (e.start?.getTime?.() ?? 0);
  const exdates: Record<string, true> = {};
  if (e.exdate) {
    for (const k of Object.keys(e.exdate)) {
      // key format already ISO-ish
      exdates[k] = true;
    }
  }

  const dates: Date[] = e.rrule.between(winStart, winEnd, true);
  for (const dt of dates) {
    // rrule returns Date in local time context; convert via luxon to JS Date
    const key = DateTime.fromJSDate(dt).toUTC().toISO();
    if (key && exdates[key]) continue;

    // Check if there is an explicit override instance
    let instStart = new Date(dt);
    let instEnd = new Date(instStart.getTime() + Math.max(durMs, 0));
    if (e.recurrences && key && e.recurrences[key]) {
      const over = e.recurrences[key];
      if (over?.start) instStart = over.start as Date;
      if (over?.end) instEnd = over.end as Date;
    }
    if (overlaps(instStart, instEnd, winStart, winEnd)) {
      out.push({ start: instStart, end: instEnd });
    }
  }
  return out;
}

/**
 * Download a public ICS and return normalized events (last `daysBack` days).
 * - Expands recurring events inside the window
 * - Normalizes times to ISO UTC
 * - Extracts attendee emails
 */
export async function fetchGoogleIcs(url: string, daysBack = 60): Promise<CalendarEvent[]> {
  if (!url) throw new Error("GCAL_ICS_URL is not set");

  const now = DateTime.utc();
  const winStart = now.minus(Duration.fromObject({ days: daysBack })).toJSDate();
  const winEnd = now.plus({ days: 1 }).toJSDate();

  // fetch ICS text
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ICS fetch failed: ${res.status}`);
  const icsText = await res.text();

  // Add defensive check and use correct API
  if (!ical?.sync?.parseICS) {
    throw new Error(`node-ical missing parseICS; available keys: ${Object.keys(ical).join(', ')}`);
  }
  const data = ical.sync.parseICS(icsText);
  console.log(`calendar: fetched ${rawCount} raw, returned ${out.length} after window`);

  let rawCount = 0;
  const out: CalendarEvent[] = [];

  for (const [_k, comp] of Object.entries<any>(data)) {
    if (!comp || comp.type !== "VEVENT") continue;
    rawCount++;

    const title: string = comp.summary || "";
    const emails = extractEmails(comp);

    // If recurring, expand inside window
    if (comp.rrule) {
      const instances = expandRecurring(comp, winStart, winEnd);
      for (const inst of instances) {
        const startISO = toISOUTC(inst.start);
        const endISO = toISOUTC(inst.end);
        const id = comp.uid || hashId([title, startISO]);

        out.push({
          id,
          title,
          start: startISO,
          end: endISO,
          attendees: emails,
        });
      }
      continue;
    }

    // Single event: include if it overlaps the window
    const s: Date | undefined = comp.start;
    const e: Date | undefined = comp.end;
    if (!s || !e) continue;

    if (overlaps(s, e, winStart, winEnd)) {
      const startISO = toISOUTC(s);
      const endISO = toISOUTC(e);
      const id = comp.uid || hashId([title, startISO]);
      out.push({
        id,
        title,
        start: startISO,
        end: endISO,
        attendees: emails,
      });
    }
  }

  // sort by start desc
  out.sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0));

  console.log(`calendar: fetched ${rawCount} raw, returned ${out.length} after window`);
  return out;
}
