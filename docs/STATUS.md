# État vérifié — 11 novembre 2026

- Nouveau dépôt GitHub privé créé. Le connecteur GitHub ne peut pas encore y écrire (404 / aucune installation disponible). Ne pas supposer que les sources locales sont publiées.
- Nouveau projet Supabase `mcbciclbmnjgtqoxbvzv` actif. Migration initiale appliquée avec succès.
- Sept tables métier privées, RLS activé, aucune permission de lecture directe pour anon/authenticated ; vérification SQL effectuée. Audit sécurité Supabase : aucune alerte retournée.
- Copie du programme Java original ; 16 tests de régression réussis, zéro échec.
- Sources de l'API créées : authentification JWT, propriétaire des demandes, administrateur unique, inventaire, panier soumis, traitement FIFO, quota transactionnel, journaux et inspections. Compilation Spring, tests d'intégration et connexion JDBC pas encore validés.
- Les 16 vérifications supplémentaires du domaine Java adapté passent avec compilation `--release 21` ; total : 32 contrôles Java exécutés avec succès. Les tests JUnit de sécurité sont écrits mais non exécutés.
- Cinq contraintes PostgreSQL et les droits privés ont été vérifiés sur le nouveau projet avec des données temporaires annulées par ROLLBACK.
- Les 16 produits de démonstration de Main.java ont été importés : 166 unités, 16 mouvements INITIAL. Ce ne sont pas des quantités réelles du campus. Aucun compte Auth créé ni administrateur attribué.
- Interface Expo écrite : inscription/connexion/récupération, catalogue, recherche/filtres, fiche, panier, récapitulatif, résultat, demandes, profil, administration du stock/file/rapports/inspections. Design inspiré de Stitch, image du riz réutilisée ; les autres illustrations sont des substituts graphiques. Police système provisoire, fidélité visuelle non vérifiée sur appareil.
- Connexion publique Supabase configurée dans le mobile, mais authentification et appels Java non testés de bout en bout.
- README, CONTEXT, ARCHITECTURE et REUSE créés. Les 11 fichiers de legacy-console ont été comparés à l'archive source : identiques octet pour octet. Item, Inventory, Student, Staff et Request n'ont reçu que leur déclaration de package dans backend.
- Aucun backend HTTP hébergé, aucun lien de preview déployé, aucun build TestFlight.
- Accès Render confirmé : My Workspace (`tea-dbqe4fjncjis73a317mg`), aucun service existant retourné. `render.yaml`, profil Spring Render et contrôle `/health/ready` ajoutés localement. Aucun service ni Blueprint créé, aucune dépense engagée.
- Docker exécute désormais `mvn verify` pendant le build. Deux tests JUnit de disponibilité ajoutés mais non exécutés ; Maven est toujours bloqué par le DNS de Maven Central.
- Manquent pour une connexion réelle de bout en bout : connexion JDBC serveur, UUID admin vérifié, configuration email/URLs Auth, hébergement Java et lancement Expo.

## Blocages observés

- Maven ne résout pas `repo.maven.apache.org` (Unknown host) : dépendances Spring indisponibles dans cet environnement.
- npm ne résout pas `registry.npmjs.org` (ENOTFOUND) : installation et compilation Expo impossibles ici. Aucun `package-lock.json` validé ; lancer l'installation puis `expo install --fix`, vérifier et committer le lockfile.
- Les 10 fichiers TS/TSX ont été analysés avec TypeScript 6.0.3 : zéro erreur de syntaxe. Ce contrôle n'est pas un contrôle de types ni une compilation Expo.
- Le dépôt GitHub privé existe, mais le connecteur n'a pas accès à ses sources et Git ne résout pas github.com. Le code ne doit pas être annoncé comme poussé.
- Jules a ensuite explicitement autorisé l'utilisation de la connexion Render existante : ce nouvel accord remplace le refus antérieur. L'accès est vérifié ; le déploiement attend les sources sur GitHub et la connexion JDBC. Seule l'offre Free est autorisée. Voir DEPLOYMENT_RENDER.md.
- Vercel ne retourne aucune équipe accessible. Aucune création ou publication Vercel effectuée. Aucun Site créé.

