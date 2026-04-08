# Persona — Backend System Design

## Context

Persona is a video generation tool for AI influencers. The frontend shell is built (Next.js + Zustand + shadcn/ui). This spec covers the backend: API layer, database, storage, generation pipeline orchestration, and auth. The goal is a working backend for ~100 active users that replaces all mock/simulated behavior with real infrastructure.

---

## Stack

- **Next.js API Routes** (on Vercel) — API layer, server-side orchestration
- **Supabase** — Postgres (DB), Auth (email + social), Storage (images + videos)
- **Kie.ai** — Unified generation API (Kling, Runway, Veo, Flux Kontext, Nano-Banana)
- **Replicate** — CLIP model for reference image classification
- **face-api.js** — Client-side face embedding and consistency scoring (WASM, no server GPU)

---

## Functional Requirements

1. **Auth** — Sign up, sign in, sign out via Supabase Auth. Email + social login.
2. **Influencer CRUD** — Create, read, update, delete. Scoped to authenticated user via RLS.
3. **Reference image management** — Upload to Supabase Storage, classify angle/expression/framing synchronously via Replicate CLIP, store metadata in Postgres.
4. **Video generation pipeline** — 5-step orchestrated flow via Kie.ai. Each step is an async job tracked in a `pipeline_runs` + `generation_jobs` schema. Resumable across sessions.
5. **Video storage** — Generated videos stored in Supabase Storage. Metadata (prompt, template, consistency score) in Postgres.
6. **Roster organization** — Folder grouping and ordering persisted per-user as JSONB with optimistic concurrency.
7. **Mock analytics** — Retained as client-side seeded-random. No real analytics infra for beta.
8. **Face consistency** — Client-side via face-api.js. No backend involvement.

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|---|---|---|
| CRUD latency | <200ms p95 | Supabase Postgres + RLS, simple queries |
| Generation throughput | 5–10 concurrent jobs | Kie.ai handles compute; we orchestrate |
| Storage per user | ~2GB (refs + videos) | Supabase Pro: 100GB total |
| Availability | 99.5% | Vercel + Supabase SLAs |
| Data isolation | Per-user via RLS | No user sees another's data |
| Max references | 30 per influencer | Spec constraint |
| Max video size | ~50MB (10s 1080p) | Supabase Storage limit: 50MB/file (free) |
| Rate limiting | 1 active pipeline run per user | Prevents runaway Kie.ai costs |

---

## High-Level Architecture

```
┌─────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│   Browser    │────▶│  Next.js on Vercel        │────▶│  Supabase    │
│   (React)    │◀────│                            │◀────│  - Postgres  │
│              │     │  /api/influencers/*        │     │  - Auth      │
│  face-api.js │     │  /api/references/*         │     │  - Storage   │
│  (WASM)      │     │  /api/pipeline/:runId      │     │              │
│              │     │  /api/webhooks/kie         │     └──────────────┘
└─────────────┘     └──────────┬─────────────────┘
                                │
                     ┌──────────▼──────────────────┐
                     │         Kie.ai API           │
                     │  (Kling, Runway, Veo, Flux)  │
                     └──────────┬──────────────────┘
                                │
                     ┌──────────▼──────────────────┐
                     │       Replicate API          │
                     │  (CLIP for classification)   │
                     └─────────────────────────────┘
```

**Key principle:** The client never talks to Kie.ai or Replicate directly. All external API calls go through Next.js API routes. API keys live in Vercel environment variables only.

---

## Database Schema

### Core Tables

