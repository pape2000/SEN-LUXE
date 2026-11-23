-- =====================================================================================
-- SEN LUXE — SCRIPT SUPABASE COMPLET (v4)
-- À exécuter dans Supabase › SQL Editor › New query › coller › Run.
-- Ré-exécutable sans danger : aucune table n'est supprimée, aucune donnée n'est effacée.
--
-- Contenu :
--   1. Contenu du site (publié + brouillon) et historique  — tables existantes conservées
--   2. Versions de publication (temps réel léger)            — senluxe_publications
--   3. Administration : mot de passe (empreinte), sessions, tentatives, journal
--   4. Commandes (table dédiée), chronologie, stock serveur transactionnel
--   5. Paniers (actifs / abandonnés / récupérés / convertis)
--   6. Événements de navigation (sans données personnelles)
--   7. Paramètres, bibliothèque de modèles, sauvegardes, médias
--   8. Supabase Storage (bucket senluxe-media + règles d'envoi par ticket)
--   9. Realtime
--  10. Reprise des anciennes données (commandes / paniers stockés dans senluxe_events)
--
-- Mot de passe administrateur initial : celui fourni par la propriétaire du site.
-- Il n'apparaît PAS dans ce script : seule son empreinte (sel + 20 000 itérations SHA-256)
-- est enregistrée. Il est conseillé de le changer dans DÉTAILS › Sécurité.
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

-- -------------------------------------------------------------------------------------
-- 0. Utilitaire : digest SHA-256 indépendant du schéma de pgcrypto
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_sha256(b bytea) returns bytea
language sql immutable set search_path = public, extensions as $$ select sha256(b) $$;

-- -------------------------------------------------------------------------------------
-- 1. CONTENU DU SITE (tables d'origine, conservées à l'identique)
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_site_content (
  id text primary key check (id in ('main','draft')),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.senluxe_content_history (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null, payload jsonb not null
);
alter table public.senluxe_content_history add column if not exists version bigint;
alter table public.senluxe_content_history add column if not exists label text;

-- -------------------------------------------------------------------------------------
-- 2. VERSIONS DE PUBLICATION — une ligne légère par publication (Realtime)
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_publications (
  version bigint generated always as identity primary key,
  published_at timestamptz not null default now(),
  content_stamp text,
  label text,
  size_bytes integer,
  products integer
);

-- -------------------------------------------------------------------------------------
-- 3. ADMINISTRATION
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_admin (
  id int primary key default 1 check (id = 1), salt text not null, hash text not null
);
alter table public.senluxe_admin add column if not exists algo text not null default 'sha256';
alter table public.senluxe_admin add column if not exists changed_at timestamptz;

create table if not exists public.senluxe_admin_sessions (
  id bigint generated always as identity primary key,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  expires_at timestamptz not null,
  label text,
  revoked boolean not null default false
);
create table if not exists public.senluxe_login_attempts (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ok boolean not null
);
create index if not exists senluxe_login_attempts_at_idx on public.senluxe_login_attempts (at);
create table if not exists public.senluxe_admin_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists senluxe_admin_log_at_idx on public.senluxe_admin_log (at desc);

-- Mot de passe administrateur : inchangé par ce script (voir la fin du fichier en cas de réinitialisation).

create or replace function public.senluxe_pw_hash(p_salt text, p_password text, p_algo text) returns text
language plpgsql immutable set search_path = public as $$
declare h bytea; s bytea := convert_to(p_salt || p_password, 'UTF8'); n int;
begin
  if p_algo = 'sha256' then return encode(public.senluxe_sha256(s), 'hex'); end if;
  n := coalesce(nullif(regexp_replace(p_algo, '\D', '', 'g'), '')::int, 20000);
  h := public.senluxe_sha256(s);
  for i in 2..n loop h := public.senluxe_sha256(h || s); end loop;
  return encode(h, 'hex');
end $$;
revoke all on function public.senluxe_pw_hash(text, text, text) from public, anon, authenticated;

create or replace function public.senluxe_password_ok(p_password text) returns boolean
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select * into a from public.senluxe_admin where id = 1;
  if a.id is null or p_password is null or length(p_password) > 200 then return false; end if;
  return public.senluxe_pw_hash(a.salt, p_password, a.algo) = a.hash;
end $$;
revoke all on function public.senluxe_password_ok(text) from public, anon, authenticated;

-- Vérifie un JETON DE SESSION (slt_…) ou, pour compatibilité, le mot de passe.
-- Toutes les fonctions administratives passent par ici : aucune ne fait confiance au navigateur.
create or replace function public.senluxe_admin_ok(p_password text) returns boolean
language plpgsql security definer set search_path = public as $$
declare s record; th text;
begin
  if p_password is null then return false; end if;
  if left(p_password, 4) = 'slt_' then
    th := encode(public.senluxe_sha256(convert_to(p_password, 'UTF8')), 'hex');
    select * into s from public.senluxe_admin_sessions where token_hash = th;
    if s.id is null or s.revoked or s.expires_at < now() then return false; end if;
    if s.last_seen < now() - interval '10 minutes' then
      update public.senluxe_admin_sessions
         set last_seen = now(), expires_at = greatest(expires_at, now() + interval '30 days')
       where id = s.id;
    end if;
    return true;
  end if;
  -- Mot de passe : limité contre les essais répétés.
  if (select count(*) from public.senluxe_login_attempts where not ok and at > now() - interval '15 minutes') >= 20 then
    return false;
  end if;
  if public.senluxe_password_ok(p_password) then return true; end if;
  insert into public.senluxe_login_attempts (ok) values (false);
  perform pg_sleep(0.5);
  return false;
end $$;
revoke all on function public.senluxe_admin_ok(text) from public, anon, authenticated;

create or replace function public.senluxe_assert_admin(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.senluxe_admin_ok(p_token) then
    raise exception 'Session administrateur invalide ou expirée. Reconnectez-vous.' using errcode = '28000';
  end if;
end $$;
revoke all on function public.senluxe_assert_admin(text) from public, anon, authenticated;

create or replace function public.senluxe_log(p_action text, p_detail jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.senluxe_admin_log (action, detail) values (p_action, coalesce(p_detail, '{}'::jsonb));
$$;
revoke all on function public.senluxe_log(text, jsonb) from public, anon, authenticated;

-- Compatibilité : ancienne vérification utilisée par l'ancien gestionnaire.
create or replace function public.senluxe_admin_check(p_password text) returns boolean
language sql security definer set search_path = public as $$ select public.senluxe_admin_ok(p_password) $$;

-- Connexion : renvoie un jeton de session (le mot de passe n'est jamais conservé côté navigateur).
create or replace function public.senluxe_admin_login(p_password text, p_label text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare tok text; exp timestamptz := now() + interval '30 days';
begin
  if (select count(*) from public.senluxe_login_attempts where not ok and at > now() - interval '15 minutes') >= 20 then
    raise exception 'Trop de tentatives. Réessayez dans 15 minutes.' using errcode = '28000';
  end if;
  if not public.senluxe_password_ok(p_password) then
    insert into public.senluxe_login_attempts (ok) values (false);
    perform pg_sleep(0.7);
    raise exception 'Mot de passe administrateur incorrect.' using errcode = '28000';
  end if;
  insert into public.senluxe_login_attempts (ok) values (true);
  tok := 'slt_' || encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.senluxe_admin_sessions (token_hash, expires_at, label)
    values (encode(public.senluxe_sha256(convert_to(tok, 'UTF8')), 'hex'), exp, left(coalesce(p_label, ''), 120));
  delete from public.senluxe_login_attempts where at < now() - interval '30 days';
  delete from public.senluxe_admin_sessions where expires_at < now() - interval '7 days';
  perform public.senluxe_log('connexion', jsonb_build_object('appareil', left(coalesce(p_label, ''), 120)));
  return jsonb_build_object('token', tok, 'expires_at', exp);
end $$;

create or replace function public.senluxe_admin_logout(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.senluxe_admin_sessions set revoked = true
   where token_hash = encode(public.senluxe_sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  perform public.senluxe_log('deconnexion', '{}'::jsonb);
end $$;

create or replace function public.senluxe_admin_session_info(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare th text := encode(public.senluxe_sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
begin
  perform public.senluxe_assert_admin(p_token);
  return (select jsonb_build_object('created_at', created_at, 'expires_at', expires_at, 'label', label)
            from public.senluxe_admin_sessions where token_hash = th);
end $$;

create or replace function public.senluxe_admin_sessions_list(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare th text := encode(public.senluxe_sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'last_seen', last_seen,
            'expires_at', expires_at, 'label', label, 'current', token_hash = th) order by last_seen desc)
          from public.senluxe_admin_sessions where not revoked and expires_at > now()), '[]'::jsonb);
end $$;

create or replace function public.senluxe_admin_session_revoke(p_token text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  update public.senluxe_admin_sessions set revoked = true where id = p_id or p_id is null;
  perform public.senluxe_log('sessions_revoquees', jsonb_build_object('id', p_id));
end $$;

create or replace function public.senluxe_admin_change_password(p_token text, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_salt text := encode(extensions.gen_random_bytes(16), 'hex'); th text;
begin
  perform public.senluxe_assert_admin(p_token);
  if not public.senluxe_password_ok(p_old) then raise exception 'Mot de passe actuel incorrect.' using errcode = '28000'; end if;
  if p_new is null or length(p_new) < 8 then raise exception 'Le nouveau mot de passe doit contenir au moins 8 caractères.'; end if;
  update public.senluxe_admin set salt = v_salt, hash = public.senluxe_pw_hash(v_salt, p_new, 'it20000'), algo = 'it20000', changed_at = now() where id = 1;
  th := encode(public.senluxe_sha256(convert_to(p_token, 'UTF8')), 'hex');
  update public.senluxe_admin_sessions set revoked = true where token_hash <> th;
  perform public.senluxe_log('mot_de_passe_change', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.senluxe_admin_log_list(p_token text, p_limit int default 200) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(x order by x.id desc) from (
      select id, at, action, detail from public.senluxe_admin_log order by id desc limit least(coalesce(p_limit, 200), 1000)) x), '[]'::jsonb);
end $$;

-- -------------------------------------------------------------------------------------
-- 7a. PARAMÈTRES
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.senluxe_settings (key, value) values
  ('abandon_minutes', '60'::jsonb),
  ('notify_orders', 'true'::jsonb),
  ('poll_seconds', '10'::jsonb),
  ('rate_orders_per_10min', '5'::jsonb)
on conflict (key) do nothing;

create or replace function public.senluxe_setting(p_key text, p_default jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.senluxe_settings where key = p_key), p_default)
$$;
revoke all on function public.senluxe_setting(text, jsonb) from public, anon, authenticated;

create or replace function public.senluxe_admin_settings(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_object_agg(key, value) from public.senluxe_settings), '{}'::jsonb);
end $$;

create or replace function public.senluxe_admin_setting_set(p_token text, p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  if p_key !~ '^[a-z0-9_]{2,60}$' then raise exception 'Clé de paramètre invalide'; end if;
  if p_key = 'abandon_minutes' and (jsonb_typeof(p_value) <> 'number' or (p_value)::text::numeric < 5 or (p_value)::text::numeric > 10080) then
    raise exception 'Délai d''abandon : entre 5 minutes et 7 jours.';
  end if;
  insert into public.senluxe_settings (key, value, updated_at) values (p_key, p_value, now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public.senluxe_log('parametre', jsonb_build_object('cle', p_key, 'valeur', p_value));
end $$;

-- -------------------------------------------------------------------------------------
-- Limitation des requêtes anonymes (anti-abus)
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_rate (
  id bigint generated always as identity primary key,
  key text not null,
  at timestamptz not null default now()
);
create index if not exists senluxe_rate_key_at_idx on public.senluxe_rate (key, at);
create or replace function public.senluxe_rate_ok(p_key text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.senluxe_rate where key = p_key and at > now() - p_window) >= p_max then return false; end if;
  insert into public.senluxe_rate (key) values (p_key);
  if random() < 0.02 then delete from public.senluxe_rate where at < now() - interval '1 day'; end if;
  return true;
end $$;
revoke all on function public.senluxe_rate_ok(text, int, interval) from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 4. STOCK SERVEUR (source de vérité des quantités)
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_stock (
  product_id text primary key,
  qty integer,                                   -- null = stock non suivi (illimité)
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------------------
-- 4b. COMMANDES
-- -------------------------------------------------------------------------------------
create sequence if not exists public.senluxe_order_seq;
create table if not exists public.senluxe_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  client_ref text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'Nouvelle'
    check (status in ('Nouvelle','Confirmée','En préparation','Expédiée','Livrée','Annulée')),
  channel text,                                   -- email / whatsapp / site
  cart_id text,
  visitor_id text,
  customer jsonb not null default '{}'::jsonb,    -- nom, téléphone, adresse, commentaire
  delivery jsonb not null default '{}'::jsonb,    -- id, libellé, frais
  items jsonb not null default '[]'::jsonb,       -- produits, variantes, quantités, prix unitaires
  subtotal integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null default 0,
  price_check text,                               -- null = conforme ; sinon écart détecté
  stock_applied boolean not null default false,
  archived boolean not null default false,
  legacy_event_id bigint unique,
  note text
);
create index if not exists senluxe_orders_created_idx on public.senluxe_orders (created_at desc);
create index if not exists senluxe_orders_status_idx on public.senluxe_orders (status);
create index if not exists senluxe_orders_updated_idx on public.senluxe_orders (updated_at);

create table if not exists public.senluxe_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.senluxe_orders(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  from_status text, to_status text, note text
);
create index if not exists senluxe_order_events_order_idx on public.senluxe_order_events (order_id, at);

-- -------------------------------------------------------------------------------------
-- 5. PANIERS
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_carts (
  id text primary key,
  visitor_id text,
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb,
  item_count integer not null default 0,
  total integer not null default 0,
  stage text not null default 'cart' check (stage in ('cart','checkout')),
  status text not null default 'active' check (status in ('active','converted','archived')),
  direct boolean not null default false,
  contact jsonb,                                  -- uniquement si saisi volontairement par le client
  contact_consent boolean not null default false,
  customer_key text,                              -- téléphone normalisé : rattache les paniers d'un même client
  order_id uuid,
  abandoned_at timestamptz,
  recovered boolean not null default false,
  history jsonb not null default '[]'::jsonb      -- étapes : créé, ajout, modification, commande
);
create index if not exists senluxe_carts_activity_idx on public.senluxe_carts (last_activity desc);
create index if not exists senluxe_carts_updated_idx on public.senluxe_carts (updated_at);
create index if not exists senluxe_carts_customer_idx on public.senluxe_carts (customer_key);

-- -------------------------------------------------------------------------------------
-- 6. ÉVÉNEMENTS DE NAVIGATION (table d'origine)
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null, visitor_id text, session_id text, cart_id text,
  data jsonb not null default '{}'::jsonb, status text
);
create index if not exists senluxe_events_created_idx on public.senluxe_events (created_at);
create index if not exists senluxe_events_type_idx on public.senluxe_events (type);

-- -------------------------------------------------------------------------------------
-- 7b. BIBLIOTHÈQUE, SAUVEGARDES, MÉDIAS
-- -------------------------------------------------------------------------------------
create table if not exists public.senluxe_library (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'sections',
  name text not null,
  description text,
  payload jsonb not null,
  thumbnail text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.senluxe_backups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null default 'full' check (kind in ('full','products','sections','settings','auto')),
  label text,
  size_bytes integer,
  payload jsonb not null
);
create table if not exists public.senluxe_media (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null unique,
  url text not null,
  folder text,
  mime text, size_bytes integer, width integer, height integer, name text
);
create table if not exists public.senluxe_upload_tickets (
  object_name text primary key,
  expires_at timestamptz not null,
  mime text, size_bytes integer
);

-- =====================================================================================
-- SÉCURITÉ : RLS partout, droits minimaux
-- =====================================================================================
do $$ declare t text; begin
  foreach t in array array['senluxe_site_content','senluxe_content_history','senluxe_publications','senluxe_admin',
    'senluxe_admin_sessions','senluxe_login_attempts','senluxe_admin_log','senluxe_settings','senluxe_rate','senluxe_stock',
    'senluxe_orders','senluxe_order_events','senluxe_carts','senluxe_events','senluxe_library','senluxe_backups',
    'senluxe_media','senluxe_upload_tickets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Public : lecture de la seule version PUBLIÉE (jamais le brouillon).
drop policy if exists senluxe_public_read on public.senluxe_site_content;
create policy senluxe_public_read on public.senluxe_site_content for select to anon, authenticated using (id = 'main');
grant select on public.senluxe_site_content to anon, authenticated;

-- Public : numéros de version publiés (aucune donnée sensible) et stock courant.
drop policy if exists senluxe_pub_read on public.senluxe_publications;
create policy senluxe_pub_read on public.senluxe_publications for select to anon, authenticated using (true);
grant select on public.senluxe_publications to anon, authenticated;
drop policy if exists senluxe_stock_read on public.senluxe_stock;
create policy senluxe_stock_read on public.senluxe_stock for select to anon, authenticated using (true);
grant select on public.senluxe_stock to anon, authenticated;

-- Visiteurs : ajout d'événements de navigation uniquement (aucune lecture).
drop policy if exists senluxe_insert on public.senluxe_events;
drop policy if exists senluxe_admin_read on public.senluxe_events;
drop policy if exists senluxe_admin_update on public.senluxe_events;
create policy senluxe_insert on public.senluxe_events for insert to anon, authenticated
  with check (type in ('visit','page','view','add','search','cart','checkout','order','checkout_start') and status is null
    and created_at between now() - interval '5 minutes' and now() + interval '5 minutes'
    and pg_column_size(data) < 20000
    and coalesce(length(visitor_id), 0) <= 64 and coalesce(length(session_id), 0) <= 64 and coalesce(length(cart_id), 0) <= 64);
grant insert on public.senluxe_events to anon, authenticated;

-- =====================================================================================
-- FONCTIONS : CONTENU, PUBLICATION, VERSIONS
-- =====================================================================================

-- Fusion du stock : la quantité saisie dans le gestionnaire ne remplace le stock serveur
-- que si elle a réellement été modifiée depuis la dernière publication (aucun décompte
-- de commande n'est écrasé par une ancienne valeur).
create or replace function public.senluxe_merge_stock(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare prev jsonb; p jsonb; out jsonb := '[]'::jsonb; pid text; newv jsonb; oldv jsonb; cur record;
begin
  select payload into prev from public.senluxe_site_content where id = 'main';
  for p in select * from jsonb_array_elements(coalesce(p_payload->'products', '[]'::jsonb)) loop
    pid := p->>'id';
    if pid is null then out := out || jsonb_build_array(p); continue; end if;
    newv := p->'stock';
    oldv := (select x->'stock' from jsonb_array_elements(coalesce(prev->'products', '[]'::jsonb)) x where x->>'id' = pid limit 1);
    select * into cur from public.senluxe_stock where product_id = pid;
    if cur.product_id is null or newv is distinct from oldv then
      insert into public.senluxe_stock (product_id, qty, updated_at)
        values (pid, case when jsonb_typeof(newv) = 'number' then greatest(0, floor((newv)::text::numeric))::int
                          when jsonb_typeof(newv) = 'string' and newv #>> '{}' ~ '^\d+$' then (newv #>> '{}')::int else null end, now())
        on conflict (product_id) do update set qty = excluded.qty, updated_at = now();
    elsif cur.qty is not null then
      p := jsonb_set(p, '{stock}', to_jsonb(cur.qty));
    end if;
    out := out || jsonb_build_array(p);
  end loop;
  return jsonb_set(p_payload, '{products}', out);
end $$;
revoke all on function public.senluxe_merge_stock(jsonb) from public, anon, authenticated;

create or replace function public.senluxe_publish_v2(p_token text, p_payload jsonb, p_label text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now(); v bigint; pl jsonb; sz int;
begin
  perform public.senluxe_assert_admin(p_token);
  if p_payload is null or jsonb_typeof(p_payload->'products') <> 'array' then raise exception 'Contenu invalide : liste de produits absente.'; end if;
  sz := pg_column_size(p_payload);
  if sz > 40 * 1024 * 1024 then raise exception 'Contenu trop volumineux (% Mo). Envoyez les images dans la médiathèque.', round(sz / 1048576.0, 1); end if;
  pl := public.senluxe_merge_stock(p_payload);
  insert into public.senluxe_publications (published_at, content_stamp, label, size_bytes, products)
    values (t, pl #>> '{meta,generatedAt}', left(coalesce(p_label, 'Publication'), 200), sz, jsonb_array_length(pl->'products'))
    returning version into v;
  pl := jsonb_set(pl, '{meta}', coalesce(pl->'meta', '{}'::jsonb) || jsonb_build_object('version', v, 'publishedAt', t));
  insert into public.senluxe_site_content (id, payload, updated_at) values ('main', pl, t)
    on conflict (id) do update set payload = excluded.payload, updated_at = t;
  insert into public.senluxe_content_history (kind, payload, version, label) values ('publication', pl, v, left(coalesce(p_label, 'Publication'), 200));
  delete from public.senluxe_content_history where kind = 'publication'
    and id in (select id from public.senluxe_content_history where kind = 'publication' order by id desc offset 60);
  perform public.senluxe_log('publication', jsonb_build_object('version', v, 'libelle', p_label, 'octets', sz));
  return jsonb_build_object('version', v, 'published_at', t, 'payload_stamp', pl #>> '{meta,generatedAt}');
end $$;

-- Compatibilité : ancienne signature (renvoie la date de publication).
create or replace function public.senluxe_publish(p_password text, p_payload jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
begin
  return (public.senluxe_publish_v2(p_password, p_payload, 'Publication')->>'published_at')::timestamptz;
end $$;

create or replace function public.senluxe_save_draft(p_password text, p_payload jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  perform public.senluxe_assert_admin(p_password);
  insert into public.senluxe_site_content (id, payload, updated_at) values ('draft', p_payload, t)
    on conflict (id) do update set payload = excluded.payload, updated_at = t;
  return t;
end $$;

create or replace function public.senluxe_get_draft(p_password text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_password);
  return (select jsonb_build_object('payload', payload, 'updated_at', updated_at) from public.senluxe_site_content where id = 'draft');
end $$;

create or replace function public.senluxe_admin_history(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'kind', kind, 'version', version,
           'label', label, 'size_bytes', pg_column_size(payload), 'products', jsonb_array_length(coalesce(payload->'products','[]'::jsonb))) order by id desc)
         from public.senluxe_content_history), '[]'::jsonb);
end $$;

create or replace function public.senluxe_admin_history_get(p_token text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return (select payload from public.senluxe_content_history where id = p_id);
end $$;

-- Statut public (diagnostic) : version publiée, date, état du schéma. Aucune donnée privée.
create or replace function public.senluxe_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'schema', 4,
    'version', (select max(version) from public.senluxe_publications),
    'published_at', (select updated_at from public.senluxe_site_content where id = 'main'),
    'server_time', now())
$$;

-- =====================================================================================
-- FONCTIONS : PANIERS (site public)
-- =====================================================================================
create or replace function public.senluxe_norm_phone(p text) returns text
language sql immutable as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9), '')
$$;

create or replace function public.senluxe_cart_sync(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cid text := left(p->>'cart_id', 64); vid text := left(p->>'visitor_id', 64);
        items jsonb := coalesce(p->'items', '[]'::jsonb); c record; cnt int; tot int; contact jsonb := null; step text;
begin
  if cid is null or cid !~ '^[A-Za-z0-9_-]{6,64}$' then raise exception 'Panier invalide'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 60 or pg_column_size(items) > 30000 then raise exception 'Panier trop volumineux'; end if;
  if not public.senluxe_rate_ok('cart:' || coalesce(vid, cid), 90, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'reason', 'rate');
  end if;
  select coalesce(sum(greatest(1, least(99, coalesce((i->>'qty')::int, 1)))), 0),
         coalesce(sum(greatest(0, coalesce((i->>'price')::numeric, 0)) * greatest(1, least(99, coalesce((i->>'qty')::int, 1)))), 0)
    into cnt, tot from jsonb_array_elements(items) i;
  if p ? 'contact' and jsonb_typeof(p->'contact') = 'object' then
    contact := jsonb_strip_nulls(jsonb_build_object('name', nullif(left(trim(p#>>'{contact,name}'), 80), ''),
                                                    'phone', nullif(left(trim(p#>>'{contact,phone}'), 30), '')));
    if contact = '{}'::jsonb then contact := null; end if;
  end if;
  select * into c from public.senluxe_carts where id = cid;
  if c.id is not null and c.status = 'converted' then return jsonb_build_object('ok', true, 'status', 'converted'); end if;
  step := case when c.id is null then 'créé' when p->>'stage' = 'checkout' and c.stage <> 'checkout' then 'début de commande'
               when cnt > c.item_count then 'produit ajouté' else 'panier modifié' end;
  insert into public.senluxe_carts as t (id, visitor_id, session_id, items, item_count, total, stage, direct, contact,
        contact_consent, customer_key, history)
  values (cid, vid, left(p->>'session_id', 64), items, cnt, tot, case when p->>'stage' = 'checkout' then 'checkout' else 'cart' end,
        coalesce((p->>'direct')::boolean, false), contact, coalesce((p->>'consent')::boolean, false),
        public.senluxe_norm_phone(contact->>'phone'), jsonb_build_array(jsonb_build_object('at', now(), 'step', step, 'items', cnt, 'total', tot)))
  on conflict (id) do update set
    items = case when jsonb_array_length(excluded.items) > 0 or t.stage = 'cart' then excluded.items else t.items end,
    item_count = case when jsonb_array_length(excluded.items) > 0 or t.stage = 'cart' then excluded.item_count else t.item_count end,
    total = case when jsonb_array_length(excluded.items) > 0 or t.stage = 'cart' then excluded.total else t.total end,
    stage = case when t.stage = 'checkout' then 'checkout' else excluded.stage end,
    contact = coalesce(excluded.contact, t.contact),
    contact_consent = t.contact_consent or excluded.contact_consent,
    customer_key = coalesce(excluded.customer_key, t.customer_key),
    status = case when t.status = 'archived' then 'active' else t.status end,
    updated_at = now(), last_activity = now(),
    history = (t.history || jsonb_build_array(jsonb_build_object('at', now(), 'step', step, 'items', excluded.item_count, 'total', excluded.total)))
              - (case when jsonb_array_length(t.history) > 40 then 0 else 999 end);
  return jsonb_build_object('ok', true, 'status', 'active');
end $$;

-- =====================================================================================
-- FONCTIONS : COMMANDES (site public) — transactionnelles, validées côté serveur
-- =====================================================================================
create or replace function public.senluxe_place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pub jsonb; items jsonb := coalesce(p->'items', '[]'::jsonb); it jsonb; prod jsonb; o record; oid uuid; onum text;
        cid text := left(p->>'cart_id', 64); vid text := left(p->>'visitor_id', 64); ref text := left(p->>'client_ref', 64);
        dlv jsonb; fee int; sub int := 0; unit int; v_qty int; expected numeric; mism text := null; clean jsonb := '[]'::jsonb;
        nm text := trim(coalesce(p#>>'{customer,name}', '')); ph text := trim(coalesce(p#>>'{customer,phone}', ''));
        ad text := trim(coalesce(p#>>'{customer,address}', '')); st record; need record; lim int;
begin
  -- Doublon (double clic, nouvel essai réseau) : la même commande est renvoyée.
  if ref is not null then
    select * into o from public.senluxe_orders where client_ref = ref;
    if o.id is not null then return jsonb_build_object('ok', true, 'duplicate', true, 'id', o.id, 'order_number', o.order_number,
        'total', o.total, 'delivery_fee', o.delivery_fee, 'subtotal', o.subtotal); end if;
  end if;
  lim := coalesce((public.senluxe_setting('rate_orders_per_10min', '5'::jsonb))::text::int, 5);
  if not public.senluxe_rate_ok('order:' || coalesce(vid, 'x'), lim, interval '10 minutes')
     or not public.senluxe_rate_ok('order:all', 60, interval '1 minute') then
    raise exception 'Trop de commandes envoyées en peu de temps. Merci de patienter quelques minutes.';
  end if;
  if length(nm) < 2 or length(nm) > 80 then raise exception 'Nom invalide.'; end if;
  if length(regexp_replace(ph, '\D', '', 'g')) not between 7 and 15 then raise exception 'Numéro de téléphone invalide.'; end if;
  if length(ad) < 3 or length(ad) > 300 then raise exception 'Adresse de livraison invalide.'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 50 then raise exception 'Commande vide ou trop volumineuse.'; end if;

  select payload into pub from public.senluxe_site_content where id = 'main';
  -- Livraison : tarif lu dans la version publiée (identique au panier du site).
  dlv := (select d from jsonb_array_elements(coalesce(pub->'delivery', '[]'::jsonb)) d where d->>'id' = p->>'delivery_id' limit 1);
  if pub is not null and jsonb_array_length(coalesce(pub->'delivery','[]'::jsonb)) > 0 then
    if dlv is null then raise exception 'Option de livraison inconnue.'; end if;
    if dlv->>'active' = 'false' then raise exception 'Cette option de livraison n''est plus proposée.'; end if;
    fee := greatest(0, round(coalesce((dlv->>'price')::numeric, 0)))::int;
  else
    fee := greatest(0, coalesce((p->>'delivery_fee')::int, 0));
    dlv := jsonb_build_object('id', p->>'delivery_id', 'label', p->>'delivery_label', 'price', fee);
  end if;

  for it in select * from jsonb_array_elements(items) loop
    v_qty := coalesce((it->>'qty')::int, 0);
    if v_qty < 1 or v_qty > 99 then raise exception 'Quantité invalide.'; end if;
    unit := round(coalesce((it->>'price')::numeric, -1))::int;
    if unit < 0 or unit > 100000000 then raise exception 'Prix invalide.'; end if;
    prod := (select x from jsonb_array_elements(coalesce(pub->'products','[]'::jsonb)) x where x->>'id' = it->>'id' limit 1);
    if pub is not null then
      if prod is null then raise exception 'Produit introuvable ou retiré : %', left(coalesce(it->>'name', it->>'id'), 80); end if;
      if prod->>'active' = 'false' then raise exception 'Produit indisponible : %', prod->>'name'; end if;
      expected := coalesce((prod->'colors'->>(it->>'color'))::numeric, (prod->>'price')::numeric, unit);
      if unit < expected then mism := coalesce(mism || ' ; ', '') || (prod->>'name') || ' : ' || unit || ' au lieu de ' || expected; end if;
    end if;
    sub := sub + unit * v_qty;
    clean := clean || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', it->>'id', 'name', left(coalesce(prod->>'name', it->>'name'), 160), 'qty', v_qty, 'price', unit,
      'color', left(it->>'color', 60), 'size', left(it->>'size', 30), 'lens', left(it->>'lens', 60),
      'opts', case when jsonb_typeof(it->'opts') = 'array' then it->'opts' end, 'img', left(it->>'img', 500),
      'collection', prod->>'cat')));
  end loop;

  -- Stock : contrôle puis décompte dans la même transaction (verrou de ligne).
  for need in select x->>'id' as pid, sum((x->>'qty')::int) as q from jsonb_array_elements(clean) x group by 1 loop
    select * into st from public.senluxe_stock where product_id = need.pid for update;
    if st.product_id is not null and st.qty is not null and st.qty < need.q then
      raise exception 'Stock insuffisant pour « % » (disponible : %).',
        coalesce((select x->>'name' from jsonb_array_elements(clean) x where x->>'id' = need.pid limit 1), need.pid), st.qty;
    end if;
  end loop;
  for need in select x->>'id' as pid, sum((x->>'qty')::int) as q from jsonb_array_elements(clean) x group by 1 loop
    update public.senluxe_stock set qty = qty - need.q, updated_at = now() where product_id = need.pid and qty is not null;
  end loop;

  onum := 'SL-' || to_char(now() at time zone 'Africa/Dakar', 'YYMMDD') || '-' || lpad(nextval('public.senluxe_order_seq')::text, 4, '0');
  insert into public.senluxe_orders (order_number, client_ref, status, channel, cart_id, visitor_id, customer, delivery, items,
      subtotal, delivery_fee, total, price_check, stock_applied)
  values (onum, ref, 'Nouvelle', left(coalesce(p->>'channel', 'site'), 20), cid, vid,
      jsonb_strip_nulls(jsonb_build_object('name', left(nm, 80), 'phone', left(ph, 30), 'address', left(ad, 300),
        'comment', nullif(left(trim(coalesce(p#>>'{customer,comment}', '')), 1000), ''))),
      jsonb_build_object('id', dlv->>'id', 'label', dlv->>'label', 'fee', fee),
      clean, sub, fee, sub + fee, mism, true)
  returning id into oid;
  insert into public.senluxe_order_events (order_id, kind, to_status, note) values (oid, 'créée', 'Nouvelle', 'Commande enregistrée depuis le site');
  if mism is not null then insert into public.senluxe_order_events (order_id, kind, note) values (oid, 'contrôle prix', mism); end if;

  if cid is not null then
    update public.senluxe_carts set status = 'converted', order_id = oid, recovered = (abandoned_at is not null),
      updated_at = now(), last_activity = now(),
      history = history || jsonb_build_array(jsonb_build_object('at', now(), 'step', 'commande confirmée', 'order', onum))
    where id = cid;
  end if;
  return jsonb_build_object('ok', true, 'id', oid, 'order_number', onum, 'subtotal', sub, 'delivery_fee', fee, 'total', sub + fee);
end $$;

-- Le site indique le canal finalement utilisé (e-mail confirmé ou WhatsApp).
create or replace function public.senluxe_order_channel(p_ref text, p_channel text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_channel not in ('email','whatsapp','site') then return; end if;
  update public.senluxe_orders set channel = p_channel, updated_at = now() where client_ref = p_ref and created_at > now() - interval '2 hours';
end $$;

-- =====================================================================================
-- FONCTIONS : ADMINISTRATION DES COMMANDES ET DU STOCK
-- =====================================================================================
create or replace function public.senluxe_admin_orders(p_token text, p_updated_after timestamptz default null, p_limit int default 5000) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from (
     select * from public.senluxe_orders where p_updated_after is null or updated_at > p_updated_after
     order by created_at desc limit least(coalesce(p_limit, 5000), 20000)) o), '[]'::jsonb);
end $$;

create or replace function public.senluxe_admin_order_timeline(p_token text, p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(to_jsonb(e) order by e.at, e.id) from public.senluxe_order_events e where order_id = p_order), '[]'::jsonb);
end $$;

create or replace function public.senluxe_admin_order_status(p_token text, p_order uuid, p_status text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o record; it record; restored boolean := false; applied boolean;
begin
  perform public.senluxe_assert_admin(p_token);
  if p_status not in ('Nouvelle','Confirmée','En préparation','Expédiée','Livrée','Annulée') then raise exception 'Statut invalide'; end if;
  select * into o from public.senluxe_orders where id = p_order for update;
  if o.id is null then raise exception 'Commande introuvable'; end if;
  applied := o.stock_applied;
  if p_status = 'Annulée' and o.stock_applied then
    for it in select x->>'id' as pid, sum((x->>'qty')::int) as q from jsonb_array_elements(o.items) x group by 1 loop
      update public.senluxe_stock set qty = qty + it.q, updated_at = now() where product_id = it.pid and qty is not null;
    end loop;
    applied := false; restored := true;
  elsif o.status = 'Annulée' and p_status <> 'Annulée' and not o.stock_applied then
    for it in select x->>'id' as pid, sum((x->>'qty')::int) as q from jsonb_array_elements(o.items) x group by 1 loop
      update public.senluxe_stock set qty = greatest(0, qty - it.q), updated_at = now() where product_id = it.pid and qty is not null;
    end loop;
    applied := true;
  end if;
  update public.senluxe_orders set status = p_status, stock_applied = applied, updated_at = now() where id = p_order;
  insert into public.senluxe_order_events (order_id, kind, from_status, to_status, note)
    values (p_order, case when restored then 'statut + stock restauré' else 'statut' end, o.status, p_status, nullif(left(coalesce(p_note, ''), 500), ''));
  perform public.senluxe_log('commande_statut', jsonb_build_object('commande', o.order_number, 'de', o.status, 'vers', p_status));
  return jsonb_build_object('ok', true, 'stock_restored', restored);
end $$;

create or replace function public.senluxe_admin_order_note(p_token text, p_order uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  update public.senluxe_orders set note = left(p_note, 2000), updated_at = now() where id = p_order;
  insert into public.senluxe_order_events (order_id, kind, note) values (p_order, 'note', left(p_note, 500));
end $$;

create or replace function public.senluxe_admin_order_archive(p_token text, p_order uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  update public.senluxe_orders set archived = p_archived, updated_at = now() where id = p_order;
  insert into public.senluxe_order_events (order_id, kind) values (p_order, case when p_archived then 'archivée' else 'désarchivée' end);
end $$;

-- Compatibilité : ancien changement de statut sur les événements (anciennes données).
create or replace function public.senluxe_set_order_status(p_password text, p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  perform public.senluxe_assert_admin(p_password);
  if p_status not in ('Nouvelle','Confirmée','En préparation','Expédiée','Livrée','Annulée') then raise exception 'Statut invalide'; end if;
  update public.senluxe_events set status = p_status where id = p_id and type = 'order';
  select id into oid from public.senluxe_orders where legacy_event_id = p_id;
  if oid is not null then perform public.senluxe_admin_order_status(p_password, oid, p_status, null); end if;
end $$;

create or replace function public.senluxe_admin_stock(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_object_agg(product_id, qty) from public.senluxe_stock), '{}'::jsonb);
end $$;

create or replace function public.senluxe_admin_stock_set(p_token text, p_product text, p_qty int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  insert into public.senluxe_stock (product_id, qty, updated_at) values (p_product, case when p_qty is null then null else greatest(0, p_qty) end, now())
    on conflict (product_id) do update set qty = excluded.qty, updated_at = now();
  update public.senluxe_site_content set payload = jsonb_set(payload, '{products}', (
      select coalesce(jsonb_agg(case when x->>'id' = p_product then jsonb_set(x, '{stock}', coalesce(to_jsonb(p_qty), 'null'::jsonb)) else x end), '[]'::jsonb)
      from jsonb_array_elements(payload->'products') x))
    where id = 'main' and jsonb_typeof(payload->'products') = 'array';
  perform public.senluxe_log('stock', jsonb_build_object('produit', p_product, 'quantite', p_qty));
end $$;

-- =====================================================================================
-- FONCTIONS : PANIERS (administration)
-- =====================================================================================
create or replace function public.senluxe_mark_abandoned() returns void
language plpgsql security definer set search_path = public as $$
declare m int := coalesce((public.senluxe_setting('abandon_minutes', '60'::jsonb))::text::int, 60);
begin
  update public.senluxe_carts set abandoned_at = last_activity + make_interval(mins => m)
   where status = 'active' and item_count > 0 and abandoned_at is null and last_activity < now() - make_interval(mins => m);
  -- Un panier réactivé après abandon redevient actif (l'abandon reste mémorisé pour « récupéré »).
end $$;
revoke all on function public.senluxe_mark_abandoned() from public, anon, authenticated;

create or replace function public.senluxe_admin_carts(p_token text, p_updated_after timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m int := coalesce((public.senluxe_setting('abandon_minutes', '60'::jsonb))::text::int, 60);
begin
  perform public.senluxe_assert_admin(p_token);
  perform public.senluxe_mark_abandoned();
  return coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('state',
      case when c.status = 'converted' and c.recovered then 'récupéré'
           when c.status = 'converted' then 'converti'
           when c.status = 'archived' then 'archivé'
           when c.item_count > 0 and c.last_activity < now() - make_interval(mins => m) then 'abandonné'
           when c.item_count > 0 then 'actif' else 'vide' end,
      'order_number', (select order_number from public.senluxe_orders o where o.id = c.order_id)) order by c.last_activity desc)
    from public.senluxe_carts c where (p_updated_after is null or c.updated_at > p_updated_after)), '[]'::jsonb);
end $$;

create or replace function public.senluxe_admin_cart_archive(p_token text, p_ids text[], p_archived boolean) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public.senluxe_assert_admin(p_token);
  update public.senluxe_carts set status = case when p_archived then 'archived' else 'active' end, updated_at = now()
   where id = any(p_ids) and status <> 'converted';
  get diagnostics n = row_count;
  perform public.senluxe_log('paniers_archives', jsonb_build_object('nombre', n, 'archives', p_archived));
  return n;
end $$;

-- =====================================================================================
-- FONCTIONS : ÉVÉNEMENTS (administration — table d'origine)
-- =====================================================================================
create or replace function public.senluxe_admin_events(p_password text, p_after_id bigint, p_since timestamptz, p_limit int)
returns setof public.senluxe_events language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_password);
  return query select * from public.senluxe_events
    where (p_after_id is null or id > p_after_id) and (p_since is null or created_at >= p_since)
    order by id limit least(coalesce(p_limit, 1000), 1000);
end $$;

-- Les anciens sites (encore en cache chez certains visiteurs) envoient nom/téléphone dans les
-- événements : ce déclencheur les range dans les tables Paniers et Commandes puis les retire
-- de l'événement. Les statistiques ne contiennent ainsi aucune donnée personnelle.
create or replace function public.senluxe_events_route() returns trigger
language plpgsql security definer set search_path = public as $$
declare d jsonb := coalesce(new.data, '{}'::jsonb); cnt int; tot int; oid uuid;
begin
  if new.type = 'cart' and new.cart_id is not null and jsonb_typeof(d->'items') = 'array' then
    select coalesce(sum(greatest(1, coalesce((i->>'qty')::int, 1))), 0) into cnt from jsonb_array_elements(d->'items') i;
    tot := coalesce((d->>'total')::numeric, 0)::int;
    insert into public.senluxe_carts as t (id, visitor_id, session_id, items, item_count, total, direct, created_at, updated_at, last_activity, history)
      values (new.cart_id, new.visitor_id, new.session_id, d->'items', cnt, tot, coalesce((d->>'direct')::boolean, false), new.created_at, new.created_at, new.created_at,
              jsonb_build_array(jsonb_build_object('at', new.created_at, 'step', 'créé', 'items', cnt, 'total', tot)))
      on conflict (id) do update set items = excluded.items, item_count = excluded.item_count, total = excluded.total,
        updated_at = greatest(t.updated_at, excluded.updated_at), last_activity = greatest(t.last_activity, excluded.last_activity),
        history = t.history || jsonb_build_array(jsonb_build_object('at', excluded.last_activity, 'step', 'panier modifié', 'items', excluded.item_count, 'total', excluded.total))
      where t.status <> 'converted';
  elsif new.type = 'checkout' and new.cart_id is not null and (d ? 'name' or d ? 'phone') then
    insert into public.senluxe_carts as t (id, visitor_id, session_id, stage, contact, customer_key, created_at, updated_at, last_activity)
      values (new.cart_id, new.visitor_id, new.session_id, 'checkout',
              jsonb_strip_nulls(jsonb_build_object('name', nullif(left(d->>'name', 80), ''), 'phone', nullif(left(d->>'phone', 30), ''))),
              public.senluxe_norm_phone(d->>'phone'), new.created_at, new.created_at, new.created_at)
      on conflict (id) do update set stage = 'checkout', contact = coalesce(t.contact, '{}'::jsonb) || excluded.contact,
        customer_key = coalesce(excluded.customer_key, t.customer_key), updated_at = now(),
        last_activity = greatest(t.last_activity, excluded.last_activity)
      where t.status <> 'converted';
    new.data := d - 'name' - 'phone';
  elsif new.type = 'order' and d ? 'orderNumber' then
    if not exists (select 1 from public.senluxe_orders where order_number = d->>'orderNumber') then
      insert into public.senluxe_orders (order_number, created_at, updated_at, status, channel, cart_id, visitor_id, customer, delivery, items,
          subtotal, delivery_fee, total, stock_applied)
      values (left(d->>'orderNumber', 40), new.created_at, new.created_at, coalesce(new.status, 'Nouvelle'), left(d->>'channel', 20), new.cart_id, new.visitor_id,
          jsonb_strip_nulls(jsonb_build_object('name', left(d->>'name', 80), 'phone', left(d->>'phone', 30), 'address', left(d->>'address', 300), 'comment', nullif(left(d->>'comment', 1000), ''))),
          jsonb_build_object('label', d->>'delivery', 'fee', coalesce((d->>'deliveryFee')::numeric, 0)::int),
          coalesce(d->'items', '[]'::jsonb), coalesce((d->>'subtotal')::numeric, 0)::int, coalesce((d->>'deliveryFee')::numeric, 0)::int,
          coalesce((d->>'total')::numeric, 0)::int, false)
      returning id into oid;
      insert into public.senluxe_order_events (order_id, at, kind, to_status, note) values (oid, new.created_at, 'créée', 'Nouvelle', 'Commande reçue (ancien format du site)');
      if new.cart_id is not null then
        update public.senluxe_carts set status = 'converted', order_id = oid, recovered = (abandoned_at is not null), updated_at = now() where id = new.cart_id;
      end if;
    end if;
    new.data := d - 'name' - 'phone' - 'address' - 'comment';
  end if;
  return new;
end $$;
drop trigger if exists senluxe_events_route on public.senluxe_events;
create trigger senluxe_events_route before insert on public.senluxe_events for each row execute function public.senluxe_events_route();

-- =====================================================================================
-- FONCTIONS : BIBLIOTHÈQUE, SAUVEGARDES, MÉDIAS
-- =====================================================================================
create or replace function public.senluxe_admin_library(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(to_jsonb(l) order by l.updated_at desc) from public.senluxe_library l), '[]'::jsonb);
end $$;

create or replace function public.senluxe_admin_library_save(p_token text, p_item jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare rid uuid := nullif(p_item->>'id', '')::uuid; r record;
begin
  perform public.senluxe_assert_admin(p_token);
  if coalesce(trim(p_item->>'name'), '') = '' then raise exception 'Nom du modèle obligatoire.'; end if;
  if p_item->'payload' is null then raise exception 'Contenu du modèle absent.'; end if;
  if rid is not null and exists (select 1 from public.senluxe_library where id = rid) then
    update public.senluxe_library set category = coalesce(p_item->>'category', category), name = left(p_item->>'name', 120),
      description = left(p_item->>'description', 1000), payload = p_item->'payload', thumbnail = left(p_item->>'thumbnail', 300000),
      archived = coalesce((p_item->>'archived')::boolean, archived), updated_at = now() where id = rid returning * into r;
  else
    insert into public.senluxe_library (id, category, name, description, payload, thumbnail, archived)
      values (coalesce(rid, gen_random_uuid()), coalesce(p_item->>'category', 'sections'), left(p_item->>'name', 120), left(p_item->>'description', 1000),
              p_item->'payload', left(p_item->>'thumbnail', 300000), coalesce((p_item->>'archived')::boolean, false)) returning * into r;
  end if;
  perform public.senluxe_log('bibliotheque', jsonb_build_object('modele', r.name));
  return to_jsonb(r);
end $$;

create or replace function public.senluxe_admin_library_delete(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  delete from public.senluxe_library where id = p_id;
  perform public.senluxe_log('bibliotheque_suppression', jsonb_build_object('id', p_id));
end $$;

create or replace function public.senluxe_admin_backup_create(p_token text, p_kind text, p_label text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform public.senluxe_assert_admin(p_token);
  insert into public.senluxe_backups (kind, label, size_bytes, payload) values (coalesce(p_kind, 'full'), left(p_label, 200), pg_column_size(p_payload), p_payload)
    returning id, created_at, kind, label, size_bytes into r;
  delete from public.senluxe_backups where kind = 'auto' and id in (select id from public.senluxe_backups where kind = 'auto' order by id desc offset 30);
  perform public.senluxe_log('sauvegarde', jsonb_build_object('type', p_kind, 'libelle', p_label));
  return to_jsonb(r);
end $$;

create or replace function public.senluxe_admin_backups(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'created_at', created_at, 'kind', kind, 'label', label, 'size_bytes', size_bytes) order by id desc)
    from public.senluxe_backups), '[]'::jsonb);
end $$;

create or replace function public.senluxe_admin_backup_get(p_token text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  perform public.senluxe_log('restauration_lecture', jsonb_build_object('sauvegarde', p_id));
  return (select payload from public.senluxe_backups where id = p_id);
end $$;

create or replace function public.senluxe_admin_backup_delete(p_token text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  delete from public.senluxe_backups where id = p_id;
  perform public.senluxe_log('sauvegarde_suppression', jsonb_build_object('id', p_id));
end $$;

-- Ticket d'envoi : autorise UN fichier, à UN nom imprévisible, pendant 10 minutes.
create or replace function public.senluxe_admin_upload_ticket(p_token text, p_folder text, p_filename text, p_mime text, p_size int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ext text; nm text; fld text := coalesce(nullif(regexp_replace(lower(coalesce(p_folder, '')), '[^a-z0-9-]', '', 'g'), ''), 'divers');
begin
  perform public.senluxe_assert_admin(p_token);
  if p_mime not in ('image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm') then
    raise exception 'Type de fichier refusé (%). Formats acceptés : JPEG, PNG, WebP, GIF, AVIF, MP4, WebM.', p_mime;
  end if;
  if p_size is null or p_size <= 0 or p_size > (case when p_mime like 'video/%' then 50 else 10 end) * 1024 * 1024 then
    raise exception 'Fichier trop lourd (10 Mo maximum pour une image, 50 Mo pour une vidéo).';
  end if;
  ext := case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'image/gif' then 'gif'
                     when 'image/avif' then 'avif' when 'video/mp4' then 'mp4' else 'webm' end;
  nm := fld || '/' || to_char(now(), 'YYYY/MM') || '/' || encode(extensions.gen_random_bytes(9), 'hex') || '-' ||
        left(coalesce(nullif(regexp_replace(lower(regexp_replace(coalesce(p_filename, ''), '\.[^.]*$', '')), '[^a-z0-9]+', '-', 'g'), ''), 'media'), 40) || '.' || ext;
  insert into public.senluxe_upload_tickets (object_name, expires_at, mime, size_bytes) values (nm, now() + interval '10 minutes', p_mime, p_size);
  delete from public.senluxe_upload_tickets where expires_at < now() - interval '1 day';
  return jsonb_build_object('bucket', 'senluxe-media', 'path', nm);
end $$;

create or replace function public.senluxe_upload_allowed(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.senluxe_upload_tickets where object_name = p_name and expires_at > now())
$$;
grant execute on function public.senluxe_upload_allowed(text) to anon, authenticated;

create or replace function public.senluxe_admin_media_register(p_token text, p_item jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform public.senluxe_assert_admin(p_token);
  insert into public.senluxe_media (path, url, folder, mime, size_bytes, width, height, name)
    values (p_item->>'path', p_item->>'url', split_part(p_item->>'path', '/', 1), p_item->>'mime', (p_item->>'size')::int,
            (p_item->>'width')::int, (p_item->>'height')::int, left(p_item->>'name', 200))
    on conflict (path) do update set url = excluded.url returning * into r;
  delete from public.senluxe_upload_tickets where object_name = p_item->>'path';
  return to_jsonb(r);
end $$;

create or replace function public.senluxe_admin_media(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.id desc) from public.senluxe_media m), '[]'::jsonb);
end $$;

-- Diagnostic complet (gestionnaire › DÉTAILS).
create or replace function public.senluxe_admin_diagnostic(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return jsonb_build_object(
    'schema', 4,
    'server_time', now(),
    'published_at', (select updated_at from public.senluxe_site_content where id = 'main'),
    'draft_at', (select updated_at from public.senluxe_site_content where id = 'draft'),
    'version', (select max(version) from public.senluxe_publications),
    'publications', (select count(*) from public.senluxe_publications),
    'orders', (select count(*) from public.senluxe_orders),
    'orders_new', (select count(*) from public.senluxe_orders where status = 'Nouvelle'),
    'carts', (select count(*) from public.senluxe_carts),
    'events', (select count(*) from public.senluxe_events),
    'events_with_pii', (select count(*) from public.senluxe_events where data ?| array['name','phone','address']),
    'stock_rows', (select count(*) from public.senluxe_stock),
    'library', (select count(*) from public.senluxe_library),
    'backups', (select count(*) from public.senluxe_backups),
    'media', (select count(*) from public.senluxe_media),
    'sessions', (select count(*) from public.senluxe_admin_sessions where not revoked and expires_at > now()),
    'failed_logins_24h', (select count(*) from public.senluxe_login_attempts where not ok and at > now() - interval '1 day'),
    'realtime_tables', (select coalesce(jsonb_agg(tablename), '[]'::jsonb) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename like 'senluxe%'),
    'bucket', (select to_jsonb(b) - 'owner' from storage.buckets b where id = 'senluxe-media'),
    'password_changed_at', (select changed_at from public.senluxe_admin where id = 1),
    'password_algo', (select algo from public.senluxe_admin where id = 1));
end $$;

-- =====================================================================================
-- DROITS D'EXÉCUTION
-- =====================================================================================
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'senluxe\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    if f.proname in ('senluxe_admin_check','senluxe_admin_login','senluxe_admin_logout','senluxe_admin_session_info','senluxe_admin_sessions_list',
        'senluxe_admin_session_revoke','senluxe_admin_change_password','senluxe_admin_log_list','senluxe_admin_settings','senluxe_admin_setting_set',
        'senluxe_publish','senluxe_publish_v2','senluxe_save_draft','senluxe_get_draft','senluxe_admin_history','senluxe_admin_history_get',
        'senluxe_status','senluxe_cart_sync','senluxe_place_order','senluxe_order_channel','senluxe_admin_orders','senluxe_admin_order_timeline',
        'senluxe_admin_order_status','senluxe_admin_order_note','senluxe_admin_order_archive','senluxe_set_order_status','senluxe_admin_stock',
        'senluxe_admin_stock_set','senluxe_admin_carts','senluxe_admin_cart_archive','senluxe_admin_events','senluxe_admin_library',
        'senluxe_admin_library_save','senluxe_admin_library_delete','senluxe_admin_backup_create','senluxe_admin_backups','senluxe_admin_backup_get',
        'senluxe_admin_backup_delete','senluxe_admin_upload_ticket','senluxe_upload_allowed','senluxe_admin_media_register','senluxe_admin_media',
        'senluxe_admin_diagnostic','senluxe_norm_phone') then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    else
      execute format('revoke all on function %s from anon, authenticated', f.sig);
    end if;
  end loop;
end $$;

-- =====================================================================================
-- 8. SUPABASE STORAGE — bucket public en lecture, écriture uniquement par ticket admin
-- =====================================================================================
do $$ begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('senluxe-media', 'senluxe-media', true, 52428800,
          array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
exception when others then raise notice 'Storage : bucket non configuré (%)', sqlerrm; end $$;

do $$ begin
  execute 'drop policy if exists senluxe_media_insert on storage.objects';
  execute $p$create policy senluxe_media_insert on storage.objects for insert to anon, authenticated
           with check (bucket_id = 'senluxe-media' and public.senluxe_upload_allowed(name))$p$;
  execute 'drop policy if exists senluxe_media_read on storage.objects';
  execute $p$create policy senluxe_media_read on storage.objects for select to anon, authenticated
           using (bucket_id = 'senluxe-media')$p$;
exception when others then raise notice 'Storage : règles non créées (%)', sqlerrm; end $$;

-- =====================================================================================
-- 9. REALTIME — le site public écoute les versions publiées et le stock (jamais les brouillons)
-- =====================================================================================
do $$ declare t text; begin
  foreach t in array array['senluxe_site_content','senluxe_publications','senluxe_stock'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
exception when others then raise notice 'Temps réel non activé : %', sqlerrm; end $$;

-- =====================================================================================
-- 10. REPRISE DES ANCIENNES DONNÉES (une seule fois, sans perte)
-- =====================================================================================
-- Commandes anciennement stockées dans senluxe_events → table senluxe_orders.
insert into public.senluxe_orders (order_number, created_at, updated_at, status, channel, cart_id, visitor_id, customer, delivery, items,
    subtotal, delivery_fee, total, stock_applied, legacy_event_id)
select distinct on (e.data->>'orderNumber')
  left(e.data->>'orderNumber', 40), e.created_at, e.created_at,
  case when e.status in ('Nouvelle','Confirmée','En préparation','Expédiée','Livrée','Annulée') then e.status else 'Nouvelle' end,
  left(e.data->>'channel', 20), e.cart_id, e.visitor_id,
  jsonb_strip_nulls(jsonb_build_object('name', left(e.data->>'name', 80), 'phone', left(e.data->>'phone', 30),
     'address', left(e.data->>'address', 300), 'comment', nullif(left(e.data->>'comment', 1000), ''))),
  jsonb_build_object('label', e.data->>'delivery', 'fee', coalesce((e.data->>'deliveryFee')::numeric, 0)::int),
  coalesce(e.data->'items', '[]'::jsonb), coalesce((e.data->>'subtotal')::numeric, 0)::int,
  coalesce((e.data->>'deliveryFee')::numeric, 0)::int, coalesce((e.data->>'total')::numeric, 0)::int, false, e.id
from public.senluxe_events e
where e.type = 'order' and e.data ? 'orderNumber'
  and not exists (select 1 from public.senluxe_orders o where o.order_number = e.data->>'orderNumber')
order by e.data->>'orderNumber', e.id;

insert into public.senluxe_order_events (order_id, at, kind, to_status, note)
select o.id, o.created_at, 'créée', 'Nouvelle', 'Reprise depuis les anciennes statistiques'
from public.senluxe_orders o where o.legacy_event_id is not null
  and not exists (select 1 from public.senluxe_order_events x where x.order_id = o.id);

-- Paniers anciennement déduits des événements → table senluxe_carts.
insert into public.senluxe_carts (id, visitor_id, session_id, created_at, updated_at, last_activity, items, item_count, total, direct, history)
select c.cart_id, c.visitor_id, c.session_id, c.first_at, c.last_at, c.last_at, coalesce(c.items, '[]'::jsonb),
       coalesce((select sum(greatest(1, coalesce((i->>'qty')::int, 1))) from jsonb_array_elements(coalesce(c.items, '[]'::jsonb)) i), 0),
       coalesce(c.total, 0), coalesce(c.direct, false), jsonb_build_array(jsonb_build_object('at', c.first_at, 'step', 'créé'))
from (
  select e.cart_id, min(e.visitor_id) as visitor_id, min(e.session_id) as session_id, min(e.created_at) as first_at, max(e.created_at) as last_at,
         (array_agg(e.data->'items' order by e.id desc) filter (where e.type = 'cart'))[1] as items,
         (array_agg((e.data->>'total')::numeric::int order by e.id desc) filter (where e.type = 'cart'))[1] as total,
         bool_or(coalesce((e.data->>'direct')::boolean, false)) as direct
  from public.senluxe_events e where e.cart_id is not null and e.type in ('cart','checkout','order') group by e.cart_id
) c
where not exists (select 1 from public.senluxe_carts x where x.id = c.cart_id);

update public.senluxe_carts c set stage = 'checkout',
  contact = jsonb_strip_nulls(jsonb_build_object('name', nullif(left(e.data->>'name', 80), ''), 'phone', nullif(left(e.data->>'phone', 30), ''))),
  customer_key = public.senluxe_norm_phone(e.data->>'phone')
from (select distinct on (cart_id) cart_id, data from public.senluxe_events where type = 'checkout' and cart_id is not null and (data ? 'name' or data ? 'phone') order by cart_id, id desc) e
where e.cart_id = c.id and c.contact is null;

update public.senluxe_carts c set status = 'converted', order_id = o.id
from public.senluxe_orders o where o.cart_id = c.id and c.status <> 'converted';

-- Les données personnelles des anciens événements, désormais copiées dans Commandes/Paniers, sont retirées des statistiques.
update public.senluxe_events set data = data - 'name' - 'phone' - 'address' - 'comment'
where type in ('checkout','order') and data ?| array['name','phone','address','comment']
  and (type = 'checkout' or exists (select 1 from public.senluxe_orders o where o.order_number = senluxe_events.data->>'orderNumber'));

-- Stock initial : quantités de la version publiée actuelle.
insert into public.senluxe_stock (product_id, qty)
select x->>'id', case when jsonb_typeof(x->'stock') = 'number' then greatest(0, floor((x->>'stock')::numeric))::int else null end
from public.senluxe_site_content s, jsonb_array_elements(coalesce(s.payload->'products', '[]'::jsonb)) x
where s.id = 'main' and x->>'id' is not null
on conflict (product_id) do nothing;

-- Version initiale si le site a déjà été publié avant cette mise à niveau.
insert into public.senluxe_publications (published_at, content_stamp, label, size_bytes, products)
select updated_at, payload #>> '{meta,generatedAt}', 'Version existante (avant mise à niveau)', pg_column_size(payload), jsonb_array_length(coalesce(payload->'products','[]'::jsonb))
from public.senluxe_site_content where id = 'main' and not exists (select 1 from public.senluxe_publications);

notify pgrst, 'reload schema';
select 'SEN LUXE : installation v4 terminée' as resultat, public.senluxe_status() as etat;
