-- Bucket público de imagens de produtos. O upload é efetuado pelo servidor
-- com a chave privada; o navegador recebe somente a URL pública do arquivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-assets', 'catalog-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
