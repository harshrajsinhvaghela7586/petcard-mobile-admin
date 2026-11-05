# PetCard Admin Console Update

## Included
- Replaced the bundled backend with the newer `backend_merged(2).zip` backend, preserving its latest controllers, routes, models, services, configuration, scripts, docs and tests.
- Expanded the Next.js admin navigation into grouped operational areas:
  - Overview, users, pets, guardian requests, guardian membership access and pending guardian invites
  - Health records / due reminders, tasks and task completion history
  - Reward wallets, reward ledger, referrals, achievements, user and pet rankings
  - Sticker/avatar catalog, sticker purchase history, notifications and admin audit log
- Added custom in-app modal dialogs for create, edit, delete, revoke, approval, reward adjustment and grant actions. No `window.alert`, `window.confirm` or `window.prompt` is used in the dashboard.
- Added server-backed list pagination and filters. Search waits for 2 seconds after the last keystroke before calling the API.
- Added manual referral reward action using `POST /api/admin/referrals/:id/reward`. The backend uses an idempotent reward-ledger key, so the same referral cannot be paid twice.
- Added guardian membership revocation and guardian invite revocation actions.
- Added sticker ownership / purchase history endpoint at `GET /api/admin/catalog/ownership`.
- Added avatar frame ownership snapshot endpoint at `GET /api/admin/pets/frames`.
- Pet detail view displays level, XP, streak, unlocked frame keys and active frame.

## Important data-model boundaries
- Sticker ownership records exist in `StickerOwnership`; the new admin endpoint lists those purchases and the user who owns each sticker.
- The current `Pet` schema stores `unlockedFrameKeys` and `activeFrameKey`, but it does not store a separate timestamped frame-unlock event for each frame. The new frame page therefore shows the current pet/user unlock snapshot and does not invent unlock timestamps.
- Health records include vaccination and due-date/reminder fields. The Health & reminders section lists the stored records and supports due-status filters.
- Reminder configuration for tasks is part of each task's reminder object; pet-level reminder settings are visible in pet details.

## Verification performed
- `node --check` passed for all 124 backend JavaScript source, script and test files.
- The backend test command was attempted. It could not fully run in this isolated environment because backend dependencies (`mongoose`, `dotenv`) are not installed here; 24 tests passed, 2 test files failed to load due to missing packages, and one existing care-score assertion failed.
- The admin TypeScript compiler was attempted, but this environment's interrupted dependency install left React / Node type packages incomplete. No TypeScript syntax diagnostics remained; a full Next.js production build still needs to be run after installing dependencies in the project environment.

## Run locally
Backend:
```bash
cd backend
npm install
npm test
npm run dev
```

Admin:
```bash
cd admin
npm install
# Set NEXT_PUBLIC_API_URL in admin/.env.local to the backend API base, e.g. http://localhost:5000/api
npm run dev
```

The admin backend uses the existing secure cookie-based admin session. Configure the backend's allowed origins and cookie settings for the actual admin origin before production deployment.