```sql
-- Users come from Supabase Auth (auth.users)

create table influencers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  niche           text not null default '',
  avatar_gradient text,
  avatar_initial  text,
  created_at      timestamptz default now()
);

create table reference_images (
  id               uuid primary key default gen_random_uuid(),
  influencer_id    uuid not null references influencers(id) on delete cascade,
  storage_path     text not null,
  thumbnail_path   text not null,
  angle            text check (angle in ('front','three-quarter','side','back')),
  expression       text check (expression in ('neutral','smile','serious')),
  framing          text check (framing in ('close-up','mid-shot','full-body')),
  status           text not null default 'pending'
                   check (status in ('pending','accepted','rejected')),
  rejection_reason text,
  created_at       timestamptz default now()
);

create table videos (
  id                uuid primary key default gen_random_uuid(),
  influencer_id     uuid not null references influencers(id) on delete cascade,
  pipeline_run_id   uuid,  -- FK added after pipeline_runs table
  prompt            text not null,
  template          text not null,
  duration          int not null,
  resolution        text not null default '1080p',
  status            text not null default 'pending'
                    check (status in ('pending','generating_frame','animating',
                                      'verifying','ready','failed')),
  failure_reason    text,
  storage_path      text,
  thumbnail_path    text,
  consistency_score numeric(4,2),
  created_at        timestamptz default now()
);
```

### Pipeline Tables

```sql
create table pipeline_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  influencer_id   uuid not null references influencers(id) on delete cascade,
  video_id        uuid references videos(id) on delete set null,
  current_step    int not null default 1 check (current_step between 1 and 5),
  status          text not null default 'active'
                  check (status in ('active','completed','failed','abandoned')),
  step_data       jsonb not null default '{}',
  -- Stores outputs from each completed step:
  -- { "1": { "selected_face_url": "..." },
  --   "2": { "grid_url": "..." },
  --   "3": { "video_url": "...", "duration": 10 },
  --   "4": { "composite_url": "..." },
  --   "5": { "animation_url": "...", "score": 0.94 } }
  created_at      timestamptz default now(),
  completed_at    timestamptz
);

create table generation_jobs (
  id              uuid primary key default gen_random_uuid(),
  pipeline_run_id uuid not null references pipeline_runs(id) on delete cascade,
  step            int not null check (step between 1 and 5),
  status          text not null default 'pending'
                  check (status in ('pending','processing','completed','failed')),
  kie_task_id     text,
  input_data      jsonb,
  output_data     jsonb,
  error_message   text,
  retry_count     int default 0,
  estimated_completion timestamptz,
  created_at      timestamptz default now(),
  completed_at    timestamptz
);

-- Add FK from videos back to pipeline_runs
alter table videos add constraint fk_pipeline_run
  foreign key (pipeline_run_id) references pipeline_runs(id) on delete set null;
```

### Roster Table

```sql
create table roster_order (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  order_data  jsonb not null default '[]',
  folders     jsonb not null default '[]',
  updated_at  timestamptz default now()  -- optimistic concurrency
);
```

### Row-Level Security

```sql
-- Every table: users see only their own data
alter table influencers enable row level security;
create policy "own_influencers" on influencers
  for all using (user_id = auth.uid());

alter table reference_images enable row level security;
create policy "own_references" on reference_images
  for all using (
    influencer_id in (select id from influencers where user_id = auth.uid())
  );

alter table videos enable row level security;
create policy "own_videos" on videos
  for all using (
    influencer_id in (select id from influencers where user_id = auth.uid())
  );

alter table pipeline_runs enable row level security;
create policy "own_pipelines" on pipeline_runs
  for all using (user_id = auth.uid());

alter table generation_jobs enable row level security;
create policy "own_jobs" on generation_jobs
  for all using (
    pipeline_run_id in (select id from pipeline_runs where user_id = auth.uid())
  );

alter table roster_order enable row level security;
create policy "own_roster" on roster_order
  for all using (user_id = auth.uid());
```

---

## API Routes

### Collapsed Surface

```
/api/
  influencers/
    GET    /                → list user's influencers (with ref counts, video counts)
    POST   /                → create influencer
    PATCH  /:id             → update name/niche
    DELETE /:id             → read storage paths → delete storage → delete rows
  references/
    POST   /upload          → upload to Storage → classify via Replicate CLIP (sync) → return result
    DELETE /:id             → delete from Storage + DB
  pipeline/
    POST   /                → create new pipeline run (validates: user has no active run)
    GET    /:runId          → get pipeline state (current step, all step outputs, active job status)
    POST   /:runId/advance  → advance to next step (validates ordering, calls Kie.ai)
    PATCH  /:runId/retry    → retry failed step (validates retry_count < 3)
    DELETE /:runId          → abandon pipeline run
  webhooks/
    POST   /kie             → Kie.ai callback (HMAC verified)
  roster/
    GET    /                → get roster order + folders + updated_at
    PUT    /                → save (rejects if updated_at doesn't match)
```

