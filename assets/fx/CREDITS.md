# Nguồn hiệu ứng (fx)

Mọi hiệu ứng trong `client/public/fx/` được render từ **pixelfx** bằng `node tools/render-fx.mjs` theo `fx-manifest.json`.

- Nguồn: https://github.com/patch-gg/pixelfx
- Commit: `044e12a45dc9cc312cec50ee606dfc98afe5adc2` (gói 0.3.1)
- License: MIT, Copyright (c) 2026 Patch, Copyright (c) 2026 Hugo Duprez. `NOTICE.md` của pixelfx ghi thêm phần phỏng theo Sprite Fusion (Hugo Duprez, MIT) và Hollow Crown (rehan-remade, MIT).
- Không dùng font Patch Pixel (không thuộc MIT). Sprite sheet chỉ chứa hiệu ứng, không chứa nhân vật mẫu (`--no-actor`); riêng `blink-out` và `blink-in` có bóng trắng hình người do effect tự vẽ.

| Tên trong HeroX | Effect pixelfx | License |
|---|---|---|
| attack-cast-1 | `melee/sword-slash` | MIT |
| attack-impact-1 | `impacts/hit-spark` | MIT |
| attack-cast-2 | `melee/heavy-cleave` | MIT |
| attack-impact-2 | `impacts/crit-hit` | MIT |
| guard-cast-1 | `impacts/shield-block` | MIT |
| guard-impact-1 | `impacts/blunt-hit` | MIT |
| guard-cast-2 | `holy/divine-shield` | MIT |
| guard-impact-2 | `impacts/parry` | MIT |
| empower-cast-1 | `arcane/spell-charge` | MIT |
| empower-impact-1 | `shadow/grasping-hands` | MIT |
| empower-cast-2 | `arcane/mana-burst` | MIT |
| empower-impact-2 | `shadow/hex-sigil` | MIT |
| dash-dust | `impacts/heavy-landing` | MIT |
| blink-out | `arcane/blink-out` | MIT |
| blink-in | `arcane/blink-in` | MIT |
| finisher | `holy/smite` | MIT |
| combo-up | `holy/blessing` | MIT |
| enemy-strike | `melee/claw-swipe` | MIT |
| enemy-spawn | `spawn/spawn-portal` | MIT |
| enemy-death | `spawn/poof` | MIT |
| level-up | `ui/level-up` | MIT |

## Âm thanh

Âm cast/hit/quái đánh được tổng hợp ngay trong trình duyệt bằng Web Audio (`client/src/audio/battle-sounds.ts`), không dùng file âm thanh của bên thứ ba.
