# CreateAI - Content Creation Workspace

## Overview

CreateAI is a minimalist PWA workspace for AI-powered content creation, CRM synchronization, and performance analytics. The application enables users to create podcasts, blogs, and e-books with AI assistance, automatically sync content with CRM systems, and track performance metrics through comprehensive reporting dashboards.

The system is designed as a browser-based Progressive Web Application (PWA) with responsive design that adapts to desktop, tablet, and mobile interfaces. It provides a complete content creation workflow from ideation to publication, with integrated AI tools for outline generation, script writing, voice synthesis, and automated publishing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built using React 18 with TypeScript, leveraging modern web technologies for optimal performance and user experience:

- **UI Framework**: React 18 with TypeScript for type safety and component-based architecture
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, customizable design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Management**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds
- **PWA Support**: Service worker configuration for offline capabilities and app-like experience

The application follows a responsive design pattern with:
- Bottom tab navigation for mobile devices
- Split view layout for tablets 
- Sidebar navigation for desktop screens
- Touch-optimized interface with 44-48px minimum touch targets

### Backend Architecture

The backend implements a modern Node.js architecture with TypeScript throughout:

- **Runtime**: Node.js with Express framework for HTTP server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Replit Auth with OpenID Connect (OIDC) and PKCE flow
- **API Design**: RESTful endpoints with JSON responses
- **File Structure**: Monorepo structure with shared schema between client and server

### Database Design

The system uses a PostgreSQL database with the following core entities:

- **Users**: Profile information, authentication data, and preferences
- **Organizations**: Multi-tenant structure with role-based access control
- **User Organizations**: Junction table linking users to organizations with specific roles
- **Content Projects**: Top-level content containers (podcasts, blogs, e-books)
- **Content Items**: Individual pieces of content within projects
- **User Integrations**: Third-party service connections and OAuth credentials
- **Analytics Snapshots**: Performance metrics and KPI data storage
- **Sessions**: Server-side session storage for authentication

Role hierarchy includes: Owner, Admin, Editor, Contributor, and Viewer with granular permissions.

### Authentication & Authorization

Authentication is handled through Replit's OpenID Connect implementation:

- **OIDC Flow**: OpenID Connect with PKCE for secure authentication
- **Session Management**: HTTP-only cookies with PostgreSQL session storage
- **Multi-tenant Support**: Organization-based access control with role-based permissions
- **Security**: CSRF protection, secure cookie settings, and session rotation

### AI Integration Layer

The system implements a provider-agnostic AI service layer:

- **OpenAI Integration**: GPT models for content generation, outline creation, and text processing
- **Content Generation**: Automated outline creation, script writing, and content drafting
- **Voice Synthesis**: Integration points for text-to-speech services (ElevenLabs)
- **Content Processing**: AI-powered content analysis, SEO optimization, and performance insights

### Development Environment

The development setup includes:

- **Hot Reload**: Vite dev server with HMR for rapid development
- **Type Checking**: TypeScript compilation and checking across the entire codebase
- **Path Aliases**: Configured aliases for clean imports (@/, @shared/, @assets/)
- **Error Handling**: Runtime error overlay and comprehensive error boundaries
- **Database Migration**: Drizzle Kit for schema migrations and database management

## External Dependencies

### Core Dependencies

- **Database**: Neon Database (serverless PostgreSQL) for data persistence
- **Authentication**: Replit Auth service for user authentication and OIDC flow
- **AI Services**: OpenAI API for content generation and text processing capabilities
- **UI Components**: Radix UI primitives through shadcn/ui for accessible component library

### Optional Integrations

- **CRM Systems**: HubSpot integration for customer relationship management sync
- **Content Publishing**: WordPress API for automated blog publishing
- **Podcast Hosting**: Transistor FM for podcast distribution and analytics
- **Voice Synthesis**: ElevenLabs for text-to-speech and voice generation
- **Stock Media**: Adobe Stock API for image and media asset integration

### Development Dependencies

- **Build Tools**: Vite for frontend bundling and esbuild for backend compilation
- **Type Safety**: TypeScript compiler and Zod for runtime validation
- **Database Tools**: Drizzle ORM and Drizzle Kit for database operations and migrations
- **Session Storage**: connect-pg-simple for PostgreSQL session management
- **Deployment**: Configured for Node.js hosting with environment variable configuration

The application is designed to be cloud-native with environment-based configuration for different deployment scenarios, supporting both development and production environments seamlessly.