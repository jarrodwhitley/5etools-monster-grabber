# Architecture

This extension uses Manifest V3 with a split runtime architecture:

- `vite.config.mjs`: Vite + CRX build configuration for dev and production.

- `manifest.json`: Extension entry points, permissions, and URL matches.
- `popup.html`: Popup UI shell.
- `app.css`: Shared popup styles.
- `options.html`: Options page shell.
- `options.css`: Options page styling.
- `src/popup/main.js`: Popup controller logic and active-tab status messaging.
- `src/options/main.js`: Options page controller and storage sync.
- `src/content/main.js`: Content script injected into 5etools pages; injects the Copy JSON button and handles extraction/transformation.
- `scripts/package-extension.sh`: Builds a release zip in `dist/`.

## Runtime Flow

1. User opens a creature on 5etools.
2. Content script injects `Copy JSON` into the stat tabs area.
3. User clicks `Copy JSON`.
4. Script opens source JSON, transforms schema to Shieldmaiden format, copies output to clipboard, and reports non-loadable properties.
5. Popup provides contextual status/help text.

## Why This Layout

- Keeps popup concerns separate from page-injected code.
- Makes future features easier (download/export, options page, telemetry-free diagnostics).
- Better alignment with Chrome Web Store review expectations around maintainability and least-privilege design.

## Build Workflow

- `npm run dev`: Vite development workflow for extension iteration.
- `npm run build`: Production build output to `dist/`.
- `npm run package`: Builds production output and zips distributable to `artifacts/`.
