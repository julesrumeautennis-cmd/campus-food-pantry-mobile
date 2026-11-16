# Déploiement du backend Java sur Render

État au 11 novembre 2026 : accès à Render confirmé via la connexion existante de Jules. Espace **My Workspace**, identifiant `tea-dbqe4fjncjis73a317mg`. Aucun service n'était présent lors de la vérification. Aucun service ou Blueprint n'a été créé par cette préparation. Aucune réinstallation de plugin n'est nécessaire.

## Configuration préparée

Le fichier `render.yaml` à la racine décrit un seul serveur HTTP Java. La création reste conditionnée à la publication des sources et à la configuration PostgreSQL réelle.

| Paramètre | Valeur |
|---|---|
| Nom prévu | campus-food-pantry-api |
| Type / runtime | web / docker |
| Offre | free, explicitement déclarée |
| Région | ohio |
| Dépôt | https://github.com/julesrumeautennis-cmd/campus-food-pantry-mobile |
| Branche | main |
| Dockerfile | ./backend/Dockerfile |
| Contexte Docker | ./backend |
| Contrôle de disponibilité | /health/ready |
| Déploiement automatique | Désactivé ; déploiement manuel après vérification |

Il n'y a ni base Render, ni disque persistant, ni worker, ni cron, ni instance payante dans ce fichier. Supabase conserve Auth et PostgreSQL. L'offre Free prévoit 512 Mo et une mise en veille après 15 minutes sans trafic ; le réveil peut retarder le premier appel. Les quotas gratuits de l'espace s'appliquent. Ne jamais passer à une offre payante pour contourner une limite sans nouvelle autorisation de Jules.

Le Dockerfile compile avec Java 21 et exécute `mvn verify`, puis démarre un JRE 21 sous un utilisateur non privilégié. Le profil `render` écoute sur `0.0.0.0` et le port `PORT` fourni par Render. Il limite les connexions PostgreSQL à trois et les threads HTTP à 24. Le tas Java utilise au maximum 60 % de la mémoire du conteneur ; les autres zones de la JVM utilisent aussi de la mémoire. Ces limites doivent encore être observées sur un vrai serveur Free.

## Variables serveur

Les trois variables `DATABASE_*` sont déclarées avec `sync: false` : saisir leurs vraies valeurs dans Render, jamais dans Git ni dans le mobile. Une clé Supabase publishable ou service_role n'est pas un mot de passe JDBC.

| Variable | Valeur / origine |
|---|---|
| SPRING_PROFILES_ACTIVE | render, déjà déclaré |
| SUPABASE_URL | https://mcbciclbmnjgtqoxbvzv.supabase.co, déjà déclaré |
| RUN_MIGRATIONS | false, déjà déclaré : V1 a déjà été appliquée à cette base |
| DATABASE_URL | URL JDBC réelle du projet, avec TLS et sans mot de passe embarqué |
| DATABASE_USERNAME | Identifiant réel du compte SQL de connexion à droits limités |
| DATABASE_PASSWORD | Mot de passe de ce compte SQL, stocké uniquement côté serveur |
| ADMIN_USER_ID | UUID Auth vérifié de Jules ; absent = personne n'est administrateur |
| CORS_ORIGINS | Origines web exactes séparées par des virgules ; absent = aucune origine web autorisée |

`ADMIN_USER_ID` et `CORS_ORIGINS` sont ajoutés manuellement lorsque leurs valeurs sont connues. Ils sont omis du Blueprint pour conserver leur valeur lors des synchronisations futures. Le contrôle CORS concerne les navigateurs ; il ne remplace pas la vérification JWT de chaque appel mobile.

Dans Supabase, `pantry_backend` est un rôle de permissions **NOLOGIN**. Le compte SQL de connexion dédié n'est pas encore provisionné. Il devra hériter de ce rôle sans superuser ni BYPASSRLS. Relever l'hôte, le port, la base et la forme de l'identifiant depuis le panneau Connect du projet réel ; pour IPv4, utiliser le pooler en mode session si nécessaire. Ne pas inventer une adresse de pooler ni utiliser le compte administrateur PostgreSQL comme compte d'exécution de l'app.

## Reprendre le déploiement

1. Autoriser le dépôt privé dans la connexion GitHub utilisée par ChatGPT. Le connecteur retourne actuellement 404 ; le dépôt existe dans Chrome, mais les sources complètes sont encore locales. L'accès GitHub de Render est une autorisation distincte à vérifier lors de la liaison du dépôt.
2. Récupérer l'historique distant, intégrer son README initial puis publier les sources et `render.yaml` sur `main`. Ne pas forcer un push qui écraserait le commit initial distant.
3. Configurer la connexion SQL dédiée et ses trois variables dans Render. Garder les secrets dans les champs prévus à cet effet, sans les copier dans une conversation.
4. Créer le Blueprint depuis le dépôt distant et examiner son plan : un seul web service `free`, aucun autre service, aucun remplacement. Si la création passe par le connecteur Blueprint, son étape de planification doit être examinée avant l'application. Aucun plan de création réel n'a encore été obtenu.
5. Appliquer le plan gratuit, laisser le build Docker exécuter les tests et inspecter les logs. Si le build échoue, corriger l'erreur avant de relancer ; ne pas ignorer les tests pour obtenir un déploiement vert.
6. Relever l'URL HTTPS réellement attribuée. Vérifier les routes ci-dessous, puis enregistrer l'URL dans `EXPO_PUBLIC_API_URL` et reconstruire/recharger le client Expo.
7. Configurer ensuite l'UUID admin, les emails et les URLs de redirection Supabase Auth. Tester un vrai parcours membre puis administrateur avant d'annoncer une preview fonctionnelle.

## Vérifications après démarrage

| Requête | Résultat attendu |
|---|---|
| GET /health | 200, serveur HTTP vivant ; ne vérifie pas PostgreSQL |
| GET /health/ready | 200 si le schéma pantry est accessible, même avec inventaire vide ; 503 sinon |
| GET /api/v1/items sans jeton | 401 |
| GET /api/v1/me avec JWT Supabase valide | Profil du membre connecté |
| GET /api/v1/admin/requests avec un membre | 403 |

La réponse publique de disponibilité ne contient ni requête SQL, ni adresse de connexion, ni détail d'erreur. Ce contrôle ne prouve pas que toutes les opérations métier fonctionnent : vérifier aussi la soumission, le traitement FIFO, les cinq unités hebdomadaires, l'historique et les permissions entre deux comptes.

## Validation réellement possible dans cette session

La configuration locale peut être contrôlée sans héberger le serveur. La compilation Maven reste bloquée par la résolution DNS de `repo.maven.apache.org`. Les deux nouveaux tests JUnit du contrôle de disponibilité sont écrits mais n'ont pas pu être exécutés. Le connecteur GitHub n'a pas accès au dépôt et Git ne résout pas `github.com` depuis l'environnement local. Aucun déploiement, test HTTP distant ou lien de preview n'a donc été validé.

Références Render consultées : [Blueprint](https://render.com/docs/blueprint-spec), [offre Free](https://render.com/docs/free), [Docker](https://render.com/docs/docker), [contrôles de santé](https://render.com/docs/health-checks), [variables d'environnement](https://render.com/docs/configure-environment-variables).
