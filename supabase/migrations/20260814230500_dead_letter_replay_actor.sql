begin;

drop function if exists public.finish_sympla_dead_letter_replay(uuid, uuid, boolean);

create function public.finish_sympla_dead_letter_replay(
  p_dead_letter_id uuid,
  p_sync_run_id uuid,
  p_succeeded boolean,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_sync_dead_letters
     set replay_started_at = null,
         last_replay_run_id = p_sync_run_id,
         resolved_at = case when p_succeeded then now() else resolved_at end,
         resolved_by = case when p_succeeded then p_actor_id else resolved_by end
   where id = p_dead_letter_id;
end;
$$;

revoke all on function public.finish_sympla_dead_letter_replay(uuid, uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.finish_sympla_dead_letter_replay(uuid, uuid, boolean, uuid) to service_role;

commit;
