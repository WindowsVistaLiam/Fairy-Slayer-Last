const { getConfiguredCardImage } = require('./fairyTailCardImages');

const RARITIES = {
  common: { label: 'Commune', color: '#aab2bd', emoji: '⚪', value: 25, duplicateFragments: 5 },
  rare: { label: 'Rare', color: '#4da3ff', emoji: '🔵', value: 75, duplicateFragments: 15 },
  epic: { label: 'Épique', color: '#b56cff', emoji: '🟣', value: 220, duplicateFragments: 50 },
  legendary: { label: 'Légendaire', color: '#ffd166', emoji: '🟡', value: 650, duplicateFragments: 150 },
  mythic: { label: 'Mythique', color: '#ff5d73', emoji: '🔴', value: 1800, duplicateFragments: 500 },
};

function toKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function card(cardId, characterName, title, rarity, faction, description, characterId = toKey(characterName)) {
  return {
    cardId,
    characterId,
    characterName,
    name: `${characterName} — ${title}`,
    title,
    rarity,
    rarityLabel: RARITIES[rarity].label,
    color: RARITIES[rarity].color,
    emoji: RARITIES[rarity].emoji,
    value: RARITIES[rarity].value,
    duplicateFragments: RARITIES[rarity].duplicateFragments,
    faction,
    description,
    imageUrl: getConfiguredCardImage(cardId, characterId),
  };
}

