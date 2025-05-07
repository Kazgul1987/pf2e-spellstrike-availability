const MODULE_ID = "pf2e-spellstrike-availability";
const PACK_ID = `${MODULE_ID}.spellstrike-effects`;
const EFFECT_SLUG = "spellstrike-available";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);
});

Hooks.once("ready", () => {
  game.modules.get(MODULE_ID).api = {
    applyEffectToActor,
    removeEffectFromActor
  };
});

/** Check if actor is a Magus */
function isMagus(actor) {
  return actor?.type === "character" && actor?.classes?.magus;
}

/** Load and apply ActiveEffect from Compendium */
async function applyEffectToActor(actor) {
  if (!actor || !isMagus(actor)) return;
  const existing = actor.effects.find(e => e.slug === EFFECT_SLUG);
  if (existing) return;

  const pack = game.packs.get(PACK_ID);
  if (!pack) return ui.notifications.error("Compendium nicht gefunden.");

  const index = await pack.getIndex();
  const entry = index.find(e => e.slug === EFFECT_SLUG || e.name === "Spellstrike Available");
  if (!entry) return ui.notifications.error("Effekt im Compendium nicht gefunden.");

  const doc = await pack.getDocument(entry._id);
  if (!doc) return;

  await actor.createEmbeddedDocuments("ActiveEffect", [doc.toObject()]);
}

/** Remove ActiveEffect */
async function removeEffectFromActor(actor) {
  const effect = actor.effects.find(e => e.slug === EFFECT_SLUG);
  if (effect) await effect.delete();
}

/** On combat start: apply effect to all Magus tokens */
Hooks.on("combatStart", combat => {
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (isMagus(actor)) {
      applyEffectToActor(actor);
    }
  }
});

/** Intercept Spellstrike macro usage */
Hooks.on("preCreateChatMessage", async message => {
  const content = message.content;
  if (!content || !content.toLowerCase().includes("spellstrike")) return;

  const speaker = message.speaker;
  const actor = game.actors.get(speaker.actor);
  if (!actor || !isMagus(actor)) return;

  await removeEffectFromActor(actor);
});

/** Add custom action to Magus sheets */
Hooks.on("renderActorSheet", async (sheet, html, data) => {
  const actor = sheet.actor;
  if (!isMagus(actor)) return;

  const button = $(
    `<button type="button" style="margin:5px">🔁 Spellstrike bereit</button>`
  );

  button.on("click", () => applyEffectToActor(actor));

  html.find(".sheet-header").append(button);
});
