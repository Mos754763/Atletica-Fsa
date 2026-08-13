-- Usuários, inclusive administradores, não podem conceder ou remover o próprio acesso.
-- Alterações de papel são feitas somente por outro administrador via rota server-side.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id then
    new.role = old.role;
    new.email = old.email;
  end if;
  return new;
end;
$$;
