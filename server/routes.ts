// server/routes.ts
import type { Express } from "express";
import http from "http";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { dismissedMeetings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Register all app routes here (mount API routers, etc.), then
 * return the Node HTTP server that wraps the Express app.
 *
 * index.ts awaits this and then wires Vite/static/etc on top.
 */
export async function registerRoutes(app: Express) {
  // Setup database connection
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

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

  // Get dismissed meetings for a user
  app.get("/api/meetings/dismissed", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
      
      const dismissed = await db
        .select()
        .from(dismissedMeetings)
        .where(eq(dismissedMeetings.userId, userId));
      
      const dismissedIds = dismissed.map(d => d.meetingId);
      res.json({ success: true, dismissedMeetings: dismissedIds });
    } catch (error: any) {
      console.error("get dismissed meetings error:", error?.message || error);
      res.status(500).json({ success: false, message: "Failed to get dismissed meetings" });
    }
  });

  // Dismiss meeting endpoint
  app.post("/api/meetings/dismiss", async (req, res) => {
    try {
      const { meetingId } = req.body;
      const userId = req.session?.user?.id;
      
      if (!meetingId) {
        return res.status(400).json({ success: false, message: "meetingId is required" });
      }
      
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
      
      // Save dismissed meeting to database
      await db
        .insert(dismissedMeetings)
        .values({
          userId,
          meetingId,
        })
        .onConflictDoNothing(); // Ignore if already dismissed
      
      res.json({ success: true, message: "Meeting dismissed successfully" });
    } catch (error: any) {
      console.error("dismiss meeting error:", error?.message || error);
      res.status(500).json({ success: false, message: "Failed to dismiss meeting" });
    }
  });

  const server = http.createServer(app);
  return server;
}
