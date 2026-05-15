# Security Assessment Platform

Production-ready security assessment and penetration testing management platform with Node.js, Express, PostgreSQL (Neon), React, and TypeScript.

## Overview

A comprehensive platform for managing security assessments, vulnerability findings, evidence collection, and automated report generation. Built for security professionals, penetration testers, and security teams.

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL (Neon Database)
- TypeScript (strict mode)
- Raw SQL with `pg` (no ORM)
- node-pg-migrate for database migrations
- JWT + OAuth2 (Google) authentication
- OpenAI & Google Gemini AI integration
- AWS S3 for file storage
- Puppeteer for PDF generation
- DOCX report generation

### Frontend
- React 18 + Vite
- TypeScript
- Tailwind CSS v4
- Redux Toolkit
- React Router v7
- shadcn/ui components
- Axios with interceptors

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and add your Neon DATABASE_URL

# Run migrations
npm run migrate:up

# Start development server
npm run dev
```

Backend runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000`

## Database Migrations

This project uses `node-pg-migrate` for version-controlled database schema changes.

### Create a new migration
```bash
cd backend
npm run migrate:create your-migration-name
```

### Run migrations
```bash
npm run migrate:up
```

### Rollback last migration
```bash
npm run migrate:down
```

## Core Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- OAuth2 (Google) integration
- Role-based access control (RBAC)
- User roles: Admin, Manager, Pentester, Viewer
- Role request system with approval workflow
- User status management (active/inactive)

### 🎯 Project Management
- Client management
- Project creation and tracking
- Project scope definition (in-scope/out-of-scope endpoints)
- Project templates
- Multi-project support

### 🔍 Findings Management
- Create, read, update, delete findings
- Severity levels (Critical, High, Medium, Low, Info)
- Status tracking (Open, In Progress, Fixed, Accepted Risk, etc.)
- CVSS scoring
- Risk matrix integration
- Finding versioning and change logs
- AI-powered finding generation (OpenAI & Gemini)

### 📸 Evidence Management
- Multi-file evidence upload
- Image optimization with Sharp
- Step-by-step evidence with images
- Evidence versioning
- AWS S3 integration for storage
- Presigned URL generation

### 📝 Report Generation
- Automated DOCX report generation
- Custom report templates
- Template editor with logo support
- Professional formatting
- Evidence embedding
- Risk matrix visualization
- Export to PDF via Puppeteer

### 💬 Collaboration
- Comments on findings
- Activity logs
- Change tracking
- Team collaboration features

### 📊 Dashboard & Analytics
- Overview statistics
- Finding distribution by severity
- Project progress tracking
- User activity monitoring

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/logout` - Logout user
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/me` - Get current user

### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (Admin only)
- `PATCH /users/:id/status` - Update user status (Admin only)

### Role Requests
- `GET /role-requests` - Get all role requests
- `POST /role-requests` - Create role request
- `PATCH /role-requests/:id/approve` - Approve request (Admin only)
- `PATCH /role-requests/:id/reject` - Reject request (Admin only)

### Clients
- `GET /clients` - Get all clients
- `POST /clients` - Create client
- `GET /clients/:id` - Get client by ID
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete client

### Projects
- `GET /projects` - Get all projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project by ID
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Findings
- `GET /findings` - Get all findings (with filters)
- `POST /findings` - Create finding
- `GET /findings/:id` - Get finding by ID
- `PUT /findings/:id` - Update finding
- `DELETE /findings/:id` - Delete finding
- `POST /findings/generate-ai` - Generate finding with AI

### Evidence
- `POST /evidence/upload` - Upload evidence files
- `GET /evidence/:id` - Get evidence by ID
- `DELETE /evidence/:id` - Delete evidence

### Reports
- `GET /reports` - Get all reports
- `POST /reports/generate` - Generate report
- `GET /reports/:id` - Get report by ID
- `GET /reports/:id/download` - Download report file
- `DELETE /reports/:id` - Delete report

### Templates
- `GET /templates` - Get all templates
- `POST /templates` - Create template
- `GET /templates/:id` - Get template by ID
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `POST /templates/:id/upload-logo` - Upload template logo

