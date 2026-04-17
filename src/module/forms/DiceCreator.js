const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

async function submitDiceCreator(_event, _form, formData) {
	const { dice, row } = foundry.utils.expandObject(formData.object);
	const actualRow = row - 1;
	if (this.object.dice && this.object.dice.row !== row) {
		const key = this.object.dice.originalKey;
		delete this.parent.diceRows[actualRow][key];
	}
	if (row > this.parent.diceRows.length) {
		this.parent.diceRows.push({});
	}
	const cleanKey = Object.fromEntries(Object.entries(dice).filter(([key, value]) => key !== "key" && value !== ""));
	if (!cleanKey.img && !cleanKey.label) {
		cleanKey.label = dice.key;
	}
	this.parent.diceRows[actualRow][dice.key] = cleanKey;
	this.parent.render(true);
}

export class DiceCreator extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(object, options = {}) {
		super(options);
		const { dice, diceRows, form, settings } = object;
		this.object = { dice, diceRows, settings };
		this.parent = form;
		Hooks.once("closeDiceRowSettings", () => this.close());
	}

	static DEFAULT_OPTIONS = {
		id: "dice-creator-form",
		form: {
			handler: submitDiceCreator,
			closeOnSubmit: true,
		},
		position: {
			width: 450,
			height: "auto",
		},
		tag: "form",
		window: {
			icon: "fas fa-dice",
			contentClasses: ["standard-form", "quick-dice-dice-creator"],
			title: "QUICK_DICE.SETTINGS.DiceCreator",
		},
	};

	static PARTS = {
		diceRows: {
			template: "./modules/quickdice/templates/DiceCreator.hbs",
		},
		footer: { template: "templates/generic/form-footer.hbs" },
	};

	_prepareContext(_options) {
		const { dice, diceRows, settings } = this.object;
		const nextRow = diceRows.findIndex((row) => Object.keys(row).length < 7);
		const rowIndex = (nextRow !== -1 ? nextRow : diceRows.length) + 1;
		const label = dice?.key ? "SETTINGS.Save" : "QUICK_DICE.DiceCreator.CreateDice";
		return {
			dice,
			diceRows: this.object.diceRows,
			value: dice?.row ?? rowIndex,
			maxRows: rowIndex,
			settings,
			buttons: [{ type: "submit", icon: "fa-solid fa-save", label }],
		};
	}
}
