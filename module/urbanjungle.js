// Import Modules
import { urbanjungleActor } from "./actor/actor.js";
import { urbanjungleActorSheet } from "./actor/actor-sheet.js";
import { urbanjungleItem } from "./item/item.js";
import { urbanjungleItemSheet } from "./item/item-sheet.js";

import { urbanjungleCombat } from "./combat.js";
import { urbanjungleCombatant } from "./combat.js";
import { urbanjungleCombatTracker } from "./combat.js";

import { rollTargetNumberDialog } from "./dicerollers.js";
import { rollHighestDialog } from "./dicerollers.js";
import { rollTargetNumberOneLine } from "./dicerollers.js";
import { rollHighestOneLine } from "./dicerollers.js";
import { copyToRollTN } from "./dicerollers.js";
import { copyToRollTNDialog } from "./dicerollers.js";
import { copyToRollHighest } from "./dicerollers.js";

import { makeStatCompareReady } from "./helpers.js";

import { ironclawRollChat } from "./commands.js";
import { ironclawRollActorChat } from "./commands.js";

import { CommonConditionInfo } from "./conditions.js";


/* -------------------------------------------- */
/*  Base Hooks                                  */
/* -------------------------------------------- */

Hooks.once('init', async function () {

    game.urbanjungle = {
        urbanjungleActor,
        urbanjungleItem,
        urbanjungleCombat,
        urbanjungleCombatant,
        urbanjungleCombatTracker,
        rollItemMacro,
        popupMacro,
        popupSelect,
        rollTargetNumberDialog,
        rollHighestDialog,
        rollTargetNumberOneLine,
        rollHighestOneLine,
        "useCUBConditions": false,
        waitUntilReady
    };

    // Define custom Entity classes
    CONFIG.Actor.documentClass = urbanjungleActor;
    CONFIG.Item.documentClass = urbanjungleItem;
    CONFIG.Combat.documentClass = urbanjungleCombat;
    CONFIG.Combatant.documentClass = urbanjungleCombatant;
    CONFIG.ui.combat = urbanjungleCombatTracker;
    CONFIG.statusEffects = CommonConditionInfo.conditionList;

    /**
     * Set an initiative formula for the system
     * @type {String}
     */
    CONFIG.Combat.initiative = {
        formula: "-1",
        decimals: 2
    };
    CONFIG.time.roundTime = 6;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("urbanjungle", urbanjungleActorSheet, { makeDefault: true });
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("urbanjungle", urbanjungleItemSheet, { makeDefault: true });

    // Register system world settings
    game.settings.register("urbanjungle", "preferTokenName", {
        name: "urbanjungle.config.preferTokenName",
        hint: "urbanjungle.config.preferTokenNameHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });
    game.settings.register("urbanjungle", "manageEncumbranceAuto", {
        name: "urbanjungle.config.manageEncumbranceAuto",
        hint: "urbanjungle.config.manageEncumbranceAutoHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register("urbanjungle", "coinsHaveWeight", {
        name: "urbanjungle.config.coinsHaveWeight",
        hint: "urbanjungle.config.coinsHaveWeightHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });
    game.settings.register("urbanjungle", "autoPrototypeSetup", {
        name: "urbanjungle.config.autoPrototypeSetup",
        hint: "urbanjungle.config.autoPrototypeSetupHint",
        scope: "world",
        type: Boolean,
        default: true,
        config: true
    });
    game.settings.register("urbanjungle", "calculateAttackEffects", {
        name: "urbanjungle.config.calculateAttackEffects",
        hint: "urbanjungle.config.calculateAttackEffectsHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register("urbanjungle", "calculateDisplaysFailed", {
        name: "urbanjungle.config.calculateDisplaysFailed",
        hint: "urbanjungle.config.calculateDisplaysFailedHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });
    game.settings.register("urbanjungle", "calculateDoesNotDisplay", {
        name: "urbanjungle.config.calculateDoesNotDisplay",
        hint: "urbanjungle.config.calculateDoesNotDisplayHint",
        scope: "world",
        type: Boolean,
        default: false,
        config: true
    });

    // Register system client settings
    game.settings.register("urbanjungle", "defaultSendDamage", {
        name: "urbanjungle.config.defaultSendDamage",
        hint: "urbanjungle.config.defaultSendDamageHint",
        scope: "client",
        type: Boolean,
        default: true,
        config: true
    });
    game.settings.register("urbanjungle", "confirmItemInfo", {
        name: "urbanjungle.config.confirmItemInfo",
        hint: "urbanjungle.config.confirmItemInfoHint",
        scope: "client",
        type: Boolean,
        default: false,
        config: true
    });

    // Register a version number that was used last time to allow determining if a new version is being used
    game.settings.register("urbanjungle", "lastSystemVersion", {
        scope: "client",
        type: String,
        default: game.system.data.version,
        config: false
    });


    // Handlebars helper registration
    Handlebars.registerHelper('concat', function () {
        var outStr = '';
        for (var arg in arguments) {
            if (typeof arguments[arg] != 'object') {
                outStr += arguments[arg];
            }
        }
        return outStr;
    });

    Handlebars.registerHelper('toLowerCase', function (str) {
        return str.toLowerCase();
    });

    Handlebars.registerHelper('equalOrNothing', function (str, compare) {
        return str.length == 0 || makeStatCompareReady(str) == compare;
    });

    Handlebars.registerHelper('valueRoundTo', function (val, roundto) {
        return isNaN(val) ? "NaN" : val.toFixed(roundto);
    });

    Handlebars.registerHelper('usableGift', function (gift) {
        return gift.data.exhaustWhenUsed || gift.data.useDice?.length > 0;
    });

    console.log("urbanjungle System init complete");
});

Hooks.once('setup', async function () {
    // Combat Utility Belt check
    let cubActive = game.modules.get("combat-utility-belt")?.active == true;
    let conditionsActive = cubActive ? game.settings.get("combat-utility-belt", "enableEnhancedConditions") : false; // Since get throws an error if the key does not exist, first check if CUB is even active
    if (cubActive && conditionsActive) {
        game.urbanjungle.useCUBConditions = true;
        console.log("CUB detected and Enhanced Conditions active! Using CUB Conditions.");
    }

    console.log("urbanjungle System setup complete");
});

Hooks.once("ready", async function () {
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on("hotbarDrop", (bar, data, slot) => createurbanjungleMacro(data, slot));

    // Check and set default Combat Tracker options if they do not exist
    let ctOptions = game.settings.get("core", Combat.CONFIG_SETTING);
    if (jQuery.isEmptyObject(ctOptions)) {
        game.settings.set("core", Combat.CONFIG_SETTING, {
            sideBased: true,
            initType: 2,
            skipDefeated: false,
            manualTN: -1
        });
    }

    // CUB remove defaults nag
    if (game.urbanjungle.useCUBConditions && game.settings.get("combat-utility-belt", "removeDefaultEffects") === false) {
        ui.notifications.info(game.i18n.localize("urbanjungle.ui.removeDefaultConditionsNag"), { permanent: true });
    }

    // Version checks 
    /*
    const lastVersion = game.settings.get("urbanjungle", "lastSystemVersion");
    if (checkIfNewerVersion(game.system.data.version, lastVersion)) {
        // TODO: Insert things like "What's new" and data migration stuff here
    }
    */
    game.settings.set("urbanjungle", "lastSystemVersion", game.system.data.version);

    console.log("urbanjungle System ready");
});


/* -------------------------------------------- */
/*  Additional Hooks                            */
/* -------------------------------------------- */

async function loadHandleBarTemplates() {
    // register templates parts
    const templatePaths = [
        "systems/urbanjungle/templates/parts/battlestats.html"
    ];
    return loadTemplates(templatePaths);
}

Hooks.once("init", function () {
    loadHandleBarTemplates();
});

function addIronclawChatLogContext(html, entryOptions) {
    entryOptions.push(
        {
            name: "urbanjungle.copyToTN",
            icon: '<i class="fas fa-bullseye"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const type = message.getFlag("urbanjungle", "rollType");
                const allowed = message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && type && type != "TN";
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                copyToRollTNDialog(message);
            }
        },
        {
            name: "urbanjungle.changeTN",
            icon: '<i class="fas fa-bullseye"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const type = message.getFlag("urbanjungle", "rollType");
                const allowed = message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && type && type == "TN";
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                copyToRollTNDialog(message);
            }
        },
        {
            name: "urbanjungle.copyToHighest",
            icon: '<i class="fas fa-dice-d6"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const type = message.getFlag("urbanjungle", "rollType");
                const allowed = message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && type && type != "HIGH";
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                copyToRollHighest(message);
            }
        },
        {
            name: "urbanjungle.rerollOne",
            icon: '<i class="fas fa-redo"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const original = message.getFlag("urbanjungle", "originalRoll");
                const hasOne = message.getFlag("urbanjungle", "hasOne");
                const allowed = message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && original && hasOne;
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                const type = message.getFlag("urbanjungle", "rollType");
                if (type === "TN") {
                    copyToRollTN(parseInt(message.roll.formula.slice(message.roll.formula.indexOf(">")+1)), message, true, true);
                } else {
                    copyToRollHighest(message, true, true);
                }
            }
        },
        {
            name: "urbanjungle.showAttack",
            icon: '<i class="fas fa-fist-raised"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const active = game.settings.get("urbanjungle", "calculateAttackEffects");
                const type = message.getFlag("urbanjungle", "hangingAttack");
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                const successes = message.getFlag("urbanjungle", "attackSuccessCount");
                // Check whether the attack effect calculation is active, the message has a roll, has a weapon id and a positive number of successes set and has explicitly been set to have a hanging normal attack
                const allowed = active && message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && weaponid && successes > 0 && type === "attack";
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                const actorid = message.getFlag("urbanjungle", "hangingActor");
                const tokenid = message.getFlag("urbanjungle", "hangingToken");
                const actor = game.scenes.current.tokens.get(tokenid)?.actor || game.actors.get(actorid);
                const weapon = actor?.items.get(weaponid) || game.items.get(weaponid);
                weapon?.resendNormalAttack?.(message);
            }
        },
        {
            name: "urbanjungle.resolveCounter",
            icon: '<i class="fas fa-fist-raised"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const active = game.settings.get("urbanjungle", "calculateAttackEffects");
                const type = message.getFlag("urbanjungle", "hangingAttack");
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                // Check whether the attack effect calculation is active, the message has a roll, has a weapon id set and has explicitly been set to have a hanging counter-attack
                const allowed = active && message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && weaponid && type === "counter";
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                const actorid = message.getFlag("urbanjungle", "hangingActor");
                const tokenid = message.getFlag("urbanjungle", "hangingToken");
                const actor = game.scenes.current.tokens.get(tokenid)?.actor || game.actors.get(actorid);
                const weapon = actor?.items.get(weaponid) || game.items.get(weaponid);
                weapon?.resolveCounterAttack?.(message);
            }
        },
        {
            name: "urbanjungle.resolveResist",
            icon: '<i class="fas fa-bolt"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const active = game.settings.get("urbanjungle", "calculateAttackEffects");
                const type = message.getFlag("urbanjungle", "hangingAttack");
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                const successes = message.getFlag("urbanjungle", "resistSuccessCount");
                // Check whether the attack effect calculation is active, the message has a roll, has a weapon id and a positive number of successes set and has explicitly been set to have a hanging resist attack
                const allowed = active && message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && weaponid && successes > 0 && type === "resist";
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                const actorid = message.getFlag("urbanjungle", "hangingActor");
                const tokenid = message.getFlag("urbanjungle", "hangingToken");
                const actor = game.scenes.current.tokens.get(tokenid)?.actor || game.actors.get(actorid);
                const weapon = actor?.items.get(weaponid) || game.items.get(weaponid);
                weapon?.resolveResistedAttack?.(message);
            }
        },
        {
            name: "urbanjungle.resolveAsNormal",
            icon: '<i class="fas fa-fist-raised"></i>',
            condition: li => {
                const message = game.messages.get(li.data("messageId"));
                const active = game.settings.get("urbanjungle", "calculateAttackEffects");
                const type = message.getFlag("urbanjungle", "hangingAttack");
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                const successes = message.getFlag("urbanjungle", "resistSuccessCount");
                // Check whether the attack effect calculation is active, the message has a roll, has a weapon id and a positive number of successes set and has explicitly been set to have a hanging resist attack
                const allowed = active && message.data.type == CONST.CHAT_MESSAGE_TYPES.ROLL && weaponid && successes > 0 && type === "resist";
                return allowed && (game.user.isGM || message.isAuthor) && message.isContentVisible;
            },
            callback: li => {
                const message = game.messages.get(li.data("messageId"));
                const weaponid = message.getFlag("urbanjungle", "hangingWeapon");
                const actorid = message.getFlag("urbanjungle", "hangingActor");
                const tokenid = message.getFlag("urbanjungle", "hangingToken");
                const actor = game.scenes.current.tokens.get(tokenid)?.actor || game.actors.get(actorid);
                const weapon = actor?.items.get(weaponid) || game.items.get(weaponid);
                weapon?.resolveAsNormalAttack?.(message);
            }
        });
}
Hooks.on("getChatLogEntryContext", addIronclawChatLogContext);

