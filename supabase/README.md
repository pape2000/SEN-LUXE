# Migrations Supabase — SEN LUXE

Ordre d'application (toutes idempotentes, non destructives) :
1. `20261118000000_senluxe_v4_baseline.sql` — schéma, RLS, fonctions, Realtime (extrait du gestionnaire d'origine).
2. `20261118194954_realtime_sync_signals.sql` — signaux de synchronisation (déjà appliquée sur le projet « sen luxe »).
3. `20261123000000_security_hardening.sql` — bcrypt, code temporaire à changer, sessions restreintes, verrouillage.

## Initialiser ou réinitialiser le code administrateur
Dans Supabase › SQL Editor (jamais depuis le site) :

    select public.senluxe_admin_bootstrap('<code temporaire>');

Le code est haché (bcrypt) et marqué « à changer » : la première connexion impose un nouveau code personnel.
Ne jamais écrire le code temporaire dans un fichier du dépôt.
