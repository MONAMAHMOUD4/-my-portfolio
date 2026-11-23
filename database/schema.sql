-- Portfolio schema for Supabase. Run once in: Supabase Dashboard > SQL Editor > New query > paste > Run.
-- Admin = the single e-mail below. Change it in is_admin() if it ever changes.
create extension if not exists pgcrypto;

create or replace function public.is_admin() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'm8457701@gmail.com'
$$;
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null, email text not null check (email like '%@%'),
  professional_title text not null, created_at timestamptz not null default now());
insert into public.profiles (full_name, email, professional_title)
  select 'Mona Mahmoud Abdelmenem', 'm8457701@gmail.com', 'Software Engineer in Computer Science'
  where not exists (select 1 from public.profiles);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40), created_at timestamptz not null default now());
insert into public.categories (name) values ('HTML'),('CSS'),('JavaScript'),('C++'),('Java'),('Python'),('PHP'),('SQL'),('Database'),('Web Development'),('Others')
  on conflict (name) do nothing;

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 150),
  description text not null default '', course text not null default '',
  category text not null, external_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.assignment_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  file_name text not null, file_type text, file_size bigint not null default 0 check (file_size >= 0),
  storage_path text not null unique, created_at timestamptz not null default now());

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 150),
  description text not null default '', category text not null,
  technologies text[] not null default '{}', thumbnail_path text,
  github_url text check (github_url is null or github_url ~* '^https?://'),
  live_demo_url text check (live_demo_url is null or live_demo_url ~* '^https?://'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null, file_type text, file_size bigint not null default 0 check (file_size >= 0),
  storage_path text not null unique, created_at timestamptz not null default now());

create index if not exists idx_assignments_created on public.assignments (created_at desc);
create index if not exists idx_assignments_course on public.assignments (course);
create index if not exists idx_assignments_category on public.assignments (category);
create index if not exists idx_afiles_assignment on public.assignment_files (assignment_id);
create index if not exists idx_projects_created on public.projects (created_at desc);
create index if not exists idx_projects_category on public.projects (category);
create index if not exists idx_pfiles_project on public.project_files (project_id);

drop trigger if exists trg_assignments_upd on public.assignments;
create trigger trg_assignments_upd before update on public.assignments for each row execute function public.touch_updated_at();
drop trigger if exists trg_projects_upd on public.projects;
create trigger trg_projects_upd before update on public.projects for each row execute function public.touch_updated_at();

-- Row Level Security: everyone reads, only the admin writes.
do $$ declare t text; begin
  foreach t in array array['profiles','categories','assignments','assignment_files','projects','project_files'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop; end $$;

-- Storage buckets (public read; 50 MB per-file cap).
insert into storage.buckets (id, name, public, file_size_limit) values
  ('assignment-files','assignment-files',true,52428800),
  ('project-files','project-files',true,52428800),
  ('project-images','project-images',true,52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "portfolio public read" on storage.objects;
create policy "portfolio public read" on storage.objects for select
  using (bucket_id in ('assignment-files','project-files','project-images'));
drop policy if exists "portfolio admin insert" on storage.objects;
create policy "portfolio admin insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('assignment-files','project-files','project-images') and public.is_admin());
drop policy if exists "portfolio admin update" on storage.objects;
create policy "portfolio admin update" on storage.objects for update to authenticated
  using (bucket_id in ('assignment-files','project-files','project-images') and public.is_admin());
drop policy if exists "portfolio admin delete" on storage.objects;
create policy "portfolio admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('assignment-files','project-files','project-images') and public.is_admin());
