# Fairy Slayer — Contexte IA

## Projet

Fairy Slayer est un bot Discord RP Fairy Tail.

- Stack : Node.js 22+, discord.js v14, MongoDB Atlas, Mongoose, `@napi-rs/canvas` et Railway.
- Repo : https://github.com/WindowsVistaLiam/Fairy-Slayer-Last
- Commandes principales : `/profil`, `/boutique`, `/classement`, `/admin`.
- Architecture : commandes fines dans `src/commands`, logique dans `src/features`, modèles Mongoose dans `src/models`, événements dans `src/events`, Canvas dans `src/canvas`.

Le `README.md` peut servir de référence fonctionnelle et de source d’idées. Il contient toutefois encore une ancienne roadmap V1 à V4 : le code et ce fichier sont les sources de vérité pour l’état actuel.

## Règles de développement

- Ne pas casser les commandes ni les interactions existantes.
- Conserver le grand affichage Canvas en image jointe directe via `createLargeCanvasPayload`.
- Le bot tourne sur Railway ; ne jamais lancer une seconde instance avec le même token.
- Vérifier `git status` et `git diff` avant de modifier le projet.
- Préserver les changements utilisateur et les fichiers non suivis.
- Exécuter `node --check` sur chaque fichier JavaScript modifié, puis `npm run check` et `git diff --check`.
- Toujours présenter un résumé et attendre l’accord explicite de l’utilisateur avant `git add`, commit ou push.
- La monnaie est affichée partout sous le nom Joyaux. Le champ MongoDB historique `jewels` est conservé volontairement pour ne pas casser les soldes existants.

## Fonctionnalités terminées

- Profils multiples par utilisateur et profil actif.
- Carte de profil grand Canvas : image, statistiques, équipement, lacrima et puissance totale.
- Inventaire MongoDB réel, consommables, achat, vente, équipement et déséquipement.
- Slots d’équipement : Arme, Tenue, Accessoire et Lacrima.
- Bonus de puissance apportés par l’équipement.
- Boutique avec conditions de rang et de puissance totale, prix influencés par réputation et rumeurs.
- Classements par personnage, dont puissance totale.
- Missions : tableau, détail, acceptation, soumission, validation ou refus staff et récompenses.
- Relations avancées entre personnages.
- Rumeurs positives, négatives ou neutres avec impact boutique.
- Réputation et historique des changements.
- Menu `/admin` grand Canvas pour profils, XP, Joyaux et inventaires.
- Catalogue enrichi à 19 objets, avec une progression des rangs C à Sacré.
- Tableau enrichi à 14 missions, avec des récompenses reliées au catalogue.
- Page `/profil` → Équipement dédiée : quatre slots, bonus et puissance totale.
- Panneaux grand Canvas adaptatifs : hauteur dynamique, douze lignes visibles et résumé du surplus.
- Inspection détaillée d’un profil depuis `/admin`, en lecture seule.

## Configuration serveur

La configuration complète est stockée dans `GuildConfig` et administrée depuis `/admin` → Configuration.

- Salons RP configurables : seuls les messages de ces salons donnent de l’XP. Sans salon configuré, le gain d’XP par message est désactivé.
- Cooldown XP et longueur minimale des messages configurables.
- Salon de logs configurable.
- Rôles staff configurables, utilisés par `/admin`, la validation des missions et la gestion des rumeurs.
- La modification de la configuration elle-même exige toujours la permission Discord `Gérer le serveur` ou `Administrateur`.
- Nombre de profils par défaut configurable.
- Règles de slots selon les rôles ; la plus grande limite applicable au membre est utilisée.
- Logs des modifications admin, validations/refus de missions, rumeurs et montées de niveau.
- La commande `/admin` n’a plus de restriction Discord statique afin que les rôles staff configurés puissent l’ouvrir ; les permissions sont contrôlées dans le code.

## État du travail en cours

La configuration serveur et l’ensemble des fonctionnalités de la roadmap ci-dessous sont présents dans le worktree mais ne sont pas encore commités. `AI_CONTEXT.md` reste non suivi tant qu’il n’a pas été ajouté à Git.

Fichiers de code concernés :

- `src/commands/admin.js`
- `src/canvas/panelCanvas.js`
- `src/canvas/profileCanvas.js`
- `src/data/items.js`
- `src/data/missions.js`
- `src/events/messageCreate.js`
- `src/features/admin/adminHub.js`
- `src/features/missions/missionHub.js`
- `src/features/profile/profileHub.js`
- `src/features/ranking/rankingHub.js`
- `src/features/rumors/rumorHub.js`
- `src/features/shop/shopHub.js`
- `src/interactions/router.js`
- `src/utils/guildConfig.js`
- `src/utils/inventoryUtils.js`
- `README.md`
- `AI_CONTEXT.md`

Dernières validations réussies : `node --check` sur tous les fichiers JavaScript modifiés, `npm run check` et `git diff --check`.

## Roadmap terminée dans le worktree

1. Interface entièrement uniformisée sur le nom Joyaux, avec compatibilité MongoDB conservée.
2. Catalogue enrichi et équilibré par rang.
3. Missions supplémentaires et nouvelles récompenses.
4. Page Équipement dédiée dans `/profil`.
5. Grands Canvas adaptatifs aux listes longues.
6. Outil admin d’inspection détaillée des profils.
7. `README.md` actualisé.

## Suites possibles

- Ajuster l’équilibrage après retours des joueurs.
- Ajouter des arcs narratifs, objets et missions saisonnières.
- Préparer séparément une migration MongoDB de `jewels` vers `joyaux` si le renommage technique devient nécessaire.
