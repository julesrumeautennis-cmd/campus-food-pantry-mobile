# Validation et limites

## Vérifications effectivement réalisées

| Contrôle | Résultat |
|---|---|
| Comparaison du dossier legacy-console avec l'archive fournie | 11 fichiers identiques octet pour octet |
| Classes Item, Inventory, Student, Staff et Request | Seule la déclaration de package change |
| Tests originaux RegressionTests | 16 réussites, 0 échec |
| Compilation du domaine adapté avec javac --release 21 | Réussie |
| DomainAdapterChecks | 16 réussites |
| Analyse syntaxique TypeScript 6.0.3 | 10 fichiers TS/TSX, zéro erreur de syntaxe ; pas de résolution des types/dépendances |
| Migration de sept tables privées dans Supabase | Appliquée |
| Contraintes SQL : quota >5, semaine non lundi, stock négatif, refus sans motif, approbation sans décision | Rejetées correctement ; données de contrôle annulées |
| RLS + droits anon/authenticated | Sept tables protégées |
| Conseiller sécurité Supabase | Aucune alerte retournée |
| Conseiller performance Supabase | Sept index encore inutilisés, information attendue sur une base neuve ; conservés pour les parcours prévus |
| Accès Render existant | My Workspace accessible ; aucun service retourné lors de la vérification |
| render.yaml | YAML analysé avec succès ; un seul web service Free, aucun disque ni autre ressource ; chemins Docker existants et variables privées non renseignées |
| git diff --check après configuration Render | Réussi |

La validation complète par le schéma/CLI Render et la création du Blueprint n'ont pas été exécutées. `mvn verify` a été tenté après l'ajout du contrôle `/health/ready` mais échoue avant compilation : Maven Central est inaccessible par DNS. Les deux nouveaux tests JUnit de disponibilité sont donc non exécutés. Aucun résultat de build Docker ou HTTP distant n'est disponible.

Les vérifications SQL testent le schéma, pas les transactions de l'API Java. Le contrôle syntaxique TSX ne résout pas les modules et ne prouve pas la compatibilité Expo.

## À exécuter dès que les dépendances sont disponibles

`mvn test`, `npm run typecheck`, `npm run check:expo`, `npm run build:web`, puis les parcours suivants sur une base de test :

1. Visiteur sans jeton → 401 ; membre sur route admin → 403 ; JWT d'un autre projet/expiré/non signé → refus.
2. Alice ne peut pas lire la demande de Bob ; elle ne peut pas transmettre un autre userId ou un rôle dans son panier/profil.
3. Double soumission avec même clé et même panier → un seul ID ; même clé/panier différent → 409.
4. Deux membres demandent le dernier stock : seule la première approbation peut consommer ce stock.
5. Deux administrateurs/appareils traitent le même ID : un seul mouvement ; jamais de traitement automatique de l'ID suivant.
6. Forcer une panne après la première écriture d'approbation : toute la transaction doit revenir à l'état précédent.
7. Tester quota dimanche/lundi à Chicago, changement d'heure, expiration aujourd'hui/demain, retrait d'un lot encore présent dans un panier.
8. Sign-up, confirmation, sign-in, sign-out, reset password avec email réel, redirection web et redirection sur iPhone.
9. Petits écrans, grands caractères, clavier, retour arrière, chargements/erreurs/vides, reconnexion et changement de compte.

Ressources : https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index ; https://docs.expo.dev/get-started/start-developing/ ; https://supabase.com/docs/guides/auth/auth-smtp
