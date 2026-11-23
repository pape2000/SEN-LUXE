-- =====================================================================================
-- SEN LUXE — Durcissement de l'authentification administrateur (v5)
-- Idempotent et non destructif : aucune table ni ligne n'est supprimée.
-- À exécuter APRÈS la baseline v4 (20261118000000_senluxe_v4_baseline.sql).
--
-- Ce que fait ce script :
--  1. Mot de passe haché en bcrypt (pgcrypto) ; les anciens hachages restent valides jusqu'au prochain changement.
--  2. Colonne must_change : un code temporaire impose un changement avant tout accès.
--  3. Sessions « restreintes » : tant que le code n'est pas changé, seules les fonctions
--     senluxe_admin_change_password / logout / session_info répondent.
--  4. Les fonctions administratives n'acceptent QUE des jetons de session (slt_…) :
--     le mot de passe brut n'est plus accepté comme jeton.
--  5. Sessions : inactivité max. 12 h, durée absolue max. 7 jours.
--  6. Temporisation progressive, verrouillage après 10 échecs / 15 min, alerte d'activité suspecte.
--  7. Le code temporaire n'est JAMAIS écrit dans ce fichier (dépôt public) : voir senluxe_admin_bootstrap.
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

alter table public.senluxe_admin          add column if not exists must_change boolean not null default false;
alter table public.senluxe_admin_sessions add column if not exists restricted  boolean not null default false;

