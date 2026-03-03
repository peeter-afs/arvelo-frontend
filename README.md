# Arvelo Frontend

Next.js React frontend application for the Arvelo Estonian bookkeeping software.

## Overview

A modern, responsive web application providing:
- Intuitive bookkeeping interface
- Real-time data visualization
- Document management
- Financial reporting
- Multi-tenant support
- Estonian and English language support

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: Apollo Client, React Query
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **PDF**: React-PDF, jsPDF
- **Icons**: Lucide React

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. Run development server:
```bash
npm run dev
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type checking
npm run type-check
```

## Project Structure

```
app/
├── (auth)/              # Authentication pages
│   ├── login/
│   ├── register/
│   └── reset-password/
├── (dashboard)/         # Main application
│   ├── layout.tsx       # Dashboard layout
│   ├── page.tsx         # Dashboard home
│   ├── accounting/      # Accounting module
│   ├── invoices/        # Invoicing module
│   ├── reports/         # Reports module
│   ├── assets/          # Fixed assets
│   └── settings/        # Settings
├── api/                 # API routes (if needed)
├── layout.tsx           # Root layout
└── globals.css          # Global styles

components/
├── ui/                  # Reusable UI components
├── forms/               # Form components
├── charts/              # Chart components
├── tables/              # Table components
└── layout/              # Layout components

lib/
├── api/                 # API client functions
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── stores/              # Zustand stores
└── validators/          # Zod schemas

public/
├── images/              # Static images
└── locales/             # Translation files
```

## Features

### Dashboard
- Key metrics overview
- Recent transactions
- Cash flow chart
- Quick actions

### Accounting Module
- Chart of accounts management
- Journal entries
- General ledger
- Partner management
- Trial balance

### Invoicing
- Create and edit invoices
- PDF generation
- Email sending
- Payment tracking
- Invoice templates

### Reports
- Balance Sheet
- Profit & Loss Statement
- VAT Report
- General Ledger Report
- Custom date ranges
- Export to PDF/Excel

### Fixed Assets
- Asset register
- Depreciation tracking
- Asset categories
- Disposal management

### Settings
- Company information
- User management
- Tenant settings
- Preferences
- Integrations

## Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/v1/graphql

# Authentication
NEXT_PUBLIC_JWT_SECRET=your-jwt-secret

# Features
NEXT_PUBLIC_ENABLE_PDF_IMPORT=true
NEXT_PUBLIC_ENABLE_BANKING=false

# Analytics (optional)
NEXT_PUBLIC_GA_ID=GA-XXXXXXXXX
```

## UI Components

The application uses a component library based on shadcn/ui:

```tsx
// Example button usage
import { Button } from '@/components/ui/button'

<Button variant="primary" size="lg">
  Create Invoice
</Button>
```

## State Management

Using Zustand for global state:

```tsx
// Example store
import { useAuthStore } from '@/lib/stores/auth'

function Component() {
  const { user, tenant, switchTenant } = useAuthStore()
  // ...
}
```

## Forms

React Hook Form with Zod validation:

```tsx
// Example form
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { invoiceSchema } from '@/lib/validators/invoice'

const form = useForm({
  resolver: zodResolver(invoiceSchema)
})
```

## Internationalization

Support for Estonian and English:

```tsx
import { useTranslation } from '@/lib/i18n'

function Component() {
  const { t } = useTranslation()
  return <h1>{t('dashboard.title')}</h1>
}
```

## Styling

Using Tailwind CSS with custom configuration:

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-semibold text-gray-900">
    Invoice #001
  </h2>
</div>
```

## Performance Optimization

- Image optimization with Next.js Image
- Code splitting with dynamic imports
- React Query for data caching
- Memoization for expensive computations
- Virtual scrolling for large lists

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## Build & Deployment

```bash
# Build for production
npm run build

# Analyze bundle size
npm run analyze

# Docker build
docker build -t arvelo-frontend .

# Docker run
docker run -p 3000:3000 arvelo-frontend
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support

## License

MIT