import { airtableSync } from './airtable-sync';
import { log, withCtx } from './logger';
import type { InboundMeetingPayload, ContactInput, MeetingResult } from '../../shared/schema';

function normalizePhone(phone?: string) {
  if (!phone) return undefined;
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.startsWith('1') && d.length === 11) return `+${d}`;
  if (phone.startsWith('+')) return phone;
  return `+${d}`;
}

export function extractContactFromMeeting(p: InboundMeetingPayload): ContactInput | undefined {
  const att = (p.attendees ?? []).find(a => a.email || a.phone || a.name || a.company);
  if (!att) return undefined;
  return {
    name: att.name?.trim(),
    email: att.email?.trim(),
    phone: normalizePhone(att.phone),
    company: att.company?.trim(),
    status: 'Prospect',
  };
}

// Deterministic idempotency key (store in Airtable Meeting fields)
function idemKey(p: InboundMeetingPayload) {
  const start = p.startISO ?? '';
  return `${p.source}:${p.externalMeetingId}:${start}`;
}

export async function processMeeting(req: any, payload: InboundMeetingPayload): Promise<MeetingResult> {
  const ctx = withCtx(req, { idem: idemKey(payload) });
  log.info('sync.process.start', ctx);

  // 1) Contact matching/creation
  let contactRecordId: string | undefined;
  const candidate = extractContactFromMeeting(payload);

  if (candidate?.email) {
    const existing = await airtableSync.searchContactsByEmail(candidate.email);
    if (existing.length > 0) {
      contactRecordId = existing[0].id;
      log.info('contact.match.email', withCtx(req, { contactRecordId, email: candidate.email }));
      // Optional: update fields if empty in Airtable
      await airtableSync.createOrUpdateContact(
        {
          Name: candidate.name ?? existing[0].fields['Name'],
          Email: candidate.email,
          Phone: candidate.phone ?? existing[0].fields['Phone'],
          Company: candidate.company ?? existing[0].fields['Company'],
          Status: existing[0].fields['Status'] ?? candidate.status ?? 'Prospect',
        },
        contactRecordId
      );
    } else {
      const created = await airtableSync.createOrUpdateContact({
        Name: candidate.name ?? 'Unknown',
        Email: candidate.email,
        Phone: candidate.phone,
        Company: candidate.company,
        Status: candidate.status ?? 'Prospect',
      });
      contactRecordId = created.records?.[0]?.id;
      log.info('contact.created', withCtx(req, { contactRecordId, email: candidate.email }));
    }
  } else if (candidate) {
    // Minimal-fields fallback path
    const created = await airtableSync.createOrUpdateContact({
      Name: candidate.name ?? 'Unknown',
      Phone: candidate.phone,
      Company: candidate.company,
      Status: 'Needs Review',
    });
    contactRecordId = created.records?.[0]?.id;
    log.warn('contact.created.minimal', withCtx(req, { contactRecordId }));
  } else {
    log.warn('contact.none.extracted', ctx);
  }

  // 2) Transcript creation (optional but recommended)
  let transcriptRecordId: string | undefined;
  if (payload.transcript || payload.notes || payload.raw) {
    const t = await airtableSync.createTranscript({
      Title: payload.title ?? 'Meeting Transcript',
      Content: payload.transcript ?? JSON.stringify(payload.raw ?? {}, null, 2),
      'Meeting Date': payload.startISO ? new Date(payload.startISO).toISOString() : undefined,
      'Processing Status': 'Processed',
    });
    transcriptRecordId = t.records?.[0]?.id;
    log.info('transcript.created', withCtx(req, { transcriptRecordId }));
  }

  // 3) Meeting creation (idempotency fields live on the record)
  const meetingWrite = await airtableSync.createMeeting({
    Name: payload.title ?? 'Meeting',
    'External Meeting ID': payload.externalMeetingId,
    Source: payload.source,
    'Idempotency Key': idemKey(payload),
    'Meeting Date': payload.startISO ? new Date(payload.startISO).toISOString() : undefined,
    Status: 'Processed',
    Transcript: transcriptRecordId ? [transcriptRecordId] : undefined,
    // Contact link added next after we get the record id
  });

  const meetingRecordId = meetingWrite.records?.[0]?.id as string;
  log.info('meeting.created', withCtx(req, { meetingRecordId }));

  // 4) Link meeting → contact if present
  if (meetingRecordId && contactRecordId) {
    await airtableSync.linkMeetingToContact(meetingRecordId, contactRecordId);
    log.info('meeting.linked.contact', withCtx(req, { meetingRecordId, contactRecordId }));
  } else {
    log.warn('meeting.not_linked_contact', withCtx(req, { meetingRecordId, contactRecordId }));
  }

  log.info('sync.process.done', ctx);
  return {
    meetingRecordId,
    contactRecordId,
    transcriptRecordId,
    created: true,
    linked: Boolean(contactRecordId),
  };
}