### Auth Middleware

Every route except `/api/webhooks/kie` requires a valid Supabase session. The middleware:
1. Reads the `sb-access-token` from the request header
2. Calls `supabase.auth.getUser(token)` to verify
3. Passes `user.id` to the route handler
4. Returns 401 if invalid

### Webhook Security

`POST /api/webhooks/kie` is unauthenticated (Kie.ai calls it). Security:
1. Kie.ai signs the payload with an HMAC (SHA-256) using a shared secret
2. The webhook route reads the `X-Kie-Signature` header
3. Computes `HMAC(secret, raw_body)` and compares against the signature
4. Rejects with 403 if mismatch
5. Shared secret stored in `KIE_WEBHOOK_SECRET` env var

---

## Deep Dive: Generation Pipeline Flow

### Starting a Pipeline

```
Client: POST /api/pipeline { influencerId }
Server:
  1. Verify user owns this influencer
  2. Check no active pipeline_run exists for this user (rate limit)
  3. Create pipeline_runs row (status=active, current_step=1)
  4. Create videos row (status=pending, linked to pipeline_run)
  5. Return { runId, videoId }
```

### Advancing a Step

```
Client: POST /api/pipeline/:runId/advance { stepInputs }
Server:
  1. Verify user owns this pipeline_run
  2. Verify run.status === 'active'
  3. Verify step ordering: stepInputs.step === run.current_step
  4. For step > 1: verify previous step output exists in run.step_data
  5. Create generation_jobs row (step, status=pending)
  6. Build Kie.ai request:
     - Step 1 (face): prompt + reference images → Kie.ai face generation
     - Step 2 (grid): selected face + pose prompt → Kie.ai grid generation
     - Step 3 (motion): client uploads a reference video file → store in Storage → no Kie.ai call, just confirm and advance (this step is user-provided input, not AI-generated)
     - Step 4 (composite): face + video keyframe → Kie.ai face swap
     - Step 5 (animate): composite + motion → Kie.ai video animation
  7. Call Kie.ai with webhook_url = /api/webhooks/kie
  8. Store kie_task_id in job row
  9. Set estimated_completion based on step (step 5: now+45s, others: now+5s)
  10. Return { jobId, estimatedCompletion }
```

### Webhook Callback

```
Kie.ai: POST /api/webhooks/kie { task_id, status, result_url, ... }
Server:
  1. Verify HMAC signature
  2. Find generation_job by kie_task_id
  3. If Kie status === 'completed':
     a. Download result from Kie.ai result_url
     b. Upload to Supabase Storage
     c. Update job (status=completed, output_data={storage_path, thumbnail_path})
     d. Update pipeline_run.step_data with step output
     e. If step === 5: update video status to 'ready', set consistency_score, pipeline status to 'completed'
     f. Else: increment pipeline_run.current_step
  4. If Kie status === 'failed':
     a. Update job (status=failed, error_message)
     b. If retry_count < 3: leave pipeline active for client retry
     c. Else: mark pipeline and video as failed
```

### Client Polling

```
Client: GET /api/pipeline/:runId (every N seconds)
Server returns:
  {
    runId, status, currentStep,
    stepData: { 1: {...}, 2: {...}, ... },
    activeJob: { id, step, status, estimatedCompletion } | null
  }

Client polling strategy:
  - If activeJob exists and estimatedCompletion is in the future:
      nextPoll = max(1s, (estimatedCompletion - now) / 2)
  - If activeJob exists and estimatedCompletion is past:
      exponential backoff: 1s → 2s → 3s → 5s cap
  - If no activeJob: stop polling (step completed, waiting for user action)
```

### Pipeline Resumability

When a user opens the Create tab:
1. Client calls `GET /api/pipeline?influencerId=X&status=active`
2. If an active run exists, restore the pipeline UI from `step_data`
3. If the active run has a pending/processing job, resume polling
4. The pipeline state lives in the DB, not in React state — tab close doesn't lose progress

