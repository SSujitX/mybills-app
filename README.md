# MyBills

MyBills is a React, Vite, and Capacitor Android app for tracking local-first bill
renewals, expiries, and payment reminders.

## Stack

- React for the UI
- Vite for web development and bundling
- Capacitor Android for the native shell
- Browser `localStorage` behind a small storage boundary for the current data phase
- Capacitor Local Notifications for Android reminder plumbing

## Quick Start

From the project root, install dependencies once:

```powershell
npm install
```

Start the local Vite development server:

```powershell
npm run dev
```

The terminal prints the local URL after the server starts. Open that URL in a
browser to use the web version while developing.

## Commands

### Web

Run the development server:

```powershell
npm run dev
```

Create the production web bundle in `dist/`:

```powershell
npm run build
```

Preview the latest production web bundle locally:

```powershell
npm run preview
```

### Android

Create the Capacitor Android project once when `android/` does not exist:

```powershell
npm run android:add
```

Build the web bundle and sync the latest Capacitor assets/plugins into Android:

```powershell
npm run android:sync
```

Open the Android project in Android Studio:

```powershell
npm run android:open
```

Build a signed release APK after release signing is configured:

```powershell
npm run android:release
```

For daily Android UI work, run `npm run android:sync` after web or Capacitor
changes, then run the app from Android Studio.

## Signing

Android release signing is configured from `android/keystore/signing.properties`
or these environment variables:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Copy `android/keystore/signing.properties.example` after the Android folder is generated.
Keep the real keystore file and real signing properties out of Git.

## Project Map

```text
src/
  app/                         App composition
  components/layout/           Shared header and footer
  features/bills/              Recurring bill ledger and local bill storage
  shared/notifications/        Capacitor notification boundary
  shared/storage/              Current local storage boundary
  styles/                      Global application styling
```

## Current Workflow

- Add multiple bill entries with title, details, price, currency, bought date, and next expiry date.
- Edit or delete any saved bill from the expiry rail.
- Store bills locally for now.
- Notification plumbing is prepared for reminders before and after a bill date.

Keep future business rules inside feature folders and route persistence or native
behavior through `src/shared` boundaries so implementations can change without
spreading platform details through the UI.
