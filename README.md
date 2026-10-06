# Guru Fitness Health Club

Guru Fitness OS is a premium gym management system prototype for a local gym owner. The project is intentionally structured so it can evolve from a strong front-end demo into a production SaaS product for multiple gyms.

## What is included
- Dashboard with business metrics and attendance overview
- QR attendance workflow with demo controls
- Duplicate attendance prevention
- Member directory and profile details
- Membership renewal flow
- Payments and settings screens
- Modern responsive UI tailored for desktop, tablet, and mobile
- Production-ready architecture notes for future Supabase and auth integration

## Local demo mode
This app currently runs in local mock mode by default so it works immediately without a backend or credentials.

A production-ready path is prepared via:
- [src/config/appConfig.js](src/config/appConfig.js)
- [src/services/dataService.js](src/services/dataService.js)
- [src/services/supabaseService.js](src/services/supabaseService.js)
- [docs/production-architecture.md](docs/production-architecture.md)
- [.env.example](.env.example)

## Install and run

```bash
cd /Users/shivamkirankhalane/guru-fitness
npm install
npm run dev -- --host 0.0.0.0
```

Open the app at:

```text
http://localhost:5173/
```

## Demo flow
1. Open Dashboard
2. Click Scan QR
3. Select Rahul Patil
4. Mark attendance
5. Scan Rahul again to confirm duplicate prevention
6. Simulate expired member and renew them
7. Add a new member from the Members page

## Project structure
- src/App.jsx — main app and business flows
- src/components — reusable UI pieces like sidebar, stats cards, avatar, toast
- src/data/mockData.js — sample members, payments, gym settings
- src/utils/gymLogic.js — status logic and attendance helpers
- src/services — mock data and future production service interfaces
- docs/production-architecture.md — production architecture blueprint

## Future production upgrades
- Replace mock data layer with Supabase tables and auth
- Add real QR camera scanner using a browser barcode library
- Add real photo uploads to Supabase Storage
- Add permissions and staff roles
- Add automation and notifications
- Deploy on Vercel and configure environment secrets

## Environment variables
Copy [.env.example](.env.example) to a real local `.env` file when you are ready to enable production integrations.

## Security note
No real secrets or credentials are committed to this project. This prototype is intentionally designed to be safe for local demonstration.