---

## Deep Dive: Reference Image Upload + Classification

### Upload Flow

```
Client: POST /api/references/upload (multipart: file + influencerId)
Server:
  1. Verify user owns this influencer
  2. Verify influencer has < 30 reference images
  3. Validate file: must be image/*, 512px+ dimensions, <10MB
  4. Resize to 800px (medium) and 200px (thumbnail) via sharp
  5. Upload both to Supabase Storage:
     - references/{influencerId}/{imageId}/medium.jpg
     - references/{influencerId}/{imageId}/thumb.jpg
  6. Call Replicate CLIP classification (synchronous, ~1-2s):
     - Input: medium image URL
     - Output: { angle, expression, framing, quality_score }
  7. If quality_score < threshold: status=rejected, reason="Low quality"
  8. Else: status=accepted, store classification
  9. Insert reference_images row
  10. Return full image record to client
```

Total latency: ~2-3 seconds (upload + resize + classify). Well within Vercel's 60s Pro timeout.

---

## Deep Dive: Influencer Deletion + Storage Cleanup

Cascade deletion must clean up Supabase Storage before rows are deleted:

```
Client: DELETE /api/influencers/:id
Server:
  1. Verify user owns this influencer
  2. BEGIN TRANSACTION
  3. Query all storage_path, thumbnail_path from reference_images WHERE influencer_id = :id
  4. Query all storage_path, thumbnail_path from videos WHERE influencer_id = :id
  5. Query all pipeline_runs WHERE influencer_id = :id (for any intermediate storage)
  6. DELETE FROM influencers WHERE id = :id (cascades to refs, videos, jobs, pipeline_runs)
  7. COMMIT
  8. Bulk delete all collected storage paths from Supabase Storage (fire-and-forget, outside transaction)
```

Storage deletion is outside the transaction because Storage operations can't roll back with Postgres. If storage deletion fails, we have orphaned files but no orphaned DB rows — a manageable state. A periodic cleanup job (Supabase pg_cron) can sweep orphaned storage paths if needed.

---

## Deep Dive: Roster Optimistic Concurrency

```
Client: PUT /api/roster { orderData, folders, lastUpdatedAt }
Server:
  1. SELECT updated_at FROM roster_order WHERE user_id = auth.uid()
  2. If lastUpdatedAt !== row.updated_at:
       Return 409 Conflict { currentData, updatedAt }
       Client shows "Roster was updated in another tab. Refresh to see changes."
  3. Else:
       UPDATE roster_order SET order_data = $1, folders = $2, updated_at = now()
       Return 200 { updatedAt: new timestamp }
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side only, for admin operations

# Kie.ai
KIE_API_KEY=kie_...                # server-side only
KIE_WEBHOOK_SECRET=whsec_...       # for HMAC verification

# Replicate
REPLICATE_API_TOKEN=r8_...         # server-side only

# App
NEXT_PUBLIC_APP_URL=https://persona.vercel.app  # for webhook callback URLs
```

`NEXT_PUBLIC_` vars are exposed to the client (Supabase SDK needs them). All others are server-side only — Vercel enforces this by not bundling non-NEXT_PUBLIC_ vars into the client build.

---

## Implementation Sequence

1. **Supabase setup** — Create project, run schema migrations, enable RLS, configure Auth providers
2. **Auth integration** — Supabase Auth in the Next.js app, middleware for API routes, session management
3. **Influencer CRUD API** — Routes + Supabase client, replace Zustand localStorage with DB calls
4. **Reference upload + classification** — Storage upload, sharp resize, Replicate CLIP, replace mock validation
5. **Pipeline orchestration** — pipeline_runs + generation_jobs tables, /api/pipeline routes, Kie.ai integration
6. **Webhook handler** — HMAC verification, job status updates, storage management
7. **Frontend refactor** — Replace Zustand persist with server state (React Query or SWR), polling for pipeline status
8. **Roster persistence** — Save/load roster order from DB with optimistic concurrency
9. **Deletion cleanup** — Transaction-based storage cleanup on influencer delete
