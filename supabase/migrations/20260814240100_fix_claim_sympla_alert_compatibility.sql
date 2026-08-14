begin;

-- A assinatura anterior tinha três argumentos. Mantemos a compatibilidade por
-- meio do quarto argumento com default e removemos a sobrecarga para evitar
-- resolução ambígua na chamada RPC do PostgREST.
drop function if exists public.claim_sympla_alert(uuid, uuid, text);

commit;
