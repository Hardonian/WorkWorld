-- Forward-only hardening of the hosted private schema. No credentials belong here.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'workworld_runtime') then
    create role workworld_runtime nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end $$;
grant authenticated to workworld_runtime;

create or replace function workworld.prevent_certification_scope_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.org_id is distinct from old.org_id or new.requested_by is distinct from old.requested_by then
    raise exception 'certification tenant and requester are immutable' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function workworld.prevent_certification_scope_change() from public;
create trigger certification_preflights_immutable_scope
before update on workworld.certification_preflights
for each row execute function workworld.prevent_certification_scope_change();

drop policy certification_preflights_owner_update on workworld.certification_preflights;
create policy certification_preflights_owner_update on workworld.certification_preflights
for update to authenticated
using (workworld.has_role(org_id, 'admin') or (requested_by = (select auth.uid()) and workworld.has_role(org_id, 'participant')))
with check (workworld.has_role(org_id, 'admin') or (requested_by = (select auth.uid()) and workworld.has_role(org_id, 'participant')));

create index if not exists idx_certification_preflights_requested_by on workworld.certification_preflights(requested_by);
-- Artifact evidence is append-only for request identities.
revoke update on workworld.certification_artifacts from authenticated;
