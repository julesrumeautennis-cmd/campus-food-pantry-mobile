# Réutilisation du code CST250

Source fournie : archive locale `campus-food-pantry-main (1).zip`, SHA-256 `95d099d9b240bf24ba64b33fa783983b5bcb2e2eb506efe566f56de240fe9410`. La branche distante n'a pas pu être refetchée depuis cet environnement ; cette archive est la référence exacte copiée.

`legacy-console/` conserve tous les fichiers de cette archive sans réécriture. Les 16 tests de régression originaux ont été exécutés avec succès le 11 novembre 2026.

| Classe | Réutilisation dans l'API |
|---|---|
| Item | Validation, expiration, restockage et diminution du stock ; seul ajout du package |
| Inventory | ArrayList + HashMap, recherche linéaire, Bubble Sort, alertes et retrait des expirés ; seul ajout du package |
| Student | Quota hebdomadaire et semaine du lundi ; seul ajout du package |
| Staff | Objet créé uniquement après contrôle ADMIN dans l'API ; seul ajout du package |
| Request | États terminaux, panier immuable et transitions ; seul ajout du package |
| RequestManager | Soumission et traitement FIFO inchangés ; ajout d'un constructeur de restauration depuis PostgreSQL |
| Main / CampusFoodPantry | Conservés dans la version console ; leurs menus et saisies Scanner sont remplacés par des écrans et routes HTTP |

Le constructeur ajouté à RequestManager accepte le prochain identifiant fourni par la séquence PostgreSQL et les demandes PENDING classées par arrivée. Il ne change pas les méthodes d'approbation ou de refus. Aucun état métier global partagé n'est utilisé par Spring.

Attention : `Staff.canProcessRequests()` et `canManageInventory()` renvoient toujours true dans l'ancien projet. Ils ne constituent donc pas une sécurité. `AccessPolicy` et Spring Security contrôlent l'UUID Supabase avant de créer un Staff.

La suppression en mémoire devient un archivage en base, les demandes reçoivent une clé d'idempotence, les identifiants étudiants deviennent des UUID Auth, et les données sont persistées. Ces adaptations sont nécessaires pour plusieurs appareils et les redémarrages du serveur.
