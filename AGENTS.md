# AGENTS.md - ADSWD Financial Records Management System

## Project Overview
Plain HTML/JS web app (ES modules) for financial records management. Firebase Auth + Firestore backend, deployed on Vercel. No build step, no package.json.

## Architecture
- **Entry point**: `index.html` (loads `js/main.js` as ES module)
- **Styles**: `styles/main.css` (CSS custom properties for theming)
- **JS structure** (`js/`):
  - `main.js` - wires services & features, bootstraps app
  - `services/` - Firebase, auth, records CRUD, storage, app state, registry
  - `features/` - feature modules (auth-ui, dashboard, cashbook, records-table, reports, i18n, import-export, admin, backup, navigation, settings, theme)
  - `ui/` - bindings, toast
  - `utils/` - format helpers

## Key Commands
- **Dev**: Open `index.html` via live server (e.g., `npx serve .` or VS Code Live Server)
- **Deploy**: Push to GitHub → Vercel auto-deploys (static hosting)
- **No lint/typecheck/test commands** - none configured

## Firebase Config
- `firebase.js` exports initialized `db`, `auth`, and all Firestore/Auth SDK functions
- Project: `adswd-financial-records-341e4`
- Uses Firebase JS SDK v12.6.0 via CDN (ES modules from gstatic.com)
- LocalStorage fallback when Firestore unavailable (`services/storage-service.js`)

## Data Flow
1. `main.js` → `recordsService.loadRecordsFromFirestore()` on auth change
2. Records stored in `state.records` (`services/app-state.js`)
3. CRUD via `records-service.js` (Firestore first, local fallback)
4. UI updates via `api` registry (`services/registry.js`) - loose coupling

## Authentication
- Email/password + Google Sign-In
- Default local users seeded if none exist: `admin`/`admin123`, `staff`/`staff123`
- Role-based UI (admin vs staff)

## Internationalization
- `features/i18n.js` - 3 languages: English (en), Kannada (kn), Hindi (hi)
- `data-i18n` attributes in HTML, `setLanguage(lang)` switches at runtime
- Language persists in localStorage

## Key Features (Pages in index.html)
- Login/Signup/Forgot password
- Dashboard (stats, chart)
- Cash Book Entry (receipts/payments with auto-calc)
- Records table (search, filter, edit, delete)
- Reports (monthly, daily, PDF/Excel export)
- Import Excel/CSV
- Export (all records, monthly)
- Backup/Restore (JSON)
- Admin panel (users, schemes, backup, settings)
- Language settings

## External Dependencies (CDN in index.html)
- html2canvas, jsPDF, jsPDF-autotable (PDF export)
- SheetJS/xlsx (Excel import/export)

## Responsive Requirements
- Test at: 360×800, 390×844, 430×932, 600×960, 820×1180, 1024×768, 1366×768, 1440×900, 1920×1080
- No horizontal overflow at any breakpoint
- See `DESIGN-MANIFEST.json` for full viewport matrix

## Design Contract
- `DESIGN-HANDOFF.md` + `DESIGN-MANIFEST.json` are source of truth for visual fidelity
- Extract tokens from `index.html`/`styles/main.css` before component work
- Preserve all interactive states (hover, focus, disabled, loading, validation)

## Common Gotchas
- **ES modules require HTTP server** - won't work via `file://` protocol
- Firebase API key is exposed in `firebase.js` (expected for client-side Firebase)
- No build step means syntax errors only surface at runtime in browser
- Firestore rules must allow read/write for authenticated users
- `state.firestoreFallbackActive` tracks offline mode