/* -------------------------------------------- */
/*  Functions                                   */
/* -------------------------------------------- */

/**
 * Delay an async function for set milliseconds
 * @param {number} ms
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Quick and dirty way to make condition adding and removing wait until the game is fully ready
 * @param {any} resolve
 */
async function waitUntilReady(resolve) {
    while (!game.ready) {
        await sleep(500);
    }
    return true;
}

/**
 * Split the version number of the system into its component parts and put them into an array
 * @param {string} version System version number as a string
 * @returns {number[]} Array containing the component numbers of the version number
 */
function getVersionNumbers(version) {
    if (typeof (version) !== "string") {
        console.error("System version spliter given something that was not a string: " + version);
        return null;
    }

    let versionarray = [];
    let versiontest = new RegExp("(\\d+)\\.(\\d+)\\.(\\d+)?"); // Regex to match and split the version number

    if (versiontest.test(version)) {
        const result = version.match(versiontest);
        for (let i = 1; i < result.length; ++i) {
            versionarray.push(result[i]); // Push each separate number in the version to a separate index in the array
        }
    } else {
        console.error("System version splitter given something which could not be split: " + version);
        return null;
    }

    return versionarray;
}

/**
 * Check if the given version number is newer than the base version number
 * @param {string} testing The version number to test
 * @param {string} baseversion The version number to test against
 * @returns {boolean} If true, the tested version is newer than the base version
 */
