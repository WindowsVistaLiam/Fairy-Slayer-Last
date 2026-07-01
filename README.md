# Fairy Slayer — Bot Discord RP

Fairy Slayer est un bot Discord RP inspiré de Fairy Tail, construit avec Node.js, discord.js v14, MongoDB et Canvas.

Commandes principales :

- `/profil` : personnage actif, profils multiples, inventaire, équipement, missions, relations, rumeurs et réputation.
- `/boutique` : achat et vente d’objets, avec prix influencés par la réputation et les rumeurs.
- `/classement` : classements par personnage.
- `/admin` : gestion staff des profils, de la progression, des inventaires et de la configuration serveur.
- `/gacha` : portail d’invocation Fairy Tail, tirages, pity et fragments.
- `/collection` : collection personnelle ou collection d’un autre joueur.
- `/cartes` : catalogue filtrable des cartes disponibles.

## Fonctionnalités

- Profils multiples et personnage actif par joueur.
- Fiche de personnage en grand Canvas avec statistiques, image et équipement.
- Rangs `C`, `B`, `A`, `S` et `Sacré`.
- XP RP automatique uniquement dans les salons configurés, avec cooldown et longueur minimale réglables.
- Montées de niveau illustrées par Canvas.
- Inventaire MongoDB, 19 objets, consommables et équipement par slots.
- Page `/profil` dédiée à l’équipement actif et à la puissance totale.
- Boutique avec achat, vente, rareté, prérequis et puissance totale.
- Classements : niveau, puissance, richesse, réputation et missions.
- 14 missions couvrant les rangs C à Sacré, avec acceptation, soumission, validation staff et récompenses.
- Relations, réputation et rumeurs influençant la boutique.
- Rôles staff configurables.
- Slots de profils configurables selon les rôles Discord.
- Salon de logs configurable pour les actions importantes.
- Interfaces `/profil` et `/admin` en grand Canvas.
- Panneaux Canvas adaptatifs aux contenus longs.
- Inspection détaillée d’un profil depuis `/admin`, sans modification des données.
- Gacha Fairy Tail persistant avec 299 cartes et cinq raretés.
- Tirage gratuit toutes les deux heures, tirages en Joyaux et tirage en fragments.
- Pity garanti aux 10e, 50e et 100e tirages.
- Doublons automatiquement convertis en fragments réutilisables.
- Collection, catalogue, recherche, pagination et fiches de cartes en grand Canvas.
- Images de cartes configurables par URL, avec cache, délai maximal et initiales de secours.

## Gacha Fairy Tail

Le gacha appartient au compte Discord sur le serveur. Les Joyaux dépensés proviennent du profil RP actif, tandis que les cartes, fragments et pity sont partagés entre tous les profils du joueur.

- Tirage gratuit : une carte toutes les deux heures.
- Tirage simple : 250 Joyaux.
- Tirage multiple : 10 cartes pour 2 250 Joyaux.
- Tirage fragments : une carte pour 100 fragments.
- Probabilités : 60 % Commune, 27 % Rare, 9 % Épique, 3,5 % Légendaire et 0,5 % Mythique.
- Garanties : Épique au 10e tirage sans Épique, Légendaire au 50e sans Légendaire et Mythique au 100e sans Mythique.

### Ajouter les images des cartes

Édite `src/data/fairyTailCardImages.js` puis ajoute un lien direct HTTP(S) :

```js
const CARD_IMAGE_URLS = {
  natsu_dragon_force: 'https://exemple.com/natsu-dragon-force.png',
};

const CHARACTER_IMAGE_URLS = {
  natsu_dragnir: 'https://exemple.com/natsu.png',
};
```

`CARD_IMAGE_URLS` personnalise une carte précise. `CHARACTER_IMAGE_URLS` applique la même image à toutes les variantes d’un personnage, sauf lorsqu’une image spécifique existe. Les liens doivent pointer directement vers une image publique de 10 Mo maximum. Si le lien échoue, le Canvas affiche automatiquement les initiales.

## Configuration depuis Discord

Un membre ayant la permission Discord **Gérer le serveur** ou **Administrateur** peut ouvrir `/admin` puis **Configuration** pour régler :

- les salons RP donnant de l’XP ;
- le salon de logs ;
- les rôles considérés comme staff ;
- les slots de profils par défaut et les bonus selon les rôles ;
- le cooldown XP et la longueur minimale des messages.

Sans salon RP configuré, le gain d’XP par message est désactivé. Les rôles staff configurés peuvent utiliser les actions staff, mais seuls les gestionnaires du serveur peuvent modifier la configuration.

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

Déploie ou actualise les commandes slash :

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
- Voir le salon de logs configuré.
- Intégrer des liens et envoyer des fichiers.

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

Les fonctionnalités sont séparées afin de garder des modules lisibles :

Structure importante :

```txt
src/commands/        Les commandes slash visibles
src/features/        Les vrais systèmes du bot
src/models/          Schémas MongoDB/Mongoose
src/canvas/          Génération des images Canvas
src/events/          Événements Discord
src/utils/           Fonctions partagées
```

## Prochaines étapes

- Tester l’équilibrage des récompenses et des prix avec les joueurs.
- Ajouter de nouveaux arcs narratifs et objets au fil des événements RP.
- Ajouter des bannières gacha temporaires et des événements limités.
- Envisager une migration MongoDB du champ technique historique `jewels` vers `joyaux` lors d’une future maintenance dédiée.
