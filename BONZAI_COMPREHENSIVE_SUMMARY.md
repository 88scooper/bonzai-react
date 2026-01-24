# Bonzai Real Estate Investment Management Platform
## Comprehensive Project Summary

**Document Date:** January 2025  
**Project Name:** Bonzai  
**Package Name:** bonzai-app  
**Project Location:** `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React`  
**Status:** Active Development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Application Architecture](#3-application-architecture)
4. [Core Features & Functionality](#4-core-features--functionality)
5. [Database Schema](#5-database-schema)
6. [API Endpoints](#6-api-endpoints)
7. [User Interface & Components](#7-user-interface--components)
8. [Financial Calculations](#8-financial-calculations)
9. [Authentication & Security](#9-authentication--security)
10. [Recent Implementations & Fixes](#10-recent-implementations--fixes)
11. [Known Issues & Technical Debt](#11-known-issues--technical-debt)
12. [Development Workflow](#12-development-workflow)
13. [Project Context & History](#13-project-context--history)

---

## 1. Project Overview

### 1.1 Purpose and Target Users

Bonzai is a comprehensive real estate investment management platform designed for independent landlords and real estate investors. The application provides institutional-grade data analysis and portfolio management tools to help users:

- Centralize property data and financial records
- Track cash flow, equity growth, and portfolio performance
- Perform sophisticated financial analysis and forecasting
- Model different investment scenarios
- Make data-driven investment decisions

**Target Users:**
- Independent landlords managing multiple properties
- Real estate investors tracking portfolio performance
- Property managers needing financial analysis tools
- Investors evaluating potential property acquisitions

### 1.2 Current Development Status

The application is in **active development** with a fully functional core feature set. Key features are implemented and operational, with ongoing improvements and optimizations.

### 1.3 Project Identification

**⚠️ CRITICAL PROJECT IDENTIFICATION:**

- **Project Name:** Bonzai (formerly named "Proplytics" - has been renamed and rebranded)
- **Package Name:** `bonzai-app` (NOT proplytics-app)
- **Active Location:**** `/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React`
- **Legacy/Archived:** The old "Proplytics" project locations should NEVER be used:
  - ❌ `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React` (OLD - archived)
  - ❌ `/Users/stu/Documents/Proplytics/Active Project/Proplytics-React-ARCHIVED-DO-NOT-USE` (OLD - archived)

**Important Notes:**
- All branding should be "Bonzai" not "Proplytics"
- All API routes use "bonzai" naming (e.g., `/api/bonzai-test`)
- The `proplytics-app/` subdirectory inside this project is a legacy/backup copy and should not be used for active development
- Database tables may still reference `proplytics_test` - this is acceptable for now but should be migrated eventually

---

## 2. Technology Stack

### 2.1 Frontend Framework

**Next.js 16.1.1** with App Router
- Server-side rendering (SSR) and static site generation (SSG)
- API routes for backend functionality
- File-based routing system
- Built-in optimization features

**React 19.2.3**
- Latest React features including concurrent rendering
- Client-side interactivity
- Component-based architecture

### 2.2 Backend & Database

**Neon PostgreSQL** (Serverless PostgreSQL)
- Cloud-hosted PostgreSQL database
- Serverless architecture for scalability
- Connection via `@neondatabase/serverless` package

**Database Connection:**
- Uses environment variable `POSTGRES_URL` for connection string
- Connection pooling handled by Neon
- SQL queries using tagged template literals for safety

### 2.3 Key Dependencies

**State Management & Data Fetching:**
- `@tanstack/react-query` v5.89.0 - Server state management, caching, and synchronization
- `@tanstack/react-query-devtools` - Development tools for React Query

**UI & Styling:**
- `tailwindcss` v4 - Utility-first CSS framework
- `framer-motion` v12.26.2 - Animation library
- `lucide-react` v0.539.0 - Icon library

**Forms & Validation:**
- `react-hook-form` v7.63.0 - Form state management
- `@hookform/resolvers` v5.2.2 - Form validation resolvers
- `zod` v4.1.11 - Schema validation

**Authentication & Security:**
- `jsonwebtoken` v9.0.2 - JWT token generation and verification
- `bcryptjs` v2.4.3 - Password hashing

**Data Visualization:**
- `recharts` v3.2.1 - Chart library for financial data visualization

**File Processing:**
- `xlsx` v0.18.5 - Excel file import/export
- `jspdf` v3.0.3 - PDF generation
- `html2canvas` v1.4.1 - HTML to image conversion

**Drag & Drop:**
- `@dnd-kit/core` v6.3.1 - Drag and drop functionality
- `@dnd-kit/sortable` v10.0.0 - Sortable lists

**Virtualization:**
- `@tanstack/react-virtual` v3.13.12 - Virtual scrolling for large lists

### 2.4 Development Tools

- **TypeScript** - Type safety (mixed with JavaScript)
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **dotenv** - Environment variable management

### 2.5 Configuration Files

- `next.config.mjs` - Next.js configuration with security headers
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.mjs` - ESLint rules

---

## 3. Application Architecture

### 3.1 Overall Architecture Pattern

Bonzai follows a **modern full-stack Next.js architecture**:

- **Frontend:** React components with Next.js App Router
- **Backend:** Next.js API routes (serverless functions)
- **Database:** Neon PostgreSQL (serverless)
- **State Management:** React Context + TanStack Query
- **Authentication:** JWT-based with server-side session management

### 3.2 Directory Structure

```
Bonzai-React/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes (backend)
│   │   ├── admin/              # Admin dashboard
│   │   ├── analytics/          # Analytics page
│   │   ├── calculator/         # Calculator tools
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── onboarding/        # User onboarding flow
│   │   ├── my-properties/      # Property management
│   │   ├── portfolio-summary/  # Portfolio dashboard
│   │   ├── mortgage-calculator/ # Mortgage tools
│   │   └── page.jsx            # Homepage
│   ├── components/             # React components
│   │   ├── analytics/          # Analytics components
│   │   ├── calculators/        # Calculator components
│   │   ├── mortgages/          # Mortgage components
│   │   ├── onboarding/         # Onboarding components
│   │   ├── scenarios/          # Scenario planning components
│   │   └── shared/             # Shared components
│   ├── context/                # React Context providers
│   │   ├── AuthContext.js      # Authentication state
│   │   ├── AccountContext.tsx  # Account management
│   │   ├── PropertyContext.tsx # Property data
│   │   ├── MortgageContext.jsx # Mortgage data
│   │   ├── SettingsContext.jsx # User settings
│   │   ├── ToastContext.jsx    # Toast notifications
│   │   └── Providers.jsx       # Provider composition
│   ├── lib/                    # Utility libraries
│   │   ├── db.ts               # Database connection
│   │   ├── auth.ts              # Authentication utilities
│   │   ├── sensitivity-analysis.js # Financial forecasting
│   │   ├── mortgage-calculations.js # Mortgage math
│   │   ├── validations/        # Zod schemas
│   │   └── ...                 # Other utilities
│   ├── utils/                  # Helper functions
│   │   ├── financialCalculations.js # Financial formulas
│   │   ├── mortgageCalculator.ts   # Mortgage calculations
│   │   └── formatting.ts       # Formatting utilities
│   └── middleware/              # Next.js middleware
│       └── api-logging.ts      # API request logging
├── migrations/                  # Database migrations
├── public/                     # Static assets
└── Mock Data/                  # Sample data files
```

### 3.3 Key Architectural Decisions

**1. Server-Side Rendering (SSR)**
- Homepage and static content use SSR for SEO and performance
- Dynamic pages use client-side rendering for interactivity

**2. API Routes as Backend**
- All backend logic in Next.js API routes
- RESTful API design
- Type-safe request/response handling

**3. React Context for Global State**
- Authentication state
- Property and mortgage data
- User settings and preferences
- Toast notifications

**4. TanStack Query for Server State**
- Automatic caching and synchronization
- Optimistic updates
- Background refetching
- Request deduplication

**5. Component Composition**
- Reusable component library
- Separation of concerns (presentation vs. logic)
- Custom hooks for shared logic

### 3.4 State Management Approach

**Global State (React Context):**
- User authentication and session
- Selected account
- Property and mortgage data
- UI settings (dark mode, etc.)

**Server State (TanStack Query):**
- API data caching
- Automatic refetching
- Optimistic updates
- Background synchronization

**Local State (React useState/useReducer):**
- Component-specific UI state
- Form inputs
- Modal visibility
- Temporary calculations

### 3.5 API Structure and Routing

**RESTful API Design:**
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/properties/[id]` - Get property details
- `PUT /api/properties/[id]` - Update property
- `DELETE /api/properties/[id]` - Delete property

**Authentication Routes:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

**Specialized Routes:**
- `/api/mortgages/calculate` - Mortgage calculations
- `/api/mortgages/prepayment` - Prepayment analysis
- `/api/mortgages/refinance` - Refinance analysis
- `/api/admin/*` - Admin operations

---

## 4. Core Features & Functionality

### 4.1 Property Management

**Property CRUD Operations:**
- Create, read, update, and delete properties
- Property details include:
  - Basic info (nickname, address, property type)
  - Financial data (purchase price, current market value)
  - Dates (purchase date, year built)
  - Physical attributes (size, unit configuration)
  - Additional data stored in JSONB field

**Property Data Storage:**
- Core fields in dedicated columns
- Extended data in `property_data` JSONB field
- Flexible schema for future additions

**Property Features:**
- Multiple properties per account
- Property images
- Expense tracking
- Mortgage association
- Financial calculations

### 4.2 Financial Calculations and Analysis Tools

**Cash Flow Analysis:**
- Monthly and annual cash flow calculations
- Net Operating Income (NOI) calculations
- Operating expense tracking (excluding mortgage)
- Debt service calculations

**Key Financial Metrics:**
- Cap Rate (NOI / Property Value)
- Cash-on-Cash Return
- Internal Rate of Return (IRR)
- Net Present Value (NPV)

**10-Year Financial Forecasting:**
- Projected cash flows over 10 years
- Adjustable assumptions:
  - Annual rent increase rate
  - Annual expense inflation
  - Vacancy rate
  - Future interest rates
- Real-time calculation updates

**Year-over-Year (YoY) Analysis:**
- Compare year-to-year performance
- Track growth trends
- Identify patterns and anomalies

### 4.3 Mortgage Calculator and Management

**Mortgage Input Fields:**
- Lender name
- Original loan amount
- Interest rate (fixed or variable)
- Variable rate spread (for variable mortgages)
- Amortization period (years/months)
- Term length (years/months)
- Start date
- Payment frequency:
  - Monthly
  - Semi-monthly
  - Bi-weekly
  - Accelerated Bi-weekly
  - Weekly
  - Accelerated Weekly

**Mortgage Calculations:**
- **Canadian Standard Formula:** Semi-annual compounding
- Payment amount calculation
- Amortization schedule generation
- Principal and interest breakdown
- Current balance calculation
- Remaining term calculation

**Mortgage Tools:**
- **Payment Calculator:** Calculate payment amounts
- **Refinance Calculator:** Analyze refinancing opportunities
- **Break Penalty Calculator:** Calculate mortgage break penalties
- **Prepayment Analysis:** Model prepayment scenarios
- **Amortization Schedule:** Full payment schedule with dates

**Mortgage Features:**
- Support for multiple mortgages per property
- Historical payment tracking
- Renewal date tracking
- Term vs. amortization period validation

### 4.4 Analytics and Reporting Capabilities

**Portfolio Summary Dashboard:**
- Aggregate portfolio metrics
- Total portfolio value
- Combined cash flow
- Average cap rate
- Property count

**Property-Level Analytics:**
- Individual property performance
- Cash flow trends
- Expense analysis
- Occupancy tracking

**Visual Analytics:**
- Charts and graphs using Recharts
- Cash flow projections
- Equity growth visualization
- Expense breakdowns
- Year-over-year comparisons

### 4.5 Sensitivity Analysis Tool

**Core Features:**
- 10-year financial forecasts
- Adjustable assumptions panel
- Real-time calculation updates
- Baseline vs. adjusted scenario comparison
- IRR, cash flow, and profit calculations
- Color-coded feedback for changes

**Assumptions Panel:**
- Annual rent increase rate
- Annual expense inflation
- Vacancy rate
- Future interest rate (for renewals)
- Property appreciation (for equity analysis)

**Analysis Modes:**
- **Cash Flow Analysis:** Focus on cash flow projections
- **Equity Analysis:** Focus on equity growth and appreciation

**Scenario Comparison:**
- Side-by-side comparison of scenarios
- Visual indicators for improvements/declines
- Key insights and recommendations

### 4.6 Scenario Planning and Saved Scenarios

**Save Scenarios:**
- Save current assumption set with a name
- Per-property scenario organization
- Scenario metadata (name, date, property)
- LocalStorage persistence

**Saved Scenarios Panel:**
- List all saved scenarios
- Load saved scenarios
- Delete scenarios with confirmation
- Current scenario indicator
- Scenario comparison

**Scenario Presets:**
- Conservative scenario
- Standard scenario
- Aggressive scenario

### 4.7 Data Import/Export Functionality

**Import Features:**
- CSV file import for properties
- Excel file import
- Bulk property upload
- Data validation on import

**Export Features:**
- PDF export of reports
- Excel export of data
- Chart/image export using html2canvas

**Data Migration:**
- Migration from localStorage to database
- Legacy data import tools
- Demo data seeding

### 4.8 User Authentication and Authorization

**Authentication Features:**
- User registration with email/password
- Login with email/password
- JWT token-based authentication
- Session management
- Password hashing with bcrypt
- Rate limiting on login attempts

**Authorization:**
- Role-based access (user/admin)
- Account-based data isolation
- Demo account protection
- Protected routes

**User Management:**
- User profiles
- Account management
- Password change functionality
- Admin user management

### 4.9 Portfolio Summary and Dashboard

**Portfolio Overview:**
- Total portfolio value
- Combined monthly/annual cash flow
- Average cap rate
- Property count
- Total equity

**Property List:**
- Property cards with key metrics
- Quick access to property details
- Property filtering and sorting
- Property search

**Quick Actions:**
- Add new property
- View property details
- Access analytics
- Manage mortgages

### 4.10 Additional Features

**Onboarding Flow:**
- New user wizard
- Step-by-step property setup
- Financial data entry
- File upload for property data

**Settings Management:**
- Dark mode toggle
- User preferences
- Account settings
- Display preferences

**Calendar & Tasks:**
- Rent collection dates
- Maintenance schedules
- Important dates tracking

**Admin Features:**
- User management
- Demo account management
- Data import tools
- System administration

---

## 5. Database Schema

### 5.1 Database Tables

**Users Table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Accounts Table:**
```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    is_demo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Properties Table:**
```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    nickname VARCHAR(255),
    address TEXT,
    purchase_price DECIMAL(15, 2),
    purchase_date DATE,
    closing_costs DECIMAL(15, 2) DEFAULT 0,
    renovation_costs DECIMAL(15, 2) DEFAULT 0,
    initial_renovations DECIMAL(15, 2) DEFAULT 0,
    current_market_value DECIMAL(15, 2),
    year_built INTEGER,
    property_type VARCHAR(100),
    size DECIMAL(10, 2),
    unit_config VARCHAR(255),
    property_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Mortgages Table:**
```sql
CREATE TABLE mortgages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    lender VARCHAR(255),
    original_amount DECIMAL(15, 2),
    interest_rate DECIMAL(5, 4),
    rate_type VARCHAR(50),
    term_months INTEGER,
    amortization_years INTEGER,
    payment_frequency VARCHAR(50),
    start_date DATE,
    mortgage_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Expenses Table:**
```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    expense_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Sessions Table:**
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Events Table:**
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_type VARCHAR(100),
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Key Data Models

**Property Model:**
- Core fields: nickname, address, purchase price, dates
- Financial: purchase price, market value, costs
- Physical: size, type, unit configuration
- Extended: JSONB field for flexible data

**Mortgage Model:**
- Core: lender, amounts, rates, dates
- Terms: amortization, term length, frequency
- Extended: JSONB for additional mortgage data

**Account Model:**
- User association
- Demo account flag
- Account name and email

### 5.3 Database Relationships

- **Users → Accounts:** One-to-many (one user can have multiple accounts)
- **Accounts → Properties:** One-to-many (one account can have multiple properties)
- **Properties → Mortgages:** One-to-many (one property can have multiple mortgages)
- **Properties → Expenses:** One-to-many (one property can have many expenses)
- **Users → Sessions:** One-to-many (one user can have multiple sessions)

### 5.4 Indexes

Performance indexes on:
- `accounts.user_id`
- `properties.account_id`
- `mortgages.property_id`
- `expenses.property_id`
- `expenses.date`
- `sessions.user_id`
- `sessions.expires_at`
- `users.email`

### 5.5 Database Migrations

Migration files in `/migrations/`:
- `001_initial_schema.sql` - Initial table creation
- `002_add_indexes.sql` - Performance indexes
- `003_add_admin_field.sql` - Admin user support
- `004_add_events_table.sql` - Events/calendar feature
- `005_add_mortgage_not_null_constraints.sql` - Data integrity
- `005_add_user_hours.sql` - User activity tracking

---

## 6. API Endpoints

### 6.1 Authentication Endpoints

**POST /api/auth/login**
- Authenticate user with email/password
- Returns JWT token and user data
- Rate limited: 5 attempts per 15 minutes per IP
- Validates input with Zod schema

**POST /api/auth/register**
- Create new user account
- Validates email format and password strength
- Hashes password with bcrypt
- Rate limited to prevent abuse

**POST /api/auth/logout**
- Invalidate current session
- Clear session from database

**GET /api/auth/user**
- Get current authenticated user
- Returns user profile including admin status

**POST /api/auth/change-password**
- Change user password
- Requires current password verification

### 6.2 Property CRUD Operations

**GET /api/properties**
- List all properties for authenticated user
- Supports pagination
- Optional filtering by accountId
- Auto-seeds demo properties if needed

**POST /api/properties**
- Create new property
- Validates input with Zod schema
- Verifies account ownership
- Prevents demo account modification

**GET /api/properties/[id]**
- Get single property details
- Includes related mortgages and expenses

**PUT /api/properties/[id]**
- Update property information
- Validates ownership
- Prevents demo modification

**DELETE /api/properties/[id]**
- Delete property
- Cascades to mortgages and expenses
- Prevents demo deletion

**POST /api/properties/bulk-upload**
- Import multiple properties from file
- Supports CSV and Excel formats
- Validates and processes in batch

### 6.3 Mortgage Management Endpoints

**GET /api/mortgages**
- List mortgages for user's properties
- Filtered by property if specified

**POST /api/mortgages**
- Create new mortgage
- Associates with property
- Validates mortgage data

**GET /api/mortgages/[id]**
- Get mortgage details
- Includes amortization schedule

**PUT /api/mortgages/[id]**
- Update mortgage information

**DELETE /api/mortgages/[id]**
- Delete mortgage

**POST /api/mortgages/calculate**
- Calculate mortgage payment
- Returns payment amount and schedule

**POST /api/mortgages/prepayment**
- Analyze prepayment scenarios
- Calculates impact on amortization

**POST /api/mortgages/refinance**
- Analyze refinancing opportunities
- Compares current vs. new mortgage

**GET /api/mortgages/[id]/download**
- Download amortization schedule
- Returns PDF or Excel format

### 6.4 Analytics and Calculation Endpoints

**GET /api/analytics/portfolio**
- Aggregate portfolio metrics
- Calculates totals and averages

**GET /api/analytics/property/[id]**
- Property-specific analytics
- Financial calculations and projections

**POST /api/analytics/forecast**
- Generate financial forecast
- 10-year projection with assumptions

**POST /api/analytics/sensitivity**
- Sensitivity analysis calculations
- Compares scenarios

### 6.5 Account Management Endpoints

**GET /api/accounts**
- List user's accounts
- Includes demo accounts if applicable

**POST /api/accounts**
- Create new account
- Associates with authenticated user

**GET /api/accounts/[id]**
- Get account details
- Includes property count and metrics

**PUT /api/accounts/[id]**
- Update account information

**DELETE /api/accounts/[id]**
- Delete account
- Cascades to properties

### 6.6 Admin Endpoints

**GET /api/admin/dashboard**
- Admin dashboard statistics
- User counts, property counts, etc.

**GET /api/admin/users**
- List all users
- Paginated results

**POST /api/admin/users/[id]/toggle-demo**
- Toggle demo account status

**POST /api/admin/create-admin-user**
- Create admin user account

**POST /api/admin/import-properties**
- Bulk import properties
- Admin-only operation

**POST /api/admin/run-migration**
- Execute database migration
- Admin-only operation

### 6.7 Demo Endpoints

**GET /api/demo**
- Get demo account data
- Public read-only access
- Auto-seeds if empty

**GET /api/demo/diagnose**
- Diagnose demo account issues
- Debugging tool

### 6.8 API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 6.9 API Security

- **Authentication:** JWT tokens required for protected routes
- **Authorization:** Account ownership verification
- **Rate Limiting:** Login and registration endpoints
- **Input Validation:** Zod schemas for all inputs
- **SQL Injection Protection:** Tagged template literals
- **CORS:** Configured for production domain
- **Security Headers:** Set in next.config.mjs

---

## 7. User Interface & Components

### 7.1 Main Pages and Routes

**Public Pages:**
- `/` - Homepage with features and CTA
- `/login` - Login page
- `/signup` - Registration page

**Authenticated Pages:**
- `/portfolio-summary` - Main dashboard
- `/my-properties` - Property list and management
- `/my-properties/[propertyId]` - Property detail page
- `/analytics` - Analytics and forecasting tools
- `/mortgage-calculator` - Mortgage calculation tools
- `/calculator` - General calculator tools
- `/settings` - User settings
- `/onboarding` - New user onboarding flow

**Admin Pages:**
- `/admin` - Admin dashboard

**Special Pages:**
- `/test` - Testing utilities
- `/test-bonzai` - Bonzai-specific tests
- `/import-properties` - Property import tool

### 7.2 Key React Components

**Layout Components:**
- `Layout.jsx` - Main app layout with sidebar
- `Sidebar.jsx` - Navigation sidebar
- `Footer.jsx` - Site footer
- `ErrorBoundary.jsx` - Error handling

**Property Components:**
- `AddPropertyModal.jsx` - Add new property form
- Property detail components
- Property list components

**Mortgage Components:**
- `MortgageFormUpgraded.jsx` - Mortgage input form
- `PropertyMortgages.jsx` - Mortgage list
- `MortgagePaymentCalculator.jsx` - Payment calculator
- `RefinanceCalculator.jsx` - Refinance analysis
- `MortgageBreakPenaltyCalculator.jsx` - Break penalty calculator
- Amortization schedule components

**Analytics Components:**
- `AssumptionsPanel.jsx` - Assumptions input
- `BaselineForecast.jsx` - Forecast chart
- `SensitivityDashboard.jsx` - Comparison dashboard
- `YoYAnalysis.jsx` - Year-over-year analysis
- `SavedScenariosPanel.jsx` - Scenario management
- `SaveScenarioModal.jsx` - Save scenario dialog

**Calculator Components:**
- `MortgageCalculator.jsx` - Main mortgage calculator
- `BreakEvenAnalysis.jsx` - Break-even calculations
- `CapitalFlowSankey.jsx` - Cash flow visualization

**Onboarding Components:**
- `OnboardingWizard.jsx` - Multi-step wizard
- `PropertyForm.jsx` - Property input form
- `FinancialDataStep.jsx` - Financial data entry
- `FileUploadZone.jsx` - File upload component
- `StepIndicator.jsx` - Progress indicator

**Shared Components:**
- `Button.jsx` - Reusable button component
- `Input.jsx` - Form input component
- `SelectInput.jsx` - Select dropdown
- `DateInput.jsx` - Date picker
- `AuthModals.jsx` - Login/signup modals
- `SettingsModal.jsx` - Settings dialog
- `MyAccountModal.jsx` - Account management

**Chart Components:**
- `AnnualExpenseChart.jsx` - Expense visualization
- Recharts-based chart components

### 7.3 UI/UX Patterns and Design System

**Design Tokens:**
- Color palette defined in `design-tokens.js`
- Primary color: `#205A3E` (green)
- Dark mode support throughout

**Typography:**
- Font families: Geist Sans, Geist Mono, Plus Jakarta Sans
- Responsive font sizes
- Clear hierarchy

**Component Patterns:**
- Card-based layouts
- Modal dialogs for forms
- Toast notifications for feedback
- Loading states with skeletons
- Error states with helpful messages

**Responsive Design:**
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Adaptive layouts
- Touch-friendly interactions

**Dark Mode:**
- System preference detection
- Manual toggle in settings
- Persistent user preference
- Smooth transitions
- Proper contrast ratios

### 7.4 Form Handling and Validation

**Form Libraries:**
- React Hook Form for form state
- Zod for schema validation
- Custom validation utilities

**Validation Patterns:**
- Client-side validation
- Server-side validation via API
- Real-time error feedback
- Accessible error messages

**Form Components:**
- Reusable input components
- Date pickers
- Select dropdowns
- File upload zones
- Multi-step wizards

---

## 8. Financial Calculations

### 8.1 Cash Flow Calculations

**Monthly Cash Flow:**
```
Monthly Cash Flow = Monthly Rent - Monthly Operating Expenses - Monthly Mortgage Payment
```

**Annual Cash Flow:**
```
Annual Cash Flow = Annual Rent - Annual Operating Expenses - Annual Mortgage Payments
```

**Implementation:** `src/utils/financialCalculations.js`

### 8.2 NOI (Net Operating Income) Calculations

**NOI Formula:**
```
NOI = Annual Rent - Annual Operating Expenses
```

**Operating Expenses Include:**
- Property taxes
- Insurance
- Maintenance and repairs
- Property management fees
- Utilities (if paid by owner)
- Other operating costs

**Excludes:**
- Mortgage payments (principal and interest)
- Capital expenditures
- Income taxes

**Implementation:** `src/utils/financialCalculations.js`

### 8.3 IRR (Internal Rate of Return) Calculations

**IRR Method:**
- Newton-Raphson iterative method
- Finds discount rate where NPV = 0
- Handles division by zero edge cases
- Maximum 1000 iterations
- Tolerance: 0.000001

**Cash Flow Array:**
- Negative values for investments (purchase, renovations)
- Positive values for returns (rent, sale proceeds)

**Implementation:** `src/lib/sensitivity-analysis.js:calculateIRR()`

**Recent Fixes:**
- Added guard against division by zero
- Handles NaN and Infinity cases
- Improved convergence for edge cases

### 8.4 Cash-on-Cash Return Calculations

**Formula:**
```
Cash-on-Cash Return = Annual Cash Flow / Total Cash Invested × 100%
```

**Total Cash Invested Includes:**
- Down payment
- Closing costs
- Initial renovations
- Other upfront costs

**Implementation:** `src/utils/financialCalculations.js`

### 8.5 Cap Rate Calculations

**Formula:**
```
Cap Rate = NOI / Property Value × 100%
```

**Uses:**
- Current market value or purchase price
- Annual NOI

**Implementation:** `src/utils/financialCalculations.js`

### 8.6 Mortgage Amortization Calculations

**Canadian Standard Formula:**
```
P = L × [c(1+c)^n] / [(1+c)^n - 1]
```

Where:
- P = Payment amount
- L = Loan amount
- c = Periodic interest rate
- n = Number of payments

**Semi-Annual Compounding:**
- Canadian mortgages use semi-annual compounding
- Periodic rate calculated from annual rate

**Payment Frequencies:**
- Monthly: 12 payments/year
- Semi-monthly: 24 payments/year
- Bi-weekly: 26 payments/year
- Accelerated Bi-weekly: 26 payments/year (monthly/2)
- Weekly: 52 payments/year
- Accelerated Weekly: 52 payments/year (monthly/4)

**Implementation:**
- `src/lib/mortgage-calculations.js`
- `src/utils/mortgageCalculator.ts`

### 8.7 Year-over-Year (YoY) Analysis

**YoY Calculations:**
- Compare metrics year-to-year
- Calculate growth rates
- Identify trends
- Track improvements/declines

**Metrics Tracked:**
- Cash flow growth
- NOI changes
- Expense trends
- Rent increases

**Implementation:** `src/components/calculators/YoYAnalysis.jsx`

### 8.8 Canadian-Specific Financial Calculations

**Land Transfer Tax (LTT):**
- Ontario Provincial LTT (tiered brackets)
- Toronto Municipal LTT (additional tiered brackets)
- Calculated based on purchase price
- Supports manual override

**LTT Brackets (2024 rates):**
- 0.5% on first $55,000
- 1.0% on $55,001 - $250,000
- 1.5% on $250,001 - $400,000
- 2.0% on amounts over $400,000

**Implementation:** `src/utils/financialCalculations.js:calculateLandTransferTax()`

### 8.9 Sensitivity Analysis Algorithms

**10-Year Forecast Generation:**
- Projects cash flows for 10 years
- Applies assumptions annually:
  - Rent increases
  - Expense inflation
  - Vacancy adjustments
  - Interest rate changes (on renewal)

**Equity Projection:**
- Models property appreciation
- Tracks principal paydown
- Calculates total equity growth
- Exit cap rate for sale value

**Scenario Comparison:**
- Baseline vs. adjusted assumptions
- Side-by-side metrics
- Visual indicators
- Key insights generation

**Implementation:** `src/lib/sensitivity-analysis.js:generateForecast()`

**Recent Fixes:**
- Added null checks for mortgages
- Validates property data before calculations
- Handles properties without mortgages
- Improved error handling

### 8.10 Calculation Accuracy and Validation

**Precision:**
- Financial calculations rounded to 2 decimal places
- Currency values stored as DECIMAL(15,2) in database
- Interest rates stored as DECIMAL(5,4)

**Validation:**
- Input validation before calculations
- Range checks for rates and percentages
- Null/undefined checks
- Type validation

**Testing:**
- Test files for key calculations
- Validation against known results
- Edge case handling

---

## 9. Authentication & Security

### 9.1 Authentication Method

**JWT-Based Authentication:**
- JSON Web Tokens for stateless authentication
- Tokens stored in localStorage
- Token expiration: 7 days
- Refresh mechanism via session validation

**Token Structure:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "iat": timestamp,
  "exp": timestamp
}
```

**Implementation:**
- `src/lib/auth.ts` - Token generation and verification
- `src/lib/jwt-utils.ts` - JWT utilities
- `src/lib/auth-middleware.ts` - Request authentication

### 9.2 User Registration and Login Flow

**Registration Flow:**
1. User submits email, password, name (optional)
2. Server validates input (Zod schema)
3. Checks for existing email
4. Hashes password with bcrypt
5. Creates user record
6. Returns success response
7. Redirects to onboarding

**Login Flow:**
1. User submits email and password
2. Server validates input
3. Rate limiting check (5 attempts per 15 min)
4. Fetches user from database
5. Verifies password with bcrypt
6. Generates JWT token
7. Creates session record
8. Returns token and user data
9. Client stores token in localStorage
10. Redirects to portfolio summary or admin

**Implementation:**
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/context/AuthContext.js`

### 9.3 Password Hashing and Security Measures

**Password Hashing:**
- bcryptjs library
- Salt rounds: 10 (default)
- One-way hashing (cannot be reversed)

**Password Requirements:**
- Minimum length validation
- Strength requirements (via Zod schema)
- Secure storage (never stored in plain text)

**Session Management:**
- Sessions stored in database
- Token hashing for storage
- Expiration tracking
- Automatic cleanup of expired sessions

**Implementation:**
- `src/lib/auth.ts:hashPassword()`
- `src/lib/auth.ts:verifyPassword()`
- `src/lib/auth.ts:createSession()`

### 9.4 Protected Routes and Middleware

**Route Protection:**
- `RequireAuth` component wrapper
- Checks for authentication token
- Redirects to login if not authenticated
- Preserves intended destination

**API Middleware:**
- `authenticateRequest()` function
- Validates JWT token
- Extracts user information
- Returns 401 if invalid

**Admin Protection:**
- `requireAdmin()` middleware
- Checks `is_admin` flag
- Returns 403 if not admin

**Implementation:**
- `src/context/AuthContext.js:RequireAuth`
- `src/lib/auth-middleware.ts`
- `src/lib/admin-middleware.ts`

### 9.5 Security Headers

**Next.js Security Headers (next.config.mjs):**
- `Strict-Transport-Security`: HSTS enforcement
- `X-Frame-Options`: Clickjacking protection
- `X-Content-Type-Options`: MIME type sniffing prevention
- `X-XSS-Protection`: XSS protection
- `Referrer-Policy`: Referrer information control
- `Permissions-Policy`: Feature access control

### 9.6 Rate Limiting

**Login Endpoint:**
- 5 attempts per 15 minutes per IP
- Returns 429 status when exceeded
- Includes retry-after header

**Registration Endpoint:**
- Rate limited to prevent abuse
- IP-based tracking

**Implementation:**
- `src/lib/rate-limit.ts`
- In-memory rate limiting (can be upgraded to Redis)

### 9.7 Input Validation

**Client-Side:**
- React Hook Form validation
- Zod schema validation
- Real-time error feedback

**Server-Side:**
- Zod schema validation on all API routes
- Type checking
- Sanitization where needed

**SQL Injection Protection:**
- Tagged template literals (Neon SQL)
- Parameterized queries
- No string concatenation

**Implementation:**
- `src/lib/validations/*.schema.ts` - Zod schemas
- `src/lib/validate-request.ts` - Validation utility

### 9.8 Demo Account Protection

**Demo Account Features:**
- Read-only access for public demo
- Prevents modifications via API
- Special handling in property routes
- Auto-seeding of demo data

**Implementation:**
- `src/lib/demo-protection.ts`
- `preventDemoModification()` function
- Checks `is_demo` flag on accounts

---

## 10. Recent Implementations & Fixes

### 10.1 Recent Feature Additions

**Sensitivity Analysis Tool (Completed):**
- 10-year financial forecasting
- Adjustable assumptions panel
- Real-time calculation updates
- Baseline vs. adjusted comparison
- IRR, cash flow, and profit calculations
- Color-coded feedback
- Property selector
- Responsive design
- Dark mode support

**Save Scenarios Feature (Completed):**
- Save scenario button in assumptions panel
- Save scenario modal with validation
- Saved scenarios panel with list view
- Load saved scenarios
- Delete scenarios with confirmation
- Current scenario indicator
- LocalStorage persistence
- Per-property scenario organization

**Equity Analysis Mode (Completed):**
- Separate equity-focused analysis
- Property appreciation modeling
- Equity growth projections
- Exit cap rate calculations

**Year-over-Year Analysis (Completed):**
- YoY comparison component
- Growth trend tracking
- Visual indicators

### 10.2 Bug Fixes and Improvements

**Critical Fixes (From Codebase Audit):**

1. **Missing Null Checks for Mortgage Calculations**
   - Added validation for properties without mortgages
   - Prevents crashes when mortgage data is missing
   - Handles rental-only or paid-off properties
   - Location: `src/lib/sensitivity-analysis.js`

2. **Division by Zero Risk in IRR Calculation**
   - Added guard against division by zero
   - Handles edge cases with invalid rate calculations
   - Improved convergence for difficult cash flow patterns
   - Location: `src/lib/sensitivity-analysis.js:calculateIRR()`

3. **Missing Error Boundaries**
   - Implemented proper React Error Boundary
   - Catches errors in provider tree
   - User-friendly error UI
   - Location: `src/components/ErrorBoundary.jsx`

4. **Inconsistent Interest Rate Handling**
   - Normalized interest rate format
   - Documented expected format (decimal 0-1)
   - Consistent conversion throughout codebase

5. **Missing Validation for Edge Cases**
   - Added input validation in forecast generation
   - Validates negative rates
   - Handles missing property values
   - Better error messages

### 10.3 Performance Optimizations

**TanStack Query Optimization:**
- Increased stale times for real estate data
- Properties/Mortgages: 30 minutes (was 5 minutes)
- Expenses: 5 minutes
- Analytics: 1 minute
- Reduces unnecessary API calls by ~80%

**Component Optimization:**
- Identified 91 client components for potential conversion
- Static content can be Server Components
- Reduced initial bundle size potential: 15-20%

**Database Query Optimization:**
- Added indexes on foreign keys
- Indexed frequently queried fields (email, dates)
- Query batching opportunities identified

### 10.4 Code Quality Improvements

**Type Safety:**
- TypeScript integration for new code
- Gradual migration from JavaScript
- Type definitions for API responses

**Code Organization:**
- Separated concerns (calculations, UI, API)
- Reusable utility functions
- Consistent naming conventions

**Documentation:**
- Code comments for complex calculations
- README files for major features
- API documentation in route files

### 10.5 Technical Debt Addressed

**Database Migration:**
- Migration from localStorage to PostgreSQL
- Data migration utilities
- Backward compatibility during transition

**Error Handling:**
- Consistent error response format
- User-friendly error messages
- Proper error logging

**Testing Infrastructure:**
- Test files for calculations
- Validation scripts
- Manual testing guides

---

## 11. Known Issues & Technical Debt

### 11.1 Current Known Bugs or Limitations

**Database Naming:**
- Some database tables may still reference `proplytics_test`
- Should be migrated to `bonzai_test` eventually
- Not critical but should be addressed

**Mortgage Calculations:**
- Semi-monthly payment frequency calculations need verification
- Variable rate mortgages need better prime rate integration
- Some edge cases in payment date calculations for non-monthly frequencies

**Validation:**
- Missing validation for term vs. amortization period relationship
- Term should not exceed amortization period for Canadian mortgages

**Performance:**
- N+1 query pattern in some API routes
- Can be optimized with query batching
- Not critical but impacts scalability

### 11.2 Areas Requiring Improvement

**Error Handling:**
- Some API routes lack comprehensive error handling
- Error messages could be more user-friendly
- Need better error logging and monitoring

**Testing:**
- Limited automated test coverage
- Need unit tests for calculations
- Integration tests for API routes
- E2E tests for critical user flows

**Documentation:**
- Some complex calculations need better documentation
- API documentation could be more comprehensive
- User guides needed for advanced features

**Accessibility:**
- Some components may need ARIA labels
- Keyboard navigation could be improved
- Screen reader support needs verification

### 11.3 Code Quality Concerns

**TypeScript Migration:**
- Mixed JavaScript and TypeScript
- Gradual migration in progress
- Some files still need type definitions

**Component Size:**
- Some components are large and could be split
- Better component composition needed
- Reusability could be improved

**State Management:**
- Some prop drilling could be reduced
- Consider additional context providers
- Better separation of server and client state

### 11.4 Performance Bottlenecks

**Bundle Size:**
- Initial bundle could be smaller
- Code splitting opportunities
- Tree shaking optimization

**Database Queries:**
- Some routes make multiple sequential queries
- Could be optimized with joins or batching
- Caching strategy could be improved

**Rendering:**
- Some components re-render unnecessarily
- React.memo opportunities
- useMemo/useCallback optimization needed

### 11.5 Migration Needs

**Database Table Naming:**
- Migrate from `proplytics_test` to `bonzai_test`
- Update all references
- Create migration script

**Legacy Code:**
- `proplytics-app/` subdirectory should be removed
- Legacy backup code cleanup
- Remove unused dependencies

**Environment Variables:**
- Document all required environment variables
- Create .env.example file
- Validate on startup

---

## 12. Development Workflow

### 12.1 Setup and Installation Instructions

**Prerequisites:**
- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Git

**Installation Steps:**

1. **Clone/Navigate to Project:**
   ```bash
   cd "/Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React"
   ```

2. **Verify Location:**
   ```bash
   pwd
   # Should show: /Users/stu/Documents/Bonzai Real Estate App/Active Project/Bonzai-React
   
   grep '"name"' package.json
   # Should show: "name": "bonzai-app",
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Set Up Environment Variables:**
   Create `.env.local` file:
   ```env
   POSTGRES_URL=your_neon_database_url
   JWT_SECRET=your_jwt_secret_key
   NEXT_PUBLIC_BYPASS_PROVIDERS=false
   ```

5. **Run Database Migrations:**
   ```bash
   # Migrations are run automatically or via admin route
   # Or manually execute SQL files in /migrations/
   ```

6. **Start Development Server:**
   ```bash
   npm run dev
   ```

7. **Open Application:**
   - Navigate to http://localhost:3000

### 12.2 Development Commands

**Available Scripts:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests (currently runs lint)

### 12.3 Testing Approach

**Current Testing:**
- Manual testing guides in documentation
- Test calculation files in root directory
- Validation scripts

**Test Files:**
- `test_calculation_fixes.js`
- `test_irr_calculation.js`
- `test_yoy_calculations.js`
- `test_canadian_calc.js`
- Various other test files

**Future Testing Needs:**
- Unit tests with Jest/Vitest
- Integration tests for API routes
- E2E tests with Playwright/Cypress
- Calculation validation tests

### 12.4 Code Organization Patterns

**File Naming:**
- Components: PascalCase (e.g., `PropertyCard.jsx`)
- Utilities: camelCase (e.g., `financialCalculations.js`)
- API routes: kebab-case (e.g., `change-password/route.ts`)

**Component Structure:**
- One component per file
- Co-located styles (Tailwind classes)
- Props interface at top of file
- Exported as default

**API Route Structure:**
- One route handler per file
- HTTP methods as named exports
- Validation at start of handler
- Consistent error handling

**Utility Functions:**
- Pure functions where possible
- Well-documented with JSDoc
- Type-safe with TypeScript
- Testable and isolated

### 12.5 Documentation Structure

**Project Documentation:**
- `README.md` - Project overview
- `AGENT_START_HERE.md` - Critical project identification
- `QUICK_START_GUIDE.md` - Quick reference
- Feature-specific guides (e.g., `SENSITIVITY_ANALYSIS_GUIDE.md`)

**Code Documentation:**
- JSDoc comments for functions
- Inline comments for complex logic
- README files for major features
- API documentation in route files

**User Documentation:**
- Feature guides
- Calculation explanations
- Testing guides

---

## 13. Project Context & History

### 13.1 Project Evolution

**Original Project: Proplytics**
- Originally named "Proplytics"
- Real estate investment management platform
- Similar feature set to current Bonzai

**Rebranding to Bonzai:**
- Project renamed from "Proplytics" to "Bonzai"
- Package name changed to `bonzai-app`
- All branding updated
- API routes use "bonzai" naming

**Legacy Locations:**
- Old Proplytics project archived
- Should not be accessed or modified
- Legacy code in `proplytics-app/` subdirectory (backup only)

### 13.2 Key Milestones

**Initial Development:**
- Core property management features
- Basic financial calculations
- User authentication
- Database schema design

**Feature Additions:**
- Mortgage calculator and management
- Sensitivity analysis tool
- Scenario planning
- Analytics dashboard
- Year-over-year analysis

**Recent Improvements:**
- Codebase audit and fixes
- Performance optimizations
- Error handling improvements
- Documentation updates

### 13.3 Important Decisions and Rationale

**Technology Choices:**
- **Next.js:** Full-stack framework, SSR, API routes
- **Neon PostgreSQL:** Serverless, scalable, managed
- **TanStack Query:** Excellent caching and synchronization
- **React 19:** Latest features, performance improvements

**Architecture Decisions:**
- **JWT Authentication:** Stateless, scalable
- **React Context:** Simple global state management
- **Component Composition:** Reusable, maintainable
- **API Routes:** Backend in same codebase

**Database Design:**
- **JSONB Fields:** Flexibility for extended data
- **Cascade Deletes:** Data integrity
- **Indexes:** Query performance
- **UUID Primary Keys:** Distributed system friendly

### 13.4 Future Roadmap Considerations

**Potential Enhancements:**
- Mobile app (React Native)
- Advanced reporting and exports
- Integration with accounting software
- Property valuation APIs
- Automated expense categorization
- Document storage and management
- Multi-currency support
- Tax reporting features

**Technical Improvements:**
- Complete TypeScript migration
- Comprehensive test coverage
- Performance monitoring
- Error tracking (Sentry)
- Analytics integration
- CI/CD pipeline

**User Experience:**
- Improved onboarding flow
- Better mobile responsiveness
- Enhanced data visualization
- More calculation tools
- Better help documentation

---

## Conclusion

Bonzai is a comprehensive real estate investment management platform with a solid foundation and active development. The application provides institutional-grade financial analysis tools for independent landlords and real estate investors. With features including property management, mortgage calculations, sensitivity analysis, and scenario planning, Bonzai helps users make data-driven investment decisions.

The codebase demonstrates good architectural decisions, modern technology choices, and a focus on user experience. Ongoing improvements address performance, code quality, and feature enhancements. The project is well-positioned for continued growth and development.

---

**Document Generated:** January 2025  
**Last Updated:** Based on codebase analysis as of January 2025  
**Version:** 1.0
