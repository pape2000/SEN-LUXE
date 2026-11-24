-- =====================================================================================
-- SEN LUXE — v6 : code de secours, état de sécurité, garde-fous sur les contenus personnalisés
-- ADDITIVE ET IDEMPOTENTE : aucune table ni ligne existante n'est modifiée ou supprimée.
-- NON APPLIQUÉE EN PRODUCTION tant que le propriétaire ne l'a pas validée.
--
-- Retour arrière (sans toucher aux données commerciales) :
--   drop trigger if exists senluxe_site_content_v6_guard on public.senluxe_site_content;
--   drop function if exists public.senluxe_v6_guard() , public.senluxe_css_safe(text), public.senluxe_admin_recover(text,text,text),
--     public.senluxe_admin_recovery_generate(text,text), public.senluxe_admin_recovery_revoke(text,text),
--     public.senluxe_admin_recovery_history(text), public.senluxe_admin_security_status(text);
--   (la table senluxe_admin_recovery ne contient que le hachage du code de secours ; elle peut être conservée.)
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.senluxe_admin_recovery (
  id          int primary key default 1 check (id = 1),
  hash        text not null,
  created_at  timestamptz not null default now(),
  used_at     timestamptz,
  revoked_at  timestamptz,
  active      boolean not null default true
);
alter table public.senluxe_admin_recovery enable row level security;
revoke all on public.senluxe_admin_recovery from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- Détecte tout contenu CSS dangereux (utilisé aussi par le garde-fou ci-dessous)
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_css_safe(p_css text) returns boolean
language sql immutable set search_path = public as $$
  select p_css is null or (
    length(p_css) <= 20000
    and p_css !~* '(@import|@charset|@font-face|@namespace|url\s*\(|expression\s*\(|javascript:|vbscript:|data:[a-z]+/|behavior\s*:|-moz-binding|</?\s*(script|style|iframe|object|embed|link|meta)|<!--|\\[0-9a-f]{1,6}|\\u|\\x|&#)'
  )
$$;

-- -------------------------------------------------------------------------------------
-- Garde-fou : un contenu publié ne peut pas embarquer de CSS ou de script dangereux
-- dans les champs v6 (animLib, integrations). Les autres champs ne sont pas concernés.
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_v6_guard() returns trigger
language plpgsql set search_path = public as $$
declare a jsonb := new.payload -> 'animLib'; it jsonb; ig jsonb := new.payload -> 'integrations'; k text; v jsonb; idv text;
begin
  if a is not null and jsonb_typeof(a) = 'array' then
    if jsonb_array_length(a) > 60 then raise exception 'Trop d''animations personnalisées (60 maximum).'; end if;
    for it in select * from jsonb_array_elements(a) loop
      if not public.senluxe_css_safe(it ->> 'css') or not public.senluxe_css_safe(it::text) then
        raise exception 'Animation personnalisée refusée : contenu non autorisé (« % »).', left(coalesce(it ->> 'name', '?'), 60);
      end if;
    end loop;
  end if;
  if ig is not null and jsonb_typeof(ig) = 'object' then
    for k, v in select * from jsonb_each(ig) loop
      idv := v ->> 'id';
      if idv is not null and idv <> '' and idv !~ '^[A-Za-z0-9_-]{3,40}$' then
        raise exception 'Identifiant d''intégration invalide pour « % ».', left(k, 30);
      end if;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists senluxe_site_content_v6_guard on public.senluxe_site_content;
create trigger senluxe_site_content_v6_guard before insert or update on public.senluxe_site_content
  for each row execute function public.senluxe_v6_guard();

