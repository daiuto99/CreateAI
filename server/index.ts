import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { fetchGoogleIcs } from "./calendar/googleIcs";
import { setupVite, serveStatic, log } from "./vite";
import { registerAdminLogs } from "./adminLogs";   // admin endpoint for fetching from GitHub
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Boot info logging
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || "5000", 10);

// Ensure NODE_ENV is set for app.get("env") compatibility
process.env.NODE_ENV = NODE_ENV;
log(`🚀 Booting server: NODE_ENV=${NODE_ENV}, PORT=${PORT}`);

// Health endpoint - must respond even in production
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    env: NODE_ENV
  });
});
log(`✅ Registered health endpoint: GET /healthz`);

app.use((req, res, next) => {
  const start = Date.now();
  const pathName = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    // @ts-ignore - preserve original types
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathName.startsWith("/api")) {
      let logLine = `${req.method} ${pathName} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try { logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`; } catch {}
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // 🔹 Add admin logs API (reads latest GitHub comment)
  registerAdminLogs(app);

  // 🔹 Public text endpoint for latest summary (so I can pull logs on demand)
  app.get("/latest-summary.txt", (_req: Request, res: Response) => {
    try {
      const p = path.resolve(process.cwd(), "server/public/latest-summary.txt");
      const txt = fs.readFileSync(p, "utf-8");
      res.type("text/plain").send(txt);
    } catch {
      res.status(404).type("text/plain").send("No summary yet.");
    }
  });
  app.get("/api/calendar/events", async (_req, res) => {
    try {
      const url = process.env.GCAL_ICS_URL;
      if (!url) {
        return res.status(501).json({ message: "ICS not configured" });
      }
      const events = await fetchGoogleIcs(url, 60);
      console.log(`calendar: responding with ${events.length} events`);
      res.json({ count: events.length, events });
    } catch (err: any) {
      console.error("calendar: error", err?.message || err);
      res.status(502).json({ message: "Calendar fetch failed" });
    }
  });

  // importantly setup vite in development BEFORE the 404 handler
  // so vite can serve the frontend routes
  if (NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Terminal 404 handler (must be AFTER vite setup)
  app.use('*', (req: Request, res: Response) => {
    log(`404 ${req.method} ${req.path}`);
    res.status(404).json({ message: 'Not Found' });
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log stack trace in development
    if (NODE_ENV === 'development') {
      log(`ERROR ${status}: ${message}\n${err.stack || 'No stack trace'}`);
    } else {
      log(`ERROR ${status}: ${message}`);
    }
    
    res.status(status).json({ message });
  });

  // List all registered routes
  function listRoutes() {
    const routes: string[] = [];
    
    function extractRoutes(stack: any[], prefix = '') {
      stack.forEach((layer: any) => {
        if (layer.route) {
          // Direct route
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
          methods.forEach(method => {
            routes.push(`${method} ${prefix}${layer.route.path}`);
          });
        } else if (layer.name === 'router' && layer.handle.stack) {
          // Nested router
          const nestedPrefix = layer.regexp.source
            .replace(/^\^\\?/, '')
            .replace(/\$\??$/, '')
            .replace(/\\/g, '')
            .replace(/\?/g, '');
          extractRoutes(layer.handle.stack, prefix + nestedPrefix);
        }
      });
    }
    
    if (app._router && app._router.stack) {
      extractRoutes(app._router.stack);
    }
    
    return routes;
  }
  
  const routes = listRoutes();
  log(`ROUTES: ${routes.join(', ')}`);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified. Bind 0.0.0.0 for Replit.
  server.listen(
    {
      port: PORT,
      host: "0.0.0.0",
      // reusePort intentionally omitted to avoid conflicts
    },
    () => {
      log(`serving on port ${PORT}`);
    }
  );
  
  // Server error handling
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`❌ Port ${PORT} is already in use (EADDRINUSE)`);
      process.exit(1);
    } else {
      log(`❌ Server error: ${err.code || 'Unknown'} - ${err.message}`);
      process.exit(1);
    }
  });
})();

// Process-level error handling
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log(`❌ Unhandled Promise Rejection: ${reason?.message || reason}`);
  if (NODE_ENV === 'development' && reason?.stack) {
    log(reason.stack);
  }
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  log(`❌ Uncaught Exception: ${err.message}`);
  if (NODE_ENV === 'development' && err.stack) {
    log(err.stack);
  }
  process.exit(1);
});
