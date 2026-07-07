# Fairy Slayer — Contexte IA

## Projet

Fairy Slayer est un bot Discord RP Fairy Tail.

- Stack : Node.js 22+, discord.js v14, MongoDB Atlas, Mongoose, `@napi-rs/canvas` et Railway.
- Repo : https://github.com/WindowsVistaLiam/Fairy-Slayer-Last
- Commandes principales : `/profil`, `/guilde`, `/boutique`, `/classement`, `/admin`, `/gacha`, `/collection`, `/cartes`.
- Architecture : commandes fines dans `src/commands`, logique dans `src/features`, modèles Mongoose dans `src/models`, événements dans `src/events`, Canvas dans `src/canvas`.

Le `README.md` sert de référence fonctionnelle et de source d’idées. Le code et ce fichier restent les sources de vérité pour l’état actuel.

## Règles de développement

- Ne pas casser les commandes ni les interactions existantes.
- Conserver le grand affichage Canvas en image jointe directe via `createLargeCanvasPayload`.
- Le bot tourne sur Railway ; ne jamais lancer une seconde instance avec le même token.
- Vérifier `git status` et `git diff` avant de modifier le projet.
- Préserver les changements utilisateur et les fichiers non suivis.
- Exécuter `node --check` sur chaque fichier JavaScript modifié, puis `npm run check` et `git diff --check`.
- Toujours présenter un résumé et attendre l’accord explicite de l’utilisateur avant `git add`, commit ou push.
- La monnaie est affichée partout sous le nom Joyaux. Le champ MongoDB historique `jewels` est conservé volontairement pour ne pas casser les soldes existants.

## Interdits

- Ne jamais commit `.env`.
- Ne jamais afficher le token Discord.
- Ne jamais lancer deux instances du bot avec le même token.
- Ne jamais supprimer les champs MongoDB existants sans migration.

## Fonctionnalités terminées

- Profils multiples par utilisateur et profil actif.
- Guildes RP par personnage : création, classement par puissance collective, candidatures, invitations, membres, exclusions, rangs personnalisés et permissions déléguées.
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
- Gacha Fairy Tail avec 299 cartes, cinq raretés, un tirage gratuit toutes les deux heures et des achats simple/multiple en fragments.
- Les 34 cartes originales gardent leurs IDs ; 60 personnages reçoivent quatre éditions générées et 25 ont une édition Mythique supplémentaire.
- Images configurables dans `src/data/fairyTailCardImages.js`, soit par `cardId`, soit par `characterId` pour toutes les variantes.
- Le Canvas charge les liens HTTP(S) avec cache, limite de 10 Mo, timeout de 5 secondes et fallback sur les initiales.
- Le Canvas gacha enregistre explicitement Cinzel Bold pour les titres et Marcellus pour les textes afin d’éviter les glyphes manquants et la police décorative illisible.
- Catalogue et collection triés de Mythique à Commune, avec lignes colorées selon la rareté.
- Les boutons de pagination utilisent toujours des IDs distincts, même sur une page unique, et le routeur attend les promesses pour empêcher un rejet Discord de faire tomber le processus.
- Pity persistant : Épique à 10, Légendaire à 50 et Mythique à 100.
- Doublons convertis automatiquement en fragments selon la rareté.
- Collection et catalogue paginés avec recherche et fiches détaillées en grand Canvas.
- Cartes, fragments et pity liés au compte Discord et au serveur ; le gacha n’utilise jamais les Joyaux RP.
- Coûts gacha : 100 fragments pour une carte ou 900 fragments pour dix cartes.
- `/daily` propose Expédition, Enquête et Raid risqué avec cooldown MongoDB de 24 heures et récompenses/pénalités en fragments.
- `/combat pve` utilise une carte possédée contre une carte de même rareté, avec cooldown de 30 minutes.
- `/combat pvp` crée un défi public accept/refus, utilise la meilleure carte du défenseur et transfère jusqu’à 50 fragments.
- `/combat stats` et l’inspection admin affichent les victoires, défaites et mouvements de fragments.

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

Les systèmes Daily, combat PvE/PvP et la nouvelle économie gacha exclusivement en fragments sont présents dans le worktree mais ne sont pas encore commités.

Fichiers de code concernés :

- `src/commands/combat.js`
- `src/commands/daily.js`
- `src/features/admin/adminHub.js`
- `src/features/combat/combatHub.js`
- `src/features/daily/dailyHub.js`
- `src/features/gacha/gachaHub.js`
- `src/interactions/router.js`
- `src/models/CombatSession.js`
- `src/models/CombatStats.js`
- `src/models/DailyState.js`
- `src/utils/gacha.js`
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
- Ajouter des bannières limitées, favoris, échanges ou améliorations de cartes si le gacha doit évoluer vers la profondeur d’ArcaneRPG.
- Remplir progressivement le registre d’images avec des liens directs stables et autorisés.
- Préparer séparément une migration MongoDB de `jewels` vers `joyaux` si le renommage technique devient nécessaire.
