import { DiceCreator } from "./DiceCreator.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function addDiceRow() {
	new DiceCreator({
		form: this,
		diceRows: this.diceRows,
		settings: this.settings,
	}).render(true);
}

function resetDiceRows() {
	this.diceRows = foundry.utils.deepClone(this._defaultDiceRows);
	this.render(false);
}

async function submitDiceRows(_event, _form, _formData) {
	let forceRender = false;
	await Promise.all(
		DiceRowSettings.settingsKeys.map(async (key) => {
			const current = game.settings.get("quickdice", key);
			if (current !== this.settings[key]) {
				await game.settings.set("quickdice", key, this.settings[key]);
				forceRender = true;
			}
		}),
	);
	const current = game.settings.get("quickdice", "diceRows");
	if (JSON.stringify(this.diceRows) !== JSON.stringify(current)) {
		await game.settings.set("quickdice", "diceRows", this.diceRows);
		forceRender = true;
	}
	if (forceRender) Hooks.callAll("quickdice.forceRender");
}

export class DiceRowSettings extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(object, options = {}) {
		super(object, options);
		this.diceRows = foundry.utils.deepClone(game.settings.get("quickdice", "diceRows"));
		this._defaultDiceRows = foundry.utils.deepClone(CONFIG.QUICKDICE.dice);
	}

	static DEFAULT_OPTIONS = {
		id: "dice-row-form",
		form: {
			handler: submitDiceRows,
			closeOnSubmit: true,
		},
		position: {
			width: 450,
			height: "auto",
		},
		tag: "form",
		window: {
			icon: "fas fa-dice",
			contentClasses: ["standard-form", "quick-dice-row-settings"],
			title: "QUICK_DICE.SETTINGS.DiceRowSettings",
		},
		actions: {
			add: addDiceRow,
			reset: resetDiceRows,
		},
	};

	static PARTS = {
		diceRows: {
			template: "./modules/quickdice/templates/DiceRowSettings.hbs",
		},
		footer: { template: "templates/generic/form-footer.hbs" },
	};

	settings;

	static get settingsKeys() {
		return CONFIG.QUICKDICE.getTraySettingsKeys();
	}

	_prepareContext(_options) {
		this.settings ??= CONFIG.QUICKDICE.getTraySettings();
		return {
			...CONFIG.QUICKDICE.getTrayContext({
				dicerows: this.diceRows,
				settings: this.settings,
			}),
			buttons: [
				{ type: "button", icon: "fa-solid fa-plus", label: "QUICK_DICE.DiceCreator.CreateDice", action: "add" },
				{ type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" },
				{ type: "button", icon: "fa-solid fa-undo", label: "SETTINGS.Reset", action: "reset" },
			],
		};
	}

	_onChangeInput(event) {
		super._onChangeInput(event);
		const input = event.target;
		if (input.type === "checkbox" && input.closest(".form-group")) {
			this.settings[input.name] = input.checked;
			this.render(false);
		}
	}

	_onRender(context, options) {
		super._onRender(context, options);
		for (const button of this.element.querySelectorAll(".quick-dice button.quick-dice__button")) {
			button.addEventListener("click", (event) => {
				event.preventDefault();
				const { formula: key, tooltip } = event.currentTarget.dataset;
				const row = this.diceRows.findIndex((r) => r[key]);
				const diceData = this.diceRows[row][key];
				const { color, img, label } = diceData;
				new DiceCreator({
					form: this,
					diceRows: this.diceRows,
					dice: {
						key,
						originalKey: key, // In case the key is changed later.
						color,
						img,
						label,
						tooltip: tooltip !== key ? tooltip : "",
						row: row + 1,
					},
					settings: this.settings,
				}).render(true);
			});
			button.addEventListener("contextmenu", (event) => {
				event.preventDefault();
				const { formula: key } = event.currentTarget.dataset;
				const row = this.diceRows.findIndex((r) => r[key]);
				delete this.diceRows[row][key];
				if (!Object.keys(this.diceRows[row]).length) {
					this.diceRows.splice(row, 1);
				}
				this.render(false);
			});
		}
		for (const button of this.element.querySelectorAll(
			".quick-dice .quick-dice__roll, .quick-dice .quick-dice__math button, .quick-dice .quick-dice__ad",
		)) {
			button.addEventListener("click", (event) => {
				event.preventDefault();
			});
		}
	}
}
