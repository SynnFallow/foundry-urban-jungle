import { makeStatCompareReady } from "./helpers.js";

/**
 * Unified function to get whether the target has any of the select conditions for urbanjungle
 * @param {String[] | String} conditions Conditions to check for, make sure they are comparison-ready
 * @param {(Actor | Token)} target The actor or token(s) in question
 * @param {boolean} warn Whether to use CUB's warnings
 * @returns {boolean} Whether the target has any of the conditions
 */
export function hasConditionsIronclaw(conditions, target, warn = false) {
    if (!conditions || !target) {
        console.log("hasConditionsIronclaw was given empty conditions or target: " + conditions.toString() + " " + target.toString());
        return false;
    }

    if (game.urbanjungle.useCUBConditions) {
        let cubconditions = CommonConditionInfo.convertToCub(conditions);
        return game.cub.hasCondition(cubconditions, target, { "warn": warn });
    }
    else {
        let actor = getTargetActor(target);
        if (!actor) return false;
        conditions = Array.isArray(conditions) ? conditions : [conditions];

        return actor.data.effects.some(x => conditions.includes(x.data.flags?.core?.statusId));
    }
}

/**
 * Unified function to get all condition names the target has for urbanjungle
 * @param {Actor | Token} target The actor or token in question
 * @param {boolean} warn Whether to use CUB's warnings
 * @returns {string[]} Array of conditions the target has
 */
export function getConditionNamesIronclaw(target, warn = false) {
    let names = [];

    if (game.urbanjungle.useCUBConditions) {
        let raw = game.cub.getConditions(target, { "warn": warn });
        if (raw?.conditions) {
            if (Array.isArray(raw.conditions)) {
                raw.conditions.forEach(x => names.push(x.name));
            }
            else {
                names.push(raw.conditions.name);
            }
        }
    }
    else {
        let actor = getTargetActor(target);
        if (!actor) return false;

        actor.data.effects.forEach((value) => names.push(value.data.label));
    }

    return names;
}

/**
 * Unified function to get all conditions the target has for urbanjungle
 * @param {Actor | Token} target The actor or token in question
 * @param {boolean} warn Whether to use CUB's warnings
 * @returns {Object[]} Array of conditions the target has
 */
export function getConditionsIronclaw(target, warn = false) {
    let conds = [];

    if (game.urbanjungle.useCUBConditions) {
        let raw = game.cub.getConditionEffects(target, { "warn": warn });
        if (raw) {
            if (Array.isArray(raw)) {
                raw.conditions.forEach(x => conds.push(x));
            }
            else {
                conds.push(raw);
            }
        }
    }
    else {
        let actor = getTargetActor(target);
        if (!actor) return false;

        actor.data.effects.forEach((value) => conds.push(value));
    }

    return conds;
}

/**
 * Unified function to add conditions for urbanjungle
 * @param {String[] | String} conditions Conditions to add
 * @param {(Actor | Token)} target The actor or token in question
 * @param {boolean} warn Whether to use CUB's warnings
 */
export async function addConditionsIronclaw(conditions, target, warn = false) {
    if (!game.ready) { // If the game isn't fully ready yet, wait until it is
        await game.urbanjungle.waitUntilReady();
    }

    if (game.urbanjungle.useCUBConditions) {
        let cubconditions = CommonConditionInfo.convertToCub(conditions);
        return game.cub.addCondition(cubconditions, target, { "warn": warn });
    }
    else {
        let actor = getTargetActor(target);
        if (!actor) return false;
        let usedconditions = Array.isArray(conditions) ? conditions : [conditions];
        if (hasConditionsIronclaw(conditions, target, warn)) {
            const existingeffects = getConditionsIronclaw(target, warn);
            usedconditions = usedconditions.filter(x => existingeffects.some(y => y.getFlag("core", "statusId") === x) == false);
        }
        const effects = prepareEffects(CommonConditionInfo.getMatchedConditions(usedconditions));
        if (effects.length > 0) {
            await actor.createEmbeddedDocuments("ActiveEffect", effects);
        }
    }
}