const CORE_CARDS = [
  card('happy_compagnon_aile', 'Happy', 'Compagnon ailé', 'common', 'Fairy Tail', 'Un Exceed joyeux qui ne laisse jamais Natsu partir seul à l’aventure.'),
  card('carla_voyante', 'Carla', 'Voyante céleste', 'common', 'Fairy Tail', 'Une Exceed calme et perspicace dotée d’un rare pouvoir de prémonition.'),
  card('plue_esprit_niche', 'Plue', 'Esprit de compagnie', 'common', 'Esprits célestes', 'Le plus attendrissant des esprits célestes, fidèle malgré son étrange apparence.'),
  card('macao_flame_purple', 'Macao Conbolt', 'Flamme violette', 'common', 'Fairy Tail', 'Un mage vétéran capable de produire une flamme violette difficile à éteindre.'),
  card('wakaba_smoke_magic', 'Wakaba Mine', 'Volutes de fumée', 'common', 'Fairy Tail', 'Un mage expérimenté qui modèle sa fumée avec une précision surprenante.'),
  card('romeo_rainbow_flame', 'Romeo Conbolt', 'Flamme arc-en-ciel', 'common', 'Fairy Tail', 'Un jeune mage passionné maîtrisant plusieurs couleurs de flammes.'),
  card('bisca_sniper', 'Bisca Connell', 'Tireuse d’élite', 'common', 'Fairy Tail', 'Une spécialiste du rééquipement à distance et des tirs impossibles.'),
  card('alzack_guns_magic', 'Alzack Connell', 'Pistolero magique', 'common', 'Fairy Tail', 'Un combattant précis qui charge ses projectiles de magie.'),
  card('jet_high_speed', 'Jet', 'Vitesse fulgurante', 'common', 'Shadow Gear', 'Sa magie de vitesse lui permet de fondre sur une cible en un instant.'),
  card('droy_plant_magic', 'Droy', 'Semences guerrières', 'common', 'Shadow Gear', 'Un mage des plantes capable de faire surgir ses alliées végétales du sol.'),

  card('levy_script_solide', 'Levy McGarden', 'Script solide', 'rare', 'Shadow Gear', 'Les mots qu’elle écrit prennent forme pour protéger ses compagnons.'),
  card('lucy_celestial_keys', 'Lucy Heartfilia', 'Gardienne des clés', 'rare', 'Fairy Tail', 'Une constellationniste qui combat aux côtés de ses esprits célestes.'),
  card('gray_ice_make', 'Gray Fullbuster', 'Ice Make', 'rare', 'Fairy Tail', 'Un mage de glace créatif dont chaque construction répond à la situation.'),
  card('wendy_sky_maiden', 'Wendy Marvel', 'Jeune fille du ciel', 'rare', 'Fairy Tail', 'Une chasseuse de dragon céleste capable de soigner et renforcer ses alliés.'),
  card('juvia_rain_woman', 'Juvia Lockser', 'Femme de pluie', 'rare', 'Fairy Tail', 'Son corps d’eau et sa magie torrentielle rendent ses émotions dévastatrices.'),
  card('elfman_beast_arm', 'Elfman Strauss', 'Bras de la bête', 'rare', 'Fairy Tail', 'Un mage de Take Over qui porte fièrement la force des créatures vaincues.'),
  card('cana_fairy_glitter', 'Cana Alberona', 'Cartomancienne', 'rare', 'Fairy Tail', 'Ses cartes magiques cachent une puissance digne des plus grands mages.'),
  card('freed_dark_ecriture', 'Fried Justine', 'Écriture des ténèbres', 'rare', 'Raijinshû', 'Ses runes imposent des lois magiques que les imprudents regrettent vite.'),
  card('panther_lily_sword', 'Panther Lily', 'Épéiste Exceed', 'rare', 'Fairy Tail', 'Un guerrier Exceed discipliné maniant une lame à sa mesure.'),

  card('natsu_fire_dragon', 'Natsu Dragnir', 'Dragon de feu', 'epic', 'Fairy Tail', 'Un chasseur de dragon incandescent dont la volonté brûle plus fort que tout.'),
  card('erza_titania', 'Erza Scarlett', 'Titania', 'epic', 'Fairy Tail', 'La reine des fées change d’armure au cœur du combat sans jamais reculer.'),
  card('gajeel_iron_dragon', 'Gajeel Redfox', 'Dragon d’acier', 'epic', 'Fairy Tail', 'Son corps et sa magie de fer transforment chaque duel en choc frontal.'),
  card('laxus_lightning_dragon', 'Luxus Draer', 'Dragon de foudre', 'epic', 'Fairy Tail', 'Une foudre écrasante guidée par l’orgueil et l’attachement à sa guilde.'),
  card('mirajane_satan_soul', 'Mirajane Strauss', 'Satan Soul', 'epic', 'Fairy Tail', 'Derrière son sourire se cache une magie démoniaque d’une violence redoutable.'),
  card('sting_white_dragon', 'Sting Eucliffe', 'Dragon blanc', 'epic', 'Sabertooth', 'Un chasseur de dragon lumineux, rapide et sûr de sa puissance.'),
  card('rogue_shadow_dragon', 'Rogue Cheney', 'Dragon de l’ombre', 'epic', 'Sabertooth', 'Il se fond dans les ombres avant de frapper depuis un angle impossible.'),

  card('makarov_fairy_law', 'Makarov Draer', 'Fairy Law', 'legendary', 'Fairy Tail', 'Le maître protège ses enfants avec une magie capable de juger une armée entière.'),
  card('gildarts_crash', 'Gildarts Clive', 'Crash absolu', 'legendary', 'Fairy Tail', 'Le mage le plus redouté de la guilde désassemble toute magie sur son passage.'),
  card('jellal_grand_chariot', 'Jellal Fernandes', 'Grand Chariot', 'legendary', 'Crime Sorcière', 'La puissance des astres répond à un mage cherchant sans relâche la rédemption.'),
  card('zeref_black_wizard', 'Zeleph', 'Mage noir immortel', 'legendary', 'Empire Alvarez', 'Une malédiction immortelle fait de chacun de ses sentiments un danger.'),
  card('acnologia_apocalypse', 'Acnologia', 'Dragon de l’Apocalypse', 'legendary', 'Indépendant', 'Le dragon noir règne sur la destruction et dévore la magie elle-même.'),

  card('natsu_dragon_force', 'Natsu Dragnir', 'Force du Dragon', 'mythic', 'Fairy Tail', 'Quand la Force du Dragon s’éveille, ses flammes dépassent les limites humaines.'),
  card('erza_nakagami', 'Erza Scarlett', 'Armure Nakagami', 'mythic', 'Fairy Tail', 'Une armure légendaire qui tranche la magie et consume une énergie immense.'),
  card('lucy_star_dress', 'Lucy Heartfilia', 'Star Dress suprême', 'mythic', 'Fairy Tail', 'Lucy unit les pouvoirs de ses esprits et fait rayonner tout le ciel étoilé.'),
];

