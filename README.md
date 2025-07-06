# InterviewPrep Platform

A comprehensive interview preparation platform with DSA practice sheets, live code execution, and AI-powered features.

## Features

### 🎯 Core Features
- **DSA Practice Sheets**: Multiple categorized sheets (Striver, Love Babbar, Custom)
- **Live Code Execution**: Run code directly in the browser using Piston API
- **AI-Powered Interviews**: Real-time technical interviews with AI guidance
- **Text-to-Speech Integration**: AI interviewer responses with professional audio
- **Progress Tracking**: Track solved problems, streaks, and completion rates
- **Daily Email Notifications**: Customizable problem recommendations
- **User Dashboard**: Comprehensive analytics and progress visualization
- **Admin Panel**: Complete platform management and analytics

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (User/Admin)
- Secure password hashing with bcrypt
- Protected routes and API endpoints

### 📊 Admin Features
- User management and analytics
- Sheet and problem management
- Email campaign monitoring
- Platform usage statistics
- CSV import for bulk problem uploads

### 💻 Technical Features
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **AI Services**: Groq AI for interviews, ElevenLabs for TTS
- **Authentication**: JWT tokens
- **Email Service**: Nodemailer with SMTP
- **Code Execution**: Piston API integration
- **Database**: PostgreSQL with proper indexing
- **Security**: Helmet, CORS, Rate limiting
- **Real-time Communication**: Socket.io for live interviews

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- SMTP email service (Gmail recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd interview-prep-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb interview_prep
   
   # Run migrations
   npm run db:migrate
   
   # Seed with sample data
   npm run db:seed
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: https://docvault-hzj4.onrender.com

### Demo Credentials

After seeding the database, you can use these credentials:

**Admin Account:**
- Email: admin@interviewprep.com
- Password: admin123

**User Account:**
- Email: user@example.com
- Password: user123

## Environment Configuration

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_prep
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### User Endpoints
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/preferences` - Update user preferences
- `GET /api/users/dashboard` - Get dashboard data

### Sheet Endpoints
- `GET /api/sheets` - Get all sheets
- `GET /api/sheets/:id` - Get sheet with problems
- `GET /api/sheets/:id/progress` - Get user progress for sheet

### Problem Endpoints
- `GET /api/problems/:id` - Get problem details
- `GET /api/problems/search` - Search problems

### Progress Endpoints
- `POST /api/progress/problem` - Update problem progress
- `GET /api/progress/overview` - Get progress overview
- `GET /api/progress/sheet/:id` - Get sheet progress

### Code Execution Endpoints
- `POST /api/code/execute` - Execute code
- `GET /api/code/history` - Get execution history
- `GET /api/code/stats` - Get execution statistics

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/users` - Manage users
- `GET /api/admin/sheets` - Manage sheets
- `POST /api/admin/sheets` - Create new sheet
- `GET /api/admin/analytics` - Platform analytics

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `password` (VARCHAR, Hashed)
- `name` (VARCHAR)
- `role` (VARCHAR: 'user' | 'admin')
- `is_active` (BOOLEAN)
- `created_at`, `updated_at`, `last_login` (TIMESTAMP)

### Sheets Table
- `id` (UUID, Primary Key)
- `title`, `description` (VARCHAR/TEXT)
- `difficulty` (VARCHAR: 'beginner' | 'intermediate' | 'advanced')
- `estimated_time`, `author` (VARCHAR)
- `tags` (JSONB)
- `is_active` (BOOLEAN)
- `created_by` (UUID, Foreign Key)

### Problems Table
- `id` (UUID, Primary Key)
- `sheet_id` (UUID, Foreign Key)
- `title` (VARCHAR)
- `step_no`, `sl_no_in_step` (INTEGER)
- `head_step_no` (VARCHAR)
- Various link fields (TEXT)
- `difficulty` (INTEGER: 0=Easy, 1=Medium, 2=Hard)
- `ques_topic` (JSONB)

### Problem Progress Table
- `id` (UUID, Primary Key)
- `user_id`, `problem_id`, `sheet_id` (UUID, Foreign Keys)
- `status` (VARCHAR: 'not_started' | 'in_progress' | 'solved' | 'bookmarked')
- `solved_at` (TIMESTAMP)

## Development

### Available Scripts
- `npm run dev` - Start development servers (frontend + backend)
- `npm run dev:client` - Start frontend only
- `npm run dev:server` - Start backend only
- `npm run build` - Build for production
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

### Project Structure
```
├── server/                 # Backend code
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   ├── config/            # Configuration files
│   └── scripts/           # Database scripts
├── src/                   # Frontend code
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   └── types/            # TypeScript types
└── public/               # Static assets
```

## Deployment

### Production Environment Variables
Ensure all environment variables are properly set for production:
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure proper SMTP settings
- Set up SSL for database connections

### Database Setup
1. Create production PostgreSQL database
2. Run migrations: `npm run db:migrate`
3. Optionally seed with initial data: `npm run db:see`

### Security Considerations
- Enable HTTPS in production
- Set up proper CORS origins
- Configure rate limiting
- Use environment-specific secrets
- Enable database SSL connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.