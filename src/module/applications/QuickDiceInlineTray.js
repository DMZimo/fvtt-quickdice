import { QuickDiceTrayApplication } from "./QuickDiceTrayApplication.js";

export class QuickDiceInlineTray extends QuickDiceTrayApplication {
	static DEFAULT_OPTIONS = {
		id: "quick-dice-inline",
		classes: ["quick-dice-inline"],
		window: {
			frame: false,
		},
	};

	_canRender(_options) {
		if (!document.getElementById("chat-message")) return false;
	}

	_insertElement(element) {
		const chatInput = document.getElementById("chat-message");
		if (!chatInput) return;

		const existing = document.getElementById(element.id);
		if (existing && existing !== element) existing.remove();
		chatInput.insertAdjacentElement("afterend", element);
	}

	reposition() {
		if (!this.rendered || !this.element) return;
		const chatInput = document.getElementById("chat-message");
		if (!chatInput) return;
		chatInput.insertAdjacentElement("afterend", this.element);
	}
}