const CHARACTER_ROSTER = [
  ['Natsu Dragnir', 'Fairy Tail'], ['Lucy Heartfilia', 'Fairy Tail'], ['Gray Fullbuster', 'Fairy Tail'],
  ['Erza Scarlett', 'Fairy Tail'], ['Wendy Marvel', 'Fairy Tail'], ['Happy', 'Fairy Tail'],
  ['Carla', 'Fairy Tail'], ['Gajeel Redfox', 'Fairy Tail'], ['Levy McGarden', 'Shadow Gear'],
  ['Juvia Lockser', 'Fairy Tail'], ['Luxus Draer', 'Fairy Tail'], ['Mirajane Strauss', 'Fairy Tail'],
  ['Elfman Strauss', 'Fairy Tail'], ['Lisanna Strauss', 'Fairy Tail'], ['Cana Alberona', 'Fairy Tail'],
  ['Fried Justine', 'Raijinshû'], ['Evergreen', 'Raijinshû'], ['Bixrow', 'Raijinshû'],
  ['Makarov Draer', 'Fairy Tail'], ['Gildarts Clive', 'Fairy Tail'], ['Mest Gryder', 'Fairy Tail'],
  ['Panther Lily', 'Fairy Tail'], ['Macao Conbolt', 'Fairy Tail'], ['Wakaba Mine', 'Fairy Tail'],
  ['Romeo Conbolt', 'Fairy Tail'], ['Bisca Connell', 'Fairy Tail'], ['Alzack Connell', 'Fairy Tail'],
  ['Jet', 'Shadow Gear'], ['Droy', 'Shadow Gear'], ['Sting Eucliffe', 'Sabertooth'],
  ['Rogue Cheney', 'Sabertooth'], ['Yukino Agria', 'Sabertooth'], ['Minerva Orland', 'Sabertooth'],
  ['Rufus Lohr', 'Sabertooth'], ['Orga Nanagear', 'Sabertooth'], ['Kagura Mikazuchi', 'Mermaid Heel'],
  ['Ichiya Vandalay Kotobuki', 'Blue Pegasus'], ['Lyon Vastia', 'Lamia Scale'], ['Cherrya Blendy', 'Lamia Scale'],
  ['Jura Neekis', 'Lamia Scale'], ['Jellal Fernandes', 'Crime Sorcière'], ['Meredy', 'Crime Sorcière'],
  ['Ultear Milkovich', 'Crime Sorcière'], ['Zeleph', 'Empire Alvarez'], ['Mavis Vermillion', 'Fairy Tail'],
  ['Acnologia', 'Indépendant'], ['Irene Belserion', 'Spriggan 12'], ['August', 'Spriggan 12'],
  ['Brandish μ', 'Spriggan 12'], ['Dimaria Yesta', 'Spriggan 12'], ['Invel Yura', 'Spriggan 12'],
  ['God Serena', 'Spriggan 12'], ['Ajeel Raml', 'Spriggan 12'], ['Wahl Icht', 'Spriggan 12'],
  ['Neinhart', 'Spriggan 12'], ['Jacob Lessio', 'Spriggan 12'], ['Hadès', 'Grimoire Heart'],
  ['Larcade Dragneel', 'Empire Alvarez'], ['Anna Heartfilia', 'Constellationnistes'], ['Aquarius', 'Esprits célestes'],
];

const EDITIONS = [
  ['portrait_guilde', 'Portrait de guilde', 'common', (name, faction) => `${name} rejoint la collection dans une édition classique aux couleurs de ${faction}.`],
  ['mission_perilleuse', 'Mission périlleuse', 'rare', (name) => `${name} affronte une mission où expérience, courage et magie font toute la différence.`],
  ['pouvoir_libere', 'Pouvoir libéré', 'epic', (name) => `${name} cesse de retenir sa magie et révèle une puissance capable de renverser le combat.`],
  ['legende_vivante', 'Légende vivante', 'legendary', (name, faction) => `${name} entre dans la légende de ${faction} après un affrontement mémorable.`],
];

const MYTHIC_CHARACTERS = new Set([
  'natsu_dragnir', 'lucy_heartfilia', 'gray_fullbuster', 'erza_scarlett', 'wendy_marvel',
  'gajeel_redfox', 'luxus_draer', 'mirajane_strauss', 'makarov_draer', 'gildarts_clive',
  'sting_eucliffe', 'rogue_cheney', 'minerva_orland', 'kagura_mikazuchi', 'jura_neekis',
  'jellal_fernandes', 'ultear_milkovich', 'zeleph', 'mavis_vermillion', 'acnologia',
  'irene_belserion', 'august', 'brandish', 'god_serena', 'hades',
]);

const SERIES_CARDS = CHARACTER_ROSTER.flatMap(([characterName, faction]) => {
  const characterId = toKey(characterName);
  const editions = EDITIONS.map(([editionId, title, rarity, describe]) => card(
    `series_${characterId}_${editionId}`,
    characterName,
    title,
    rarity,
    faction,
    describe(characterName, faction),
    characterId,
  ));
  if (MYTHIC_CHARACTERS.has(characterId)) {
    editions.push(card(
      `series_${characterId}_apogee_magique`,
      characterName,
      'Apogée magique',
      'mythic',
      faction,
      `${characterName} atteint l’apogée de sa magie dans une édition mythique baignée d’énergie pure.`,
      characterId,
    ));
  }
  return editions;
});

const FAIRY_TAIL_CARDS = [...CORE_CARDS, ...SERIES_CARDS];

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

function getCardById(cardId) {
  return FAIRY_TAIL_CARDS.find((entry) => entry.cardId === cardId) || null;
}

function getCardsByRarity(rarity) {
  return FAIRY_TAIL_CARDS.filter((entry) => entry.rarity === rarity);
}

module.exports = {
  FAIRY_TAIL_CARDS,
  RARITIES,
  RARITY_ORDER,
  getCardById,
  getCardsByRarity,
};
