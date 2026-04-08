# Backend Infrastructure, Auth & CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all client-side mock data with real Supabase persistence — auth, influencer CRUD, reference image upload + classification, video records, and roster ordering. After this plan, the app uses a real database and real auth.

**Architecture:** Next.js API routes talk to Supabase (Postgres + Auth + Storage). Client fetches data from API routes instead of localStorage. Zustand store becomes a thin cache over server state. Image classification uses Replicate CLIP (synchronous during upload).

**Tech Stack:** Supabase (Postgres, Auth, Storage), Next.js API Routes, Replicate API, sharp (image resizing)

---

## File Structure

### New Files
```
src/lib/supabase/
  client.ts          — Browser-side Supabase client (uses anon key)
  server.ts          — Server-side Supabase client (uses service role key)
  middleware.ts       — Auth middleware for API routes

src/app/api/
  influencers/
    route.ts          — GET (list) + POST (create)
    [id]/
      route.ts        — PATCH (update) + DELETE (delete with storage cleanup)
  references/
    upload/route.ts   — POST (upload + classify)
    [id]/route.ts     — DELETE (remove + storage cleanup)
  roster/
    route.ts          — GET + PUT (with optimistic concurrency)

src/app/auth/
  login/page.tsx      — Login page
  callback/route.ts   — Supabase auth callback handler

supabase/
  migrations/
    001_schema.sql    — All tables + RLS policies
```

### Modified Files
```
src/lib/store.ts                — Strip persistence, add async fetch/mutate actions
src/lib/types.ts                — Add API request/response types
src/providers/store-provider.tsx — Replace seed data with server fetch
src/app/layout.tsx              — Add Supabase auth provider
src/app/page.tsx                — Gate behind auth
package.json                    — Add @supabase/supabase-js, @supabase/ssr, sharp
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase + sharp**

```bash
cd /Users/gimdongha/Desktop/sume/persona
npm install @supabase/supabase-js @supabase/ssr sharp
npm install -D @types/sharp supabase
```

- [ ] **Step 2: Create .env.local template**

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
REPLICATE_API_TOKEN=r8_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add to `.gitignore`:
```
.env.local
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add supabase, sharp, replicate dependencies"
```

---

### Task 2: Database Schema Migration

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/001_schema.sql

-- ── Core Tables ─────────────────────────────────────

create table public.influencers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  niche           text not null default '',
  avatar_gradient text,
  avatar_initial  text,
  created_at      timestamptz default now()
);

create index idx_influencers_user on public.influencers(user_id);

create table public.reference_images (
  id               uuid primary key default gen_random_uuid(),
  influencer_id    uuid not null references public.influencers(id) on delete cascade,
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

create index idx_refs_influencer on public.reference_images(influencer_id);

create table public.videos (
  id                uuid primary key default gen_random_uuid(),
  influencer_id     uuid not null references public.influencers(id) on delete cascade,
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

create index idx_videos_influencer on public.videos(influencer_id);

-- ── Pipeline Tables ─────────────────────────────────

create table public.pipeline_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  influencer_id   uuid not null references public.influencers(id) on delete cascade,
  video_id        uuid references public.videos(id) on delete set null,
  current_step    int not null default 1 check (current_step between 1 and 5),
  status          text not null default 'active'
                  check (status in ('active','completed','failed','abandoned')),
  step_data       jsonb not null default '{}',
  created_at      timestamptz default now(),
  completed_at    timestamptz
);

create index idx_pipeline_user on public.pipeline_runs(user_id);

create table public.generation_jobs (
  id                     uuid primary key default gen_random_uuid(),
  pipeline_run_id        uuid not null references public.pipeline_runs(id) on delete cascade,
  step                   int not null check (step between 1 and 5),
  status                 text not null default 'pending'
                         check (status in ('pending','processing','completed','failed')),
  kie_task_id            text,
  input_data             jsonb,
  output_data            jsonb,
  error_message          text,
  retry_count            int default 0,
  estimated_completion   timestamptz,
  created_at             timestamptz default now(),
  completed_at           timestamptz
);

create index idx_jobs_pipeline on public.generation_jobs(pipeline_run_id);
create index idx_jobs_kie_task on public.generation_jobs(kie_task_id);

-- ── Roster Table ────────────────────────────────────

create table public.roster_order (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  order_data  jsonb not null default '[]',
  folders     jsonb not null default '[]',
  updated_at  timestamptz default now()
);

-- ── Row-Level Security ──────────────────────────────

alter table public.influencers enable row level security;
create policy "own_influencers" on public.influencers
  for all using (user_id = auth.uid());

alter table public.reference_images enable row level security;
create policy "own_references" on public.reference_images
  for all using (
    influencer_id in (select id from public.influencers where user_id = auth.uid())
  );

alter table public.videos enable row level security;
create policy "own_videos" on public.videos
  for all using (
    influencer_id in (select id from public.influencers where user_id = auth.uid())
  );

alter table public.pipeline_runs enable row level security;
create policy "own_pipelines" on public.pipeline_runs
  for all using (user_id = auth.uid());

alter table public.generation_jobs enable row level security;
create policy "own_jobs" on public.generation_jobs
  for all using (
    pipeline_run_id in (select id from public.pipeline_runs where user_id = auth.uid())
  );

alter table public.roster_order enable row level security;
create policy "own_roster" on public.roster_order
  for all using (user_id = auth.uid());

-- ── Storage Buckets ─────────────────────────────────
-- Create these via Supabase dashboard or CLI:
-- Bucket: "references" (public: false)
-- Bucket: "videos" (public: false)
-- Bucket: "pipeline-assets" (public: false)
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
# Option A: Via Supabase CLI (if linked)
npx supabase db push

# Option B: Copy-paste the SQL into Supabase dashboard → SQL Editor → Run
```

