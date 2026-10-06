# Guru Fitness OS – Architecture and Delivery Plan

## Overview
This project is designed as a premium gym operating system prototype for local deployment while preserving a clear path to production. The first phase is intentionally local-only and uses mock data and local state so the product can be demonstrated immediately without backend setup.

## Current status
- Frontend: React + Vite
- Styling: custom premium UI, responsive layout
- Data layer: local mock data with a service abstraction
- QR workflow: demo simulation with camera-ready abstraction
- Production path: Supabase-ready interfaces and environment variables documented

## Production architecture
### Recommended stack
- Frontend: React + Vite
- Database: PostgreSQL via Supabase
- Auth: Supabase Auth
- Storage: Supabase Storage for member photos
- Hosting: Vercel
- QR scanning: @zxing/browser or html5-qrcode
- Charts: Recharts or similar
- PDFs: jsPDF or html2canvas + jsPDF

## Required production rules
- Store each record under a gym_id
- Use Row Level Security in Supabase
- Keep auth server-side only
- Never expose service role keys in client code
- Validate all important operations on the backend
- Maintain audit logs for sensitive actions
- Do not allow expired member attendance without explicit permission and audit trail

## Data domains
- gym
- staff
- roles
- permissions
- members
- memberships
- membership_freezes
- attendance
- payments
- receipts
- leads
- follow_ups
- notifications
- automations
- expenses
- audit_logs

## Security checklist
- No secrets in frontend code
- No raw database errors shown to staff users
- No direct user-controlled gym_id accepted from the browser
- Photos saved to object storage, not embedded in database records
- Member privacy respected in QR tokens
- Duplicate attendance enforced at the database level

## Phase plan
1. Inspect existing prototype and preserve active flows
2. Upgrade design system and structure for premium product feeling
3. Prepare mock-mode service architecture and production-ready interfaces
4. Add Supabase-ready data abstraction and environment contracts
5. Extend modules for members, memberships, attendance, payments, CRM, and communications
6. Harden security and performance
7. Add tests, build validation, and deployment setup

## Demo mode vs production mode
The app intentionally keeps a demo mode for local development. This allows the gym owner to demonstrate the product without camera access or database setup. Production mode should replace mock data services with Supabase calls, secure auth, and real QR scanning.
