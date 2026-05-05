# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Hiko App (`artifacts/hiko`)

Mobile-first running assistant. React + Vite + Zustand + react-leaflet + framer-motion. All data is mocked in Zustand stores (no Supabase connected yet — stores mirror Supabase schema for easy future swap).

### Features
- Live map with green pin markers, animated runner dots
- Progressive auth: global AuthModal gates actions (Start Run, Like, Comment, Post, Message, Add Friend)
- **Comments** (`useCommentsStore`) — add/edit/delete with timestamps; CommentsSheet slide-up
- **Direct Messages** (`useMessagesStore`) — conversation list + real-time-style chat with simulated replies
- **Run Mode** — route rendered from user position with green polyline + glow, direction panel (bearing arrow, distance, on/off-route badge), voice guidance toasts
- Challenges, Friends, Profile with badges (lucide icons)

### Key stores
- `useAuthStore` — user, openAuthModal, requireAuth
- `useCommentsStore` — comments keyed by postId
- `useMessagesStore` — conversations + messages, simulated replies
- `useRunStore`, `useDataStore`, `useFeedStore`, `useFriendsStore`, `useChallengeStore`

### Key components
- `AuthModal` — global sign-in modal with pending action replay
- `CommentsSheet` — slide-up comment drawer with edit/delete
- `MapView` — leaflet map with pin icons, route polyline + glow + waypoint dots, UserMarker pan
- `Logo` — inline SVG mark in #0ebc68
- `BottomNav` — unread message badge on Social tab

### Routing
- `/` Home map, `/routes`, `/routes/:id`, `/challenges`
- `/social`, `/social/new`, `/social/friends`
- `/messages`, `/messages/:userId` (chat)
- `/profile`, `/run/:routeId`, `/auth`

### Geo utils (`src/lib/geo.ts`)
- `bearing`, `distanceM`, `generateLoop`, `nearestWaypointIndex`, `fmtDist`, `bearingLabel`
