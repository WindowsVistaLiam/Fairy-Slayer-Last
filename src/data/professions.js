const PROFESSIONS = [
  {
    id: 'alchimiste',
    name: 'Alchimiste',
    description: 'Fabrique potions, élixirs et préparations magiques.',
    craftCategory: 'potions',
  },
  {
    id: 'forgeron',
    name: 'Forgeron',
    description: 'Forge épées, lances, marteaux et armes enchantées.',
    craftCategory: 'armes',
  },
  {
    id: 'armurier',
    name: 'Armurier',
    description: 'Conçoit armures, manteaux et protections de combat.',
    craftCategory: 'armures',
  },
  {
    id: 'redacteur',
    name: 'Rédacteur',
    description: 'Rédige grimoires et livres de sorts équipables.',
    craftCategory: 'grimoires',
  },
  {
    id: 'fermier',
    name: 'Fermier',
    description: 'Gagne 20 % d’XP supplémentaire sur chaque message RP éligible.',
  },
  {
    id: 'marchand',
    name: 'Marchand',
    description: 'Achète les objets de la boutique à 80 % de leur prix calculé.',
  },
  {
    id: 'barde',
    name: 'Barde',
    description: 'Gagne 1 réputation tous les 10 messages RP d’au moins 120 caractères.',
  },
  {
    id: 'tresorier',
    name: 'Trésorier',
    description: 'Fait fructifier ses Joyaux de 5 % par jour.',
  },
];

function getProfession(id) {
  return PROFESSIONS.find((profession) => profession.id === id) || null;
}

module.exports = { PROFESSIONS, getProfession };
