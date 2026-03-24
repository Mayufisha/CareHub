# CareHub Mobile React Native

React Native mobile client for CareHub, connected to `CareHub.Api` JWT auth and role-based API routes.

## Implemented Features

- Auth/session
  - Login via `POST /api/auth/login`
  - Session validation via `GET /api/auth/me`
  - Token + user persistence in AsyncStorage
  - `Admin` role blocked from mobile login
- Dashboard
  - Live role-aware metrics for residents, medications, and observations
  - Manual refresh and loading/error states
- Residents
  - List view with search and pull-to-refresh
- Observations
  - List view with filter and pull-to-refresh
  - Create observation flow for `Nurse` and `General CareStaff`
- Medications
  - List view with search, stock visibility, and pull-to-refresh
- MAR (Nurse)
  - View recent MAR entries
  - Create MAR entries
  - Void MAR entries
  - Filter entries and optional include-voided toggle
- Medication Orders (Nurse)
  - List orders
  - Create order
  - Update status transitions (`Requested -> Ordered -> Received` and cancel flow)
- AI (Nurse)
  - Shift summary
  - Detect trends
  - Care query
  - Trend explain (3-day and 7-day options)

## Current Role Matrix

- `Admin`
  - Not allowed on mobile
- `Nurse`
  - `Dashboard`, `Residents`, `Observations`, `Medications`, `MAR`, `Orders`, `AI`
- `General CareStaff`
  - `Dashboard`, `Residents`, `Observations`
- `Observer`
  - `Dashboard`, `Observations`, `Medications`

## API Base URL Configuration

Configured in `src/services/apiClient.js`:

- Android emulator default: `http://10.0.2.2:5007/api`
- iOS/default fallback: `http://localhost:5007/api`
- Optional override: `CAREHUB_API_BASE_URL`

## Run

1. `npm install`
2. `npm run start`
3. `npm run android` or `npm run ios`

## Known Gaps

1. Mobile is still not full parity with desktop for all workflows.
2. No dedicated automated role regression suite yet.
3. Android environment/toolchain stability may vary by local setup.
