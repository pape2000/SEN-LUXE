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
4. `20261123010000_order_price_enforcement.sql` — une commande dont un prix est inférieur au prix publié est refusée
   (avant : seulement signalée). Totaux et frais de livraison toujours recalculés par le serveur.

## Retour arrière
- Git : le tag `pre-v5-e04bef4` pointe vers l'état de production d'avant cette version.
- Vercel : le déploiement `dpl_7x2HY8DmpZJtHhiHMZ431eR2P2na` (commit e04bef4) peut être re-promu en production.
- Supabase « sen luxe » : copie complète des tables avant migration dans le schéma privé `backup_20261123`.
