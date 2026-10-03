# Workflow Management System

Tender register, stage pipeline, SLA dashboard, action queues, masters and audit trail for the procurement (PM),
finance (FM) and estimation (CEC) workflow.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS (project root, `src/`)
- **Backend:** ASP.NET Core Web API on .NET 10 (`backend/TenderTracker.Api`)

## Run locally

**Prerequisites:** Node.js 20+ and the .NET 10 SDK.

```
npm run setup
npm run dev
```

Use `npm run setup` rather than a plain `npm install`. Some Windows antivirus behaviour monitors (seen with
Quick Heal) freeze npm for good while it unpacks the ~3,700 tiny icon files in `lucide-react`; the setup script
(`scripts/install-deps.mjs`) unpacks that one package slowly, then runs a normal `npm install` for the rest. It is
safe on every platform. If it still freezes, add the project folder and `%LOCALAPPDATA%\npm-cache` to the
antivirus exclusions, restart the PC to clear frozen `node.exe` processes, delete `node_modules`, and run it again.

`npm run dev` starts both halves and opens the app in your browser:

| What     | URL                   | Started by        |
| -------- | --------------------- | ----------------- |
| Frontend | http://localhost:3000 | `npm run dev:web` |
| API      | http://localhost:5080 | `npm run dev:api` |

The frontend calls `/api/...` on its own origin; Vite proxies those requests to the API (see `vite.config.ts`),
so no CORS setup is needed in development. The first launch takes a few extra seconds while .NET compiles — the app shows a
"Loading…" screen until the API answers.

## API

| Method | Route                   | Purpose                                                              |
| ------ | ----------------------- | -------------------------------------------------------------------- |
| GET    | `/api/health`           | Liveness check                                                       |
| GET    | `/api/users`            | Officer directory (PM / FM / CEC / ADMIN)                            |
| PUT    | `/api/users`            | Replace the officer directory (Masters > Officers / Groups)          |
| GET    | `/api/tenders`          | Full tender register                                                 |
| GET    | `/api/tenders/{srNo}`   | One tender                                                           |
| POST   | `/api/tenders`          | Create a tender (a unique `sr_no` is assigned)                       |
| PUT    | `/api/tenders/{srNo}`   | Save a tender: hand-offs, evaluation movements, cancellation, edits  |
| GET    | `/api/settings`         | Masters and the task list, one JSON value per key                    |
| PUT    | `/api/settings/{key}`   | Save one of them (`stages`, `slaRules`, `groups`, `tasks`, ...)      |

JSON field names are the ones in `src/types.ts` (`sr_no`, `brief_status`, `days_by_role`, ...). The API stores
tenders; the rules (stage hand-off, SLA, working days, evaluation split, who sees what) run in the frontend, in
`src/App.tsx` and `src/utils/tenderUtils.ts`. Fields the API does not read pass through unchanged, so adding a
field to `src/types.ts` needs no backend change.

## Data

- Seed data: `backend/TenderTracker.Api/Data/Seed/users.json` and `tenders.json`.
- Changes are saved to `backend/TenderTracker.Api/App_Data/` (`tenders.json`, `users.json`, `settings.json`),
  so they survive restarts. **Delete that folder to reset to the seed data.**

## Layout

```
src/                         React app (views, components, utils)
src/api/client.ts            Typed fetch client for the backend
src/utils/tenderUtils.ts     Working-day maths, evaluation split, visibility rules
backend/TenderTracker.Api/
  Controllers/               TendersController, UsersController, SettingsController
  Models/                    Tender, TimelineLogEntry, UserProfile
  Services/TenderStore.cs    In-memory store + JSON file persistence
```

`Services/TenderWorkflow.cs`, `Services/DateUtils.cs` and `Models/AdvanceStageRequest.cs` are no longer used
(the frontend took over those rules) and can be deleted.

## Working days

Every duration in the app (days at a stage, days held by each team, total SLA, committee time) counts
working days only. Saturdays, Sundays and public holidays are skipped, so Friday 09:00 to Monday 09:00 is
one day. The holiday list is kept under **Masters > Holidays**; keep it up to date each year. The rule lives in
`workingMsBetween` (`src/utils/tenderUtils.ts`). Stored day counts are recomputed from their dates when tenders
load and whenever the holiday list changes (`normalizeTender`), so older data follows the current list too.

## EMD and BQC evaluation

While a tender is at **Under BQC / Tech Evaluation**, two sub-stages run side by side: EMD Evaluation and BQC
Evaluation (only EMD when the tender is marked "BQC required: NO"). On the tender's Overview tab the tender
creator lists the bidders and sends all or some of them to a finance officer under either sub-stage, at any
time; the finance officer finds the tender in their action queue and returns the bidders after checking.

Time is shared by the bidders each side holds. If Finance holds 2 of 4 bidders for one day under EMD, half a
day of EMD goes to Finance and half to the creator. Because the two sub-stages run in parallel, the stage's
time is the average of the two, so creator time plus finance time always equals the time actually elapsed.
The finance share appears in the Timeline, the stage-wise breakdown and "days by role". The file cannot leave
the stage while Finance still holds bidders. See `computeEvaluationSplit`.

## Who sees file movements

In **Timeline & Audit** and in a tender's Timeline tab, an officer sees only the tenders they work on. A group
leader sees the group's tenders. Only head level (Management, and the Entity, Finance and Estimate heads set
in the masters) sees every tender. See `getAuditVisibleTenders`.

## Deploy

The two halves are hosted separately: the API as a Docker container, the frontend as a static site.

### 1. API on Render (free tier)

1. Sign in at https://render.com with GitHub, choose **New > Blueprint**, and pick this repository.
   Render reads `render.yaml` and builds `backend/TenderTracker.Api/Dockerfile`.
2. When the deploy finishes, open the service URL and add `/api/health`; it should answer `{"status":"ok"}`.
3. Copy the service URL (for example `https://tender-tracker-api.onrender.com`). You will need it in step 2.

Notes:
- The free tier sleeps after 15 minutes without traffic; the first request after that takes about a minute.
- Its disk is not persistent: changes are lost on each deploy or restart and the seed data comes back.
  For shared, durable data move to a paid Render disk, Railway (volumes) or Azure App Service.
- Any host that runs a Dockerfile works the same way (Railway, Fly.io, Azure Container Apps). The app listens
  on the `PORT` the host provides, or 8080.
- To limit which sites may call the API, set the env var `Cors__AllowedOrigins` to a comma-separated list of
  origins (e.g. `https://tender1453.vercel.app`). Unset, any site may call it.

### 2. Frontend on Vercel

1. Sign in at https://vercel.com with GitHub, choose **Add New > Project**, and import this repository.
   Vercel detects Vite; keep the defaults (build `npm run build`, output `dist`).
2. Under **Environment Variables** add `VITE_API_BASE` = the Render URL from step 1 **plus `/api`**, e.g.
   `https://tender-tracker-api.onrender.com/api`.
3. Click **Deploy**. Every later push to `main` deploys again automatically.

If the site shows "We couldn't load your tenders", open **Technical details** on that screen: it names the API
URL it tried. Check that URL answers at `/health`, and that `VITE_API_BASE` was set before the last deploy
(Vercel bakes it into the build, so change it and redeploy).
