export default class TemplateDiceMap {
	_rightClickCommand;

	/** Unmark the KH/KL buttons if a roll is made */
	removeAdvOnRoll = true;

	/** Shows the KH/KL buttons */
	showExtraButtons = true;

	/**
	 * The formula that will be rendered on the KH/KL buttons
	 * @returns {{}}
	 *
	 * @example Making the buttons be +1/-1 for additional logic
	 * ```js
	 * return {
	 *	kh: "+1",
	 *	kl: "-1"
	 * };
	 */
	get buttonFormulas() {
		return {
			kh: "kh",
			kl: "kl",
		};
	}

	/**
	 * The dice rows that will be shown on the dice tray.
	 * @property {String} color		Optional RGB or Hex value that colors a dice's background image. If none is preset, it will be white.
	 * @property {String} img		The path to an image that will be shown on the button. If none is present, the label will be used instead.
	 * @property {String} label		The label meant to be used when the button doesn't have a proper image, like Fate Dice or multiple dice.
	 * @property {String} tooltip	Optional tooltip that will be shown instead of the key. Useful for special dice like Genesys system's.
	 * @returns {[Object]}
	 *
	 * @example
	 * ```js Dice buttons with mixed image/label
	 * return [{
	 * 	d6: { img: "icons/dice/d6black.svg" },
	 *  "4df": { label: "Fate Dice" }
	 * }];
	 * ```
	 *
	 * @example Dice buttons with just labels
	 * ```js
	 * return [{
	 * 	d6: { label: "1d6" },
	 *  "2d6": { label: "2d6" }
	 *  "3d6": { label: "3d6" }
	 * }];
	 * ```
	 *
	 * @example Dice buttons with tooltips
	 * ```js
	 * return [{
	 * 	da: { tooltip: "Proficiency" },
	 *  ds: { tooltip: "Setback" }
	 *  df: { tooltip: "Force" }
	 * }];
	 * ```
	 */
	get dice() {
		return [
			{
				d4: { img: "icons/dice/d4black.svg" },
				d6: { img: "icons/dice/d6black.svg" },
				d8: { img: "icons/dice/d8black.svg" },
				d10: { img: "icons/dice/d10black.svg" },
				d12: { img: "icons/dice/d12black.svg" },
				d20: { img: "icons/dice/d20black.svg" },
				d100: { img: "modules/quickdice/assets/icons/d100black.svg" },
			},
		];
	}

	/**
	 * Labels that will be shown on the Keep Highest/Lowest button if they are shown.
	 */
	get labels() {
		return {
			advantage: "QUICK_DICE.KeepHighest",
			adv: "KH",
			disadvantage: "QUICK_DICE.KeepLowest",
			dis: "KL",
		};
	}

	get rightClickCommand() {
		this._rightClickCommand ??= game.settings.get("quickdice", "rightClickCommand");
		return this._rightClickCommand;
	}

	/**
	 * List of additional settings to be registered during the i18nInit hook.
	 */
	get settings() {
		return {};
	}

	get textarea() {
		return document.getElementById("chat-message");
	}

	getTraySettingsKeys() {
		const keys = ["compactMode", "hideNumberInput", "hideNumberButtons", "hideRollButton"];
		if (this.showExtraButtons) keys.push("hideAdv");
		return keys;
	}

	getTraySettings(overrides = {}) {
		return this.getTraySettingsKeys().reduce((settings, key) => {
			settings[key] = overrides[key] ?? game.settings.get("quickdice", key);
			return settings;
		}, {});
	}

	getRightClickHint(command = this.rightClickCommand) {
		return game.i18n.localize(command === "roll" ? "QUICK_DICE.RightClickRoll" : "QUICK_DICE.RightClickDecrease");
	}

	getTrayContext({ dicerows, settings } = {}) {
		return {
			dicerows: dicerows ?? game.settings.get("quickdice", "diceRows"),
			settings: settings ?? this.getTraySettings(),
			showExtraButtons: this.showExtraButtons,
			labels: this.labels,
			rightClickHint: this.getRightClickHint(),
		};
	}

	getChatFormula() {
		return this._stripHTML(this.textarea?.value ?? "");
	}

	getModifierValue() {
		return this.parseFormulaState().modifier;
	}

	focusChatInput() {
		this.textarea?.focus();
	}

	/** Strip ProseMirror HTML wrapper from chat input value */
	_stripHTML(value) {
		const raw = String(value);
		return raw.replace(/^<p>|<\/p>$/gi, "");
	}

	/**
	 * Write a plain-text value into the ProseMirror chat input.
	 * Uses the EditorView captured via the "plugins" event injection in quickdice.js.
	 */
	_setChatValue(text) {
		const view = this._chatView;
		if (!view) {
			console.warn("[quickdice] _setChatValue | no captured EditorView yet");
			return;
		}
		const html = text ? `<p>${text}</p>` : "";
		const { state } = view;
		const content = foundry.prosemirror.dom.parseString(html).content;
		const tr = state.tr.replaceWith(0, state.doc.content.size, content);
		view.dispatch(tr);
	}

