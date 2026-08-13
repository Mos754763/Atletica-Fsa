const publicStorageBase = "https://tbxihkzuyzszrfxqmleq.supabase.co/storage/v1/object/public/catalog-assets/institutional";

export function institutionalAsset(path: string) {
  return `${publicStorageBase}/${path}`;
}

