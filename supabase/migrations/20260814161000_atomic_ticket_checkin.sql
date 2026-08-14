create or replace function public.check_in_event_ticket(p_check_in_code text)
returns table(registration_id uuid, final_status public.registration_status, already_checked_in boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration public.event_registrations%rowtype;
  v_ticket public.event_tickets%rowtype;
begin
  if not public.current_role() in ('admin', 'caixa') then raise exception 'Permissão insuficiente'; end if;
  select * into v_registration from public.event_registrations where check_in_code = upper(trim(p_check_in_code)) for update;
  if not found then raise exception 'Inscrição não localizada'; end if;
  if v_registration.status = 'check_in_realizado' then return query select v_registration.id, v_registration.status, true; return; end if;
  if v_registration.status <> 'confirmada' then raise exception 'Ingresso ainda não está confirmado'; end if;
  select * into v_ticket from public.event_tickets where registration_id = v_registration.id for update;
  if not found or v_ticket.status <> 'emitido' then raise exception 'Ingresso indisponível para check-in'; end if;
  update public.event_registrations set status = 'check_in_realizado', checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now() where id = v_registration.id;
  update public.event_tickets set status = 'usado', used_at = now(), updated_at = now() where id = v_ticket.id;
  return query select v_registration.id, 'check_in_realizado'::public.registration_status, false;
end;
$$;

grant execute on function public.check_in_event_ticket(text) to authenticated;
