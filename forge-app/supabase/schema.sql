-- SOUL LEVELING — schéma Supabase.
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Peut être relancé sans risque.

-- ---------- Profils publics (pseudo, niveau, série) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 24),
  avatar text check (avatar is null or char_length(avatar) <= 120000),
  theme text not null default 'forge',
  level int not null default 1 check (level between 1 and 1000),
  xp int not null default 0 check (xp between 0 and 10000000),
  rank text not null default 'E' check (rank in ('E', 'D', 'C', 'B', 'A', 'S')),
  streak int not null default 0 check (streak between 0 and 100000),
  best_streak int not null default 0 check (best_streak between 0 and 100000),
  cycle int not null default 1 check (cycle between 1 and 1000),
  day int not null default 1 check (day between 1 and 100000),
  updated_at timestamptz not null default now()
);

-- ---------- Sauvegarde complète (changer de téléphone) ----------
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  check (pg_column_size(data) < 900000)
);

-- ---------- Amis ----------
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- ---------- Épreuves de saison ----------
create table if not exists public.season_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id text not null check (event_id ~ '^ev[0-9]{6}$'),
  days int not null default 0 check (days between 0 and 31),
  trophy boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------- Sécurité (Row Level Security) ----------
alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.friendships enable row level security;
alter table public.season_progress enable row level security;

drop policy if exists "profils visibles par les joueurs" on public.profiles;
create policy "profils visibles par les joueurs" on public.profiles for select to authenticated using (true);
drop policy if exists "créer son profil" on public.profiles;
create policy "créer son profil" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "modifier son profil" on public.profiles;
create policy "modifier son profil" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "sa sauvegarde" on public.saves;
create policy "sa sauvegarde" on public.saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "voir ses liens" on public.friendships;
create policy "voir ses liens" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "demander en ami" on public.friendships;
create policy "demander en ami" on public.friendships for insert to authenticated with check (requester = auth.uid() and status = 'pending');
drop policy if exists "accepter une demande" on public.friendships;
create policy "accepter une demande" on public.friendships for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid());
drop policy if exists "retirer un lien" on public.friendships;
create policy "retirer un lien" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

drop policy if exists "saison visible" on public.season_progress;
create policy "saison visible" on public.season_progress for select to authenticated using (true);
drop policy if exists "sa saison" on public.season_progress;
create policy "sa saison" on public.season_progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "sa saison maj" on public.season_progress;
create policy "sa saison maj" on public.season_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Garde-fous : pas de bond d'XP irréaliste ----------
create or replace function public.guard_profile() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    -- au plus 5 000 XP gagnés par mise à jour, et jamais de retour en arrière du pseudo
    if new.xp > old.xp + 5000 then new.xp := old.xp + 5000; end if;
    new.username := old.username;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.guard_profile();

-- ---------- Classements ----------
create or replace view public.season_board with (security_invoker = true) as
  select s.event_id, s.days, s.trophy, p.id, p.username, p.display_name, p.avatar, p.level, p.rank, p.streak, p.xp
  from public.season_progress s join public.profiles p on p.id = s.user_id;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.saves, public.friendships to authenticated;
grant select, insert, update on public.season_progress to authenticated;
grant select on public.season_board to authenticated;

-- ---------- Suppression de compte (exigée par l'App Store) ----------
-- Efface l'utilisateur connecté ; profil, sauvegarde, amitiés et saisons partent en cascade.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Personnages générés par IA ----------
create table if not exists public.hero_generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists hero_generations_user on public.hero_generations (user_id, created_at);
alter table public.hero_generations enable row level security;
drop policy if exists "ses générations" on public.hero_generations;
create policy "ses générations" on public.hero_generations for select to authenticated using (user_id = auth.uid());
grant select on public.hero_generations to authenticated;
