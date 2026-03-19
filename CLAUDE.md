# Wedda — Svensk bröllopsmarknadsplats

## Tech stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Express.js (TypeScript, ESM)
- Database: Supabase (PostgreSQL)
- Email: Resend API
- Deploy: Netlify (auto-deploy from GitHub main branch)
- Build: npm run build → dist/index.cjs + dist/public/

## Viktiga filer
- server/routes.ts — alla API-endpoints
- server/storage.ts — MemStorage + SupabaseStorage
- server/email.ts — Resend-integration
- client/src/pages/ — alla sidor
- shared/schema.ts — alla datatyper
- server/data_products.json — 536 produkter
- server/data_vendors.json — 536 leverantörer

## Regler
- Allt UI på svenska
- Admin-emails: jonatan.siden@gmail.com, jonatan@prymit.com
- Kontakt: mailto till BÅDA jonatan.siden@gmail.com OCH svenake62@gmail.com
- Resend: onboarding@resend.dev (wedda.se ej verifierad ännu)
- All vendor-info ska vara 100% korrekt, inga fejkade uppgifter
- Varje vendor MÅSTE ha en fungerande e-postadress
- Priser i SEK, realistiska för svenska bröllopsmarknaden

## Netlify
- URL: imaginative-fenglisu-d5e61c.netlify.app
- Auto-deploy vid push till main
- Env-variabler redan konfigurerade på Netlify
