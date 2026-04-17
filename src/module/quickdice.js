import { DiceRowSettings } from "./forms/DiceRowSettings.js";
import Template, { dnd5eDiceMap as dnd5e } from "./maps/templates/template.js";
import { QuickDiceTrayManager } from "./QuickDiceTrayManager.js";

const keymaps = { Template, dnd5e };

// Initialize module
Hooks.once("init", () => {
	foundry.applications.handlebars.loadTemplates([
		"modules/quickdice/templates/tray.hbs",
		"modules/quickdice/templates/partials/tray-button.hbs",
	]);

	// Capture the live EditorView for the chat input by injecting a plugin via the
	// "plugins" event fired by HTMLProseMirrorElement._configurePlugins().
	// The event bubbles, so we listen on document. We filter to prose-mirror#chat-message
	// to avoid capturing editors from other parts of the UI.
	document.addEventListener("plugins", (event) => {
		if (event.target?.id !== "chat-message") return;
		const { Plugin, PluginKey } = foundry.prosemirror;
		const key = new PluginKey("quickdice-view-capture");
		event.plugins.quickdice = new Plugin({
			key,
			view(editorView) {
				if (CONFIG.QUICKDICE) {
					CONFIG.QUICKDICE._chatView = editorView;
					CONFIG.QUICKDICE.runtime?.syncApplications();
				}
				return {
					update(view) {
						if (CONFIG.QUICKDICE) {
							CONFIG.QUICKDICE._chatView = view;
							CONFIG.QUICKDICE.runtime?.syncApplications();
						}
					},
					destroy() {
						if (CONFIG.QUICKDICE) CONFIG.QUICKDICE._chatView = null;
					},
				};
			},
		});
	});
});

Hooks.once("i18nInit", () => {
	const newMaps = foundry.utils.deepClone(keymaps);

	Hooks.callAll("quickdice.keymaps", newMaps, newMaps.Template);
	const supportedSystemMaps = Object.keys(newMaps).join("|");
	const systemMapsRegex = new RegExp(`^(${supportedSystemMaps})$`);
	const providerStringMaps = getProviderString(systemMapsRegex) || "Template";
	CONFIG.QUICKDICE = new newMaps[providerStringMaps]();
	new QuickDiceTrayManager(CONFIG.QUICKDICE);

	registerSettings();
	game.keybindings.register("quickdice", "popout", {
		name: "QUICK_DICE.KEYBINDINGS.popout.name",
		onDown: async () => {
			await CONFIG.QUICKDICE.runtime.togglePopout();
			const tool = ui.controls.control.tools.quickDice;
			if (tool) {
				tool.active = CONFIG.QUICKDICE.runtime.isPopoutOpen;
				ui.controls.render();
			}
		},
	});
	if (game.settings.get("quickdice", "enableQuickDice")) {
		let wasAtBottom = true;
		Hooks.on("quickdice.forceRender", () => CONFIG.QUICKDICE.runtime.rerenderApplications());
		Hooks.once("renderChatLog", () => CONFIG.QUICKDICE.runtime.renderInlineTray());
		Hooks.on("renderChatLog", (chatlog) => {
			if (!chatlog.isPopout) return;
			CONFIG.QUICKDICE.runtime.repositionInlineTray();
		});
		Hooks.on("closeChatLog", (chatlog) => {
			if (!chatlog.isPopout) return;
			CONFIG.QUICKDICE.runtime.repositionInlineTray();
		});
		Hooks.on("activateChatLog", () => {
			if (ui.chat.popout?.rendered && !ui.chat.isPopout) return;
			CONFIG.QUICKDICE.runtime.repositionInlineTray();
		});
		Hooks.on("deactivateChatLog", () => {
			if (ui.chat.popout?.rendered && !ui.chat.isPopout) return;
			CONFIG.QUICKDICE.runtime.repositionInlineTray();
		});
		Hooks.on("collapseSidebar", (_, wasExpanded) => {
			if (ui.chat.popout?.rendered && !ui.chat.isPopout) return;
			CONFIG.QUICKDICE.runtime.repositionInlineTray();
			if (!wasExpanded && wasAtBottom) ui.chat.scrollBottom();
			wasAtBottom = ui.chat.isAtBottom;
		});
	}
});