function checkIfNewerVersion(testing, baseversion) {
    const oldver = getVersionNumbers(baseversion);
    const newver = getVersionNumbers(testing);

    for (let i = 0; i < newver.length; ++i) {
        if (newver[i] != oldver[i])
            return newver[i] > oldver[i];
    }

    return false;
}

/* -------------------------------------------- */
/*  External Module Support                     */
/* -------------------------------------------- */

// Drag Ruler integration
Hooks.once("dragRuler.ready", (SpeedProvider) => {
    class urbanjungleSpeedProvider extends SpeedProvider {
        get colors() {
            return [
                { id: "stride", default: 0x0000FF, name: "urbanjungle.speeds.stride" },
                { id: "dash", default: 0x00DE00, name: "urbanjungle.speeds.dash" },
                { id: "run", default: 0xFFFF00, name: "urbanjungle.speeds.run" }
            ];
        }

        getRanges(token) {
            const stridespeed = token.actor?.data.data.stride || 0;
            const dashspeed = token.actor?.data.data.dash || 0;
            const runspeed = token.actor?.data.data.run || 0;

            const ranges = [
                { range: stridespeed, color: "stride" },
                { range: dashspeed + stridespeed, color: "dash" },
                { range: runspeed, color: "run" }
            ];

            return ranges;
        }
    }

    dragRuler.registerSystem("urbanjungle", urbanjungleSpeedProvider);
});