/**
 * Unified function to remove conditions for urbanjungle
 * @param {String[] | String} conditions Conditions to remove
 * @param {(Actor[] | Token[] | Actor | Token)} target The actor(s) or token(s) in question
 * @param {boolean} checkfirst First check if the target has any of the conditions
 * @param {boolean} warn Whether to use CUB's warnings
 */
export async function removeConditionsIronclaw(conditions, target, checkfirst = true, warn = false) {
    if (!game.ready) { // If the game isn't fully ready yet, wait until it is
        await game.urbanjungle.waitUntilReady();
    }

    if (game.urbanjungle.useCUBConditions) {
        if (checkfirst === false || (hasConditionsIronclaw(conditions, target))) {
            let cubconditions = CommonConditionInfo.convertToCub(conditions);
            return game.cub.removeCondition(cubconditions, target, { "warn": warn });
        }
    }
    else {
        let actor = getTargetActor(target);
        if (!actor) return false;
        conditions = Array.isArray(conditions) ? conditions : [conditions];

        let removals = [];
        actor.data.effects.forEach((value) => { if (conditions.includes(value.getFlag("core", "statusId"))) removals.push(value.id); });
        if (removals.length > 0)
            await actor.deleteEmbeddedDocuments("ActiveEffect", removals);
    }
}

/**
 * Unified function to get a specific condition for urbanjungle
 * @param {string | ActiveEffect} condition The name or the ActiveEffect of the condition
 * @param {boolean} warn Whether to use CUB's warnings
 * @returns {Object} Array of conditions the target have
 */
export function getConditionByNameIronclaw(condition, warn = false) {
    let name = condition?.data?.label || condition;
    name = makeStatCompareReady(name);

    if (game.urbanjungle.useCUBConditions) {
        name = CommonConditionInfo.convertToCub(name);
        return game.cub.getCondition(name, null, { "warn": warn });
    }
    else {
        let cond = CommonConditionInfo.getMatchedConditions(name);
        return cond.length > 0 ? cond.shift() : null;
    }
}

/* -------------------------------------------- */
/*  Condition Helpers                           */
/* -------------------------------------------- */

/**
 * Grab the actor instance from the given target
 * @param {Actor | Token} target
 * @returns {Actor | null}
 */
function getTargetActor(target) {
    return (target instanceof Actor ? target : (target instanceof Token ? target.actor : null));
}

function prepareEffects(effects) {
    let effectDatas = [];
    effects = Array.isArray(effects) ? effects : [effects];

    for (let effect of effects) {
        const createData = duplicate(effect);
        createData.label = game.i18n.localize(effect.label);
        createData["flags.core.statusId"] = effect.id;
        delete createData.id;
        effectDatas.push(createData);
    }

    return effectDatas;
}

/* -------------------------------------------- */
/*  Condition Static Information                */
/* -------------------------------------------- */

