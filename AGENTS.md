# AGENTS.md

## Purpose

This repository is the MyBills application starter. Keep it ready for a local-first
bills workflow that runs as a React web app and a Capacitor Android app.

## Working Rules

- Read the relevant feature, shared service, and layout files before editing.
- Keep unfinished product ideas out of the shell until requirements are stated.
- Put business behavior inside `src/features`.
- Put platform and persistence boundaries inside `src/shared`.
- Keep data local for now and access browser `localStorage` through shared storage modules.
- Use Capacitor notification helpers instead of calling plugin APIs from feature UI.
- Do not commit Android keystores, signing properties, passwords, or generated secrets.
- Keep Android signing able to read local signing properties or CI environment variables.

## Project Layout

- `src/app`: application composition and top-level wiring
- `src/components/layout`: shared header and footer shell
- `src/features`: user-facing modules
- `src/shared/storage`: current local storage adapters
- `src/shared/notifications`: Capacitor notification adapters
- `src/styles`: global styling
- `android`: generated Capacitor Android project

## Commands

```powershell
npm install
npm run dev
npm run build
npm run android:add
npm run android:icons
npm run android:sync
npm run android:open
npm run android:release
```

## Verification

- Run `npm run build` after frontend or shared-module changes.
- Run `npm run android:sync` after Capacitor config or plugin changes.
- Check Android signing changes against the example signing properties file.
- Test notification permission and probe scheduling on an Android build when reminders change.
