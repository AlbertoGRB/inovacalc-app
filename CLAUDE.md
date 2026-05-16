# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

InovaCalc Mobile — React Native app for the Inovassie sales team. Creates SST (occupational safety) service quotes (plans + trainings), manages companies, and supports offline usage.

## Commands

```bash
# Start dev server (LAN mode — use if port 8081 is taken)
bun expo start --port 8082

# Start for specific platform
bun run android
bun run ios

# Install dependencies
bun install

# Type-check
bunx tsc --noEmit

# EAS Build (requires Node.js installed locally)
CI=1 EXPO_TOKEN=<token> eas build --profile preview --platform android
# Alternatively: trigger builds from expo.dev dashboard
```

## Architecture

### Directory Layout

```
app/            — Expo Router file-based routes
  (auth)/       — Unauthenticated screens (login, forgot-password)
  (app)/        — Authenticated screens (home, companies, quotes, profile)
  quote/        — Multi-step quote creation wizard (7 steps)
  _layout.tsx   — Root layout: QueryClient, AuthGate, network setup

src/
  hooks/        — TanStack Query data hooks (useCompanies, useQuotes, useSettings, useCreateQuote)
  lib/          — Shared logic (supabase, calculations, sync, network, logger, format, pdf)
  stores/       — Zustand state (authStore, quoteDraftStore, outboxStore, notificationsStore)
  theme/        — Design system (colors, typography, spacing)
  types/        — TypeScript types mirroring Postgres schema (database.ts)
  components/
    ui/          — Reusable UI (Button, Badge, Counter, ErrorState, NetworkBanner...)
    layout/      — Shell components (Header, BottomNav, SafeContainer)
```

### Path Aliases

`@/*` maps to `./src/*` — use `@/lib/supabase`, `@/stores/authStore`, etc.

### Critical Init Order (`app/_layout.tsx`)

The order in root layout is load-order-sensitive:
1. `setupNetworkManager()` — binds AppState to TanStack `onlineManager`
2. `QueryClient` created with `networkMode: 'offlineFirst'`
3. `PersistQueryClientProvider` wraps the tree (AsyncStorage, key `inovacalc-query-cache-v1`)
4. `AuthGate` calls `authStore.initialize()` → reads session from AsyncStorage → sets `initialized = true`
5. Data hooks fire only after `initialized && !!session`

### Auth Timing Guard

All data hooks **must** have this pattern or RLS will silently return empty arrays:

```typescript
const { session, initialized } = useAuthStore();
const query = useQuery({
  queryKey: ['key'],
  enabled: initialized && !!session,  // ← required
  queryFn: ...
});
```

### Offline Write (Outbox Pattern)

Mutations go through `outboxStore` (Zustand persist, key `outbox-v1`):
- Online → direct Supabase insert → `queryClient.invalidate()`
- Offline → `outbox.enqueue({ type: 'company.create', payload })` → `flushOutbox()` runs on reconnect

`flushOutbox()` (in `src/lib/sync.ts`) is called:
- On auth (every session start)
- Every 30 seconds via `AuthGate`
- Manually via `NetworkBanner` "Enviar agora" button
- Rate-limited: minimum 5 s between calls (`FLUSH_MIN_INTERVAL_MS`)

Operations are processed **serially** to preserve order dependency (company must exist before a quote that references it). `replaceTempId` propagates real IDs to dependent operations.

### Quote Wizard Flow

Route: `app/quote/` — wizard manages state in `quoteDraftStore` (in-memory Zustand, no persistence).

```
/quote/select-company → /quote/what-include → /quote/configure-plan
→ /quote/select-plan → /quote/trainings → /quote/extras → /quote/summary
```

Draft is intentionally not persisted — if the app closes mid-wizard, the draft resets to avoid inconsistent state.

### Pricing Calculations (`src/lib/calculations.ts`)

- `calculatePlans(inputs, configs, gheTable)` — computes ESSENCIAL / INTEGRAL / AVANÇADO plan prices
- `calculateTrainings(inputs, discounts)` — computes training bundle prices with plan-based discounts
- Config values (margins, costs per unit) come from `plan_configs` table via `useSettings`
- GHE lookup: function range capped at 5, 10, or 20 functions

Key business rules:
- Margins: G1=40%, G2/G3=60%, G4=80% (from `margem_g1`…`margem_g4` in `plan_configs`)
- Tax: 8% applied on (baseCost + margin)
- CIPA included in AVANÇADO when employees ≥ threshold (`CIPA_RULES` constant)
- Training discounts by plan type: NONE=0%, ESSENCIAL=20%, INTEGRAL=30%, AVANCADO=40%

### Logging (`src/lib/logger.ts`)

Structured logger with circular buffer (300 entries). In `__DEV__`: all levels logged with ANSI colors. In production: only WARN and ERROR reach the console.

```typescript
import { logger } from '@/lib/logger';
logger.info('TAG', 'message', optionalData);
```

### SVG Support

SVGs are imported as React components via `react-native-svg-transformer` (configured in `metro.config.js`). Type declarations in `svg.d.ts`.

### Hermes Compatibility

**Never use** `AbortSignal.timeout()` — it does not exist in the Hermes engine. Use `AbortController + setTimeout` instead.

### Version Constraint

`expo@54.0.34` requires `expo-updates@~29.0.17`. Always verify against `node_modules/expo/bundledNativeModules.json` before installing/upgrading `expo-updates`.

## Environment

Required `.env` file (never commit):
```
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Variables are also configured on EAS (`eas env:create`) for builds. The `ANON_KEY` is safe to expose — access control is enforced by Supabase RLS.

## Database

Supabase project: `zhluarirmpcdqclqybfr`. All tables have RLS. Roles: `ADMIN > MANAGER > SELLER`.

Migrations in `supabase/migrations/`. When adding columns, always use `ADD COLUMN IF NOT EXISTS`.