Hooks.once("ready", () => {
	if (game.settings.get("quickdice", "autoOpenPopout")) CONFIG.QUICKDICE.runtime.togglePopout();
});

function getProviderString(regex) {
	const id = game.system.id;
	if (regex.test(id)) return id;
	return "";
}

Hooks.on("getSceneControlButtons", (controls) => {
	controls.tokens.tools.quickDice = {
		name: "quickDice",
		title: "QUICK_DICE.DiceTray",
		icon: "fas fa-dice-d20",
		onChange: () => CONFIG.QUICKDICE.runtime.togglePopout(),
		active:
			CONFIG.QUICKDICE.runtime?.isPopoutOpen || (!game.ready && game.settings.get("quickdice", "autoOpenPopout")),
		toggle: true,
	};
});

// Called when a message is sent through chat
Hooks.on("chatMessage", () => CONFIG.QUICKDICE.runtime?.resetApplications());

function registerSettings() {
	game.settings.registerMenu("quickdice", "DiceRowSettings", {
		name: "QUICK_DICE.SETTINGS.DiceRowSettings",
		label: "QUICK_DICE.SETTINGS.DiceRowSettings",
		icon: "fas fa-cogs",
		type: DiceRowSettings,
		restricted: true,
	});

	game.settings.register("quickdice", "enableQuickDice", {
		name: game.i18n.localize("QUICK_DICE.SETTINGS.enableQuickDice.name"),
		hint: game.i18n.localize("QUICK_DICE.SETTINGS.enableQuickDice.hint"),
		scope: "user",
		config: true,
		default: true,
		type: Boolean,
		requiresReload: true,
	});

	game.settings.register("quickdice", "hideAdv", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});

	// Menu Settings

	game.settings.register("quickdice", "diceRows", {
		scope: "world",
		config: false,
		default: CONFIG.QUICKDICE.dice,
		type: Array,
	});

	game.settings.register("quickdice", "compactMode", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});
	game.settings.register("quickdice", "hideNumberInput", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});
	game.settings.register("quickdice", "hideNumberButtons", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});
	game.settings.register("quickdice", "hideRollButton", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});

	game.settings.register("quickdice", "autoOpenPopout", {
		name: "QUICK_DICE.SETTINGS.autoOpenPopout.name",
		hint: "QUICK_DICE.SETTINGS.autoOpenPopout.hint",
		scope: "user",
		config: true,
		default: false,
		type: Boolean,
	});

	game.settings.register("quickdice", "popoutPosition", {
		scope: "user",
		config: false,
		default: {},
		type: Object,
	});

	game.settings.register("quickdice", "rightClickCommand", {
		name: "QUICK_DICE.SETTINGS.rightClickCommand.name",
		hint: "QUICK_DICE.SETTINGS.rightClickCommand.hint",
		scope: "world",
		config: true,
		type: new foundry.data.fields.StringField({
			required: true,
			blank: false,
			choices: {
				decrease: "QUICK_DICE.SETTINGS.rightClickCommand.options.decrease",
				roll: "QUICK_DICE.SETTINGS.rightClickCommand.options.roll",
			},
			initial: "decrease",
		}),
		onChange: (v) => {
			CONFIG.QUICKDICE._rightClickCommand = v;
			CONFIG.QUICKDICE.runtime?.rerenderApplications();
		},
	});

	for (const [key, data] of Object.entries(CONFIG.QUICKDICE.settings)) {
		game.settings.register(
			"quickdice",
			key,
			foundry.utils.mergeObject(
				{
					scope: "world",
					config: true,
				},
				data,
			),
		);
	}
}
