# Golf Wolf - Replit Agent Guide

## Overview

Golf Wolf is a mobile-first web application designed to help golfers manage and score Wolf golf games on the course. The app allows players to quickly set up a game, add players with handicaps, track hole-by-hole results, and view running leaderboards - all without requiring user authentication.

The application follows a full-stack TypeScript architecture with React on the frontend and Express on the backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with custom golf-themed green color palette
- **UI Components**: shadcn/ui component library (Radix primitives + custom styling)
- **Animations**: Framer Motion for page transitions and interactions
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API with typed route contracts in `shared/routes.ts`
- **Storage**: Currently uses in-memory storage (MemStorage class) with interface designed for easy PostgreSQL migration
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Definition**: Shared between frontend/backend in `shared/schema.ts`

### Data Model
Three main entities:
1. **Games**: Tracks game status (setup/playing/complete) and current hole
2. **Players**: Name, handicap, game association, and cached score
3. **HoleResults**: Wolf selection, partner choice, lone wolf status, and winners per hole

### API Structure
Routes defined in `shared/routes.ts` with Zod validation:
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game state with players and results
- `POST /api/games/:id/start` - Begin game (requires 3+ players)
- `POST /api/games/:id/players` - Add player
- `DELETE /api/games/:id/players/:playerId` - Remove player
- `POST /api/games/:id/holes` - Submit hole result
- `POST /api/games/:id/restart` - Reset game

### Build System
- Development: `tsx` for TypeScript execution with Vite dev server
- Production: Custom build script using esbuild for server bundling and Vite for client
- Database migrations: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL**: Required via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management and query building
- **connect-pg-simple**: Session storage (available but not currently used)

### UI/UX Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **canvas-confetti**: Celebration effects for hole winners
- **Lucide React**: Icon library

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator

### Validation
- **Zod**: Runtime type validation for API requests/responses
- **drizzle-zod**: Generate Zod schemas from Drizzle table definitions