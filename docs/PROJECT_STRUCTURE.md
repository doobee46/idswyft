# Idswyft Project Structure

This document outlines the organization of the Idswyft identity verification platform codebase.

## Root Directory Structure

```
idswyft/
├── README.md                    # Main project documentation
├── CLAUDE.md                   # Claude Code assistant instructions
├── package.json                # Root package configuration
├── .gitignore                 # Git ignore patterns
│
├── backend/                   # Node.js/Express API server
│   ├── src/                  # Source code
│   ├── package.json         # Backend dependencies
│   ├── tsconfig.json        # TypeScript configuration
│   ├── Procfile            # Deployment configuration
│   └── DEPLOYMENT.md       # Backend deployment guide
│
├── frontend/                 # React/TypeScript web application
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   ├── tsconfig.json        # TypeScript configuration
│   ├── vite.config.ts       # Vite build configuration
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   └── vercel.json         # Vercel deployment configuration
│
├── docs/                    # Project documentation
│   ├── VERIFICATION_SYSTEM_ARCHITECTURE.md  # Technical architecture
│   ├── DEPLOYMENT.md                        # Deployment guide
│   ├── SDK_IMPLEMENTATION_SUMMARY.md        # SDK documentation
│   ├── PROJECT_STRUCTURE.md                 # This file
│   └── Specs/                              # Project specifications
│       ├── Prd.md                         # Product requirements
│       ├── requirements.md                # Technical requirements
│       └── tasks.md                       # Task checklist
│
├── sql/                     # Database scripts and migrations
│   ├── CREATE_TABLES.sql    # Initial table creation
│   └── supabase-setup.sql   # Supabase initialization
│
├── supabase/               # Supabase configuration
│   ├── config.toml         # Supabase project configuration
│   └── migrations/         # Database migration files
│       ├── 01_initial_schema.sql
│       ├── 02_add_missing_document_columns.sql
│       └── 03_add_missing_verification_columns.sql
│
└── sdks/                   # Software Development Kits
    ├── README.md           # SDK overview
    ├── javascript/         # JavaScript/Node.js SDK
    │   ├── src/           # SDK source code
    │   ├── test/          # Test files
    │   ├── dist/          # Built distribution
    │   └── package.json   # SDK dependencies
    └── python/            # Python SDK
        ├── idswyft/       # Python package
        ├── examples/      # Usage examples
        ├── setup.py       # Package setup
        └── pyproject.toml # Python project configuration
```

## Backend Structure (`/backend/src/`)

```
src/
├── config/                 # Configuration management
│   ├── index.ts           # Main configuration
│   └── database.ts        # Database connection
│
├── middleware/            # Express middleware
│   ├── auth.ts           # Authentication middleware
│   ├── errorHandler.ts   # Error handling
│   └── rateLimit.ts      # Rate limiting
│
├── routes/               # API route handlers
│   ├── verification.ts   # Verification endpoints
│   ├── developer.ts      # Developer portal endpoints
│   ├── auth.ts          # Authentication endpoints
│   ├── admin.ts         # Admin panel endpoints
│   ├── health.ts        # Health check endpoints
│   └── webhooks.ts      # Webhook endpoints
│
├── services/             # Business logic services
│   ├── verification.ts   # Verification workflow
│   ├── ocr.ts           # OCR processing
│   ├── faceRecognition.ts # Face recognition
│   ├── storage.ts       # File storage
│   ├── documentQuality.ts # Quality analysis
│   └── webhook.ts       # Webhook delivery
│
├── types/                # TypeScript type definitions
│   └── index.ts         # Shared types
│
├── utils/                # Utility functions
│   └── logger.ts        # Logging utilities
│
├── scripts/              # Database and setup scripts
│   └── setup-db.ts      # Database initialization
│
├── sql/                  # SQL schema files
│   └── schema.sql       # Database schema
│
└── server.ts             # Main application entry point
```

## Frontend Structure (`/frontend/src/`)

```
src/
├── components/            # Reusable React components
│   └── layout/           # Layout components
│       └── Layout.tsx    # Main layout wrapper
│
├── pages/                # Page components (routes)
│   ├── HomePage.tsx      # Landing page
│   ├── DeveloperPage.tsx # Developer portal
│   ├── VerificationPage.tsx # Verification demo
│   ├── LiveCapturePage.tsx  # Live camera capture
│   ├── DocsPage.tsx      # API documentation
│   ├── AdminPage.tsx     # Admin dashboard
│   ├── AdminLogin.tsx    # Admin login
│   └── NotFoundPage.tsx  # 404 page
│
├── config/               # Configuration files
│   └── api.ts           # API endpoints and configuration
│
├── App.tsx              # Main React application
├── main.tsx            # Application entry point
├── index.css           # Global styles
└── vite-env.d.ts       # Vite type definitions
```

## Key Configuration Files

### Root Level
- **`package.json`**: Root package configuration with workspace setup
- **`.gitignore`**: Git ignore patterns for all environments
- **`CLAUDE.md`**: Instructions for Claude Code assistant

### Backend
- **`tsconfig.json`**: TypeScript compiler configuration
- **`Procfile`**: Railway/Heroku deployment configuration
- **`DEPLOYMENT.md`**: Backend-specific deployment instructions

### Frontend
- **`vite.config.ts`**: Vite bundler configuration
- **`tailwind.config.js`**: Tailwind CSS utility configuration
- **`postcss.config.js`**: PostCSS processing configuration
- **`vercel.json`**: Vercel deployment configuration

### Database
- **`supabase/config.toml`**: Supabase project configuration
- **`sql/*.sql`**: Database schema and initialization scripts
- **`supabase/migrations/`**: Version-controlled database migrations

## Development Workflow

1. **Backend Development**: Work in `/backend/src/`
2. **Frontend Development**: Work in `/frontend/src/`
3. **Documentation**: Add/update files in `/docs/`
4. **Database Changes**: Create migrations in `/supabase/migrations/`
5. **SDK Development**: Work in respective `/sdks/` subdirectories

## File Naming Conventions

- **TypeScript files**: PascalCase for components, camelCase for utilities
- **Configuration files**: kebab-case (e.g., `vite.config.ts`)
- **Documentation files**: UPPERCASE.md (e.g., `README.md`)
- **Database files**: snake_case.sql (e.g., `create_tables.sql`)
- **Migration files**: Sequential numbering (e.g., `01_initial_schema.sql`)

## Clean Architecture Principles

The project follows clean architecture principles:

1. **Separation of Concerns**: Clear boundaries between layers
2. **Dependency Inversion**: Services depend on abstractions
3. **Single Responsibility**: Each module has one clear purpose
4. **Open/Closed Principle**: Extensible without modification
5. **Interface Segregation**: Minimal, focused interfaces

## Deployment Structure

- **Backend**: Deployed as Node.js application (Railway/Heroku)
- **Frontend**: Deployed as static site (Vercel/Netlify)
- **Database**: Managed PostgreSQL (Supabase)
- **Storage**: File system or S3-compatible storage
- **CDN**: For static assets and document delivery

This structure supports scalable development, easy maintenance, and clear separation of concerns across the entire platform.