-- -------------------------------------------------------------------------------------
-- État de sécurité (date du dernier changement, code de secours, échecs récents)
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_admin_security_status(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; a record;
begin
  perform public.senluxe_assert_admin(p_token);
  select * into a from public.senluxe_admin where id = 1;
  select * into r from public.senluxe_admin_recovery where id = 1;
  return jsonb_build_object(
    'password_changed_at', a.changed_at,
    'algo', a.algo,
    'recovery', jsonb_build_object('configured', r.id is not null, 'active', coalesce(r.active, false) and r.revoked_at is null and r.used_at is null,
                'created_at', r.created_at, 'used_at', r.used_at, 'revoked_at', r.revoked_at),
    'failures_24h', (select count(*) from public.senluxe_login_attempts where not ok and at > now() - interval '24 hours'),
    'sessions_active', (select count(*) from public.senluxe_admin_sessions where not revoked and expires_at > now()),
    'two_factor', jsonb_build_object('available', false, 'note', 'Architecture prévue ; non activée.'));
end $$;

-- -------------------------------------------------------------------------------------
-- Code de secours : généré côté serveur, affiché UNE fois, conservé haché (bcrypt), usage unique
-- Exige le code actuel (vérification renforcée). Générer un nouveau code révoque l'ancien.
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_admin_recovery_generate(p_token text, p_current text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; raw bytea := extensions.gen_random_bytes(16); code text := ''; i int;
begin
  perform public.senluxe_assert_admin(p_token);
  if (select count(*) from public.senluxe_login_attempts where not ok and at > now() - interval '15 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
  end if;
  if not public.senluxe_password_ok(p_current) then
    insert into public.senluxe_login_attempts (ok) values (false);
    perform pg_sleep(1);
    return jsonb_build_object('ok', false, 'error', 'Code administrateur actuel incorrect.');
  end if;
  for i in 0..15 loop
    code := code || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
    if i in (3, 7, 11) then code := code || '-'; end if;
  end loop;
  insert into public.senluxe_admin_recovery (id, hash, created_at, used_at, revoked_at, active)
    values (1, extensions.crypt(code, extensions.gen_salt('bf', 10)), now(), null, null, true)
  on conflict (id) do update set hash = excluded.hash, created_at = now(), used_at = null, revoked_at = null, active = true;
  perform public.senluxe_log('recuperation_code_genere', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'code', code);
end $$;

create or replace function public.senluxe_admin_recovery_revoke(p_token text, p_current text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.senluxe_assert_admin(p_token);
  if not public.senluxe_password_ok(p_current) then
    insert into public.senluxe_login_attempts (ok) values (false);
    perform pg_sleep(1);
    return jsonb_build_object('ok', false, 'error', 'Code administrateur actuel incorrect.');
  end if;
  update public.senluxe_admin_recovery set active = false, revoked_at = now() where id = 1 and revoked_at is null;
  perform public.senluxe_log('recuperation_code_revoque', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- -------------------------------------------------------------------------------------
-- Récupération : le code de secours (usage unique) permet de choisir un nouveau code.
-- Mêmes limites que la connexion (10 échecs / 15 min, temporisation), toutes sessions révoquées.
-- Ce n'est PAS une connexion : aucun jeton de session n'est délivré ; il faut ensuite se connecter normalement.
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_admin_recover(p_code text, p_new text, p_label text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r record; fails int;
begin
  select count(*) into fails from public.senluxe_login_attempts where not ok and at > now() - interval '15 minutes';
  if fails >= 10 then
    return jsonb_build_object('ok', false, 'locked', true, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
  end if;
  select * into r from public.senluxe_admin_recovery where id = 1;
  if r.id is null or not r.active or r.used_at is not null or r.revoked_at is not null
     or p_code is null or length(p_code) > 40 or extensions.crypt(upper(trim(p_code)), r.hash) <> r.hash then
    insert into public.senluxe_login_attempts (ok) values (false);
    perform public.senluxe_log('recuperation_echec', jsonb_build_object('appareil', left(coalesce(p_label, ''), 120)));
    perform pg_sleep(least(1 + fails * 0.5, 3));
    return jsonb_build_object('ok', false, 'error', 'Code de secours invalide ou déjà utilisé.');
  end if;
  if p_new is null or length(p_new) < 10 or length(p_new) > 200 or p_new !~ '[A-Za-z]' or p_new !~ '[0-9]' then
    return jsonb_build_object('ok', false, 'error', 'Le nouveau code doit contenir au moins 10 caractères, avec une lettre et un chiffre.');
  end if;
  update public.senluxe_admin set salt = '', hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)), algo = 'bcrypt',
         changed_at = now(), must_change = false where id = 1;
  update public.senluxe_admin_recovery set used_at = now(), active = false where id = 1;
  update public.senluxe_admin_sessions set revoked = true where not revoked;
  perform public.senluxe_log('recuperation_reussie', jsonb_build_object('appareil', left(coalesce(p_label, ''), 120)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.senluxe_admin_recovery_history(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.senluxe_assert_admin(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('at', at, 'action', action, 'detail', detail) order by at desc)
                     from (select * from public.senluxe_admin_log where action like 'recuperation\_%' order by at desc limit 50) x), '[]'::jsonb);
end $$;

-- Paramètres du gestionnaire (mgr_*) : forme et taille contrôlées côté serveur, sans remplacer la fonction existante
create or replace function public.senluxe_settings_v6_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.key like 'mgr\_%' or new.key like 'v6\_%' then
    if jsonb_typeof(new.value) not in ('object', 'array') then raise exception 'Paramètre « % » : objet ou liste attendu.', new.key; end if;
    if length(new.value::text) > 300000 then raise exception 'Paramètre « % » trop volumineux.', new.key; end if;
    if not public.senluxe_css_safe(new.value::text) then raise exception 'Paramètre « % » refusé : contenu non autorisé.', new.key; end if;
  end if;
  return new;
end $$;
drop trigger if exists senluxe_settings_v6_guard on public.senluxe_settings;
create trigger senluxe_settings_v6_guard before insert or update on public.senluxe_settings
  for each row execute function public.senluxe_settings_v6_guard();

revoke all on function public.senluxe_css_safe(text) from public, anon, authenticated;
revoke all on function public.senluxe_v6_guard() from public, anon, authenticated;
revoke all on function public.senluxe_settings_v6_guard() from public, anon, authenticated;
grant execute on function public.senluxe_admin_security_status(text)        to anon, authenticated;
grant execute on function public.senluxe_admin_recovery_generate(text,text) to anon, authenticated;
grant execute on function public.senluxe_admin_recovery_revoke(text,text)   to anon, authenticated;
grant execute on function public.senluxe_admin_recover(text,text,text)      to anon, authenticated;
grant execute on function public.senluxe_admin_recovery_history(text)       to anon, authenticated;

notify pgrst, 'reload schema';