// ChatCommands integration
// Using async and delays to ensure the same press of enter does not also automatically close the dialog
Hooks.on("chatCommandsReady", function (chatCommands) {

    // Basic command to trigger a one-line highest or TN roll from the chat, with the dice included after the command
    chatCommands.registerCommand(chatCommands.createCommandFromData({
        commandKey: "/iroll",
        invokeOnCommand: (chatlog, messageText, chatdata) => {
            ironclawRollChat(messageText);
        },
        shouldDisplayToChat: false,
        iconClass: "fa-dice-d6",
        description: game.i18n.localize("urbanjungle.command.iroll")
    }));

    // Trigger an actor dice pool popup, with optional preselected stats and dice
    chatCommands.registerCommand(chatCommands.createCommandFromData({
        commandKey: "/actorroll",
        invokeOnCommand: async (chatlog, messageText, chatdata) => {
            await sleep(100);
            ironclawRollActorChat(messageText, chatdata?.speaker);
        },
        shouldDisplayToChat: false,
        iconClass: "fa-user",
        description: game.i18n.localize("urbanjungle.command.actorroll")
    }));

    // Use an item as the currently selected actor
    chatCommands.registerCommand(chatCommands.createCommandFromData({
        commandKey: "/itemuse",
        invokeOnCommand: async (chatlog, messageText, chatdata) => {
            await sleep(100);
            rollItemMacro(messageText.trim());
        },
        shouldDisplayToChat: false,
        iconClass: "fa-fist-raised",
        description: game.i18n.localize("urbanjungle.command.itemuse")
    }));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createurbanjungleMacro(data, slot) {
    if (data.type !== "Item") return;
    if (!("data" in data)) return ui.notifications.warn(game.i18n.localize("urbanjungle.ui.macroOwnedItemsWarning"));
    const item = data.data;

    // Create the macro command
    const command = `game.urbanjungle.rollItemMacro("${item.name}");`;
    let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command: command,
            flags: { "urbanjungle.itemMacro": true }
        });
    }
    game.user.assignHotbarMacro(macro, slot);
    return false;
}

