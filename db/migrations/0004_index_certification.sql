-- WorkWorld Index private certification: metadata and evidence references only.
-- Credentials, prompts, and raw customer data are intentionally excluded.

create table if not exists workworld.certification_preflights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references workworld.orgs(id) on delete cascade,
  requested_by uuid not null references workworld.profiles(id) on delete restrict,
  agent_name text not null check (char_length(agent_name) between 2 and 120),
  adapter text not null check (adapter in ('openai-compatible', 'anthropic-messages', 'ollama', 'custom-mcp')),
  suite_version text not null,
  max_budget_usd numeric(12,2) not null check (max_budget_usd >= 0),
  configuration_digest text not null check (configuration_digest ~ '^[a-f0-9]{64}$'),
  status text not null default 'prepared' check (status in ('prepared', 'running', 'review', 'complete', 'expired', 'withdrawn')),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workworld.certification_artifacts (
  id uuid primary key default gen_random_uuid(),
  preflight_id uuid not null references workworld.certification_preflights(id) on delete cascade,
  kind text not null check (kind in ('manifest', 'action-log', 'state-digest', 'report', 'signature')),
  digest text not null check (digest ~ '^[a-f0-9]{64}$'),
  storage_key text not null,
  created_at timestamptz not null default now(),
  unique(preflight_id, kind, digest)
);

alter table workworld.certification_preflights enable row level security;
alter table workworld.certification_artifacts enable row level security;

create policy certification_preflights_member_read on workworld.certification_preflights for select to authenticated
  using (workworld.has_role(org_id, 'admin') or requested_by = (select auth.uid()));
create policy certification_preflights_member_insert on workworld.certification_preflights for insert to authenticated
  with check (requested_by = (select auth.uid()) and workworld.has_role(org_id, 'participant'));
create policy certification_preflights_owner_update on workworld.certification_preflights for update to authenticated
  using (requested_by = (select auth.uid()) or workworld.has_role(org_id, 'admin'))
  with check (requested_by = (select auth.uid()) or workworld.has_role(org_id, 'admin'));
create policy certification_artifacts_member_read on workworld.certification_artifacts for select to authenticated
  using (exists (select 1 from workworld.certification_preflights p where p.id = preflight_id and (p.requested_by = (select auth.uid()) or workworld.has_role(p.org_id, 'admin'))));
create policy certification_artifacts_member_insert on workworld.certification_artifacts for insert to authenticated
  with check (exists (select 1 from workworld.certification_preflights p where p.id = preflight_id and (p.requested_by = (select auth.uid()) or workworld.has_role(p.org_id, 'admin'))));

create index if not exists idx_certification_preflights_org_created on workworld.certification_preflights(org_id, created_at desc);
create index if not exists idx_certification_artifacts_preflight on workworld.certification_artifacts(preflight_id, created_at);

grant select, insert, update on workworld.certification_preflights, workworld.certification_artifacts to authenticated;
grant select, insert, update, delete on workworld.certification_preflights, workworld.certification_artifacts to service_role;
