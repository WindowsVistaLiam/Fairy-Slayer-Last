/*
 * REGISTRE DES IMAGES DU GACHA
 *
 * Colle uniquement des liens directs HTTP(S) entre les guillemets.
 * Formats acceptés : PNG, JPEG, WEBP ou GIF. Taille maximale : 10 Mo.
 *
 * 1. CHARACTER_IMAGE_URLS donne une image par défaut à TOUTES les cartes du personnage.
 * 2. CARD_IMAGE_URLS remplace cette image pour UNE carte précise.
 *
 * Exemple :
 * natsu_dragnir: 'https://exemple.com/natsu.png',
 */

const CHARACTER_IMAGE_URLS = {
  // Fairy Tail — équipe principale
  natsu_dragnir: '', // Natsu Dragnir
  lucy_heartfilia: '', // Lucy Heartfilia
  gray_fullbuster: '', // Gray Fullbuster
  erza_scarlett: '', // Erza Scarlett
  wendy_marvel: '', // Wendy Marvel
  happy: '', // Happy
  carla: '', // Carla

  // Fairy Tail — autres membres
  gajeel_redfox: '', // Gajeel Redfox
  levy_mcgarden: '', // Levy McGarden
  juvia_lockser: '', // Juvia Lockser
  luxus_draer: '', // Luxus Draer
  mirajane_strauss: '', // Mirajane Strauss
  elfman_strauss: '', // Elfman Strauss
  lisanna_strauss: '', // Lisanna Strauss
  cana_alberona: '', // Cana Alberona
  fried_justine: '', // Fried Justine
  evergreen: '', // Evergreen
  bixrow: '', // Bixrow
  makarov_draer: '', // Makarov Draer
  gildarts_clive: '', // Gildarts Clive
  mest_gryder: '', // Mest Gryder
  panther_lily: '', // Panther Lily
  macao_conbolt: '', // Macao Conbolt
  wakaba_mine: '', // Wakaba Mine
  romeo_conbolt: '', // Romeo Conbolt
  bisca_connell: '', // Bisca Connell
  alzack_connell: '', // Alzack Connell
  jet: '', // Jet
  droy: '', // Droy

  // Sabertooth
  sting_eucliffe: '', // Sting Eucliffe
  rogue_cheney: '', // Rogue Cheney
  yukino_agria: '', // Yukino Agria
  minerva_orland: '', // Minerva Orland
  rufus_lohr: '', // Rufus Lohr
  orga_nanagear: '', // Orga Nanagear

  // Autres guildes
  kagura_mikazuchi: '', // Kagura Mikazuchi — Mermaid Heel
  ichiya_vandalay_kotobuki: '', // Ichiya — Blue Pegasus
  lyon_vastia: '', // Lyon Vastia — Lamia Scale
  cherrya_blendy: '', // Cherrya Blendy — Lamia Scale
  jura_neekis: '', // Jura Neekis — Lamia Scale

  // Crime Sorcière
  jellal_fernandes: '', // Jellal Fernandes
  meredy: '', // Meredy
  ultear_milkovich: '', // Ultear Milkovich

  // Légendes et antagonistes
  zeleph: '', // Zeleph
  mavis_vermillion: '', // Mavis Vermillion
  acnologia: '', // Acnologia
  hades: '', // Hadès
  anna_heartfilia: '', // Anna Heartfilia
  aquarius: '', // Aquarius

  // Spriggan 12 et Empire Alvarez
  irene_belserion: '', // Irene Belserion
  august: '', // August
  brandish: '', // Brandish μ
  dimaria_yesta: '', // Dimaria Yesta
  invel_yura: '', // Invel Yura
  god_serena: '', // God Serena
  ajeel_raml: '', // Ajeel Raml
  wahl_icht: '', // Wahl Icht
  neinhart: '', // Neinhart
  jacob_lessio: '', // Jacob Lessio
  larcade_dragneel: '', // Larcade Dragneel

  // Esprits
  plue: '', // Plue
};

const CARD_IMAGE_URLS = {
  // Cartes historiques communes
  happy_compagnon_aile: '',
  carla_voyante: '',
  plue_esprit_niche: '',
  macao_flame_purple: '',
  wakaba_smoke_magic: '',
  romeo_rainbow_flame: '',
  bisca_sniper: '',
  alzack_guns_magic: '',
  jet_high_speed: '',
  droy_plant_magic: '',

  // Cartes historiques rares
  levy_script_solide: '',
  lucy_celestial_keys: '',
  gray_ice_make: '',
  wendy_sky_maiden: '',
  juvia_rain_woman: '',
  elfman_beast_arm: '',
  cana_fairy_glitter: '',
  freed_dark_ecriture: '',
  panther_lily_sword: '',

  // Cartes historiques épiques
  natsu_fire_dragon: '',
  erza_titania: '',
  gajeel_iron_dragon: '',
  laxus_lightning_dragon: '',
  mirajane_satan_soul: '',
  sting_white_dragon: '',
  rogue_shadow_dragon: '',

  // Cartes historiques légendaires
  makarov_fairy_law: '',
  gildarts_crash: '',
  jellal_grand_chariot: '',
  zeref_black_wizard: '',
  acnologia_apocalypse: '',

  // Cartes historiques mythiques
  natsu_dragon_force: '',
  erza_nakagami: '',
  lucy_star_dress: '',

  /*
   * OVERRIDES DES CARTES GÉNÉRÉES
   *
   * Si une variante doit avoir une image différente de celle du personnage,
   * copie son ID depuis sa fiche `/cartes`, puis ajoute une ligne ici :
   *
   * series_natsu_dragnir_portrait_guilde: 'https://exemple.com/natsu-portrait.png',
   * series_natsu_dragnir_mission_perilleuse: 'https://exemple.com/natsu-mission.png',
   * series_natsu_dragnir_pouvoir_libere: 'https://exemple.com/natsu-pouvoir.png',
   * series_natsu_dragnir_legende_vivante: 'https://exemple.com/natsu-legende.png',
   * series_natsu_dragnir_apogee_magique: 'https://exemple.com/natsu-mythique.png',
   */
};

function getConfiguredCardImage(cardId, characterId) {
  return CARD_IMAGE_URLS[cardId] || CHARACTER_IMAGE_URLS[characterId] || null;
}

module.exports = {
  CARD_IMAGE_URLS,
  CHARACTER_IMAGE_URLS,
  getConfiguredCardImage,
};
