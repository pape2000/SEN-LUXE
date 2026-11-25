# Sauvegarde de la production — avant la version v6 (2026-11-25)

**Ne jamais supprimer ni modifier cette branche.**

| Élément | Valeur |
|---|---|
| Branche Git de sauvegarde | `backup/production-before-release-2026-11-25` |
| Commit exact de l'ancienne production | `a4bf2d2d3df4c388af984c41224f8bb01b85bfb4` (`main`) |
| Déploiement Vercel d'origine | `dpl_BPK5jW9KwHMZJLmwNHH3zfVahAc2` — `senluxe-3huncpcw6-221-digital.vercel.app` (READY, production) |
| Déploiement de production précédent | `dpl_7x2HY8DmpZJtHhiHMZ431eR2P2na` (commit `e04bef4`) |
| Projet Vercel | `prj_puusW1IUIO2oYI616NeRYrs1FHEf` — équipe `221-digital` (`team_WPwxqopiePdDC8lRSid9CBaQ`) |
| Domaines | `senluxe.site` (308 → `www.senluxe.site`), `www.senluxe.site`, `senluxe.vercel.app` |
| Version déployée | commit `2aa569e` — déploiement `dpl_6sPwmEz5LoFeQR5pz7hkDVzyB7bW` (promu, sans reconstruction) |
| Projet Supabase | `ejzuevxsofkwqklqjhni` (eu-west-1, Postgres 17) |
| Migrations avant la version | `20261118192404 senluxe_v4_provision`, `20261118194954 senluxe_realtime_sync_signals`, `20261123211434 senluxe_security_hardening_v5`, `20261123212058 senluxe_order_price_enforcement` |
| Migration v6 | `20261124000000_v6_recovery_and_guards.sql` — **NON appliquée** (la version déployée fonctionne sans elle) |
| Sauvegarde base | schéma `backup_release_20261125` (copie exacte des 19 tables `senluxe_*` + `_functions` (58), `_triggers` (5), `_policies` (5)), accès fermé à anon/authenticated, comptes de lignes vérifiés identiques |

Aucune clé secrète n'est consignée ici. Les variables d'environnement restent dans Vercel / Supabase.

## Retour arrière du code (immédiat, sans reconstruction)
1. Vercel : `request_rollback` vers `dpl_BPK5jW9KwHMZJLmwNHH3zfVahAc2` (ou Dashboard › Deployments › ce déploiement › « Promote to Production »).
2. Vérifier `https://www.senluxe.site/` et `/gestionnaire/`.
3. Facultatif (cohérence Git) : ne PAS pousser sur `main` tant que le retour n'est pas décidé ; `main` est resté à `a4bf2d2`.

## Base de données — ne pas restaurer à l'aveugle
Les nouvelles données (commandes, paniers, réglages `mgr_*`/`v6_*`) créées après la sauvegarde seraient perdues par une restauration complète. L'ancienne version ignore les clés `v6_*`, `mgr_*` ajoutées : **aucune restauration de base n'est nécessaire** pour revenir au code précédent.
Si une donnée précise doit être récupérée : copier depuis `backup_release_20261125.<table>` vers `public.<table>` ligne par ligne (`insert … select … on conflict do nothing`), jamais `drop`/`truncate` de `public`.
Pour supprimer les réglages ajoutés par la v6 : `delete from public.senluxe_settings where key like 'v6\_%' or key in ('mgr_prefs','mgr_theme','mgr_anim','mgr_animlib');` (uniquement sur demande).
