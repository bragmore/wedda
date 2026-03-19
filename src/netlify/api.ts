const express = require("express");
const serverless = require("serverless-http");
const { registerRoutes } = require("../../server/routes");
const { createServer } = require("http");

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Strip /.netlify/functions/api prefix so Express routes see /api/...
app.use((req: any, _res: any, next: any) => {
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

// Handler for Netlify — CJS export so esbuild produces real module.exports
const handler = async (event: any, context: any) => {
  if (!routesRegistered) {
    await initPromise;
  }
  const serverlessHandler = serverless(app, {
    basePath: "/.netlify/functions/api",
  });
  return serverlessHandler(event, context);
};

module.exports = { handler };
