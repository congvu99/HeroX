# HeroX: Art + Chapter Pipeline Contracts

Paths relative to repo root. Citations path:line. Runtime is data-driven; nothing is hardcoded to chapter 1 except START_MAP_PATH (client/src/scenes/scene-keys.ts:28).

## 1. HERO & ACTOR SPRITES
### 1.1 Path to URL (sprite-asset-urls.ts)
- :7-11 globs ../../../assets/sprites/**/*.png as Vite ?url; key stripped of ../../assets/ -> sprites/hero/hero_walk.png (:5,13-15).
- spriteAssetUrl returns string|undefined; missing never crashes (:18-20).
- On-disk root: assets/sprites/ at repo root. Dirs hero/ monsters/ npc/ props/.
- New PNG auto-discovered but fails credits test unless in assets/credits.json (Sec 5).

### 1.2 Hero walk (hero-sprite.ts)
- sprites/hero/hero_walk.png (:8). Cell 192x192, 9 cols (:10-11). Char ~64px centered, feet y=128 (:12-13).
- Row order up=0 left=1 down=2 right=3 (:17), universal (placeholder-textures.ts:27, import-placeholder-art.mjs:21).
- Col0 standing, cols1-8 walk (:14-15). Named frames up/left/down/right -> col0 (:51-52).
- Walk start=row*9+1 end=row*9+8 fr10 rep-1 (:16,55-61). load.spritesheet 192 (:39).
- prepareHeroLook {textureKey,frameSize,feetY,animated} (:22-29,46-64); missing->placeholder 64/62/false (:47-49). Origin feetY/frameSize (battle-actors.ts:103).

### 1.3 Hero battle moves (hero-battle-animations.ts)
Cells 192x192 (:8,46). HeroBattleMove idle|strike|cast|fall (:13). SHEETS (:24-29):
- idle hero_idle.png cols2 singleRow false fr2 rep-1
- strike hero_slash.png cols6 false fr18 rep0
- cast hero_spellcast.png cols7 false fr16 rep0
- fall hero_hurt.png cols6 singleRow true fr10 rep0
Battle anims use ONLY row0 UP of multi-row (:9-10,59); singleRow start0. Missing skipped (:44-45,53-54). fall absent -> red tint (battle-actors.ts:172-173).

### 1.4 Enemy/boss (battle-actors.ts)
- Plain images load.image, single still frame, tween-driven (:78-83).
- MONSTER_SPRITES kind->file (:28-34): imp-scout->imp, imp->imp, skeleton, ghoul, scarecrow-demon. Path sprites/monsters/FILE.png (:80).
- Keys monster:FILE (:59-63); load errors ignored (world-scene.ts:202).
- Size via SCALE: normal ACTOR_SCALE=2, boss BOSS_SCALE=1.5 (:22-24). BOSS_KINDS scarecrow-demon (:35). Origin (0.5,1) feet bottom (:105,127).
- 64/96/128 authoring only, import-placeholder-art.mjs:16-17 FRAME normal64 elite96 boss128 prop32. Engine scales loaded image. Author boss ~128 tall feet-bottom, rendered x1.5.
- Tints MULTIPLY elite 0xffa060, shield 0xff5a1f, hurt white (:37-41,232-236). Keep neutral.
- elite-demon.png exists but NO kind references it (orphan; elite is tint).

### 1.5 NPC/props (prop-sprites.ts)
- NPC_SPRITES dialogId->path (:6-13): keeper/smith/hollow-villager->npc, chapel-door/chapel-altar->props, scarecrow->monsters/scarecrow-demon.png. Key is dialogId.
- Chests props/chest-closed.png chest-open.png (:14-15). Plain images, placeholder (:22-34).
- Portrait (story/dialog-runner.ts:27-35,117-119): SPEAKER_INFO speaker->{name,portrait} via spriteAssetUrl. New speaker needs entry + new SpeakerId (story-types.ts:32).

### 1.6 placeholder-textures.ts
Canvas fallbacks hero(64 named facings) npc chest enemy(64) light(256) collision tile 3 building stages(96x64). Facing order up/left/down/right (:27).

## 2. MAP / LDTK PIPELINE
### 2.1 generate-chapter-1.mjs
npm run generate:chapter-1 -w @herox/client (:3), deterministic. Inputs chapter-1/levels.mjs, chapter-1/kenney-atlas.mjs, tools/lib/ldtk-project.mjs. Consts (:14-25) MAP_NAME chapter-1-misty-village, tileset chapter-1.png, PROJECT_IID, DUMMY_WORLD_IID, bg #5DA84B.
Outputs assets/: tilesets/chapter-1.png (:152), tilesets/chapter-1-tiles.json name->index (:18,153 used by arena test:7), tilesets/chapter-1-glow.json (:19,154), maps/chapter-1-misty-village.ldtk (:169), maps/chapter-1-misty-village/LEVEL.ldtkl per level (:160-162), atlas credit (:171-178).
Per-level ASCII ops -> rasterize (:33-51) -> decodeCell {ground,decor,solid} (:74-107) -> assertPlayable BFS from spawn (:120-145) -> buildLevelJson. hashNoise seeded per index (:93).

