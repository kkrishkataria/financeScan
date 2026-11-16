# FinanceScan

FinanceScan is a full-stack personal-finance web application for tracking accounts, income, expenses, budgets, and recurring transactions. It provides authenticated dashboards, account-level activity, receipt scanning with Gemini, and automated background workflows for recurring transactions, monthly reports, and budget alerts.

## Features

- Secure sign-up and sign-in using Clerk
- Multiple current and savings accounts, including a selectable default account
- Income and expense transaction management
- Dashboard with account balances, recent activity, spending overview, and charts
- Account-specific transaction history and bulk deletion
- Budget creation and progress tracking
- Receipt scanning and AI-assisted transaction categorization using Google Gemini
- Recurring transaction scheduling (daily, weekly, monthly, or yearly)
- Automated monthly reports and budget-alert workflows through Inngest
- Transactional email support through Resend
- Responsive UI built with Tailwind CSS, Radix UI, and shadcn-style components

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Actions, Turbopack) |
| UI | React 18, Tailwind CSS, Radix UI, Lucide React, Vaul, Sonner |
| Authentication | Clerk |
| Database and ORM | PostgreSQL (for example, Supabase) and Prisma |
| AI | Google Generative AI (Gemini) |
| Background jobs | Inngest |
| Email | Resend and React Email |
| Forms and validation | React Hook Form, Zod, Hookform Resolvers |
| Data visualization | Recharts |

## Project structure

```text
app/                  Routes, layouts, API endpoints, and page components
app/(auth)/           Clerk sign-in and sign-up pages
app/(main)/           Protected dashboard, account, and transaction pages
actions/              Server Actions for accounts, budgets, transactions, and email
components/           Shared UI and feature components
lib/                  Prisma, Gemini, Inngest, and utility integrations
prisma/               PostgreSQL schema and migrations
emails/               React Email templates
data/                 Landing-page content
public/               Images and other static assets
```

## Requirements

- Node.js 18.18 or newer (Node.js 20 LTS recommended)
- npm
- A PostgreSQL database
- A Clerk application
- A Google Gemini API key for receipt scanning/categorization

Resend and Inngest are needed for their respective production automations.

## Installation

1. Clone the repository and enter the application folder:

   ```bash
   cd financeScan
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` from the example below and supply your own credentials.

4. Apply the database migrations and generate the Prisma client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

   For local schema changes during development, use `npx prisma migrate dev` instead.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Visit [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `financeScan/.env`. Do not commit it; `.env*` is ignored by Git.

```env
# PostgreSQL / Prisma
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Google Gemini
GEMINI_API_KEY="your-gemini-api-key"
# Optional: override the default Gemini model fallback chain
GEMINI_MODEL="gemini-flash-latest"

# Optional: required when sending emails through Resend
RESEND_API_KEY="re_..."
```

`DATABASE_URL` is used by the application; `DIRECT_URL` supports Prisma's direct database connection, which is commonly required when using a pooled database URL.

## Available commands

```bash
# Run the local development server
npm run dev

# Create a production build
npm run build

# Serve an existing production build
npm run start

# Generate the Prisma client
npx prisma generate

# Open Prisma's database browser
npx prisma studio

# Apply development migrations
npx prisma migrate dev

# Apply committed migrations (deployment/CI)
npx prisma migrate deploy

# Run the React Email development preview
npm run email
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/sign-in` | Clerk sign-in flow |
| `/sign-up` | Clerk sign-up flow |
| `/dashboard` | Protected finance dashboard |
| `/account/[id]` | Protected account details and transactions |
| `/transaction/create` | Protected transaction creation and receipt scanning |
| `/api/seed` | Seed endpoint |
| `/api/inngest` | Inngest webhook/function endpoint |

The middleware protects `/dashboard`, `/account/*`, and `/transaction/*` routes with Clerk.

## Data model

Prisma defines these main entities:

- **User**: mirrors the authenticated Clerk user.
- **Account**: current or savings account, balance, and default-account status.
- **Transaction**: income or expense entry, category, receipt, status, and optional recurrence metadata.
- **Budget**: one budget per user, with the date of the most recent alert.

Transactions belong to both a user and an account. Deleting a user cascades to their accounts, transactions, and budget.

## Background automation

The Inngest integration contains functions for processing recurring transactions, triggering recurring transaction checks, generating monthly reports, and checking budget alerts. Point your Inngest development or production environment at:

```text
/api/inngest
```

## Notes for deployment

- Configure every environment variable in the hosting provider.
- Run `npx prisma migrate deploy` as part of deployment before serving traffic.
- Set Clerk's production URLs and redirect settings to your deployed domain.
- Configure Inngest to reach `https://your-domain/api/inngest`.
- Add a verified sending domain in Resend before enabling production email.

## License

No license has been specified for this project. Add a `LICENSE` file before distributing it publicly.
