import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.join(__dirname, "public");
  const indexPath = path.join(distPath, "index.html");

  if (!fs.existsSync(distPath)) {
    console.error(
      `[static] WARNING: dist/public not found at ${distPath}. Static files will not be served.`
    );
    // Register a fallback so the server doesn't hang on all routes
    app.get("/{*path}", (_req, res) => {
      res.status(503).send("Frontend not built. Run npm run build first.");
    });
    return;
  }

  app.use(express.static(distPath));

  // SPA catch-all: return index.html for any non-API route
  app.get("/{*path}", (_req, res) => {
    if (!fs.existsSync(indexPath)) {
      console.error(`[static] index.html not found at ${indexPath}`);
      return res.status(500).send("index.html missing from build output.");
    }
    res.sendFile(indexPath);
  });
}
