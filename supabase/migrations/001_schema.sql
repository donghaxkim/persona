-- supabase/migrations/001_schema.sql

-- Core Tables
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
  status           text not null default 'pending' check (status in ('pending','accepted','rejected')),
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
  status            text not null default 'pending' check (status in ('pending','generating_frame','animating','verifying','ready','failed')),
  failure_reason    text,
  storage_path      text,
  thumbnail_path    text,
  consistency_score numeric(4,2),
  created_at        timestamptz default now()
);
create index idx_videos_influencer on public.videos(influencer_id);

create table public.pipeline_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  influencer_id   uuid not null references public.influencers(id) on delete cascade,
  video_id        uuid references public.videos(id) on delete set null,
  current_step    int not null default 1 check (current_step between 1 and 5),
  status          text not null default 'active' check (status in ('active','completed','failed','abandoned')),
  step_data       jsonb not null default '{}',
  created_at      timestamptz default now(),
  completed_at    timestamptz
);
create index idx_pipeline_user on public.pipeline_runs(user_id);

create table public.generation_jobs (
  id                     uuid primary key default gen_random_uuid(),
  pipeline_run_id        uuid not null references public.pipeline_runs(id) on delete cascade,
  step                   int not null check (step between 1 and 5),
  status                 text not null default 'pending' check (status in ('pending','processing','completed','failed')),
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

create table public.roster_order (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  order_data  jsonb not null default '[]',
  folders     jsonb not null default '[]',
  updated_at  timestamptz default now()
);

-- RLS policies
alter table public.influencers enable row level security;
create policy "own_influencers" on public.influencers for all using (user_id = auth.uid());

alter table public.reference_images enable row level security;
create policy "own_references" on public.reference_images for all using (influencer_id in (select id from public.influencers where user_id = auth.uid()));

alter table public.videos enable row level security;
create policy "own_videos" on public.videos for all using (influencer_id in (select id from public.influencers where user_id = auth.uid()));

alter table public.pipeline_runs enable row level security;
create policy "own_pipelines" on public.pipeline_runs for all using (user_id = auth.uid());

alter table public.generation_jobs enable row level security;
create policy "own_jobs" on public.generation_jobs for all using (pipeline_run_id in (select id from public.pipeline_runs where user_id = auth.uid()));

alter table public.roster_order enable row level security;
create policy "own_roster" on public.roster_order for all using (user_id = auth.uid());