### 2.2 chapter-1/kenney-atlas.mjs
KENNEY_SHEETS town/dungeon 16px 12col (:9-18) x2->32. KENNEY_TILES ordered name->[sheet,idx,glow?] (:30-115), order=atlas order. ATLAS_COLUMNS 8 (:12), cap 2048 (:13,138). buildKenneyAtlas {image,rows,indexByName,objectTiles,glow} (:133-149).

### 2.3 tools/lib/ldtk-project.mjs
GRID 32, LDTK 1.5.3 (:6-7). ENTITY_DEFS fixed (:24-32) + UIDs (:14-22): PlayerSpawn{spawnId} Portal{targetLevel,targetSpawn} Npc{dialogId} Chest{itemId} BattleTrigger{encounterId} Torch{} Building{buildingId}. Pivots spawn/npc/chest (0.5,1); portal/battle/building (0,0) resizable; torch (0.5,0.5). Layers Entities/Collision(IntGrid 1=solid)/Decor/Ground (:114-138). Single world Free (:141-177); multi-world rejected (ldtk-loader.ts:187-189). UIDs per-file, reusable across chapters.

### 2.4 Runtime (ldtk-loader.ts, map-asset-urls.ts)
- map-asset-urls.ts:7 globs assets/{maps,tilesets}/**/*.{ldtk,ldtkl,png}; mapAssetUrl THROWS if missing (:18-22).
- Boot one project START_MAP_PATH maps/chapter-1-misty-village.ldtk (scene-keys.ts:28), boot-scene.ts:40.
- World resolves .ldtkl lazily (world-scene.ts:213 resolveAssetPath), tileset rel (world-scene.ts:426).
- Validates LDtk major 1 (:149-154); collision CSV len==cells (:251-256); fields required (:267-274); unknown kinds ignored (:321-322,353-355); buildingId isBuildingId (:316-319). Helpers findSpawn/findBrokenPortalLinks/resolveAssetPath (:383-424).

### 2.5 Adding ch2-5 maps
No multi-project runtime mechanism beyond single START_MAP_PATH; cross-project portals absent. Options:
(A) One project per chapter (recommended): create client/scripts/generate-chapter-N.mjs + chapter-N/levels.mjs + chapter-N/kenney-atlas.mjs (or reuse). Add npm script. Runtime needs chapter->project selector. Ash_Forest portal targets absent future level, gated (levels.mjs:140-142, test exempts chapter-1-map.test.ts:18,170-172).
(B) Add levels to same project (one .ldtk).
Parametrize MAP_NAME, tileset filenames, PROJECT_IID/DUMMY_WORLD_IID (unique UUID), bg, LEVELS. decode/write machinery + ldtk-project.mjs reusable.

## 3. STORY / ENEMIES / ENCOUNTERS / WORD-CHAINS
### 3.1 StoryChapter (story-types.ts)
StoryChapter{chapter,title,beats[],quests[],dialogs[],encounterGates[],levelGates[],buildingUnlocks:Record<building,beatId>,finalBeat} (:81-93).
BeatCompletion: {kind dialog} | {kind battle,encounterId} | {kind collect,itemId} | {kind word,word,meaning,emoji} (:2-10).
StoryBeat{id,chapter,objective,requires[],completion,autoDialogId?} (:12-22). StoryQuest{id,title,beats[]} (:25-30). DialogVariant{requires?,unless?,lines[],completesBeat?,startsEncounter?} (:47-57). DialogLine{speaker,text,teach?} (:40-44). SpeakerId (:32). EncounterGate{encounterId,requires[],lockedMessage} (:65-69). LevelGate{levelId,requires[],chapter?,lockedMessage} (:72-78).
Template data/story/chapter-1.ts (beat map :5-18, object :29-281).

### 3.2 Enemy (encounters.ts + data/enemies/chapter-1.ts)
EnemyTemplate{kind,name?,baseHp,baseAttack,rewardGold,fireShield?} (encounters.ts:5-14). CHAPTER_1_ENEMIES satisfies Record (data/enemies/chapter-1.ts:7-24). Scaled by scaleEncounterEnemies (encounters.ts:57-69). ENEMY_NAMES (:27-29). kind->sprite via MONSTER_SPRITES; new kind needs entry.