/**
 * Roll an item macro for the currently selected actor, if the actor has the given item
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    const item = actor ? actor.items.find(i => i.name === itemName) : null;
    if (!item) return ui.notifications.warn(game.i18n.format("urbanjungle.ui.actorDoesNotHaveItem", { "itemName": itemName }));

    // Trigger the item roll
    return item.roll();
}

/**
 * Popup a certain type of dialog screen on the currently selected actor
 * @param {number} popup The type of popup to open
 * @returns {Promise}
 */
function popupMacro(popup) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    if (!actor) return ui.notifications.warn(game.i18n.localize("urbanjungle.ui.actorNotFoundForMacro"));

    // Trigger the popup
    switch (popup) {
        case 0:
            return actor.popupSelectRolled();
            break;
        case 1:
            return actor.popupDamage();
            break;
        case 2:
            return actor.popupAddCondition();
            break;
        default:
            ui.notifications.warn(game.i18n.format("urbanjungle.ui.popupNotFoundForMacro", { "popup": popup }));
            return actor.popupSelectRolled();
            break;
    }
}

/**
 * Popup the standard dice pool selection dialog with some readied data
 * @param {string[]} prechecked Array of skills to autocheck on the dialog, must be in lowercase and without spaces
 * @param {boolean} tnyes Whether to use a TN, true for yes
 * @param {number} tnnum TN to use, ignored if highest roll
 * @param {string} extradice Default extra dice to use for the bottom one-line slot
 */
function popupSelect(prechecked = [], tnyes = false, tnnum = 3, extradice = "") {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    if (!actor) return ui.notifications.warn(game.i18n.localize("urbanjungle.ui.actorNotFoundForMacro"));

    return actor.popupSelectRolled(prechecked, tnyes, tnnum, extradice);
}