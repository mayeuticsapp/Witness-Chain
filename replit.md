# WitnessChain - Digital Forensic Certification Platform

## Overview

WitnessChain is a digital forensic certification platform that transforms smartphones into certified evidence capture devices. The application enables field technicians, auditors, and inspectors to capture legally-compliant digital evidence (photos, video, audio) with cryptographic hashing, GPS geolocation, and qualified timestamps (eIDAS TSA). Evidence is sealed with SHA-256 hashes and timestamped through external TSA providers to create tamper-proof forensic records suitable for legal proceedings.

The platform follows a "black box" architecture where captured media is immediately sealed with metadata, hashed locally, and sent to a backend for qualified timestamping and immutable storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend is a single-page application organized around key workflows:
- Dashboard (proof listing and statistics)
- Capture (camera/audio/file acquisition with GPS)
- Delivery (courier-specific capture workflow)
- Verify (public verification portal)
- Proof Detail (individual evidence inspection)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints under `/api/*`
- **File Handling**: Multer for multipart uploads (50MB limit)
- **Development Mode**: Vite middleware integration for HMR

Key backend modules:
- `routes.ts`: API endpoint definitions for proof CRUD
- `storage.ts`: Database abstraction layer using repository pattern
- `tsa.ts`: Timestamp Authority integration (FreeTSA.org)
- `db.ts`: Database connection management

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle-kit with `db:push` command

Core data model:
- `users`: Basic authentication (id, username, password)
- `proofs`: Forensic evidence records containing:
  - Actor metadata (user, role, device)
  - Context (intervention, site, client)
  - Capture data (timestamp, GPS, file info, hash)
  - TSA certification (provider, token, timestamp)
  - Storage info (WORM path, retention)
  - Blockchain anchor (optional merkle root, txid)
  - Audit log (append-only event trail)

### Cryptographic Pipeline
1. Client-side SHA-256 hash calculation (`client/src/lib/hash.ts`)
2. Upload with manifest to backend
3. Server-side TSA request to qualified provider
4. Storage with integrity verification capabilities

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/ui/   # shadcn/ui components
│   ├── pages/           # Route components
│   ├── lib/             # Utilities, API client, hooks
│   └── hooks/           # Custom React hooks
├── server/              # Express backend
├── shared/              # Shared types and schema
├── migrations/          # Drizzle database migrations
└── attached_assets/     # Static assets and documentation
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (required via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management

### Timestamp Authority
- **FreeTSA.org**: Free TSA service for RFC 3161 timestamps
- Integration in `server/tsa.ts` sends hash and receives signed timestamp token
- Future: eIDAS-qualified TSA providers for legal compliance

### Planned Integrations (from documentation)
- **WORM Storage**: S3-compatible with immutability policies
- **Blockchain Anchoring**: Periodic Merkle root publication (Ethereum/L2)
- **HSM/KMS**: Key management for production signing

### Frontend Dependencies
- React Query for data fetching
- Recharts for dashboard visualizations
- date-fns for date formatting
- Zod for runtime validation (shared with backend via drizzle-zod)

### Development Tools
- Vite dev server with HMR
- Replit-specific plugins for deployment and development banners
- TypeScript strict mode enabled