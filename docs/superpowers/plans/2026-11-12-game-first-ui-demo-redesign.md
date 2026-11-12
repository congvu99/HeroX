# HeroX Game-First UI Demo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web-dashboard demo with a 640×360 action-RPG presentation for login, outfit, health HUD, and character information.

**Architecture:** Keep the existing isolated HTML demo and dependency-free Node contract test. The outer review controls remain outside the simulated game screen; all four inner states use game-screen composition, shared frame primitives, the existing HeroX sprite sheet, and keyboard navigation.

**Tech Stack:** Semantic HTML5, embedded CSS, vanilla JavaScript, local HeroX PNG assets, Node.js built-in `node:test`, Playwright for visual verification.

---

## File structure

- Modify `prototypes/gothic-ui-demo/demo.test.mjs`: replace dashboard-oriented assertions with game-screen contracts.
- Modify `prototypes/gothic-ui-demo/index.html`: rebuild the four views as title screen, HUD overlay, armory, and character sheet.
- No changes to `client/`, `server/`, `shared/`, maps, sprites, or game data.

### Task 1: Define the game-first contract

**Files:**
- Modify: `prototypes/gothic-ui-demo/demo.test.mjs`
- Test: `prototypes/gothic-ui-demo/demo.test.mjs`

- [ ] **Step 1: Replace the visual-structure tests with game-screen assertions**

Keep the existing offline, palette, four-view, and button tests. Add these tests after the four-view test:

```js
test('models a 640 by 360 game screen instead of a web dashboard', async () => {
  const source = await html();
  assert.match(source, /class="game-screen"/);
  assert.match(source, /data-logical-width="640"/);
  assert.match(source, /data-logical-height="360"/);
  assert.match(source, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.doesNotMatch(source, /class="demo-heading"|class="tabs"|class="login-panel"|class="outfit-list"/);
});

test('uses dedicated action RPG compositions for all four states', async () => {
  const source = await html();
  assert.match(source, /class="[^\"]*title-screen/);
  assert.match(source, /class="[^\"]*combat-hud/);
  assert.match(source, /class="[^\"]*armory-screen/);
  assert.match(source, /class="[^\"]*character-sheet/);
  assert.match(source, /equipment-slot/);
  assert.match(source, /command-bar/);
});

test('uses the existing HeroX sprite and game keyboard controls', async () => {
  const source = await html();
  assert.match(source, /\.\.\/\.\.\/assets\/sprites\/hero\/hero_idle\.png/);
  assert.match(source, /image-rendering:\s*pixelated/);
  assert.match(source, /event\.key\s*===\s*'m'/i);
  assert.match(source, /\['1',\s*'2',\s*'3',\s*'4'\]/);
});
```

Update the device assertion so it checks `.game-stage[data-device='mobile']` instead of `.preview-shell[data-device='mobile']`.

- [ ] **Step 2: Run the contract and verify RED**

Run:

```powershell
node --test prototypes/gothic-ui-demo/demo.test.mjs
```

Expected: the existing five tests pass; the three new game-first tests fail because the old dashboard classes and composition remain.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add -- prototypes/gothic-ui-demo/demo.test.mjs
git commit -m "test: require game-first UI composition"
```

### Task 2: Rebuild the four screens as action-RPG UI

**Files:**
- Modify: `prototypes/gothic-ui-demo/index.html`
- Test: `prototypes/gothic-ui-demo/demo.test.mjs`

- [ ] **Step 1: Replace the outer page shell**

Use one compact review toolbar above the game stage. It contains the title `HeroX UI TEST`, four icon-like state buttons, and Desktop/Mobile controls. The toolbar must use `data-tab` and `data-mode` so the existing interaction contract remains stable. Remove `.demo-heading`, `.tabs`, `.preview-shell`, `.login-panel`, and `.outfit-list`.

Create the stage with this exact shell:

```html
<div class="game-stage" data-device="desktop">
  <div class="game-screen" data-logical-width="640" data-logical-height="360">
    <!-- four data-view sections -->
  </div>
