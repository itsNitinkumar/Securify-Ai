# Full-Stack Application

Production-ready full-stack application with Node.js, Express, PostgreSQL (Neon), React, and TypeScript.

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL (Neon Database)
- TypeScript (strict mode)
- Raw SQL with `pg` (no ORM)
- node-pg-migrate for database migrations
- JWT authentication ready

### Frontend
- React 18 + Vite
- TypeScript
- Tailwind CSS v4
- Redux Toolkit
- React Router v7
- shadcn/ui components
- Axios

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

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Health Check
- `GET /health` - Server health status

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Database & environment config
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database queries (raw SQL)
│   │   ├── routes/          # API routes
│   │   ├── middlewares/     # Custom middleware
│   │   ├── utils/           # Utilities (asyncHandler, ApiResponse, ApiError)
│   │   └── types/           # TypeScript types
│   ├── migrations/          # Database migrations
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn components (don't modify)
│   │   │   └── common/      # Custom components
│   │   ├── pages/           # Page components
│   │   ├── layouts/         # Layout components
│   │   ├── routes/          # Route configuration
│   │   ├── store/           # Redux store & slices
│   │   ├── api/             # API calls
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

### Frontend Architecture
✅ **Component-Based** - Reusable UI components  
✅ **State Management** - Redux Toolkit  
✅ **Type-Safe** - Full TypeScript support  
✅ **Theme System** - CSS variables for easy theming  
✅ **API Layer** - Centralized Axios instance with interceptors  
✅ **Routing** - React Router with layouts  

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
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
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

## License

ISC

---

Built CODEXVEER using modern best practices
