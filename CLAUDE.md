# Wedda — Svensk bröllopsmarknadsplats

## Tech stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js (TypeScript, ESM)
- Database: Supabase Cloud (PostgreSQL) — projekt: qfniwqbeccmhclwqgefk.supabase.co
- Email: Resend API (from: onboarding@resend.dev tills wedda.se verifieras i Resend)
- Deploy: Dokploy på VPS (Hetzner, 65.21.183.246) — Docker-baserad
- Build: npm run build → dist/index.cjs + dist/public/

## Deploy & infrastruktur
- VPS: Hetzner 65.21.183.246 — Dokploy körs på port 8001
- Dokploy app-namn: wedda-main-yt0vtd
- Domän: wedda.se (Traefik hanterar SSL/routing)
- Docker service: wedda-main-yt0vtd (Docker Swarm)
- Port inuti container: 5000

## Beroenden — vad som krävs för att appen ska fungera
Inga LLM/AI-tokens används. Appen har ingen AI-integration.

| Beroende | Kritiskt | Risk |
|---|---|---|
| VPS (Hetzner) | Ja — allt körs här | Går VPS:en ner går allt ner |
| Supabase Cloud | Ja — databasen | Gratisnivå pausar efter 1 vecka inaktivitet → app kraschar |
| Resend | Nej — bara mail | Appen kraschar inte, mail slutar skickas |
| GitHub-repot | Nej — bara vid deploy | Påverkar inte drift |
| wedda.se-domänen | Nej — bara DNS | Appen körs ändå, nås via IP |

**Viktigast:** Kontrollera att Supabase-projektet är på betald plan eller pinga det regelbundet — gratisnivån pausar automatiskt.

## Miljövariabler (satta i Dokploy)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY
- RESEND_API_KEY
- BASE_URL=https://wedda.se
- VENDOR_TOKEN_SECRET
- NODE_ENV=production
- PORT=5000

## Viktiga filer
- server/routes.ts — alla API-endpoints
- server/storage.ts — MemStorage (dev) + SupabaseStorage (prod)
- server/supabase-storage.ts — Supabase-implementation
- server/email.ts — Resend-integration
- client/src/pages/ — alla sidor
- shared/schema.ts — alla datatyper
- server/data_products.json — 536 produkter
- server/data_vendors.json — 536 leverantörer

## Issue tracking
- Linear-bräda: https://linear.app/jonatan-siden/project/wedda-5e2cd3051c97
- Kolla alltid Linear för aktuella issues och status innan du börjar jobba

## Regler
- Allt UI på svenska
- Admin-emails: jonatan.siden@gmail.com, jonatan@prymit.com
- Kontakt: mailto till BÅDA jonatan.siden@gmail.com OCH svenake62@gmail.com
- All vendor-info ska vara 100% korrekt, inga fejkade uppgifter
- Varje vendor MÅSTE ha en fungerande e-postadress
- Priser i SEK, realistiska för svenska bröllopsmarknaden
- Inga LLM/AI-anrop i koden — lägg inte till sådant utan explicit instruktion
