-- Deletes only this session's synthetic fixtures. Existing Org A / Org B are untouched.
begin;
delete from workworld.orgs where id in ('da7a92f2-a10c-4bac-8a6d-000000000001','da7aa3f8-a10c-4bac-8a6d-000000000002') and name in ('WorkWorld isolated QA A','WorkWorld isolated QA B');
delete from workworld.profiles where id in ('da7a89e0-a10c-4bac-8a6d-000000000003','da7a4ecd-a10c-4bac-8a6d-000000000004','da7ac22e-a10c-4bac-8a6d-000000000005') and display_name like 'Synthetic QA%';
commit;
