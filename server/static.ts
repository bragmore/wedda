import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");
  const indexPath = path.join(distPath, "index.html");

  console.log("[static] __dirname:", __dirname);
  console.log("[static] cwd:", process.cwd());
  console.log("[static] Serving static from:", distPath);

  if (!fs.existsSync(distPath)) {
    console.error("[static] ERROR: dist/public not found at", distPath);
    app.get("/{*path}", (_req, res) => {
      res.status(503).send("Frontend not built. dist/public is missing.");
    });
    return;
  }

  app.use(express.static(distPath));

  app.get("/{*path}", (_req, res) => {
    if (!fs.existsSync(indexPath)) {
      console.error("[static] ERROR: index.html not found at", indexPath);
      return res.status(500).send("index.html missing from dist/public.");
    }
    res.sendFile(indexPath);
  });
}
