const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function onAddDie(event, target) {
	event.preventDefault();
	this.controller.updateDiceFormula(target.dataset, "add");
	this.manager.syncApplications();
	this.controller.textarea?.focus();
}

function onAdjustModifier(event, target) {
	event.preventDefault();
	const delta = Number(target.dataset.delta ?? 0);
	this.controller.adjustModifierValue(delta);
	this.manager.syncApplications();
	this.controller.textarea?.focus();
}

function onCycleAdvantage(event) {
	event.preventDefault();
	this.controller.cycleAdvantage();
	this.manager.syncApplications();
	this.controller.textarea?.focus();
}

function onRollFormula(event) {
	event.preventDefault();
	const formula = this.controller.getChatFormula();
	this.controller.roll(formula);
	this.controller.clearChatFormula();
	this.manager.syncApplications(this.controller.getEmptyFormulaState());
	this.controller.textarea?.focus();
}

export class QuickDiceTrayApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(manager, options = {}) {
		super(options);
		this.manager = manager;
		this.controller = manager.controller;
	}

	static DEFAULT_OPTIONS = {
		actions: {
			"add-die": onAddDie,
			"adjust-modifier": onAdjustModifier,
			"cycle-advantage": onCycleAdvantage,
			"roll-formula": onRollFormula,
		},
		window: {
			frame: false,
			minimizable: false,
			resizable: false,
		},
	};

	static PARTS = {
		tray: {
			template: "modules/quickdice/templates/tray.hbs",
		},
	};

	get trayElement() {
		return this.element?.querySelector(".quick-dice");
	}

	async _prepareContext(_options) {
		return this.controller.getTrayContext();
	}

	_onRender(context, options) {
		super._onRender(context, options);

		const root = this.trayElement;
		if (!root) return;

		for (const button of root.querySelectorAll("button")) {
			button.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				this.controller.textarea?.focus();
			});
		}

		for (const button of root.querySelectorAll(".quick-dice__button")) {
			button.addEventListener("contextmenu", (event) => {
				event.preventDefault();
				const { dataset } = event.currentTarget;
				switch (this.controller.rightClickCommand) {
					case "roll":
						this.controller.roll(dataset.formula);
						break;
					default:
						this.controller.updateDiceFormula(dataset, "sub");
						this.manager.syncApplications();
				}
			});
		}

		const modifierInput = root.querySelector(".quick-dice__input");
		modifierInput?.addEventListener("input", (event) => {
			let modifier = Number(event.currentTarget.value);
			modifier = Number.isNaN(modifier) ? 0 : modifier;
			event.currentTarget.value = modifier;
			this.controller.setModifierValue(modifier);
			this.manager.syncApplications();
		});
		modifierInput?.addEventListener("wheel", (event) => {
			event.preventDefault();
			const delta = event.deltaY < 0 ? 1 : -1;
			const modifier = this.controller.getModifierValue() + delta;
			this.controller.setModifierValue(modifier);
			this.manager.syncApplications();
		});
		modifierInput?.addEventListener("focus", () => {
			modifierInput.select();
		});

		this.applyState(this.controller.parseFormulaState());
	}

	applyState(state) {
		const root = this.trayElement;
		if (!root) return;

		const modifierInput = root.querySelector(".quick-dice__input");
		if (modifierInput) modifierInput.value = state.modifier;

		for (const button of root.querySelectorAll(".quick-dice__button")) {
			const die = this.controller.getButtonDie(button.dataset.formula);
			const quantity = state.diceCounts[die] ?? 0;
			const flag = button.querySelector(".quick-dice__flag");
			if (flag) {
				flag.textContent = quantity > 0 ? quantity : "";
				flag.classList.toggle("hide", quantity === 0);
			}
			button.classList.toggle("has-dice", quantity > 0);
		}

		for (const button of root.querySelectorAll(".quick-dice__roll")) {
			button.classList.toggle("ready", state.ready);
		}

		for (const button of root.querySelectorAll(".quick-dice__ad")) {
			this.controller.updateAdvButton(button, state.advState);
		}
	}
}
