# Village/Town map file search (LDtk/Tiled) — report

Date: 2026-11-20. Goal: downloadable, openly-licensed, parseable 2D top-down village map DATA file for re-skinning onto Kenney Tiny Town.

## VERIFIED — best candidate (recommend)

**Kenney Roguelike RPG — `sample.tmx`** (mapeditor/tiled-resources)
- URL (raw): https://raw.githubusercontent.com/mapeditor/tiled-resources/master/RPG/sample.tmx
- Repo/folder: https://github.com/mapeditor/tiled-resources/tree/master/RPG (author: the Tiled project; tiles by Kenney Vleugels)
- License: **CC0** — quoted from `RPG/License.txt` in the folder: "Roguelike pack by Kenney Vleugels for Kenney ... License (Creative Commons Zero, CC0) ... You may use these graphics in personal and commercial projects. Credit ... would be nice but is not mandatory." (Downloaded + read.) NOTE: repo ROOT has no LICENSE file (404 verified); the CC0 statement lives in `RPG/License.txt` and covers the Kenney art the map is built from.
- Format: **.tmx** (Tiled XML). Real map data confirmed — 5 `<layer>` blocks with base64+zlib `<data>`. Decoded locally:
  - Map: orthogonal, 50x50 tiles, 16x16 px (matches Tiny Town's 16px grid).
  - Ground: 2500/2500 cells filled (6 gids). Ground Overlay: 517 tiles. Obstacles: 111 tiles (27 gids). Doors/Windows/Roofs: 27 tiles (22 gids). Roof Overlay: 2 tiles.
- Tileset referenced: Kenney **Roguelike** sheets (`roguelikeSheet_transparent` 968x526 / 16px, plus Char/Dungeon/Indoor .tsx), **NOT** Tiny Town. Same author + same 16px pixel-art family, so re-skinnable onto Tiny Town but tile indices will NOT map directly.
- Content: top-down RPG town/dungeon-overworld layout with ground, buildings, roofs, doors/windows, obstacles.

## VERIFIED — secondary (wrong theme, but clean data)

**LDtk official sample maps** (deepnight/ldtk) — MIT repo.
- Folder: https://github.com/deepnight/ldtk/tree/master/app/extraFiles/samples
- `Typical_TopDown_example.ldtk` (raw: .../samples/Typical_TopDown_example.ldtk). Real .ldtk data: jsonVersion 1.5.3, 3 levels, layers with autoLayerTiles (242/536/...) + gridTiles (210). Tileset = `TopDown_by_deepnight` (176x176). THEME = dungeon/cave (Nuclear Blaze), **not a warm village** — poor skin match.
- Asset licenses (from `samples/README.md`): Cavernas (Adam Saltsman), SunnyLand (Ansimuz), Inca (Kronbits), Nuclear Blaze **CC-BY-SA 4.0**. Repo code = MIT, but embedded tiles are mixed/CC-BY-SA. Layout is MIT-usable; art is not CC0.
- Also present: `WorldMap_GridVania_layout.ldtk`, `WorldMap_Free_layout.ldtk`, platformer example. Not inspected in depth — world-map (overworld node) style, not a tiled village interior.

## NOT FOUND (searched, nothing verified)
- A map file built WITH Kenney **Tiny Town** specifically (.ldtk/.tmx/.tmj): no verified result on GitHub repos, itch.io, OpenGameArt. Kenney's Tiny Town zip ships only tileset + rendered Sample.png (no source map) — consistent with user's finding. GitHub code-search (which could confirm community files) requires auth and was unavailable.
- itch.io leads (ansimuz Tiny RPG Town CC0, Screaming Brain Tiny Top Down, pixeljad VillageTD) surfaced but NOT opened/verified — unknown whether any ships an actual map DATA file vs just tiles.

## RECOMMENDATION
Use the Kenney Roguelike `sample.tmx` (CC0, real 50x50 16px layered tile data) as the layout to re-skin onto Tiny Town. Same author/grid/pixel style; expect to remap tile indices (Roguelike sheet gids -> Tiny Town gids) since it is a different sheet. Downloaded locally to:
`...scratchpad/tiled-rpg/sample.tmx` (+ License.txt, README.md).

## Unresolved questions
- Want the itch.io CC0 leads (ansimuz Tiny RPG Town etc.) actually opened to confirm if any includes a .tmx/.tmj/.ldtk DATA file? (needs ~3 page fetches)
- Confirm Roguelike-sheet->Tiny-Town tile mapping is acceptable, or is index-exact match (Tiny Town source) a hard requirement? If hard, answer is: none found.
