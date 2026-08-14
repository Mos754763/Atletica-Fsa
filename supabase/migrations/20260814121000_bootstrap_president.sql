begin;

update public.profiles
   set is_president = true,
       updated_at = now()
 where email = 'moises.754763@graduacao.fsa.br';

do $$
begin
  if not exists (select 1 from public.profiles where is_president) then
    raise exception 'Nenhum presidente foi provisionado. Crie o perfil proprietário antes de aplicar esta migração.';
  end if;
end $$;

commit;
