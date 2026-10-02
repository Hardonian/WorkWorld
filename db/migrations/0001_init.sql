-- WorkWorld hosted schema — Supabase-compatible migration 0001.
-- Apply to a FRESH database only. Forward: creates schema + RLS.
-- Rollback: drop schema workworld cascade (see docs/RELEASE_CHECKLIST.md).
--
-- Roles mirror Supabase: anon / authenticated / service_role.
-- RLS derives tenancy from trusted JWT claims (request.jwt.claims),
-- never from client-supplied headers.

create schema if not exists workworld;

-- Local compatibility: real Supabase provides auth.uid(); create it only if absent.
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    create schema if not exists auth;
    create function auth.uid() returns uuid
      language sql stable
      as $f$
        select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
      $f$;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

create table if not exists workworld.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workworld.profiles (
  id uuid primary key, -- equals auth user id
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workworld.memberships (
  org_id uuid not null references workworld.orgs(id) on delete cascade,
  user_id uuid not null references workworld.profiles(id) on delete cascade,
  role text not null check (role in ('participant','assessor','admin')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists workworld.assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references workworld.orgs(id) on delete cascade,
  run_id uuid not null,
  assessor_id uuid not null references workworld.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists workworld.episode_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references workworld.orgs(id) on delete cascade,
  participant_id uuid not null references workworld.profiles(id) on delete cascade,
  scenario_id text not null,
  scenario_version text not null,
  condition text not null check (condition in ('human','agent','assisted')),
  status text not null default 'active' check (status in ('active','submitted','expired')),
  revision bigint not null default 0,
  state_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Append-only action history (no update/delete policies by design).
create table if not exists workworld.run_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workworld.episode_runs(id) on delete cascade,
  seq bigint not null,
  action_json jsonb not null,
  actor_kind text not null check (actor_kind in ('human','agent','assisted','manager','system')),
  outcome text not null check (outcome in ('applied','rejected','replayed')),
  created_at timestamptz not null default now(),
  unique (run_id, seq)
);

-- Assessor judgments: revisions are new rows; original rows are never updated.
create table if not exists workworld.assessments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workworld.episode_runs(id) on delete cascade,
  assessor_id uuid not null references workworld.profiles(id) on delete cascade,
  revision integer not null default 1,
  ratings jsonb not null,
  comment text not null default '',
  superseded_by uuid null references workworld.assessments(id),
  created_at timestamptz not null default now(),
  unique (run_id, revision)
);

alter table workworld.orgs enable row level security;
alter table workworld.profiles enable row level security;
alter table workworld.memberships enable row level security;
alter table workworld.assignments enable row level security;
alter table workworld.episode_runs enable row level security;
alter table workworld.run_actions enable row level security;
alter table workworld.assessments enable row level security;

-- Helper: is the caller a member with the given role in the given org?
create or replace function workworld.has_role(target_org uuid, want text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workworld.memberships m
    where m.org_id = target_org and m.user_id = auth.uid() and m.role = want
  );
$$;

-- orgs
drop policy if exists orgs_select on workworld.orgs;
create policy orgs_select on workworld.orgs for select to authenticated
  using (exists (select 1 from workworld.memberships m where m.org_id = id and m.user_id = auth.uid()));
drop policy if exists orgs_insert on workworld.orgs;
create policy orgs_insert on workworld.orgs for insert to authenticated
  with check (false); -- org creation is service-role only

-- profiles
drop policy if exists profiles_select_self on workworld.profiles;
create policy profiles_select_self on workworld.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from workworld.memberships m
    where m.user_id = id and m.org_id in (
      select org_id from workworld.memberships where user_id = auth.uid()
    ) and workworld.has_role(m.org_id, 'admin')
  ));
drop policy if exists profiles_insert_self on workworld.profiles;
create policy profiles_insert_self on workworld.profiles for insert to authenticated
  with check (id = auth.uid());

