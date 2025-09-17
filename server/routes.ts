// server/routes.ts
import type { Express } from "express";
import http from "http";

/**
 * Register all app routes here (mount API routers, etc.), then
 * return the Node HTTP server that wraps the Express app.
 *
 * index.ts awaits this and then wires Vite/static/etc on top.
 */
export async function registerRoutes(app: Express) {
  // Import and setup API endpoints
  const { fetchGoogleIcs } = await import("./calendar/googleIcs");

  // Add meetings endpoint using Google Calendar ICS
  app.get("/api/meetings", async (req, res) => {
    try {
      const url = process.env.GCAL_ICS_URL;
      if (!url) {
        return res.status(501).json({ message: "Google Calendar ICS URL not configured" });
      }
      
      const events = await fetchGoogleIcs(url, 60);
      
      // Convert calendar events to meeting format expected by frontend
      const meetings = events.map(event => ({
        id: event.id,
        title: event.title,
        date: event.start,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        hasOtterMatch: false, // These would be determined by matching logic
        hasAirtableMatch: false,
        description: `Meeting from ${new Date(event.start).toLocaleDateString()} to ${new Date(event.end).toLocaleDateString()}`
      }));
      
      res.json(meetings);
    } catch (error: any) {
      console.error("meetings: error", error?.message || error);
      res.status(502).json({ message: "Failed to fetch meetings" });
    }
  });

  // Placeholder endpoints for other integrations (you can implement these later)
  app.get("/api/integrations", (req, res) => {
    res.json([]);
  });

  app.get("/api/otter/transcripts", (req, res) => {
    res.json([]);
  });

  app.get("/api/airtable/contacts", (req, res) => {
    res.json([]);
  });

  const server = http.createServer(app);
  return server;
}