-- -------------------------------------------------------------------------------------
-- Vérification du mot de passe : bcrypt (nouveau) ou itérations SHA-256 (ancien)
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_password_ok(p_password text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare a record;
begin
  select * into a from public.senluxe_admin where id = 1;
  if a.id is null or p_password is null or length(p_password) > 200 then return false; end if;
  if a.algo = 'bcrypt' then
    return extensions.crypt(p_password, a.hash) = a.hash;
  end if;
  return public.senluxe_pw_hash(a.salt, p_password, a.algo) = a.hash;
end $$;
revoke all on function public.senluxe_password_ok(text) from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- Initialisation / réinitialisation : exécutable uniquement depuis l'éditeur SQL Supabase
-- (rôle postgres). Jamais accessible via l'API publique.
--   select public.senluxe_admin_bootstrap('<code temporaire>');
-- Le code temporaire est marqué « à changer » : la première connexion force son remplacement.
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_admin_bootstrap(p_temp_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_temp_code is null or length(p_temp_code) < 4 then raise exception 'Code temporaire trop court.'; end if;
  insert into public.senluxe_admin (id, salt, hash, algo, changed_at, must_change)
  values (1, '', extensions.crypt(p_temp_code, extensions.gen_salt('bf', 10)), 'bcrypt', now(), true)
  on conflict (id) do update
    set salt = '', hash = excluded.hash, algo = 'bcrypt', changed_at = now(), must_change = true;
  update public.senluxe_admin_sessions set revoked = true where not revoked;
  perform public.senluxe_log('initialisation_code', '{}'::jsonb);
  return 'Code temporaire enregistré (haché). Toutes les sessions ont été révoquées. Changement obligatoire à la prochaine connexion.';
end $$;
revoke all on function public.senluxe_admin_bootstrap(text) from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- Contrôle d'un jeton de session (aucun mot de passe brut accepté)
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_session_ok(p_token text, p_allow_restricted boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare s record; th text;
begin
  if p_token is null or left(p_token, 4) <> 'slt_' or length(p_token) > 200 then return false; end if;
  th := encode(public.senluxe_sha256(convert_to(p_token, 'UTF8')), 'hex');
  select * into s from public.senluxe_admin_sessions where token_hash = th;
  if s.id is null or s.revoked then return false; end if;
  if s.expires_at < now() or s.created_at < now() - interval '7 days' then return false; end if;
  if s.restricted and not p_allow_restricted then return false; end if;
  if s.last_seen < now() - interval '1 minute' then
    update public.senluxe_admin_sessions
       set last_seen = now(), expires_at = least(created_at + interval '7 days', now() + interval '12 hours')
     where id = s.id;
  end if;
  return true;
end $$;
revoke all on function public.senluxe_session_ok(text, boolean) from public, anon, authenticated;

create or replace function public.senluxe_admin_ok(p_password text) returns boolean
language sql security definer set search_path = public as $$ select public.senluxe_session_ok(p_password, false) $$;
revoke all on function public.senluxe_admin_ok(text) from public, anon, authenticated;

create or replace function public.senluxe_assert_admin(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.senluxe_session_ok(p_token, false) then
    raise exception 'Session administrateur invalide ou expirée. Reconnectez-vous.' using errcode = '28000';
  end if;
end $$;
revoke all on function public.senluxe_assert_admin(text) from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- Connexion : temporisation progressive + verrouillage + alerte
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_admin_login(p_password text, p_label text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare tok text; exp timestamptz := now() + interval '12 hours'; fails int; mc boolean;
begin
  select count(*) into fails from public.senluxe_login_attempts where not ok and at > now() - interval '15 minutes';
  -- IMPORTANT : un échec est renvoyé comme réponse normale (ok=false) et non par RAISE EXCEPTION,
  -- sinon la transaction est annulée et la tentative n'est jamais enregistrée (verrouillage inopérant).
  if fails >= 10 then
    return jsonb_build_object('ok', false, 'locked', true, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
  end if;
  if not public.senluxe_password_ok(p_password) then
    insert into public.senluxe_login_attempts (ok) values (false);
    if fails + 1 = 5 then
      perform public.senluxe_log('activite_suspecte', jsonb_build_object('motif', '5 échecs de connexion en 15 minutes', 'appareil', left(coalesce(p_label, ''), 120)));
    end if;
    perform pg_sleep(least(0.5 + fails * 0.5, 3));
    return jsonb_build_object('ok', false, 'error', 'Mot de passe administrateur incorrect.');
  end if;
  select coalesce(must_change, false) into mc from public.senluxe_admin where id = 1;
  insert into public.senluxe_login_attempts (ok) values (true);
  tok := 'slt_' || encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.senluxe_admin_sessions (token_hash, expires_at, label, restricted)
    values (encode(public.senluxe_sha256(convert_to(tok, 'UTF8')), 'hex'), exp, left(coalesce(p_label, ''), 120), mc);
  delete from public.senluxe_login_attempts where at < now() - interval '30 days';
  delete from public.senluxe_admin_sessions where expires_at < now() - interval '7 days';
  perform public.senluxe_log('connexion', jsonb_build_object('appareil', left(coalesce(p_label, ''), 120), 'code_temporaire', mc));
  return jsonb_build_object('ok', true, 'token', tok, 'expires_at', exp, 'must_change', mc);
end $$;

create or replace function public.senluxe_admin_session_info(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare th text := encode(public.senluxe_sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
begin
  if not public.senluxe_session_ok(p_token, true) then
    raise exception 'Session administrateur invalide ou expirée. Reconnectez-vous.' using errcode = '28000';
  end if;
  return (select jsonb_build_object('created_at', created_at, 'expires_at', expires_at, 'label', label, 'must_change', restricted)
            from public.senluxe_admin_sessions where token_hash = th);
end $$;

-- -------------------------------------------------------------------------------------
-- Changement du code : ancien code vérifié côté serveur, bcrypt, révocation des autres sessions
-- -------------------------------------------------------------------------------------
create or replace function public.senluxe_admin_change_password(p_token text, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare th text;
begin
  if not public.senluxe_session_ok(p_token, true) then
    raise exception 'Session administrateur invalide ou expirée. Reconnectez-vous.' using errcode = '28000';
  end if;
  if (select count(*) from public.senluxe_login_attempts where not ok and at > now() - interval '15 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
  end if;
  if not public.senluxe_password_ok(p_old) then
    insert into public.senluxe_login_attempts (ok) values (false);
    perform pg_sleep(1);
    return jsonb_build_object('ok', false, 'error', 'Mot de passe actuel incorrect.');
  end if;
  if p_new is null or length(p_new) < 10 or length(p_new) > 200 then
    raise exception 'Le nouveau mot de passe doit contenir au moins 10 caractères.';
  end if;
  if p_new = p_old then raise exception 'Le nouveau mot de passe doit être différent de l''ancien.'; end if;
  if p_new !~ '[A-Za-z]' or p_new !~ '[0-9]' then
    raise exception 'Le nouveau mot de passe doit contenir au moins une lettre et un chiffre.';
  end if;
  update public.senluxe_admin
     set salt = '', hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)), algo = 'bcrypt',
         changed_at = now(), must_change = false
   where id = 1;
  th := encode(public.senluxe_sha256(convert_to(p_token, 'UTF8')), 'hex');
  update public.senluxe_admin_sessions set revoked = true where token_hash <> th and not revoked;
  update public.senluxe_admin_sessions set restricted = false where token_hash = th;
  perform public.senluxe_log('mot_de_passe_change', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- Compatibilité : l'ancienne fonction de vérification n'accepte plus que des jetons.
create or replace function public.senluxe_admin_check(p_password text) returns boolean
language sql security definer set search_path = public as $$ select public.senluxe_session_ok(p_password, false) $$;

-- Droits : la bootstrap et les contrôles internes ne sont jamais exposés.
revoke all on function public.senluxe_admin_bootstrap(text) from public, anon, authenticated;
revoke all on function public.senluxe_session_ok(text, boolean) from public, anon, authenticated;
grant execute on function public.senluxe_admin_login(text, text)                to anon, authenticated;
grant execute on function public.senluxe_admin_session_info(text)               to anon, authenticated;
grant execute on function public.senluxe_admin_change_password(text, text, text) to anon, authenticated;
grant execute on function public.senluxe_admin_check(text)                      to anon, authenticated;

notify pgrst, 'reload schema';
select 'SEN LUXE : durcissement v5 terminé' as resultat;
