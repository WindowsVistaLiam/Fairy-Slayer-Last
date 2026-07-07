const RECIPES = [
  { recipeId: 'potion_vigueur', profession: 'alchimiste', outputItemId: 'potion_vigueur', ingredients: { herbe_lune: 2, eau_lacrima: 1 } },
  { recipeId: 'antidote_arcane', profession: 'alchimiste', outputItemId: 'antidote_arcane', ingredients: { herbe_lune: 2, racine_mandragore: 1, eau_lacrima: 1 } },
  { recipeId: 'elixir_celerite', profession: 'alchimiste', outputItemId: 'elixir_celerite', ingredients: { racine_mandragore: 2, eau_lacrima: 2 } },
  { recipeId: 'potion_peau_pierre', profession: 'alchimiste', outputItemId: 'potion_peau_pierre', ingredients: { racine_mandragore: 2, poussiere_etoile: 1, eau_lacrima: 2 } },
  { recipeId: 'essence_draconique', profession: 'alchimiste', outputItemId: 'essence_draconique', ingredients: { ecaille_draconique: 1, poussiere_etoile: 2, eau_lacrima: 3 } },
  { recipeId: 'panacee_celeste', profession: 'alchimiste', outputItemId: 'panacee_celeste', ingredients: { plume_phenix: 1, poussiere_etoile: 4, eau_lacrima: 5 } },

  { recipeId: 'sabre_acier_magique', profession: 'forgeron', outputItemId: 'sabre_acier_magique', ingredients: { lingot_fer: 3, acier_magique: 1 } },
  { recipeId: 'lance_vent', profession: 'forgeron', outputItemId: 'lance_vent', ingredients: { lingot_fer: 2, acier_magique: 2, fil_argent: 1 } },
  { recipeId: 'marteau_runique', profession: 'forgeron', outputItemId: 'marteau_runique', ingredients: { lingot_fer: 4, acier_magique: 2, plaque_runique: 1 } },
  { recipeId: 'arc_lunaire', profession: 'forgeron', outputItemId: 'arc_lunaire', ingredients: { acier_magique: 3, fil_argent: 2, poussiere_etoile: 1 } },
  { recipeId: 'lame_mithril', profession: 'forgeron', outputItemId: 'lame_mithril', ingredients: { mithril: 3, acier_magique: 2, plaque_runique: 1 } },
  { recipeId: 'espadon_dragon', profession: 'forgeron', outputItemId: 'espadon_dragon', ingredients: { mithril: 4, ecaille_draconique: 3, plaque_runique: 2 } },

  { recipeId: 'armure_cuir_mage', profession: 'armurier', outputItemId: 'armure_cuir_mage', ingredients: { cuir_renforce: 4, fil_argent: 1 } },
  { recipeId: 'robe_enchantee', profession: 'armurier', outputItemId: 'robe_enchantee', ingredients: { tissu_enchante: 4, fil_argent: 2 } },
  { recipeId: 'cuirasse_runique', profession: 'armurier', outputItemId: 'cuirasse_runique', ingredients: { lingot_fer: 3, cuir_renforce: 2, plaque_runique: 2 } },
  { recipeId: 'manteau_lunaire', profession: 'armurier', outputItemId: 'manteau_lunaire', ingredients: { tissu_enchante: 4, fil_argent: 3, poussiere_etoile: 1 } },
  { recipeId: 'armure_mithril', profession: 'armurier', outputItemId: 'armure_mithril', ingredients: { mithril: 4, fil_argent: 3, plaque_runique: 2 } },
  { recipeId: 'armure_draconique', profession: 'armurier', outputItemId: 'armure_draconique', ingredients: { mithril: 4, ecaille_draconique: 4, plaque_runique: 3 } },

  { recipeId: 'grimoire_soins', profession: 'redacteur', outputItemId: 'grimoire_soins', ingredients: { parchemin_vierge: 4, encre_magique: 1, herbe_lune: 1 } },
  { recipeId: 'livre_flammes', profession: 'redacteur', outputItemId: 'livre_flammes', ingredients: { parchemin_vierge: 5, encre_magique: 2, cristal_memoire: 1 } },
  { recipeId: 'codex_vent', profession: 'redacteur', outputItemId: 'codex_vent', ingredients: { parchemin_vierge: 5, encre_magique: 2, fil_argent: 1 } },
  { recipeId: 'tome_runique', profession: 'redacteur', outputItemId: 'tome_runique', ingredients: { parchemin_vierge: 6, encre_magique: 3, cristal_memoire: 2 } },
  { recipeId: 'grimoire_celeste', profession: 'redacteur', outputItemId: 'grimoire_celeste', ingredients: { parchemin_vierge: 8, encre_magique: 4, cristal_memoire: 3, poussiere_etoile: 2 } },
  { recipeId: 'codex_draconique', profession: 'redacteur', outputItemId: 'codex_draconique', ingredients: { parchemin_vierge: 10, encre_magique: 5, cristal_memoire: 4, plume_phenix: 1 } },
];

function getRecipesForProfession(profession) {
  return RECIPES.filter((recipe) => recipe.profession === profession);
}

function getRecipeById(recipeId) {
  return RECIPES.find((recipe) => recipe.recipeId === recipeId) || null;
}

module.exports = { RECIPES, getRecipesForProfession, getRecipeById };
