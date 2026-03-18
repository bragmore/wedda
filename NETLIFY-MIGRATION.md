# Wedda — Netlify Migration Guide

## What's Been Done

### 1. Image Fixes (Complete)
- Replaced 3 wrong images (cap, t-shirt girl, newspaper) with correct Unsplash photos
- Kostymer: All images now show actual suits
- Brudklänningar: All images now show actual bridal dresses

### 2. Architecture Prepared for Netlify (Complete)
The codebase has been refactored to support both the current deployment and Netlify:

- **`server/email.ts`** — New unified email module supporting:
  - `external-tool` CLI (current sandbox deployment)
  - Resend API (for Netlify/serverless — set `RESEND_API_KEY` env var)
  
- **`server/supabase-storage.ts`** — Full Supabase storage implementation:
  - Products, vendors, categories → still loaded from JSON (read-only, fast)
  - Users, orders, order items, messages → stored in Supabase
  
- **`server/storage.ts`** — Auto-selects storage backend:
  - No env vars → uses in-memory (current behavior)
  - `SUPABASE_URL` + `SUPABASE_ANON_KEY` set → uses Supabase

- **`netlify.toml`** — Netlify build config with API redirects
- **`netlify/functions/api.ts`** — Serverless function wrapping Express via `serverless-http`
- **`supabase-migration.sql`** — SQL to create required tables in Supabase

## Steps to Complete Netlify Deploy

### Step 1: Create Supabase Tables
1. Go to your Supabase Dashboard → SQL Editor
2. Run the contents of `supabase-migration.sql`
3. This creates: `wedda_users`, `wedda_orders`, `wedda_order_items`, `wedda_messages`

### Step 2: Get Supabase Credentials
From your Supabase Dashboard → Settings → API:
- **Project URL** (e.g., `https://xxxxx.supabase.co`)
- **Service Role Key** (for server-side access)

### Step 3: Set Up Email Service (Resend recommended)
1. Create account at [resend.com](https://resend.com)
2. Add your domain (wedda.se) or use their free tier
3. Get your API key

### Step 4: Create Netlify Site
1. Push repo to GitHub/GitLab
2. Connect to Netlify
3. Set environment variables in Netlify Dashboard:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_KEY` = your Supabase service role key
   - `RESEND_API_KEY` = your Resend API key
   - `RESEND_FROM` = `Wedda <noreply@wedda.se>`

### Step 5: Configure Custom Domain
1. In Netlify → Domain management → Add custom domain
2. Add `wedda.se` (or your chosen domain)
3. Configure DNS records as Netlify instructs

## Current Architecture

```
┌─────────────────────────────────────────┐
│  Client (React + Vite)                   │
│  - Hash routing (#/)                     │
│  - TanStack Query for API calls          │
└──────────────┬──────────────────────────┘
               │ /api/*
               ▼
┌─────────────────────────────────────────┐
│  Express Server (routes.ts)              │
│  - Auth (bcrypt)                         │
│  - Orders                                │
│  - Messages                              │
│  - Email (email.ts)                      │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│  JSON  │ │Supabase│ │ Email  │
│  Files │ │   DB   │ │Service │
│(static)│ │(users, │ │(Resend │
│        │ │orders) │ │/Gmail) │
└────────┘ └────────┘ └────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `server/routes.ts` | Uses email.ts module instead of inline sendEmail |
| `server/storage.ts` | Auto-selects MemStorage or SupabaseStorage |
| `server/supabase-storage.ts` | NEW — Full Supabase storage implementation |
| `server/email.ts` | NEW — Multi-transport email (external-tool, Resend) |
| `netlify.toml` | NEW — Netlify build/redirect config |
| `netlify/functions/api.ts` | NEW — Serverless function entry point |
| `supabase-migration.sql` | NEW — Database migration script |
| `package.json` | Added `build:netlify` script |
| `server/data_products.json` | Fixed 3 wrong images |