### Comments
- `GET /comments/finding/:findingId` - Get comments for finding
- `POST /comments` - Create comment
- `PUT /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics

### Upload
- `POST /upload/image` - Upload single image
- `POST /upload/images` - Upload multiple images

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Database & environment config
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── finding.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── report-generator.service.ts
│   │   │   ├── openai.service.ts
│   │   │   └── role-request.service.ts
│   │   ├── models/          # Database queries (raw SQL)
│   │   │   ├── user.model.ts
│   │   │   ├── finding.model.ts
│   │   │   ├── project.model.ts
│   │   │   ├── report.model.ts
│   │   │   └── evidence.model.ts
│   │   ├── routes/          # API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── finding.routes.ts
│   │   │   ├── project.routes.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── evidence.routes.ts
│   │   │   ├── template.routes.ts
│   │   │   ├── client.routes.ts
│   │   │   ├── comment.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── role-request.routes.ts
│   │   │   └── upload.routes.ts
│   │   ├── middlewares/     # Custom middleware
│   │   │   ├── auth.ts      # JWT & role verification
│   │   │   ├── errorHandler.ts
│   │   │   └── upload.ts    # Multer configuration
│   │   ├── utils/           # Utilities
│   │   ├── types/           # TypeScript types
│   │   └── templates/       # Report templates (.docx)
│   ├── migrations/          # Database migrations
│   ├── uploads/             # Uploaded files (local)
│   ├── reports/             # Generated reports
│   ├── public/              # Static files
│   ├── scripts/             # Utility scripts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components (don't modify)
│   │   │   ├── common/      # Custom components
│   │   │   ├── users/       # User management components
│   │   │   ├── findings/    # Finding components
│   │   │   ├── projects/    # Project components
│   │   │   └── reports/     # Report components
│   │   ├── pages/           # Page components
│   │   │   ├── SignUpPage.tsx
│   │   │   ├── FindingDetailPage.tsx
│   │   │   ├── GenerateFindingAIPage.tsx
│   │   │   ├── TemplateEditorPage.tsx
│   │   │   ├── RBACSettingsPage.tsx
│   │   │   └── ProfileSettingsPage.tsx
│   │   ├── layouts/         # Layout components
│   │   ├── routes/          # Route configuration
│   │   ├── store/           # Redux store & slices
│   │   ├── api/             # API calls
│   │   │   ├── userApi.ts
│   │   │   ├── projectApi.ts
│   │   │   ├── uploadApi.ts
│   │   │   └── ...
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # TypeScript types
│   └── package.json
│
└── README.md
```

## Key Features

### Backend Architecture
✅ **Clean Architecture** - Controller → Service → Model pattern  
✅ **Raw SQL** - Full PostgreSQL power with `pg` library  
✅ **Type Safety** - Strict TypeScript configuration  
✅ **Error Handling** - Centralized error middleware  
✅ **Async Handler** - No try-catch repetition  
✅ **Migrations** - Version-controlled schema changes  
✅ **Environment Config** - Single source of truth pattern  
✅ **RBAC** - Role-based access control with middleware  
✅ **File Upload** - Multer + AWS S3 integration  
✅ **AI Integration** - OpenAI & Google Gemini for finding generation  
✅ **Report Generation** - Automated DOCX/PDF creation  

### Frontend Architecture
✅ **Component-Based** - Reusable UI components  
✅ **State Management** - Redux Toolkit  
✅ **Type-Safe** - Full TypeScript support  
✅ **Theme System** - CSS variables for easy theming  
✅ **API Layer** - Centralized Axios instance with interceptors  
✅ **Routing** - React Router with protected routes  
✅ **Toast Notifications** - React Hot Toast for user feedback  
✅ **Form Handling** - Controlled components with validation  

### Security Features
✅ **JWT Authentication** - Secure token-based auth  
✅ **OAuth2** - Google authentication integration  
✅ **Password Hashing** - bcrypt for secure password storage  
✅ **Rate Limiting** - Express rate limiter  
✅ **Helmet** - Security headers  
✅ **CORS** - Configured cross-origin resource sharing  
✅ **Role Verification** - Middleware-based authorization  
✅ **Input Validation** - Server-side validation  