### 3.3 Encounter (encounters.ts)
Encounter{id,enemies[],promptTimeMs,allowElite} (:16-21). ENCOUNTERS (:37-51). Id consts (:23-27). findEncounter (:53-55).

### 3.4 WordChain (data/word-chains.ts)
WordChain{id,words[]} (:2-6). CHAPTER_1_PHRASES space phrases (:10-41); id=phrase-dashes words=split (:43-46). Every word must be in LingoBrain deck (server contract-eng-deck.test.ts:17-21). Single flat WORD_CHAINS.

### 3.5 Registry + registration points
STORY_CHAPTERS=[CHAPTER_1_STORY] (story-rules.ts:8) = single registry; all story fns iterate it.
For new chapter:
- story-rules.ts:3,8 import+array.
- shared/src/index.ts:200-233 exports.
- encounters.ts:23-27 id consts; :35,37-51 enemies+ENCOUNTERS; index.ts:92-102 exports.
- data/enemies/chapter-N.ts; index.ts:101.
- battle-actors.ts:28-35 MONSTER_SPRITES+BOSS_KINDS.
- battle-arena-layout.ts:2,124-130 ENCOUNTER_THEMES (unknown->fields :133-135); new theme THEMES:85-122 + ArenaThemeId:33 + ARENA_THEMES:179 + lighting-presets.ts:103-107.
- lighting-presets.ts:94-100 LEVEL_LIGHTING (missing->sunny:110-112).
- dialog-runner.ts:30-36 + story-types.ts:32 SpeakerId+portrait.
- data/word-chains.ts chains (optional).
grep FIELD_ENCOUNTER_ID: encounters.ts:24, data/story/chapter-1.ts:1, battle-arena-layout.ts:2,127, index, arena test.
grep CHAPTER_1: data/story/chapter-1.ts:5, data/enemies/chapter-1.ts:7, index.ts:101,200.
Server: beats generic via checkBeatCompletion (story-rules.ts:59-71); no ch1 hardcode (story-routes.ts). Beat ids = DB herox.story_progress.beat (chapter-1.ts:4) - never rename. Unknown chapter 404 (story-routes.test.ts:166).

### 3.6 Unlock thresholds (progression/level-curve.ts)
ChapterUnlock{chapter,learned,mastered} (:37-41). CHAPTER_UNLOCKS (:44-50): 1=0/0 2=100/0 3=300/0 4=600/0 5=1000/200. isChapterUnlocked (:57-60). Thresholds 2-5 ALREADY exist. Wired via LevelGate.chapter in levelGateState (story-rules.ts:147-157): chapter:N requires isChapterUnlocked. Ch1 Ash_Forest chapter:2 (chapter-1.ts:123). New chapter entry gate: chapter:N + requires [prev finalBeat].

## 4. LIGHTING / ARENA
### 4.1 lighting-presets.ts
LightingPreset (:6-28). 3 presets sunny/sunset/moonlight (:30-91). LEVEL_LIGHTING Record<levelId,preset> (:94-100); lightingForLevel->sunny fallback (:110-112) but test requires every level declared (test:14-17). ARENA_LIGHTING (:103-107); lightingForArena NO fallback (:114-116) - new theme must be added.

### 4.2 battle-arena-layout.ts
6x11 x2 centered (:9-31). ArenaThemeId fields|village|lair (:33); ARENA_THEMES (:179). THEMES (:85-122) floor/wallTop/wallFace, decor, ground, glow, 11-row ASCII rows, embers. Tile names must be in chapter-1-tiles.json (test:13-18). ENCOUNTER_THEMES (:124-130) default fields (:133-135). Arena atlas chapter-1 only (battle-arena.ts:26). golden-hour-atmosphere.ts preset-driven (:58-63,90-92), no chapter specifics.

## 5. CREDITS
### 5.1 credits.json: fields path,title,source,url,authors,license,modified (credits-store.mjs:10). path rel assets/. Sorted, all strings (upsertCredits:42-51). SOURCES dcss/lpc/kenney/herox (:13-35).
### 5.2 build-credits.mjs: generates CREDITS.md from credits.json + art-recipes.json (:6-9,49-62). --check exits1 on drift (:65-71). PixelLab section (:37-46).
### 5.3 art-recipes.json now {version1,assets[]}. Each (asset-credits.test.ts:30-40): {id,path,prompt,seed int,size w>0 h>0,directions 4|8,animations non-empty,reference existing,createdAt YYYY-MM-DD}. No tokens (:146-158).
### 5.4 Credits test invariants (asset-credits.test.ts):
- Every .png in assets/{sprites,tiles,tilesets} needs entry (:9,46-52,88-90).
- Entry file exists, no dup, 5 fields non-empty (:92-100).
- palette-harmonize note matches herox-harmonized tEXt marker both ways (:102-107). PixelLab must NOT carry marker/note.
- CREDITS.md regenerated (:109-111) via node tools/build-credits.mjs.
- source /pixellab/i -> path in art-recipes.json (:138-144).
- LPC credits no GPL (:114-135).