-- memberships
drop policy if exists memberships_select on workworld.memberships;
drop policy if exists memberships_admin_insert on workworld.memberships;
drop policy if exists memberships_admin_delete on workworld.memberships;
create policy memberships_select on workworld.memberships for select to authenticated
  using (user_id = auth.uid() or workworld.has_role(org_id, 'admin'));
create policy memberships_admin_insert on workworld.memberships for insert to authenticated
  with check (workworld.has_role(org_id, 'admin'));
create policy memberships_admin_delete on workworld.memberships for delete to authenticated
  using (workworld.has_role(org_id, 'admin'));

-- assignments: assessor sees own; admin manages
drop policy if exists assignments_select on workworld.assignments;
drop policy if exists assignments_admin_insert on workworld.assignments;
create policy assignments_select on workworld.assignments for select to authenticated
  using (assessor_id = auth.uid() or workworld.has_role(org_id, 'admin'));
create policy assignments_admin_insert on workworld.assignments for insert to authenticated
  with check (workworld.has_role(org_id, 'admin'));

-- episode_runs: participant owns; assigned assessor reads; admin reads org
-- NOTE: policy subqueries must fully qualify outer columns — an unqualified
-- `run_id`/`id` resolves to the INNER table's same-named column and silently
-- changes the predicate (caught by tests/db/rls.test.ts).
drop policy if exists runs_select on workworld.episode_runs;
create policy runs_select on workworld.episode_runs for select to authenticated
  using (
    participant_id = auth.uid()
    or workworld.has_role(org_id, 'admin')
    or exists (
      select 1 from workworld.assignments a
      where a.run_id = episode_runs.id and a.assessor_id = auth.uid()
    )
  );
drop policy if exists runs_insert_own on workworld.episode_runs;
drop policy if exists runs_update_own on workworld.episode_runs;
create policy runs_insert_own on workworld.episode_runs for insert to authenticated
  with check (participant_id = auth.uid() and workworld.has_role(org_id, 'participant'));
-- State updates: only the owning participant (transactional revision checks live
-- in the application layer; RLS binds identity + tenant).
create policy runs_update_own on workworld.episode_runs for update to authenticated
  using (participant_id = auth.uid())
  with check (participant_id = auth.uid() and org_id in (
    select org_id from workworld.memberships where user_id = auth.uid() and role = 'participant'
  ));

-- run_actions: append-only; visible with run visibility
drop policy if exists actions_select on workworld.run_actions;
drop policy if exists actions_insert_participant on workworld.run_actions;
create policy actions_select on workworld.run_actions for select to authenticated
  using (exists (
    select 1 from workworld.episode_runs r where r.id = run_id and (
      r.participant_id = auth.uid()
      or workworld.has_role(r.org_id, 'admin')
      or exists (select 1 from workworld.assignments a where a.run_id = r.id and a.assessor_id = auth.uid())
    )
  ));
create policy actions_insert_participant on workworld.run_actions for insert to authenticated
  with check (exists (
    select 1 from workworld.episode_runs r
    where r.id = run_id and r.participant_id = auth.uid()
  ));

-- assessments: assigned assessor writes revisions; nobody updates rows in place
drop policy if exists assessments_select on workworld.assessments;
create policy assessments_select on workworld.assessments for select to authenticated
  using (
    assessor_id = auth.uid()
    or workworld.has_role((select org_id from workworld.episode_runs r where r.id = run_id), 'admin')
    or exists (select 1 from workworld.episode_runs r where r.id = run_id and r.participant_id = auth.uid())
  );
drop policy if exists assessments_insert_assigned on workworld.assessments;
create policy assessments_insert_assigned on workworld.assessments for insert to authenticated
  with check (
    assessor_id = auth.uid()
    and exists (
      select 1 from workworld.assignments a
      where a.run_id = assessments.run_id and a.assessor_id = auth.uid()
    )
  );

grant usage on schema workworld to authenticated, service_role;
grant select, insert, update, delete on all tables in schema workworld to service_role;
grant select, insert, update, delete on all tables in schema workworld to authenticated;
-- (table grants are broad; RLS is the enforcement boundary — verified by tests)