/** Common class for unified condition name referencing */
export class CommonConditionInfo {
    /**
     * List of conditions used to replace Foundry defaults for urbanjungle system
     * Condition id's are all in comparison-ready format, all lowercase and spaces removed
     */
    static conditionList = [{
        id: "focused",
        label: "urbanjungle.effect.status.focused",
        icon: "icons/svg/upgrade.svg"
    },
    {
        id: "guarding",
        label: "urbanjungle.effect.status.guarding",
        icon: "icons/svg/shield.svg"
    },
    {
        id: "reeling",
        label: "urbanjungle.effect.status.reeling",
        icon: "icons/svg/lightning.svg"
    },
    {
        id: "hurt",
        label: "urbanjungle.effect.status.hurt",
        icon: "icons/svg/acid.svg"
    },
    {
        id: "afraid",
        label: "urbanjungle.effect.status.afraid",
        icon: "systems/urbanjungle/icons/status/afraid.svg"
    },
    {
        id: "injured",
        label: "urbanjungle.effect.status.injured",
        icon: "icons/svg/blood.svg"
    },
    {
        id: "dying",
        label: "urbanjungle.effect.status.dying",
        icon: "systems/urbanjungle/icons/status/dying.svg"
    },
    {
        id: "dead",
        label: "urbanjungle.effect.status.dead",
        icon: "icons/svg/skull.svg"
    },
    {
        id: "overkilled",
        label: "urbanjungle.effect.status.overkilled",
        icon: "systems/urbanjungle/icons/status/overkilled.svg"
    },
    {
        id: "asleep",
        label: "urbanjungle.effect.status.asleep",
        icon: "icons/svg/sleep.svg"
    },
    {
        id: "unconscious",
        label: "urbanjungle.effect.status.unconscious",
        icon: "icons/svg/unconscious.svg"
    },
    {
        id: "burdened",
        label: "urbanjungle.effect.status.burdened",
        icon: "systems/urbanjungle/icons/status/burdened.svg"
    },
    {
        id: "over-burdened",
        label: "urbanjungle.effect.status.over-burdened",
        icon: "systems/urbanjungle/icons/status/overburdened.svg"
    },
    {
        id: "cannotmove",
        label: "urbanjungle.effect.status.cannotmove",
        icon: "systems/urbanjungle/icons/status/cantmove.svg"
    },
    {
        id: "fatigued",
        label: "urbanjungle.effect.status.fatigued",
        icon: "icons/svg/degen.svg"
    },
    {
        id: "sick",
        label: "urbanjungle.effect.status.sick",
        icon: "icons/svg/poison.svg"
    },
    {
        id: "confused",
        label: "urbanjungle.effect.status.confused",
        icon: "icons/svg/daze.svg"
    },
    {
        id: "terrified",
        label: "urbanjungle.effect.status.terrified",
        icon: "systems/urbanjungle/icons/status/terrified.svg"
    },
    {
        id: "enraged",
        label: "urbanjungle.effect.status.enraged",
        icon: "icons/svg/explosion.svg"
    },
    {
        id: "knockdown",
        label: "urbanjungle.effect.status.knockdown",
        icon: "icons/svg/falling.svg"
    },
    {
        id: "berserk",
        label: "urbanjungle.effect.status.berserk",
        icon: "icons/svg/hazard.svg"
    },
    {
        id: "blinded",
        label: "urbanjungle.effect.status.blinded",
        icon: "icons/svg/blind.svg"
    },
    {
        id: "silenced",
        label: "urbanjungle.effect.status.silenced",
        icon: "icons/svg/silenced.svg"
    },
    {
        id: "fulltilt",
        label: "urbanjungle.effect.status.fulltilt",
        icon: "icons/svg/up.svg"
    },
    {
        id: "slowed",
        label: "urbanjungle.effect.status.slowed",
        icon: "icons/svg/down.svg"
    },
    {
        id: "immobilized",
        label: "urbanjungle.effect.status.immobilized",
        icon: "icons/svg/mountain.svg"
    },
    {
        id: "half-buried",
        label: "urbanjungle.effect.status.half-buried",
        icon: "icons/svg/ruins.svg"
    },
    {
        id: "onfire",
        label: "urbanjungle.effect.status.onfire",
        icon: "icons/svg/fire.svg"
    },
    {
        id: "mesmerized",
        label: "urbanjungle.effect.status.mesmerized",
        icon: "icons/svg/ice-aura.svg"
    },
    {
        id: "marionette",
        label: "urbanjungle.effect.status.marionette",
        icon: "icons/svg/paralysis.svg"
    },
    {
        id: "controlled",
        label: "urbanjungle.effect.status.controlled",
        icon: "icons/svg/statue.svg"
    },
    {
        id: "allfours",
        label: "urbanjungle.effect.status.allfours",
        icon: "icons/svg/pawprint.svg"
    },
    {
        id: "flying",
        label: "urbanjungle.effect.status.flying",
        icon: "icons/svg/wing.svg"
    },
    {
        id: "grappled",
        label: "urbanjungle.effect.status.grappled",
        icon: "icons/svg/net.svg"
    },
    {
        id: "hiding",
        label: "urbanjungle.effect.status.hiding",
        icon: "icons/svg/mystery-man.svg"
    },
    {
        id: "misc-a",
        label: "urbanjungle.effect.status.misc-a",
        icon: "icons/svg/eye.svg"
    },
    {
        id: "misc-b",
        label: "urbanjungle.effect.status.misc-b",
        icon: "icons/svg/clockwork.svg"
    },
    {
        id: "misc-c",
        label: "urbanjungle.effect.status.misc-c",
        icon: "icons/svg/castle.svg"
    },
    {
        id: "misc-d",
        label: "urbanjungle.effect.status.misc-d",
        icon: "icons/svg/book.svg"
    },
    {
        id: "misc-e",
        label: "urbanjungle.effect.status.misc-e",
        icon: "icons/svg/coins.svg"
    },
    {
        id: "misc-f",
        label: "urbanjungle.effect.status.misc-f",
        icon: "icons/svg/sound.svg"
    }];

