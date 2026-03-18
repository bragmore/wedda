import express from "express";
import serverless from "serverless-http";
import { registerRoutes } from "../../server/routes";  // esbuild resolves from project root
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Strip /.netlify/functions/api prefix so Express routes see /api/...
app.use((req, _res, next) => {
  if (req.path.startsWith("/.netlify/functions/api")) {
    req.url = "/api" + req.url.replace("/.netlify/functions/api", "");
  }
  next();
});

// Register all Express routes
let routesRegistered = false;
const initPromise = (async () => {
  await registerRoutes(httpServer, app);
  routesRegistered = true;
})();

// Export handler for Netlify
export const handler = async (event: any, context: any) => {
  if (!routesRegistered) {
    await initPromise;
  }
  const serverlessHandler = serverless(app, {
    basePath: "/.netlify/functions/api",
  });
  return serverlessHandler(event, context);
};