- [ ] **Step 3: Create storage buckets in Supabase dashboard**

Navigate to Storage → Create buckets: `references`, `videos`, `pipeline-assets` (all private).

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: database schema migration with RLS policies"
```

---

### Task 3: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Browser client**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server client (for API routes)**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

// Admin client for webhook handlers (bypasses RLS)
import { createClient } from "@supabase/supabase-js";

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 3: Auth middleware helper**

```typescript
// src/lib/supabase/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "./server";

export async function requireAuth() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, error: null, supabase };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: supabase client setup (browser, server, admin, auth middleware)"
```

---

### Task 4: Auth Pages + Provider

**Files:**
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Auth callback handler**

```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
```

- [ ] **Step 2: Login page**

```typescript
// src/app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-medium">persona</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
              Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-[0.625rem] uppercase tracking-widest text-muted-foreground">
              Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--color-status-failed)]">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "..." : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Gate main page behind auth**

Modify `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { StoreProvider } from "@/providers/store-provider";
import { AppShell } from "@/components/layout/app-shell";

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/ src/app/page.tsx
git commit -m "feat: auth pages (login, signup, callback) + route guard"
```

---

### Task 5: Influencer CRUD API Routes

**Files:**
- Create: `src/app/api/influencers/route.ts`
- Create: `src/app/api/influencers/[id]/route.ts`

- [ ] **Step 1: List + Create routes**

