# 5etools-monster-grabber
Copy the JSON data of a creature from 5etools.com and restructure the data to fit the Shieldmaiden encounter builder schema.

**Note:** this tool is currently in its testing phase.

## Known Issues
- Some stats are not being copied over if their value is different from most creatures (Aberrant Spirit, for example)

## To-dos
- Handle multi-type attacks (ex: Guard's spear attack)
- Error reporting for non-loadable properties

## Features to be considered:
- Add option to open JSON in a new tab (currently working just not implemented)
- Add option to download JSON (currently working just not implemented)
- Move buttons to extension popup rather than inject them into the page

## How to test
1. Download the repository (Click Code -> Download ZIP)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable Developer mode
4. Click on `Load unpacked` and select the repository folder
5. Navigate to [5etools.com](https://5e.tools/bestiary.html) and select a creature
6. Click on the "Copy JSON" button
7. Visit the [Shieldmaiden NPCs page](https://shieldmaiden.app/content/npcs) and click "Import".
8. Paste JSON into the "JSON Input" field and click "Parse JSON"

If you encounter any issues, please report it. Helpful information includes:
- The creature you are trying to import
- The error message you received
- The Chrome version you are using
