# Campus Food Pantry

Application de cours CST250 : **Java Spring Boot + Supabase + React Native/Expo**. Le programme console original est conservé ; la nouvelle interface utilise une API Java persistante.

**Commencer par [CONTEXT.md](CONTEXT.md), [l'architecture](docs/ARCHITECTURE.md) et [l'état vérifié](docs/STATUS.md).** L'état vérifié distingue les fichiers créés des fonctionnalités réellement compilées et déployées.

## Dépôt et Supabase

- Dépôt privé : https://github.com/julesrumeautennis-cmd/campus-food-pantry-mobile
- Supabase : https://supabase.com/dashboard/project/mcbciclbmnjgtqoxbvzv
- Le schéma initial a été appliqué à ce projet. `RUN_MIGRATIONS=false` est volontaire pour cette base existante : ne pas relancer V1 avec Flyway sans établir une baseline V1.
- Un autre projet Supabase existait avant ; il n'a pas été modifié.

## Lancer l'API Java

Prérequis : JDK 21 ou supérieur, Maven 3.6.3 ou supérieur et accès Internet pour télécharger les dépendances.

1. Copier `backend/.env.example` vers `backend/.env`.
2. Renseigner la connexion PostgreSQL dans ce fichier ignoré par Git. Le mot de passe reste côté serveur. Utiliser un compte de connexion ayant uniquement le rôle `pantry_backend`, avec TLS et un endpoint joignable depuis l'hôte Java. Pour un hébergement IPv4, utiliser les paramètres de connexion pooler affichés par le dashboard Supabase ; ne pas inventer son hostname.
3. Après inscription et confirmation de l'identité de Jules, renseigner son UUID Auth exact dans `ADMIN_USER_ID`. Vide = personne n'est admin. N'inscrire aucune valeur de test dans l'environnement réel.
4. Depuis la racine, exécuter :

```powershell
.\scripts\start-api.ps1
```

Si Maven n'est pas dans PATH :

```powershell
.\scripts\start-api.ps1 -MavenCommand 'C:\Program Files\NetBeans-22\netbeans\java\maven\bin\mvn.cmd'
```

`GET http://localhost:8080/health` doit retourner `{"status":"ok"}`. Ce contrôle prouve seulement que HTTP répond. Vérifier ensuite `/api/v1/me` avec une vraie session puis une soumission/approbation.

## Lancer le mobile et la preview web

Prérequis : Node.js 22 ou supérieur. Dans `mobile`, copier `.env.example` vers `.env` et renseigner l'adresse de l'API. L'URL et la clé publique publishable du nouveau projet sont déjà configurées dans `src/project.ts` ; les variables `.env` permettent de les remplacer pour un autre environnement. Cette clé publique ne donne aucun accès aux tables métier privées. Aucune clé service_role/secrète n'est acceptable ici.

```powershell
cd mobile
npm install
npx expo install --fix
npm run typecheck
npm run check:expo
npm start
```

La première installation doit vérifier les versions de modules natifs avec Expo et produire `package-lock.json`, à committer ensuite. Les dépendances n'ont pas pu être téléchargées dans l'environnement initial : ne pas supposer une compatibilité validée avant cette étape.

Pour la version web : `npm run web`. Pour produire les fichiers statiques : `npm run build:web` (sortie `mobile/dist`). Configurer `CORS_ORIGINS` côté Java avec l'origine exacte de la preview web. Un site HTTPS doit appeler une API HTTPS.

## Essayer gratuitement sur iPhone

Installer **Expo Go** depuis l'App Store. Sur iPhone physique, se connecter au même compte Expo gratuit sur le PC (`npx expo login`) et dans Expo Go. Lancer `npm start`, puis scanner le QR avec l'appareil photo de l'iPhone. Le PC et l'iPhone doivent pouvoir communiquer. Dans `EXPO_PUBLIC_API_URL`, remplacer `localhost` par l'IP LAN du PC, par exemple `http://192.168.1.20:8080` ; c'est un exemple, pas une adresse détectée. Autoriser le serveur sur le réseau privé si le pare-feu le demande. Ne pas partager les identifiants du compte avec le professeur : utiliser une preview web ou la distribution TestFlight prévue ensuite.

Un tunnel Expo transporte le bundle Expo, pas automatiquement l'API Java. Si l'API est hébergée, utiliser son URL HTTPS. Le QR n'est utilisable que tant que le serveur de développement est disponible ; Expo Go n'est pas une application autonome TestFlight.

Alternative : exporter le web, l'héberger, ouvrir le lien dans Safari puis « Ajouter à l'écran d'accueil ». L'application doit toujours pouvoir atteindre son API. Aucun lien déployé n'est annoncé tant que sa compilation et son accès n'ont pas été vérifiés.

## Configurer Auth

Activer la connexion email/mot de passe dans Supabase Auth. Configurer Site URL et Redirect URLs avec la preview web et le schéma `campuspantry://` pour un futur build natif. Expo Go utilise une URL de développement différente ; adapter explicitement `EXPO_PUBLIC_AUTH_REDIRECT_URL` et la liste autorisée pour un test sur appareil.

Le formulaire prévoit inscription, confirmation email, connexion, déconnexion et réinitialisation de mot de passe. Le service email par défaut de Supabase restreint les destinataires : un SMTP adapté est nécessaire pour une inscription ouverte à toutes les adresses. Les secrets SMTP ne vont pas dans l'app ni dans Git. Les rôles proviennent exclusivement de Java.

## Tests

```powershell
.\scripts\check-domain.ps1 -JavaBin 'C:\Program Files\Java\jdk-25.0.2\bin'
cd backend
mvn test
```

Les tests originaux restent inchangés. Les vérifications supplémentaires couvrent la restauration FIFO, les refus sans mutation, les quotas et la sécurité JWT. Voir STATUS pour savoir lesquels ont été exécutés. Le workflow CI est fourni, mais n'a pas encore tourné sur le nouveau dépôt.

## Déployer sur Render Free

L'accès à l'espace Render **My Workspace** a été confirmé avec la connexion existante. [render.yaml](render.yaml) prépare un seul serveur Docker sur l'offre **Free**, avec contrôle de disponibilité PostgreSQL et sans base Render. Les sources ne sont pas encore publiées sur GitHub et les identifiants JDBC restent à configurer : aucun service n'est déployé. Suivre [la procédure Render](docs/DEPLOYMENT_RENDER.md) pour les paramètres exacts et les blocages restants.

Héberger séparément la sortie statique Expo. Brancher l'URL Java publique réellement attribuée dans la configuration mobile, puis tester le parcours complet membre → demande → admin → décision → historique.

TestFlight demande ensuite un compte Apple Developer, un bundle identifier définitif, un projet Expo/EAS et des identifiants de signature Apple. Rien n'a été acheté, soumis ou publié sur TestFlight.
