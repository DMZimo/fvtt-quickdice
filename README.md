# Quick Dice

A streamlined dice tray module for **Foundry VTT v14** and **D&D 5e**.

Quick Dice adds a dice tray below the chat sidebar and turns the d20 icon near the chat prompt into a dice calculator with buttons for dice, numbers, and simple math.

This is a modernized fork of [Dice Tray](https://github.com/mclemente/fvtt-dice-tray), stripped down to support only D&D 5e and updated for Foundry v14's ProseMirror-based chat input.

## Installation

1. Go to the setup page and choose **Add-on Modules**.
2. Click **Install Module**.
3. Paste the manifest URL:

   ```url
   https://github.com/DMZimo/fvtt-quickdice/releases/latest/download/module.json
   ```

4. Enable the module in your world's module settings.

## What Changed from Dice Tray

- **Live updates** - the dice tray updates in real time, even if you edit the chat formula manually.
- **Foundry v14 only** - uses the new ProseMirror chat API.
- **D&D 5e only** - all other game systems have been removed.
- **No build toolchain bloat** - plain `cpSync` build script and native CSS.
- **Biome** for linting and formatting.

## Development

> Note: We only play D&D (2024) at our table - I can't reliably test or maintain other systems.

### Prerequisites

- Node.js 24+ (see `.nvmrc`)
- [Biome](https://biomejs.dev/) (installed via `npm install`)

```bash
nvm install
npm install
```

### Local Development

No build step is needed. Symlink `src/` directly into your Foundry VTT modules folder:

```bash
ln -s "$(pwd)/src" "/path/to/FoundryVTT/Data/modules/quickdice"
```

Edits to `src/` are picked up immediately on reload.

### Linting & Formatting

```bash
npm run check       # biome lint + format check
npm run check:fix   # auto-fix lint + format issues
npm run lint        # lint only
npm run format      # format only
```

### Releasing

1. Update `src/module.json` with the new version and merge the release commit to `main`.
2. Create and push a matching tag, for example `git tag v1.2.3 && git push origin v1.2.3`.
3. The `Release` workflow validates the tag against `src/module.json`, packages `src/`, and publishes the GitHub release assets.
4. If publishing needs to be rerun, use the `Release` workflow manually against the existing tag.

## Credits

This project is a fork of [Dice Tray](https://github.com/mclemente/fvtt-dice-tray) by **Matheus Clemente**, itself a fork of [Dice Calculator](https://gitlab.com/asacolips-projects/foundry-mods/foundry-vtt-dice-calculator) by **Asacolips**.

## License

[MIT](LICENSE)
