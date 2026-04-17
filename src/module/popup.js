import { QuickDiceTrayApplication } from "./applications/QuickDiceTrayApplication.js";

export class QuickDicePopOut extends QuickDiceTrayApplication {
	static DEFAULT_OPTIONS = {
		id: "quick-dice-popout",
		tag: "aside",
		position: {
			width: ui?.sidebar?.options.width ?? 300,
		},
		window: {
			frame: true,
			title: "QUICK_DICE.DiceTray",
			icon: "fas fa-dice-d20",
			minimizable: true,
			resizable: true,
		},
	};

	async _renderFrame(options) {
		const frame = await super._renderFrame(options);
		this.window.close.remove(); // Prevent closing
		return frame;
	}

	async close(options = {}) {
		if (!options.closeKey) return super.close(options);
		return this;
	}

	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		if (options.isFirstRender && ui.nav) {
			const position = game.settings.get("quickdice", "popoutPosition");
			const { right, top } = ui.nav.element.getBoundingClientRect();
			const uiScale = game.settings.get("core", "uiConfig").uiScale;
			options.position.left ??= position.left ?? right + 16 * uiScale;
			options.position.top ??= position.top ?? top;
		}
	}

	setPosition(position) {
		const superPosition = super.setPosition(position);
		const { left, top } = superPosition;
		game.settings.set("quickdice", "popoutPosition", { left, top });
		return superPosition;
	}
}
