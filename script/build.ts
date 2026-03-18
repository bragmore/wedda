import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Build Netlify Function — bundle everything (no externals) so Netlify
  // doesn't try to resolve dependencies with zip-it-and-ship-it.
  // Use ESM format with .mjs extension so Netlify runs it as ESM.
  console.log("building netlify function...");
  await esbuild({
    entryPoints: ["src/netlify/api.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "netlify/functions/api.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: [],
    logLevel: "info",
    banner: { js: "import { createRequire } from 'module'; import { fileURLToPath as __esm_fileURLToPath } from 'url'; import { dirname as __esm_dirname } from 'path'; const require = createRequire(import.meta.url); const __filename = __esm_fileURLToPath(import.meta.url); const __dirname = __esm_dirname(__filename);" },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
