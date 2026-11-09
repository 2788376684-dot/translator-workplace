-- Execute in your own Supabase project's SQL editor.
-- Every row is owned by the authenticated Supabase Auth user.
create table if not exists public.tw_workspace_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.tw_workspace_snapshots enable row level security;
revoke all on public.tw_workspace_snapshots from anon;
grant select, insert, update, delete on public.tw_workspace_snapshots to authenticated;
drop policy if exists tw_workspace_select_self on public.tw_workspace_snapshots;
drop policy if exists tw_workspace_insert_self on public.tw_workspace_snapshots;
drop policy if exists tw_workspace_update_self on public.tw_workspace_snapshots;
drop policy if exists tw_workspace_delete_self on public.tw_workspace_snapshots;
create policy tw_workspace_select_self on public.tw_workspace_snapshots for select to authenticated
  using ((select auth.uid()) is not null and user_id=(select auth.uid()));
create policy tw_workspace_insert_self on public.tw_workspace_snapshots for insert to authenticated
  with check ((select auth.uid()) is not null and user_id=(select auth.uid()));
create policy tw_workspace_update_self on public.tw_workspace_snapshots for update to authenticated
  using ((select auth.uid()) is not null and user_id=(select auth.uid()))
  with check ((select auth.uid()) is not null and user_id=(select auth.uid()));
create policy tw_workspace_delete_self on public.tw_workspace_snapshots for delete to authenticated
  using ((select auth.uid()) is not null and user_id=(select auth.uid()));
