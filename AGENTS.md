# AGENTS.md

## Project overview

Vanilla JavaScript single-page app (Financial Records Management System for ADSWD, Karnataka).
No build system, no framework, no Node.js toolchain.

## Development

- There is no `package.json`, so there are no `npm install`, build, test, lint, or typecheck commands. Do not look for or run them.
- `index.html` is the only entry point. Serve the repo root with any static server (e.g. `python3 -m http.server`, VS Code Live Server); ES modules require HTTP, not `file://`.
- Deployed to Vercel (https://adswd-frms.vercel.app/) as static hosting of the repo root.
- CDNs are loaded at runtime: Firebase SDK (ESM from `gstatic.com`), jsPDF, html2canvas, SheetJS. Do not install these via npm.

## Architecture

Layer-separated plain ES modules under `js/`:

- `services/` - data and state (Firebase/Auth wrappers, records CRUD, app state, config)
- `features/` - per-domain business logic and UI (auth, cashbook, reports, admin, settings, etc.)
- `ui/` - generic UI primitives (`toast.js`, `bindings.js`)
- `utils/` - pure helpers (`format.js`)

### Key patterns (match these when adding code)

- **Registry for cross-feature calls:** feature modules must not import each other directly (causes circular imports). Instead they write/read shared functions through the `api` object in `js/services/registry.js`.
- **Event delegation:** do not use inline `onclick`. All DOM events flow through `data-action` attributes dispatched centrally in `js/ui/bindings.js`.
- **i18n:** user-facing strings live in `js/features/i18n.js` for English, Kannada (`kn`), and Hindi (`hi`), applied via `data-i18n` / `data-i18n-placeholder` attributes. Add new copy everywhere it is needed.
- **Styling tokens:** all colors, spacing, radius, shadows are CSS custom properties in `styles/main.css`. Do not hardcode raw values inline.
- **Persistence:** Cloud Firestore is the primary store with an automatic fallback to localStorage (via `js/services/storage-service.js`) when Firestore is unreachable. Both paths must keep working.

## Design references

- `DESIGN-MANIFEST.json` and `DESIGN-HANDOFF.md` are AI design-handoff artifacts - use as reference for design intent and tokens, not as runtime config.
- Validate UI changes across the responsive viewport matrix in `DESIGN-HANDOFF.md` (360px up to 1920px), preserving design fidelity.
