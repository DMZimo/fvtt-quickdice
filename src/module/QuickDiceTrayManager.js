import { QuickDiceInlineTray } from "./applications/QuickDiceInlineTray.js";
import { QuickDicePopOut } from "./popup.js";

export class QuickDiceTrayManager {
	constructor(controller) {
		this.controller = controller;
		this.inlineTray = new QuickDiceInlineTray(this);
		this.popoutTray = null;
		controller.runtime = this;
	}

	get isPopoutOpen() {
		return this.popoutTray?.rendered ?? false;
	}

	async renderInlineTray(options = { force: true }) {
		await this.inlineTray.render(options);
		this.syncApplications();
		return this.inlineTray;
	}

	repositionInlineTray() {
		this.inlineTray.reposition();
	}

	async rerenderApplications() {
		if (document.getElementById("chat-message")) await this.renderInlineTray({ force: true });
		if (this.popoutTray?.rendered) await this.popoutTray.render({ force: true });
		this.syncApplications();
	}

	syncApplications(state = this.controller.parseFormulaState()) {
		if (this.inlineTray.rendered) this.inlineTray.applyState(state);
		if (this.popoutTray?.rendered) this.popoutTray.applyState(state);
		return state;
	}

	resetApplications() {
		return this.syncApplications(this.controller.getEmptyFormulaState());
	}

	async togglePopout() {
		this.popoutTray ??= new QuickDicePopOut(this);
		if (this.popoutTray.rendered) await this.popoutTray.close({ animate: false });
		else await this.popoutTray.render({ force: true });
		this.syncApplications();
		return this.popoutTray;
	}
}