### Database Schema
- **users** - User accounts with roles and status
- **clients** - Client organizations
- **projects** - Security assessment projects
- **findings** - Vulnerability findings with CVSS scores
- **evidence** - Evidence files and metadata
- **step_images** - Step-by-step evidence images
- **finding_versions** - Finding change history
- **finding_logs** - Activity logs
- **comments** - Finding comments
- **report_templates** - Custom report templates
- **generated_reports** - Generated report metadata
- **role_requests** - Role change requests  

## Development

### Backend Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run migrate:up   # Run migrations
npm run migrate:down # Rollback migration
```

### Frontend Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Session
SESSION_SECRET=your_session_secret

# AI Services
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api/v1
```

## Database

This project uses **Neon** - a serverless PostgreSQL database.

- Serverless architecture
- Auto-scales to zero
- Built-in connection pooling
- Database branching (like Git)
- Free tier available

Get your connection string from: https://console.neon.tech

## Customization

### Change Theme Colors
Edit `frontend/src/index.css`:
```css
@theme {
  --color-primary: #your-color;
  --color-secondary: #your-color;
}
```

### Add New API Endpoint
1. Create model in `backend/src/models/`
2. Create service in `backend/src/services/`
3. Create controller in `backend/src/controllers/`
4. Create route in `backend/src/routes/`
5. Register route in `backend/src/routes/index.ts`

### Add New Frontend Page
1. Create page in `frontend/src/pages/`
2. Add route in `frontend/src/routes/AppRoutes.tsx`
3. Add navigation in `frontend/src/layouts/MainLayout.tsx`

### Configure AI Services
The platform supports both OpenAI and Google Gemini for AI-powered finding generation:
- Add `OPENAI_API_KEY` for OpenAI GPT models
- Add `GEMINI_API_KEY` for Google Gemini models
- Configure in `backend/src/services/openai.service.ts`

### Setup AWS S3 for File Storage
1. Create an S3 bucket in AWS
2. Configure IAM user with S3 permissions
3. Add credentials to `.env`
4. Files will be automatically uploaded to S3

### Create Initial Admin User
```bash
cd backend
npm run setup:manager
```

## User Roles & Permissions

### Admin
- Full system access
- User management
- Role assignment
- Template management
- All CRUD operations

### Manager
- Project management
- Finding management
- Report generation
- User viewing
- Template usage

### Pentester
- Finding creation/editing
- Evidence upload
- Comment on findings
- View projects

### Viewer
- Read-only access
- View findings
- View reports
- View projects

## Production Deployment

### Backend
```bash
npm run build
npm start
```

### Frontend
```bash
npm run build
# Serve the dist/ folder
```

Recommended platforms:
- **Backend**: Railway, Render, Fly.io
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Database**: Neon (already configured)

## Best Practices

✅ **No ORM** - Direct SQL for performance and control  
✅ **Migrations** - All schema changes version controlled  
✅ **Type Safety** - Strict TypeScript everywhere  
✅ **Error Handling** - Centralized and consistent  
✅ **Environment Config** - Loaded once, imported everywhere  
✅ **Component Reusability** - shadcn/ui + custom wrappers  
✅ **State Management** - Redux Toolkit for predictable state  
✅ **Security First** - RBAC, JWT, input validation  
✅ **File Management** - S3 for scalability  
✅ **AI Integration** - Multiple providers for flexibility  

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Check Neon database is active
- Ensure SSL mode is enabled

### Migration Errors
```bash
# Reset migrations (development only)
npm run migrate:down
npm run migrate:up
```

### File Upload Issues
- Check `uploads/` directory permissions
- Verify AWS S3 credentials if using S3
- Check file size limits in `backend/src/middlewares/upload.ts`

### AI Generation Not Working
- Verify API keys in `.env`
- Check API quotas and billing
- Review service configuration in `backend/src/services/openai.service.ts`

### OAuth Issues
- Verify Google OAuth credentials
- Check callback URL matches Google Console
- Ensure session secret is set

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Security Considerations

- Never commit `.env` files
- Rotate JWT secrets regularly
- Use strong passwords for database
- Enable rate limiting in production
- Review CORS settings for production
- Keep dependencies updated
- Use HTTPS in production
- Implement proper logging and monitoring

## License

ISC

---

Built with ❤️ for security professionals by CODEXVEER