## Prochaine reprise

1. Lire CONTEXT et ARCHITECTURE, puis ouvrir ce dépôt local. Ne pas recommencer la création des ressources Supabase/GitHub.
2. Rétablir un environnement de build disposant du réseau. Installer et compiler Java/Expo ; corriger toute erreur réelle et enregistrer le lockfile.
3. Configurer le compte JDBC serveur à droits limités, les URLs Auth et l'envoi des emails. Faire inscrire Jules, vérifier l'UUID puis définir ADMIN_USER_ID.
4. Tester les autorisations HTTP, deux membres distincts, les doubles soumissions et approbations concurrentes avec la vraie base ; vérifier qu'une panne annule toutes les écritures.
5. Autoriser le dépôt privé dans la connexion GitHub, récupérer son historique distant puis publier les sources sans écraser les commits existants.
6. Déployer l'API avec `render.yaml` sur Render Free après publication et configuration JDBC ; vérifier `/health/ready`, les autorisations et le parcours réel. Lancer Expo avec cette URL HTTPS, puis vérifier Safari/iPhone/Expo Go. Fournir le vrai QR/lien seulement après lancement réussi. TestFlight reste une étape ultérieure.

Mettre ce fichier à jour après les prochaines vérifications ; ne pas transformer une intention en résultat constaté.

## Reverification during the follow-up on 2026-11-11

- GitHub authenticated profile is julesrumeautennis-cmd, but accessible installations and owned repositories both return empty lists. The repository metadata call returns 404. Git CLI still fails DNS resolution for github.com.
- The signed-in Chrome session confirms that the user owns the private repository. The remote main branch still contains only README.md at initial commit de2ac5fc88202f5157c3a5661710e7b066fc84d1. No source upload or push succeeded. The browser upload page is open; no commit was submitted.
- Render My Workspace remains accessible and lists no services. No paid resources or deployments were created.
- Supabase campus-food-pantry remains ACTIVE_HEALTHY. Its seven pantry tables have RLS and backend-only policies. Auth has zero users; ADMIN_USER_ID is still unknown.
- Verified pantry_backend grants: SELECT/INSERT on the seven tables; UPDATE only on profiles, item_lots, requests and weekly_quotas. No DELETE, schema CREATE or auth.users SELECT permission.
- Proposed SQL is saved in backend/db/provision-runtime.sql. It would create pantry_app with a random password, inherit pantry_backend, and store the password encrypted in Supabase Vault. It grants no superuser, role creation, database creation or BYPASSRLS permission.
- Automatic approval review rejected that provisioning action, stating that explicit permission to create the database login was missing. A read-only check afterward confirms neither pantry_app nor the named Vault secret exists. Do not retry through a different execution route. Request explicit approval for this concrete account provisioning before proceeding.
- Next dependencies: authorize this repository in the GitHub connection; approve pantry_app provisioning; publish source without overwriting remote history; then create the Render Free service and transfer the credential directly to protected server configuration. JDBC, Spring compilation, HTTP behavior and mobile preview remain unverified.

## Subsequent provisioning and GitHub check on 2026-11-16

- The earlier provisioning rejection above is historical. After Jules explicitly approved it, migration `provision_pantry_runtime_login` succeeded: `pantry_app` inherits `pantry_backend`, with its generated password stored in Supabase Vault. Catalog checks confirmed limited privileges and no access to decrypted Vault values or auth.users. The password was not printed or placed in Git. A real JDBC login has not been tested; protected Render environment configuration is still pending.
- Jules explicitly requested a push to the existing repository. Retested the GitHub plugin: the authenticated account is `julesrumeautennis-cmd`, repository metadata still returns HTTP 404, accessible installations are empty, and repository listing for that owner is empty.
- Direct `git ls-remote origin` also fails with `Could not resolve host: github.com`. No source push or remote mutation succeeded. Local commits remain available; do not recreate the repository or overwrite remote history when access is restored.