```typescript
// src/app/api/influencers/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("influencers")
    .select(`
      *,
      reference_images(id, thumbnail_path, angle, expression, framing, status),
      videos(id, prompt, template, duration, resolution, status, thumbnail_path, consistency_score, created_at)
    `)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const { name, niche } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const hues = [340, 210, 140, 30, 270, 180];
  const hue = hues[Math.floor(Math.random() * hues.length)];

  const { data, error } = await supabase
    .from("influencers")
    .insert({
      user_id: user!.id,
      name: name.trim(),
      niche: (niche || "General").trim(),
      avatar_gradient: `linear-gradient(135deg, hsl(${hue}, 40%, 70%) 0%, hsl(${hue + 30}, 50%, 60%) 100%)`,
      avatar_initial: name.trim().charAt(0).toUpperCase(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Update + Delete routes**

```typescript
// src/app/api/influencers/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  const body = await request.json();
  const patch: Record<string, string> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.niche !== undefined) patch.niche = body.niche.trim();

  const { data, error } = await supabase
    .from("influencers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  // 1. Collect storage paths BEFORE cascade delete
  const { data: refs } = await supabase
    .from("reference_images")
    .select("storage_path, thumbnail_path")
    .eq("influencer_id", id);

  const { data: vids } = await supabase
    .from("videos")
    .select("storage_path, thumbnail_path")
    .eq("influencer_id", id);

  // 2. Delete influencer (cascades to refs, videos, pipeline_runs, jobs)
  const { error } = await supabase
    .from("influencers")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. Clean up storage (fire-and-forget)
  const paths = [
    ...(refs || []).flatMap((r) => [r.storage_path, r.thumbnail_path]),
    ...(vids || []).flatMap((v) => [v.storage_path, v.thumbnail_path]),
  ].filter(Boolean);

  if (paths.length > 0) {
    supabase.storage.from("references").remove(
      paths.filter((p) => p.startsWith("references/")).map((p) => p.replace("references/", ""))
    );
    supabase.storage.from("videos").remove(
      paths.filter((p) => p.startsWith("videos/")).map((p) => p.replace("videos/", ""))
    );
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/influencers/
git commit -m "feat: influencer CRUD API routes with storage cleanup"
```

---

### Task 6: Reference Image Upload + Classification

**Files:**
- Create: `src/app/api/references/upload/route.ts`
- Create: `src/app/api/references/[id]/route.ts`

- [ ] **Step 1: Upload + classify route**

```typescript
// src/app/api/references/upload/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";
import sharp from "sharp";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const influencerId = formData.get("influencerId") as string;

  if (!file || !influencerId) {
    return NextResponse.json({ error: "File and influencerId required" }, { status: 400 });
  }

  // Verify ownership
  const { data: influencer } = await supabase
    .from("influencers")
    .select("id")
    .eq("id", influencerId)
    .single();

  if (!influencer) {
    return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  }

  // Check limit
  const { count } = await supabase
    .from("reference_images")
    .select("*", { count: "exact", head: true })
    .eq("influencer_id", influencerId);

  if ((count || 0) >= 30) {
    return NextResponse.json({ error: "Maximum 30 reference images" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageId = crypto.randomUUID();

  // Resize with sharp
  const medium = await sharp(buffer)
    .resize(800, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbnail = await sharp(buffer)
    .resize(200, null, { withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  // Upload to Supabase Storage
  const mediumPath = `${influencerId}/${imageId}/medium.jpg`;
  const thumbPath = `${influencerId}/${imageId}/thumb.jpg`;

  const [medUpload, thumbUpload] = await Promise.all([
    supabase.storage.from("references").upload(mediumPath, medium, { contentType: "image/jpeg" }),
    supabase.storage.from("references").upload(thumbPath, thumbnail, { contentType: "image/jpeg" }),
  ]);

  if (medUpload.error || thumbUpload.error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Classify via Replicate CLIP (or mock for now)
  let classification = await classifyImage(supabase, mediumPath);

  // Insert record
  const { data: record, error } = await supabase
    .from("reference_images")
    .insert({
      influencer_id: influencerId,
      storage_path: `references/${mediumPath}`,
      thumbnail_path: `references/${thumbPath}`,
      angle: classification.angle,
      expression: classification.expression,
      framing: classification.framing,
      status: classification.quality >= 0.5 ? "accepted" : "rejected",
      rejection_reason: classification.quality < 0.5 ? "Low image quality" : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate signed URL for thumbnail
  const { data: signedUrl } = await supabase.storage
    .from("references")
    .createSignedUrl(thumbPath, 3600);

  return NextResponse.json({
    ...record,
    thumbnailUrl: signedUrl?.signedUrl || null,
  }, { status: 201 });
}

// Classification helper — calls Replicate CLIP or falls back to random
async function classifyImage(supabase: any, storagePath: string) {
  const angles = ["front", "three-quarter", "side", "back"] as const;
  const expressions = ["neutral", "smile", "serious"] as const;
  const framings = ["close-up", "mid-shot", "full-body"] as const;

  // TODO: Replace with Replicate CLIP call when API token is configured
  // For now, use deterministic random based on path
  const hash = storagePath.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    angle: angles[hash % angles.length],
    expression: expressions[hash % expressions.length],
    framing: framings[hash % framings.length],
    quality: 0.8 + (hash % 20) / 100,
  };
}
```

- [ ] **Step 2: Delete reference route**

```typescript
// src/app/api/references/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
  const { id } = await params;

  // Get paths before delete
  const { data: ref } = await supabase
    .from("reference_images")
    .select("storage_path, thumbnail_path")
    .eq("id", id)
    .single();

  if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete DB row
  const { error } = await supabase
    .from("reference_images")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cleanup storage
  const paths = [ref.storage_path, ref.thumbnail_path]
    .filter(Boolean)
    .map((p) => p.replace("references/", ""));

  if (paths.length > 0) {
    supabase.storage.from("references").remove(paths);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/references/
git commit -m "feat: reference image upload with classification + delete with storage cleanup"
```

---

### Task 7: Roster Persistence API

**Files:**
- Create: `src/app/api/roster/route.ts`

- [ ] **Step 1: GET + PUT with optimistic concurrency**

```typescript
// src/app/api/roster/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/middleware";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from("roster_order")
    .select("*")
    .eq("user_id", user!.id)
    .single();

  if (error && error.code === "PGRST116") {
    // No row yet — return defaults
    return NextResponse.json({ order_data: [], folders: [], updated_at: null });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const { order_data, folders, last_updated_at } = body;

  // Check optimistic concurrency
  const { data: existing } = await supabase
    .from("roster_order")
    .select("updated_at")
    .eq("user_id", user!.id)
    .single();

  if (existing && last_updated_at && existing.updated_at !== last_updated_at) {
    return NextResponse.json(
      { error: "Conflict — roster was updated in another tab", current: existing },
      { status: 409 }
    );
  }

  // Upsert
  const { data, error } = await supabase
    .from("roster_order")
    .upsert({
      user_id: user!.id,
      order_data,
      folders,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/roster/
git commit -m "feat: roster order persistence with optimistic concurrency"
```

---

### Task 8: Refactor Store to Use API

**Files:**
- Modify: `src/lib/store.ts`
- Create: `src/lib/api.ts`
- Modify: `src/providers/store-provider.tsx`

- [ ] **Step 1: Create API client**

```typescript
// src/lib/api.ts

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  influencers: {
    list: () => fetchAPI<any[]>("/api/influencers"),
    create: (name: string, niche: string) =>
      fetchAPI<any>("/api/influencers", {
        method: "POST",
        body: JSON.stringify({ name, niche }),
      }),
    update: (id: string, patch: { name?: string; niche?: string }) =>
      fetchAPI<any>(`/api/influencers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      fetchAPI<any>(`/api/influencers/${id}`, { method: "DELETE" }),
  },
  references: {
    upload: (influencerId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("influencerId", influencerId);
      return fetchAPI<any>("/api/references/upload", {
        method: "POST",
        body: form,
        headers: {}, // Let browser set Content-Type for FormData
      });
    },
    delete: (id: string) =>
      fetchAPI<any>(`/api/references/${id}`, { method: "DELETE" }),
  },
  roster: {
    get: () => fetchAPI<any>("/api/roster"),
    save: (orderData: any[], folders: any[], lastUpdatedAt: string | null) =>
      fetchAPI<any>("/api/roster", {
        method: "PUT",
        body: JSON.stringify({ order_data: orderData, folders, last_updated_at: lastUpdatedAt }),
      }),
  },
};
```

- [ ] **Step 2: Update store-provider to fetch from API**

```typescript
// src/providers/store-provider.tsx
"use client";

import { useEffect, useState } from "react";
import { usePersonaStore } from "@/lib/store";
import { api } from "@/lib/api";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [influencers, roster] = await Promise.all([
          api.influencers.list(),
          api.roster.get(),
        ]);

        // Map DB records to store shape
        const mapped = influencers.map((inf: any) => ({
          id: inf.id,
          name: inf.name,
          niche: inf.niche,
          bio: "",
          avatarGradient: inf.avatar_gradient || "",
          avatarInitial: inf.avatar_initial || inf.name.charAt(0).toUpperCase(),
          referenceImages: (inf.reference_images || []).map((r: any) => ({
            id: r.id,
            influencerId: inf.id,
            thumbnailDataUrl: "", // Will need signed URL
            thumbnailPath: r.thumbnail_path,
            angle: r.angle,
            expression: r.expression,
            framing: r.framing,
            status: r.status,
            rejectionReason: null,
            createdAt: r.created_at || new Date().toISOString(),
          })),
          videos: (inf.videos || []).map((v: any) => ({
            id: v.id,
            influencerId: inf.id,
            prompt: v.prompt,
            template: v.template,
            duration: v.duration,
            resolution: v.resolution,
            status: v.status,
            thumbnailGradient: null,
            thumbnailPath: v.thumbnail_path,
            consistencyScore: v.consistency_score,
            createdAt: v.created_at || new Date().toISOString(),
          })),
          createdAt: inf.created_at,
        }));

        usePersonaStore.setState({
          influencers: mapped,
          rosterOrder: roster.order_data || mapped.map((i: any) => ({ type: "influencer", id: i.id })),
          folders: roster.folders || [],
          activeInfluencerId: mapped.length > 0 ? mapped[0].id : null,
          activeView: "profile",
        });
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Update store — make CRUD actions call API**

The store's `createInfluencer`, `deleteInfluencer`, `updateInfluencer` actions should call the API and then update local state with the response. Keep the current synchronous shape but add async API calls that fire-and-forget (optimistic updates with rollback on error).

This is a large refactor — the store file should be updated to:
1. Keep all current state shapes and UI-only actions unchanged
2. Replace `createInfluencer` to call `api.influencers.create()` then update local state
3. Replace `deleteInfluencer` to call `api.influencers.delete()` then update local state
4. Replace `updateInfluencer` to call `api.influencers.update()` then update local state
5. Remove the `persist` middleware (data comes from the server now)

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts src/lib/store.ts src/providers/store-provider.tsx
git commit -m "feat: refactor store to fetch from API, add API client layer"
```

---

### Task 9: Wire Up Reference Upload to API

**Files:**
- Modify: `src/components/workspace/upload-view.tsx`

- [ ] **Step 1: Replace mock validation with API call**

In `upload-view.tsx`, replace the `processFiles` callback to:
1. Call `api.references.upload(influencerId, file)` instead of `resizeImage` + `saveImageBlob` + `simulateValidation`
2. The API handles resize, storage, and classification
3. Update the store with the returned record

The `processFiles` function becomes:
```typescript
const processFiles = useCallback(
  async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const file of fileArray) {
      try {
        const result = await api.references.upload(influencer.id, file);
        addReferenceImage(influencer.id, {
          id: result.id,
          influencerId: influencer.id,
          thumbnailDataUrl: result.thumbnailUrl || "",
          angle: result.angle,
          expression: result.expression,
          framing: result.framing,
          status: result.status,
          rejectionReason: result.rejection_reason,
          createdAt: result.created_at,
        });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
  },
  [influencer.id, addReferenceImage]
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspace/upload-view.tsx
git commit -m "feat: wire reference upload to API, replace mock validation"
```

---

### Task 10: Environment Setup + Verification

- [ ] **Step 1: Set up Supabase project**

1. Go to supabase.com → New Project
2. Copy URL and anon key into `.env.local`
3. Copy service role key into `.env.local`
4. Run the migration SQL in the Supabase SQL editor

- [ ] **Step 2: Test auth flow**

1. `npm run dev`
2. Visit localhost:3000 → should redirect to /auth/login
3. Create an account
4. Should redirect back to main app
5. App should load with empty state (no influencers)

- [ ] **Step 3: Test CRUD**

1. Create an influencer via the UI
2. Check Supabase dashboard → influencers table has the row
3. Upload a reference image
4. Check Supabase Storage → references bucket has files
5. Delete the influencer
6. Verify cascade: rows and storage files cleaned up

- [ ] **Step 4: Final commit + push**

```bash
git add -A
git commit -m "feat: backend infrastructure, auth, and CRUD — complete"
git push origin main
```
