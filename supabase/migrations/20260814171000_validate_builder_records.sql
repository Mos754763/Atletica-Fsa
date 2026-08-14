begin;

create or replace function public.validate_custom_table_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  field_row record;
  field_value jsonb;
begin
  if jsonb_typeof(new.data_json) <> 'object' then
    raise exception 'Os dados do registro devem ser um objeto JSON.';
  end if;

  for field_row in
    select slug, field_type, is_required
      from public.custom_table_fields
     where table_id = new.table_id and deleted_at is null
  loop
    field_value := new.data_json -> field_row.slug;
    if field_row.is_required and (field_value is null or field_value = 'null'::jsonb) then
      raise exception 'O campo obrigatório % não foi preenchido.', field_row.slug;
    end if;
    if field_value is null or field_value = 'null'::jsonb then
      continue;
    end if;

    if field_row.field_type in ('text', 'date', 'single_select', 'person') and jsonb_typeof(field_value) <> 'string' then
      raise exception 'O campo % deve ser texto.', field_row.slug;
    elsif field_row.field_type = 'number' and jsonb_typeof(field_value) <> 'number' then
      raise exception 'O campo % deve ser numérico.', field_row.slug;
    elsif field_row.field_type = 'multi_select' and jsonb_typeof(field_value) <> 'array' then
      raise exception 'O campo % deve ser uma lista.', field_row.slug;
    elsif field_row.field_type = 'checkbox' and jsonb_typeof(field_value) <> 'boolean' then
      raise exception 'O campo % deve ser verdadeiro ou falso.', field_row.slug;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists custom_records_validate_values on public.custom_table_records;
create trigger custom_records_validate_values
before insert or update of table_id, data_json on public.custom_table_records
for each row execute procedure public.validate_custom_table_record();

commit;