    /**
     * Map of standard names and their proper names in the CUB-provided condition-map
     */
    static cubList = Object.freeze(new Map([["focused", "Focused"], ["guarding", "Guarding"], ["reeling", "Reeling"], ["hurt", "Hurt"], ["afraid", "Afraid"],
    ["injured", "Injured"], ["dying", "Dying"], ["dead", "Dead"], ["overkilled", "Overkilled"], ["asleep", "Asleep"], ["unconscious", "Unconscious"],
    ["burdened", "Burdened"], ["over-burdened", "Over-Burdened"], ["cannotmove", "Cannot Move"], ["fatigued", "Fatigued"], ["sick", "Sick"],
    ["confused", "Confused"], ["terrified", "Terrified"], ["enraged", "Enraged"], ["knockdown", "Knockdown"], ["berserk", "Berserk"],
    ["blinded", "Blinded"], ["silenced", "Silenced"], ["fulltilt", "Full Tilt"], ["slowed", "Slowed"], ["immobilized", "Immobilized"],
    ["half-buried", "Half-Buried"], ["onfire", "On Fire"], ["mesmerized", "Mesmerized"], ["marionette", "Marionette"], ["controlled", "Controlled"],
    ["allfours", "All Fours"], ["flying", "Flying"], ["grappled", "Grappled"], ["hiding", "Hiding"], ["misc-a", "Misc-A"], ["misc-b", "Misc-B"], ["misc-c", "Misc-C"],
    ["misc-d", "Misc-D"], ["misc-e", "Misc-E"], ["misc-f", "Misc-F"]]));

    /**
     * Convert a single or a list of conditions from id's into CUB condition names
     * @param {string | string[]} conditions
     * @returns {string[]}
     */
    static convertToCub(conditions) {
        let cubconditions = [];
        if (Array.isArray(conditions)) {
            conditions.forEach(cond => {
                if (this.cubList.has(cond))
                    cubconditions.push(this.cubList.get(cond));
            });
        }
        else {
            if (this.cubList.has(conditions))
                cubconditions.push(this.cubList.get(conditions));
        }
        return cubconditions;
    }

    /**
     * Get the condition or all conditions from the list
     * @param {string | string[]} conditions The condition or array of conditions to get
     * @returns {Array}
     */
    static getMatchedConditions(conditions) {
        let matches = [];
        if (Array.isArray(conditions)) {
            matches = this.conditionList.filter(cond => conditions.includes(cond.id));
        } else {
            matches.push(this.conditionList.find(cond => cond.id == conditions));
        }
        return matches;
    }

    /**
     * Returns the translation identifier for a given condition
     * @param {string} condition
     * @returns {string}
     */
    static getConditionLabel(condition) {
        return this.conditionList.find(cond => cond.id == condition)?.label;
    }
}