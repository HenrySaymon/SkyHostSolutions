# SkyHostSolutions

A full-stack technical services website and client portal for SkyHostSolutions — a server management, DevOps, and infrastructure support business.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: `artifacts/skyhost`, preview at `/`)
- API: Express 5 (artifact: `artifacts/api-server`, served at `/api`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: express-session + bcrypt (session-based, NO JWT)
- API codegen: Orval (from OpenAPI spec in `lib/api-spec`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — all Drizzle ORM table schemas
- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks and Zod schemas
- `artifacts/api-server/src/routes/` — auth.ts, services.ts, testimonials.ts, contact.ts, client.ts, admin.ts
- `artifacts/skyhost/src/pages/` — all frontend pages (Home, Services, ServiceDetail, Pricing, Testimonials, About, Contact, auth pages, dashboard pages, admin pages)
- `artifacts/skyhost/src/contexts/` — AuthContext.tsx (session), CurrencyContext.tsx (USD/EUR/INR)
- `artifacts/skyhost/src/components/layout/` — Navbar, Footer, DashboardLayout, AdminLayout

## Architecture decisions

- Session-based auth (not JWT) — simpler for server-rendered portal, uses `connect-pg-simple` to persist sessions in DB
- OpenAPI-first — all API contracts defined in YAML, client hooks generated via Orval — never write fetch calls manually
- Dark-only theme — no light/dark toggle; the entire site uses the dark navy + cyan palette permanently
- Currency in frontend only — prices stored in USD/EUR/INR columns; no conversion math, just display
- Admins and clients use separate session keys (`adminId` vs `clientId`) and separate login pages

## Product

- **Public marketing site**: Home, Services catalog (12 services), Pricing, Testimonials (8), About, Contact form
- **Client portal** (`/dashboard/*`): Dashboard overview, Orders, Invoices, Support Tickets (create + reply)
- **Admin panel** (`/admin/*`): Dashboard with charts, full CRUD for Clients, Services, Orders, Invoices, Tickets

## Demo Credentials

- **Admin**: admin@skyhostsolutions.com / Admin@123 (login at `/admin/login`)
- **Client**: james@techcorp.io / Client@123 (or sarah@designstudio.com / Client@123)

## User preferences

- Modern premium dark aesthetic — dark navy background, cyan primary accent
- No emojis in the codebase or UI
- TypeScript strict throughout
- Real data from API — no mock/placeholder data in production pages

## Gotchas

- Tailwind v4 uses `@custom-variant dark` — do NOT use `@apply dark` in CSS (it's a variant, not a utility)
- The html element has `class="dark"` in `index.html` to enable dark mode globally
- `useGetMe` returns `AuthResponse` (client shape) but the actual API also returns `isAdmin: true` for admins — cast to extended type in AuthContext
- Session: `req.session.clientId` for clients, `req.session.adminId` for admins
- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
