import express from "express";
import serverless from "serverless-http";
import { registerRoutes } from "../../server/routes";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register all routes
(async () => {
  await registerRoutes(httpServer, app);
})();

// Wrap Express app for serverless
export const handler = serverless(app);
