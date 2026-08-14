begin;

-- A política por linha não limita colunas. Sem este revoke, um usuário autenticado
-- poderia tentar atualizar profiles.role diretamente pela API pública do Supabase.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "profiles: user edits own profile" on public.profiles;
create policy "profiles: user edits own display name"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

commit;