</div>
```

The `.game-screen` CSS must use `aspect-ratio: 16 / 9`, `position: relative`, `overflow: hidden`, and a maximum width of `960px`. `.game-stage[data-device='mobile'] .game-screen` must use a maximum width of `720px` while retaining the same aspect ratio.

- [ ] **Step 2: Build the title screen**

Inside `data-view="login"`, use the classes `game-view title-screen`. Compose a full-screen abbey atmosphere from CSS stone, vignette, rain, ember, and altar-light layers. Place the HeroX crest and title in the upper center. Put `Đăng nhập LingoBrain` in a `.command-bar` at the lower center with a diamond cursor and the one-line learning-progress explanation below it.

- [ ] **Step 3: Build the combat HUD state**

Inside `data-view="health"`, use `game-view combat-hud`. Keep the scene visible and attach the HUD to the top-left. The HUD consists of a shield-shaped portrait, the labels `Aldric` and `Cấp 12`, a red HP meter with `876 / 1200`, and a narrow gold shield meter with `140`. Do not wrap the HUD in a centered panel.

- [ ] **Step 4: Build the armory state with the real sprite**

Inside `data-view="outfit"`, use `game-view armory-screen`. The center column contains:

```html
<div class="hero-sprite" role="img" aria-label="Hiệp sĩ HeroX"></div>
```

Style `.hero-sprite` with `background-image: url('../../assets/sprites/hero/hero_idle.png')`, a fixed 64×64 source frame enlarged with `transform: scale(2)`, and `image-rendering: pixelated`. Place four `.equipment-slot` elements around it for Mũ, Áo choàng, Khiên, and Vũ khí. At the bottom, use three square outfit sigils and one `.command-bar` action; do not use a vertical web list.

- [ ] **Step 5: Build the character sheet**

Inside `data-view="character"`, use `game-view character-sheet`. Put the hero portrait and name block on the left; place Sức mạnh, Phòng thủ, Máu tối đa, and Từ đã thuộc in a 2×2 rune-stat grid on the right. End with a full-width rune progress meter labeled `Tiến độ học từ 96 / 150`.

- [ ] **Step 6: Add keyboard and review controls**

Reuse one `showView(viewId)` function for both clicks and keyboard input:

```js
const viewOrder = ['login', 'outfit', 'health', 'character'];

function showView(viewId) {
  tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === viewId)));
  views.forEach((view) => { view.hidden = view.dataset.view !== viewId; });
}

tabs.forEach((button) => button.addEventListener('click', () => showView(button.dataset.tab)));

window.addEventListener('keydown', (event) => {
  const numberKeys = ['1', '2', '3', '4'];
  const index = numberKeys.indexOf(event.key);
  if (index >= 0) showView(viewOrder[index]);
  if (event.key === 'm' || event.key === 'M') {
    const next = stage.dataset.device === 'desktop' ? 'mobile' : 'desktop';
    setDevice(next);
  }
});
```

- [ ] **Step 7: Run the contract and verify GREEN**

Run:

```powershell
node --test prototypes/gothic-ui-demo/demo.test.mjs
```

Expected: 8 tests pass, 0 fail.

- [ ] **Step 8: Commit the redesigned demo**

```powershell
git add -- prototypes/gothic-ui-demo/index.html
git commit -m "feat: redesign HeroX demo as game UI"
```

### Task 3: Visual and regression verification

**Files:**
- Verify: `prototypes/gothic-ui-demo/index.html`
- Test: `prototypes/gothic-ui-demo/demo.test.mjs`

- [ ] **Step 1: Render every state at 1280×800 and mobile landscape**

Use Playwright to open the local file, click each `data-tab`, and verify the visible `.game-view` has no horizontal or vertical overflow. Switch to `data-mode="mobile"` and repeat.

- [ ] **Step 2: Capture the armory and HUD states**

Write screenshots only to the system temporary directory. Inspect that the hero sprite is crisp, equipment slots surround the hero, the HUD is attached to the scene, and no dashboard card appears inside `.game-screen`.

- [ ] **Step 3: Run all verification commands**

```powershell
node --test prototypes/gothic-ui-demo/demo.test.mjs
npm test
git diff --check HEAD~2..HEAD
```

Expected: 8 demo tests pass, all Vitest files pass, and `git diff --check` exits 0.

- [ ] **Step 4: Open the local file for user review**

```powershell
Start-Process (Resolve-Path 'prototypes/gothic-ui-demo/index.html')
```

Do not modify `client/` until the user approves this second demo.
