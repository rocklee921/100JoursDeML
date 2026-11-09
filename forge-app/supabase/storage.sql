-- À lancer une fois dans Supabase > SQL Editor : dossier public pour les personnages générés.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('heroes', 'heroes', true, 5242880, array['image/png'])
on conflict (id) do nothing;
