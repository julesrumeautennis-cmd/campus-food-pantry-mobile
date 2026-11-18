# Campus Food Pantry — contexte de reprise

Lire ce fichier puis `docs/ARCHITECTURE.md`, `docs/STATUS.md` et `docs/REUSE.md` à chaque reprise. Les fichiers décrivent les décisions ; seul STATUS indique ce qui a réellement été vérifié.

## Décisions de Jules

- Projet de cours CST250. Conserver le Java existant et ses algorithmes pédagogiques.
- Interface mobile **React Native + Expo + TypeScript**, utilisable sur iPhone avec Expo Go sans abonnement Apple. TestFlight envisagé plus tard.
- Backend **Java Spring Boot** : toutes les règles métier et autorisations passent par cette API.
- **Supabase Auth + PostgreSQL**, pas Auth0. Tous les comptes peuvent s'inscrire, sans domaine universitaire ni CFE.
- Un seul administrateur : Jules, déterminé par `ADMIN_USER_ID` côté serveur. L'UUID vérifié n'a pas encore été fourni. Aucun « premier utilisateur admin ».
- Design anglais inspiré du projet Google Stitch fourni : vert profond, fond menthe clair, cartes sobres, quota en cinq segments. Ajouter les écrans de connexion et d'administration manquants.
- Aucun achat ou abonnement payant autorisé. Ne pas modifier l'ancien dépôt ni l'ancien projet Supabase.
- Dernière instruction du 16 novembre : remplacer Render par **Vercel**, en gardant Java. Un projet Vercel Services regroupe l'export web Expo et le conteneur Java ; Supabase reste indépendant. Services/container est en bêta. Aucun achat ni dépassement payant autorisé. Lire `docs/DEPLOYMENT_VERCEL.md` avant le déploiement.
- La proposition Figma demandée par Jules est créée : 56 écrans et états, composants réutilisables et parcours cliquables. Elle affine la direction Stitch avec une DA de petit marché, vert forêt, papier clair et Manrope. Lire `docs/DESIGN.md` avant toute transcription React Native ; le prototype utilise des données illustratives et ne remplace pas encore l'interface du code.

## Ressources

- Source originale : https://github.com/mosescampos/campus-food-pantry
- Nouveau dépôt : https://github.com/julesrumeautennis-cmd/campus-food-pantry-mobile
- Nouveau Supabase : `mcbciclbmnjgtqoxbvzv` (us-east-2), URL publique https://mcbciclbmnjgtqoxbvzv.supabase.co
- Dashboard : https://supabase.com/dashboard/project/mcbciclbmnjgtqoxbvzv
- Stitch : https://stitch.google.com/projects/264145195589890532
- Figma : https://www.figma.com/design/0yQ1YSKVzvgdbivmssuHS2?node-id=13-1286
- Ne pas toucher au projet Supabase précédent `dlbsqcgnyfbqhiabalbg`.
- Vercel : équipe `team_jU4K2dpV1sQDAwi2zeEc43fp`, configuration `vercel.json` à la racine, services `web` et `api`, région `cle1`. Aucun projet pantry ni URL déployée n'a encore été créé. Aucun service Render n'avait été créé.

## Invariants à préserver

1. Cinq unités approuvées maximum par personne, du lundi au dimanche, fuseau America/Chicago.
2. Une demande PENDING ne réserve ni stock ni quota. L'approbation revérifie tout.
3. FIFO global : seule la plus ancienne demande en attente peut être traitée. Une action périmée ne traite jamais la demande suivante.
4. Une approbation modifie stock, quota, demande et journal dans une seule transaction. Une erreur technique annule tout.
5. Un refus métier laisse le stock et le quota inchangés et conserve un motif.
6. Un lot est expiré uniquement si sa date est antérieure à aujourd'hui. Une nouvelle date impose un nouveau lot.
7. ArrayList + HashMap partagent les mêmes Item ; recherche linéaire, Bubble Sort et ArrayDeque restent utilisés dans le chemin de l'API.
8. Ni rôle ni identifiant propriétaire ne proviennent du formulaire du client. Le propriétaire vient du JWT Supabase vérifié.
9. Pas de paiement, d'horaires de retrait, de chat, de badge d'éligibilité, ni de limite inventée de trois unités par produit.

## Où travailler

`legacy-console/` contient la copie originale immuable. `backend/` contient l'API. `mobile/` contient Expo. `docs/` explique l'architecture et les limites. Ne jamais committer `.env`, mot de passe PostgreSQL ou clé privilégiée.

Le dossier `sources/` du projet ChatGPT parent reste en lecture seule. Ce fichier est lisible à la reprise si le dépôt est ouvert ; il ne garantit pas un chargement automatique dans une conversation qui n'a pas accès au dépôt.
