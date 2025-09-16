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
  // Example: mount your API here if you have one
  // import { apiRouter } from "./api";
  // app.use("/api", apiRouter);

  const server = http.createServer(app);
  return server;
}