	clearChatFormula() {
		this._setChatValue("");
		return this.getEmptyFormulaState();
	}

	roll(formula) {
		if (!formula?.trim()) return;
		const cleanFormula = formula.replace(/(\/r|\/gmr|\/br|\/sr) /, "");
		const messageMode = game.settings.get("core", "messageMode");
		Roll.create(cleanFormula).toMessage({}, { messageMode });
	}

	parseFormulaState(rawFormula = this.getChatFormula()) {
		const normalized = this._stripHTML(rawFormula).trim();
		const expression = normalized.replace(/^(\/r|\/gmr|\/br|\/sr)\s*/, "");
		const modifierMatch = expression.match(/([+-]\d+)$/);
		const modifier = modifierMatch ? Number(modifierMatch[1]) : 0;
		const diceExpression = modifierMatch ? expression.slice(0, -modifierMatch[1].length).trim() : expression.trim();
		const diceCounts = {};
		const diceRegex = /(\d*)(d\d+)([khl]*)/g;
		let match;
		while ((match = diceRegex.exec(diceExpression)) !== null) {
			const quantity = Number(match[1]) || 1;
			diceCounts[match[2]] = quantity;
		}

		return {
			formula: normalized,
			expression,
			diceExpression,
			modifier,
			diceCounts,
			ready: expression.trim() !== "",
			advState: diceExpression.includes("kh")
				? this.buttonFormulas.kh
				: diceExpression.includes("kl")
					? this.buttonFormulas.kl
					: "none",
		};
	}

	getEmptyFormulaState() {
		return this.parseFormulaState("");
	}

	getButtonDie(formula) {
		const match = formula?.match(/^(\d*)(d\d+)/);
		return match ? match[2] : formula;
	}

	setModifierValue(value) {
		let modifier = Number(value);
		modifier = Number.isNaN(modifier) ? 0 : modifier;

		const modifierString = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : "";
		const currentFormula = this.getChatFormula();
		const modifierRegex = /([+-])(\d+)$/;
		let nextFormula;

		if (modifierRegex.test(currentFormula)) nextFormula = currentFormula.replace(modifierRegex, modifierString);
		else if (currentFormula !== "") nextFormula = currentFormula + modifierString;
		else nextFormula = `${this._getRollMode()} ${modifierString}`;

		if (/(\/r|\/gmr|\/br|\/sr) $/g.test(nextFormula)) nextFormula = "";
		this._setChatValue(nextFormula);
		return this.parseFormulaState(nextFormula);
	}

	adjustModifierValue(delta) {
		return this.setModifierValue(this.getModifierValue() + delta);
	}

	/** Updates the cycling adv button's label, class, and tooltip to reflect the given state. */
	updateAdvButton(button, state) {
		if (!button) return;
		button.setAttribute("data-adv-state", state);
		button.classList.remove("quick-dice__advantage", "quick-dice__disadvantage", "active");
		switch (state) {
			case "kh":
				button.classList.add("quick-dice__advantage", "active");
				button.textContent = game.i18n.localize(this.labels.adv);
				button.setAttribute("data-tooltip", game.i18n.localize(this.labels.advantage));
				break;
			case "kl":
				button.classList.add("quick-dice__disadvantage", "active");
				button.textContent = game.i18n.localize(this.labels.dis);
				button.setAttribute("data-tooltip", game.i18n.localize(this.labels.disadvantage));
				break;
			default:
				button.classList.add("quick-dice__advantage");
				button.textContent = game.i18n.localize(this.labels.adv);
				button.setAttribute("data-tooltip", game.i18n.localize(this.labels.advantage));
		}
	}

	cycleAdvantage() {
		const { kh, kl } = this.buttonFormulas;
		let formula = this.getChatFormula();
		const currentState = this.parseFormulaState(formula).advState;
		const nextState = currentState === "none" ? kh : currentState === kh ? kl : "none";

		if (/\d*d\d+[khl]*/.test(formula)) {
			if (/d\d+k[hl]/g.test(formula)) {
				formula = formula.replace(/(\d*)(d\d+)(k[hl]\d*)/g, (_match, count, dice, keepState) => {
					if (nextState === "none") {
						const keep = count !== "" && !Number.isNaN(Number(count)) ? Math.max(Number(count), 1) : 1;
						const nextCount = keep > 2 ? keep : 1;
						return `${nextCount > 1 ? nextCount : ""}${dice}`;
					}
					return this.updateDiceKeep(count, dice, keepState, -1, nextState).content;
				});
			} else if (nextState !== "none") {
				formula = formula.replace(/(\d*)(d\d+)/g, (_match, count, dice) => {
					return this.updateDiceKeep(count, dice, "", 1, nextState).content;
				});
			}
		}

		this._setChatValue(formula);
		return this.parseFormulaState(formula);
	}

	/**
	 * Returns a string with the number of dice to be rolled.
	 * Generally simple, unless the system demands some complex use.
	 * @param {String} qty
	 * @param {String} dice
	 * @returns {String}
	 */
	rawFormula(qty, dice) {
		return `${qty === "" ? 1 : qty}${dice}`;
	}