## 6. TESTS
- chapter-1-map.test.ts: 5 levels order Lexhold first external ldtkl (:131-136); tileset chapter-1.png grid32 <=2048 (:138-145); size 30-44w 18-26h collision no unknown (:147-157); EXACT entity-id sets EXPECTED (:29-58,159-168); >=1 Torch; portals valid except Ash_Forest (:170-173); Building 96x64 door (:175-184); edges sealed except portals (:188-200); npc/chest/spawn not solid, spawn clear of zones (:202-222); reachability (:224-237); tutorial seals exit (:239-245); ch1-field blocks path roam does not (:247-254); chapel door adjacent (:256-261). Ch2 needs own test or generalize.
- battle-arena-layout.test.ts: 6x11; tiles in chapter-1-tiles.json (:13-18); rows2-8 no decor +light (:20-26); deterministic (:28-30); ENCOUNTERS ids valid theme smithy=village boss=lair+embers unknown=fields (:32-38); centered (:40-46).
- lighting-presets.test.ts: every level has LEVEL_LIGHTING (:14-17); arena presets (:19-21); ranges (:29-44).
- asset-credits.test.ts: Sec 5.4.
- fx-assets.test.ts: manifest unique, CREDITS lists, commit pinned (:31-47); atlases match <=WebGL (:48-59); every SKILL_CATALOG castFx/impactFx + SYSTEM_FX in manifest (:61-70).
- credit-groups.test.ts, story-journal.test.ts.
- server story-routes.test.ts: beat HTTP dialog idempotent, battle needs victory, word normalized, unknown beat/chapter/fractional rejected (:117-169); generic over STORY_CHAPTERS.
- server contract-eng-deck.test.ts: WORD_CHAINS words + TUTORIAL_WORD_IDS in deck (:17-26).
- ldtk-loader.test.ts: format units, LDtk 1.x.

## To add ONE chapter:
Shared: CREATE data/story/chapter-N.ts, data/enemies/chapter-N.ts. MODIFY encounters.ts (ids+ENCOUNTERS), story-rules.ts:3,8, story-types.ts:32 (SpeakerId), word-chains.ts (opt), index.ts. Thresholds already in level-curve.ts.
Maps: CREATE client/scripts/generate-chapter-N.mjs + chapter-N/levels.mjs + chapter-N/kenney-atlas.mjs; add npm script. GENERATE assets/maps/chapter-N-*.{ldtk,ldtkl} + assets/tilesets/chapter-N*.{png,json}. MODIFY map selection (scene-keys.ts:28) OR add levels to existing project.
Client: MODIFY battle-actors.ts:28-35, prop-sprites.ts:6-15 + dialog-runner.ts:30-36, lighting-presets.ts:94-100, battle-arena-layout.ts (ENCOUNTER_THEMES + themes if new look).
Credits: MODIFY assets/credits.json; run node tools/build-credits.mjs.
Tests: ADD chapter-N map test or generalize.

## To swap hero art to PixelLab - constraints:
1. Walk hero_walk.png: square cells, 9 cols, rows up/left/down/right(0-3). Col0 idle, cols1-8 walk. Default 192px; if changing cell size update LPC_CELL_SIZE + LPC_FEET_Y (hero-sprite.ts:10-13). fr10 rep-1.
2. Battle sheets same cell size, use row0 (up): idle2 slash6 spellcast7 hurt6 single-row. Column counts SHEETS (hero-battle-animations.ts:24-29) - update if frame count differs. Row0 only (:59).
3. Square cell fed to load.spritesheet; char centered, feet at feetY.
4. Missing sheet tolerated - swap incrementally.
5. Hero exempt from palette-harmonize (import-placeholder-art.mjs:60-61); PixelLab must NOT carry marker/note.
6. Monsters/bosses: single still PNG, feet at bottom, ~64/96/128 normal/elite/boss; normal x2 boss(scarecrow-demon) x1.5. Neutral colors (runtime MULTIPLY tints).

## Open questions
- No multi-chapter map-loading mechanism beyond START_MAP_PATH; chapter->project switch is the main code gap. Separate .ldtk per chapter (A) vs one project (B)?
- WORD_CHAINS and SpeakerId are flat/global - keep or namespace per chapter?
- elite-demon.png orphaned (no kind) - intent for ch2 elites?
