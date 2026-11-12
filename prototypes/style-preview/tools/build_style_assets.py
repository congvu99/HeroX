"""Dựng asset cho bản xem phong cách HeroX từ nguồn bên thứ ba đã tải sẵn.

Cách chạy (Python có Pillow):
    python build_style_assets.py <thư mục nguồn> <thư mục public/assets>

Thư mục nguồn phải chứa:
    lpc/      bản sparse checkout của Universal-LPC-Spritesheet-Character-Generator
    dcss/     bộ "crawl-tiles Oct-5-2010" (CC0) đã giải nén
    pixelfx/  repo patch-gg/pixelfx đã chạy `node tools/render.mjs <id> --sheet`

Mọi ảnh đầu ra là file phái sinh; nguồn và license ghi ở CREDITS.txt cạnh index.html.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

LPC_CELL = 64
HERO_CELL = 192  # vệt chém của longsword LPC vẽ trong ô 192, mọi hoạt ảnh hero dùng chung ô này để không lệch tâm
FX_MAX_SHEET = 2048  # trần an toàn cho texture WebGL trên iPhone
DCSS_SCALE = 1  # tile DCSS 32px khớp lưới 32px; màn trận phóng cả cảnh bằng zoom camera nên không phóng ảnh

# Thứ tự vẽ theo zPos trong sheet_definitions của LPC (số nhỏ vẽ trước).
HERO_LAYERS = [
    ("shield_bg", 2),
    ("cape_bg", 5),
    ("sword_behind", 9),
    ("body", 10),
    ("legs", 20),
    ("feet", 25),
    ("torso", 60),
    ("arms", 65),
    ("shoulders", 70),
    ("cape_fg", 85),
    ("head", 100),
    ("shield_fg", 110),
    ("helmet", 130),
    ("visor", 132),
    ("sword", 140),
]
HERO_ANIMS = ["walk", "slash", "spellcast", "hurt", "idle"]
SWORD_DIRS = {"walk": "walk", "slash": "attack_slash", "hurt": "hurt"}  # thư mục của longsword theo hoạt ảnh
CAPE_COLOR = (122, 20, 28)  # đỏ thẫm Thánh Ngôn
SWORD_BEHIND = {"walk": "universal_behind/walk", "slash": "attack_slash/behind", "hurt": "universal_behind/hurt"}

DCSS_PICKS = {
    "monsters": {
        "imp": "dc-mon/demons/imp.png",
        "red_devil": "dc-mon/demons/red_devil.png",
        "hellion": "dc-mon/demons/hellion.png",
        "shadow_imp": "dc-mon/demons/shadow_imp.png",
        "fiend": "dc-mon/demons/fiend.png",
        "balrug": "dc-mon/demons/balrug.png",
        "cherub": "dc-mon/holy/cherub.png",
        "ophan": "dc-mon/holy/ophan.png",
        "monk": "dc-mon/holy/paladin.png",
    },
    "tiles": {
        "floor_cobble": "dc-dngn/floor/cobble_blood1.png",
        "floor_cobble2": "dc-dngn/floor/cobble_blood2.png",
        "floor_dirt": "dc-dngn/floor/grey_dirt0.png",
        "floor_dirt2": "dc-dngn/floor/grey_dirt3.png",
        "floor_hell": "dc-dngn/floor/floor_nerves0.png",
        "floor_hell2": "dc-dngn/floor/floor_nerves3.png",
        "lava": "dc-dngn/floor/lava0.png",
        "lava2": "dc-dngn/floor/lava1.png",
        "wall_dark": "dc-dngn/wall/brick_dark0.png",
        "wall_dark2": "dc-dngn/wall/brick_dark3.png",
        "wall_brown": "dc-dngn/wall/brick_brown0.png",
        "column": "dc-dngn/crumbled_column.png",
        "statue": "dc-dngn/dngn_granite_statue.png",
        "altar": "dc-dngn/altars/dngn_altar.png",
        "fountain_blood": "dc-dngn/dngn_blood_fountain.png",
        "door": "dc-dngn/dngn_closed_door.png",
    },
}

# id pixelfx → (khoá dùng trong game, bước bỏ khung để sheet nhỏ lại)
FX_PICKS = {
    "melee/sword-slash": ("slash", 1),
    "impacts/crit-hit": ("crit", 1),
    "impacts/hit-spark": ("spark", 1),
    "holy/smite": ("smite", 2),
    "holy/holy-pillar": ("pillar", 2),
    "holy/divine-shield": ("shield", 2),
    "holy/blessing": ("blessing", 2),
    "arcane/blink-out": ("blink_out", 1),
    "arcane/blink-in": ("blink_in", 1),
    "fire/torch": ("torch", 2),
    "fire/brazier": ("brazier", 2),
    "shadow/curse": ("curse", 2),
    "shadow/dark-explosion": ("dark_explosion", 3),
    "spawn/dissolve-burn": ("dissolve", 2),
    "fire/fireball": ("fireball", 1),
}


def hero_layer_path(lpc: Path, layer: str, anim: str) -> Path | None:
    sheets = lpc / "spritesheets"
    candidates = {
        "shield_bg": [sheets / f"shield/crusader/bg/{anim}/crusader.png", sheets / f"shield/crusader/bg/{anim}.png"],
        "cape_bg": [sheets / f"cape/solid/bg/{anim}.png"],
        "sword_behind": [sheets / f"weapon/sword/longsword/{SWORD_BEHIND.get(anim, '-')}/longsword.png"],
        "body": [sheets / f"body/bodies/male/{anim}.png"],
        "legs": [sheets / f"legs/armour/plate/male/{anim}.png"],
        "feet": [sheets / f"feet/armour/plate/male/{anim}.png"],
        "torso": [sheets / f"torso/armour/plate/male/{anim}.png"],
        "arms": [sheets / f"arms/armour/plate/male/{anim}.png"],
        "shoulders": [sheets / f"shoulders/pauldrons/male/{anim}.png"],
        "cape_fg": [sheets / f"cape/solid/fg/{anim}.png"],
        "head": [sheets / f"head/heads/human/male/{anim}.png"],
        "shield_fg": [sheets / f"shield/crusader/fg/male/{anim}/crusader.png"],
        "helmet": [sheets / f"hat/helmet/bascinet/adult/{anim}.png"],
        "visor": [sheets / f"hat/visor/pigface/adult/{anim}.png"],
        "sword": [sheets / f"weapon/sword/longsword/{SWORD_DIRS.get(anim, '-')}/longsword.png"],
    }[layer]
    return next((p for p in candidates if p.exists()), None)


def tint_by_luminance(img: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    """Giữ sáng tối của layer gốc, đổi sắc sang `color` (áo choàng xám → đỏ thẫm)."""
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            k = 0.35 + lum * 0.9
            pixels[x, y] = (min(255, int(color[0] * k)), min(255, int(color[1] * k)), min(255, int(color[2] * k)), a)
    return rgba


def recell(sheet: Image.Image, cell: int, cols: int, rows: int) -> Image.Image:
    """Đặt từng ô `cell` của sheet vào giữa ô HERO_CELL, chỉ lấy `cols` cột đầu."""
    out = Image.new("RGBA", (cols * HERO_CELL, rows * HERO_CELL))
    pad = (HERO_CELL - cell) // 2
    for row in range(rows):
        for col in range(cols):
            box = (col * cell, row * cell, (col + 1) * cell, (row + 1) * cell)
            out.paste(sheet.crop(box), (col * HERO_CELL + pad, row * HERO_CELL + pad))
    return out


def build_hero(lpc: Path, out_dir: Path) -> dict:
    meta = {}
    for anim in HERO_ANIMS:
        body = Image.open(lpc / f"spritesheets/body/bodies/male/{anim}.png")
        cols, rows = body.width // LPC_CELL, body.height // LPC_CELL
        frame = Image.new("RGBA", (cols * HERO_CELL, rows * HERO_CELL))
        for layer, _z in sorted(HERO_LAYERS, key=lambda item: item[1]):
            path = hero_layer_path(lpc, layer, anim)
            if path is None:
                continue
            sheet = Image.open(path).convert("RGBA")
            if layer.startswith("cape"):
                sheet = tint_by_luminance(sheet, CAPE_COLOR)
            cell = sheet.width // cols  # vũ khí có thể vẽ ở ô 64 hoặc 192
            sheet_rows = min(rows, sheet.height // cell)
            frame.alpha_composite(recell(sheet, cell, cols, sheet_rows))
        frame.save(out_dir / f"hero_{anim}.png")
        meta[anim] = {"cols": cols, "rows": rows}
    return meta


def build_lpc_monster(lpc: Path, out_dir: Path) -> dict:
    meta = {}
    for anim in ["walk", "slash", "hurt"]:
        sheet = Image.open(lpc / f"spritesheets/body/bodies/skeleton/{anim}.png").convert("RGBA")
        cols, rows = sheet.width // LPC_CELL, sheet.height // LPC_CELL
        recell(sheet, LPC_CELL, cols, rows).save(out_dir / f"skeleton_{anim}.png")
        meta[anim] = {"cols": cols, "rows": rows}
    return meta


def build_dcss(dcss: Path, out_dir: Path) -> None:
    for group, picks in DCSS_PICKS.items():
        target = out_dir / group
        target.mkdir(parents=True, exist_ok=True)
        for key, rel in picks.items():
            img = Image.open(dcss / rel).convert("RGBA")
            img.resize((img.width * DCSS_SCALE, img.height * DCSS_SCALE), Image.NEAREST).save(target / f"{key}.png")


def build_fx(pixelfx: Path, out_dir: Path) -> dict:
    manifest = {}
    target = out_dir / "fx"
    target.mkdir(parents=True, exist_ok=True)
    for fx_id, (key, step) in FX_PICKS.items():
        name = fx_id.split("/")[1]
        src_dir = pixelfx / "records" / fx_id
        meta = json.loads((src_dir / f"{name}.json").read_text(encoding="utf-8"))["meta"]["pixelfx"]
        sheet = Image.open(src_dir / f"{name}.png").convert("RGBA")
        fw, fh = meta["frameSize"]
        src_cols = meta["columns"]
        frames = [
            sheet.crop(((i % src_cols) * fw, (i // src_cols) * fh, (i % src_cols + 1) * fw, (i // src_cols + 1) * fh))
            for i in range(0, meta["frames"], step)
        ]
        cols = max(1, min(len(frames), FX_MAX_SHEET // fw))
        rows = -(-len(frames) // cols)
        if rows * fh > FX_MAX_SHEET:
            raise ValueError(f"{fx_id} vượt {FX_MAX_SHEET}px, tăng bước bỏ khung")
        packed = Image.new("RGBA", (cols * fw, rows * fh))
        for i, img in enumerate(frames):
            packed.paste(img, ((i % cols) * fw, (i // cols) * fh))
        packed.save(target / f"{key}.png")
        manifest[key] = {
            "frameWidth": fw,
            "frameHeight": fh,
            "frames": len(frames),
            "fps": round(meta["fps"] / step),
            "loop": meta["loop"],
            "pivot": meta["pivot"],
        }
    return manifest


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    source, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    sprites = out_dir / "sprites"
    sprites.mkdir(parents=True, exist_ok=True)
    manifest = {
        "heroCell": HERO_CELL,
        "hero": build_hero(source / "lpc", sprites),
        "skeleton": build_lpc_monster(source / "lpc", sprites),
        "fx": build_fx(source / "pixelfx", out_dir),
    }
    build_dcss(source / "dcss" / "crawl-tiles Oct-5-2010", out_dir)
    shutil.copy(source / "lpc" / "CREDITS.csv", out_dir / "lpc-credits.csv")
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in manifest.items() if k != "fx"}, indent=1))
    print("fx:", ", ".join(manifest["fx"]))


if __name__ == "__main__":
    main()
