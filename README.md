# Fairy Slayer — Bot Discord RP Node.js

Fairy Slayer est une base V1 pour un bot Discord RP Fairy Tail avec seulement quatre commandes principales :

- `/profil` : hub du personnage actif, profils multiples, inventaire, missions, relations, rumeurs, réputation.
- `/boutique` : boutique liée au personnage actif, prix dynamiques selon réputation et rumeurs.
- `/classement` : classements par personnage.
- `/admin` : menu staff pour modifier rang, puissance, Jewels et réputation.

## Fonctionnalités V1

- Connexion Discord.js v14.
- Connexion MongoDB avec Mongoose.
- Profils multiples par joueur.
- Profil actif par joueur.
- Champs RP : nom, âge, guilde, magie, image, description.
- Champs demandés : `mageRank` et `powerLevel`.
- Rangs disponibles : `C`, `B`, `A`, `S`, `Sacré`.
- XP automatique basé sur la taille des messages.
- Level-up avec image Canvas.
- Carte de profil Canvas.
- Boutique de base avec prérequis de rang et puissance.
- Classements : niveau, puissance, richesse, réputation, missions.
- Menu admin interactif.

## Installation locale

```bash
npm install
cp .env.example .env
```

Remplis ensuite `.env` :

```env
DISCORD_TOKEN=TON_TOKEN_ICI
CLIENT_ID=ID_DU_BOT_ICI
GUILD_ID=ID_DU_SERVEUR_ICI
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/fairy-slayer
```

Déploie les commandes slash :

```bash
npm run deploy
```

Lance le bot :

```bash
npm start
```

## Important côté portail Discord

Dans le portail développeur Discord, active l’intent suivant pour que l’XP sur messages fonctionne :

- Message Content Intent

Le bot doit aussi avoir les permissions serveur nécessaires pour :

- Lire les messages.
- Envoyer des messages.
- Utiliser les commandes slash.
- Joindre des fichiers.
- Voir les salons RP.

## Configuration Railway

Sur Railway :

1. Crée un projet depuis ton repo GitHub.
2. Ajoute les variables d’environnement :
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `MONGO_URI`
3. Build command : `npm install`
4. Start command : `npm start`

## Notes de développement

La V1 pose une base solide. Les fichiers sont volontairement séparés pour éviter un gros fichier ingérable.

Structure importante :

```txt
src/commands/        Les 4 commandes visibles
src/features/        Les vrais systèmes du bot
src/models/          Schémas MongoDB/Mongoose
src/canvas/          Génération des images Canvas
src/events/          Événements Discord
src/utils/           Fonctions partagées
```

## Prochaines étapes conseillées

V2 :

- Achat réel d’objets.
- Vente d’objets.
- Grille Canvas d’inventaire.
- Gestion admin des items.

V3 :

- Création de missions.
- Acceptation et validation des missions.
- Relations modifiables entre personnages.
- Rumeurs positives/négatives actives.

V4 :

- Configuration des salons RP.
- Logs serveur.
- Rôles staff.
- Slots de profils selon les rôles.
