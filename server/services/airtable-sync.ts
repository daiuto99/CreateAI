const AIRTABLE_API = 'https://api.airtable.com/v0';

const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const CONTACTS = process.env.AIRTABLE_CONTACTS_TABLE || 'Contacts';
const MEETINGS = process.env.AIRTABLE_MEETINGS_TABLE || 'Meetings';
const TRANSCRIPTS = process.env.AIRTABLE_TRANSCRIPTS_TABLE || 'Transcripts';
const KEY = process.env.AIRTABLE_API_KEY!;

function assertEnv() {
  if (!BASE_ID || !KEY) {
    throw new Error('[config] Missing AIRTABLE_BASE_ID or AIRTABLE_API_KEY');
  }
}

async function api(path: string, init: RequestInit = {}) {
  assertEnv();
  const res = await fetch(`${AIRTABLE_API}/${BASE_ID}/${encodeURIComponent(path)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${path} ${res.status}: ${text}`);
  }
  return res.json() as Promise<any>;
}

export const airtableSync = {
  searchContactsByEmail: async (email: string) => {
    const q = encodeURIComponent(`LOWER({Email}) = "${email.toLowerCase()}"`);
    const data = await api(`${CONTACTS}?filterByFormula=${q}`);
    return (data.records ?? []) as Array<{ id: string; fields: Record<string, any> }>;
  },

  createOrUpdateContact: async (fields: Record<string, any>, recordId?: string) => {
    if (recordId) {
      return api(CONTACTS, {
        method: 'PATCH',
        body: JSON.stringify({ records: [{ id: recordId, fields }] }),
      });
    }
    return api(CONTACTS, {
      method: 'POST',
      body: JSON.stringify({ records: [{ fields }] }),
    });
  },

  createMeeting: async (fields: Record<string, any>) => {
    return api(MEETINGS, {
      method: 'POST',
      body: JSON.stringify({ records: [{ fields }] }),
    });
  },

  linkMeetingToContact: async (meetingRecordId: string, contactRecordId: string) => {
    return api(MEETINGS, {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ id: meetingRecordId, fields: { Contact: [contactRecordId] } }],
      }),
    });
  },

  createTranscript: async (fields: Record<string, any>) => {
    return api(TRANSCRIPTS, {
      method: 'POST',
      body: JSON.stringify({ records: [{ fields }] }),
    });
  },
};