	/**
	 * Handles clicks on the dice buttons.
	 * @param {Object} dataset
	 * @param {String} direction
	 * @returns
	 */
	updateDiceFormula(dataset, direction) {
		let currFormula = this.getChatFormula();

		if (direction === "sub" && currFormula === "") return this.getEmptyFormulaState();

		const rollPrefix = this._getRollMode();
		let qty = 1;
		let dice = "";

		let matchDice = dataset.formula;
		const diceRegex = /^(\d*)(d.+)/;
		if (diceRegex.test(dataset.formula)) {
			const match = dataset.formula.match(diceRegex);
			qty = Number(match[1]) || 1;
			// Avoid issues with 0-ended dice (e.g. d100 vs d10, d20 vs d2)
			matchDice = `${match[2]}(?!0)`;
			dice = match[2];
		}
		// Catch KH/KL
		matchDice += "[khl]*";

		const matchString = new RegExp(`${this.rawFormula("(?<qty>\\d*)", `(?<dice>${matchDice})`)}(?=[+-]|$)`);

		if (matchString.test(currFormula)) {
			const match = currFormula.match(matchString);
			const parts = {
				qty: Number(match.groups?.qty ?? 1) || 1,
				die: match.groups?.dice ?? "",
			};

			qty = direction === "add" ? parts.qty + (qty || 1) : parts.qty - (qty || 1);

			if (!qty && direction === "sub") {
				currFormula = currFormula.replace(matchString, "");
				// Clear formula if remaining formula is something like "/r kh"
				if (new RegExp(`${rollPrefix}\\s+(?!.*d\\d+.*)`).test(currFormula)) {
					currFormula = "";
				}
			} else currFormula = currFormula.replace(matchString, this.rawFormula(qty, parts.die));
		} else if (currFormula === "") {
			currFormula = `${rollPrefix} ${this.rawFormula(qty, dice || dataset.formula)}`;
		} else {
			const signal = /(\/r|\/gmr|\/br|\/sr) (?!-)/g.test(currFormula) ? "+" : "";
			currFormula = currFormula.replace(
				/(\/r|\/gmr|\/br|\/sr) /g,
				`${rollPrefix} ${this.rawFormula(qty, dice || dataset.formula)}${signal}`,
			);
		}

		currFormula = currFormula
			.replace(/(\/r|\/gmr|\/br|\/sr)(( \+)| )/g, `${rollPrefix} `)
			.replace(/\+{2}/g, "+")
			.replace(/-{2}/g, "-")
			.replace(/\+$/g, "");
		this._setChatValue(currFormula);
		return this.parseFormulaState(currFormula);
	}

	/**
	 * Gets the selected roll mode. This is completely cosmetic or for pressing Enter on chat, the rollMode is picked up during Roll#toMessage
	 * @returns {String}
	 */
	_getRollMode() {
		const mode = game.settings.get("core", "messageMode");
		switch (mode) {
			case "gm":
				return "/gmr";
			case "blind":
				return "/br";
			case "self":
				return "/sr";
			default:
				return "/r";
		}
	}

	/**
	 * Process a formula to apply advantage or disadvantage. Should be used
	 * within a regex replacer function's callback.
	 *
	 * @param {string} count Current dice count in the formula.
	 * @param {string} dice Current dice in the formula.
	 * @param {string} khl Current kh/kl in the formula.
	 * @param {number} countDiff Integer to adjust the dice count by.
	 * @param {string} newKhl Formula of the button (kh or kl).
	 * @returns {object} Object with content and count keys.
	 */
	updateDiceKeep(count, dice, khl, countDiff, newKhl) {
		// Start by getting the current number of dice (minimum 1).
		const keep = Number.isNumeric(count) ? Math.max(Number(count), 1) : 1;

		// Apply the count diff to adjust how many dice we need for adv/dis.
		let newCount = keep + countDiff;
		let newKeep = newCount - 1;

		if (khl) {
			// Toggling between kh, kl, or switching off adv/dis.
			if (!khl.includes(newKhl)) {
				newCount = keep;
				newKeep = newCount - 1;
				khl = newKhl;
			}
			// Toggling off adv/dis
			else {
				newCount = keep > 2 ? keep : newCount;
				newKeep = 0;
			}
		} else {
			khl = newKhl;
		}

		// Limit the count to 2 when adding adv/dis to avoid accidental super advantage.
		if (newCount > 2 && newKeep > 0) {
			newCount = 2;
			newKeep = newCount - 1;
		}

		// Create the updated text string.
		let result = `${newCount > 0 ? newCount : 1}${dice}`;
		// Append kh or kl if needed.
		if (newCount > 1 && newKeep > 0) {
			result = `${result}${newKhl}`;
		}

		// Return an object with the updated text and the new count.
		return {
			content: result,
			count: newCount,
		};
	}
}

export class dnd5eDiceMap extends TemplateDiceMap {
	get labels() {
		return {
			advantage: "QUICK_DICE.Advantage",
			adv: "QUICK_DICE.Adv",
			disadvantage: "QUICK_DICE.Disadvantage",
			dis: "QUICK_DICE.Dis",
		};
	}
}
