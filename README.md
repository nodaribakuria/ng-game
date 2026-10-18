# ARK — The Last Engineer

2D Canvas survival game. Open this folder in VS Code and use Live Server on index.html. No install or build is needed to play. After source edits, run `node build.cjs` to refresh app.js.

## Controls

- WASD / arrows: move (physical keys also work with Georgian keyboard layout).
- Mouse: aim; left button: fire.
- R: reload. 1–4: equip unlocked weapons. H: heal.
- E: hold near a repair terminal; each complete repair costs 4 bolts.
- I: shop / inventory. M: full deck map. Esc: pause / return.
- Nearby bolts, coins, ammunition and weapons are collected automatically when no wall blocks them.

## Crimson deck and armory

Seven connected rooms inspired by the supplied spaceship reference: Command, Engineering, Armory, Crimson Core, Cargo, Medical and Archon Dock. Wide doors and alternate connecting corridors allow robots and the boss to travel between every room. The lower-left minimap marks actors and repair systems; M opens the whole deck. Machinery inside rooms is decorative. Physical walls stop movement and projectiles, including fast bullets and a gun barrel extending beyond a wall.

The red industrial shop is available from the main menu and during missions. Weapons, Ammo and Supplies tabs are functional. Select a weapon card to inspect its damage, magazine, reload time and permanent upgrade. Maximum level: 5. Each upgrade adds 30% base damage.

Coins, unlocked weapons and upgrade levels survive death, restart and page reload. They are saved in this browser's localStorage (`ark-career-v1`). Use the same browser and address/port to keep the same save; file:// and Live Server have separate storage. Purchased menu ammunition and medkits are packed into the next mission once. Mission health, repair progress and waves restart each run. If browser storage is unavailable, the shop shows a warning.

Survive 5 waves, repair three systems, then defeat Archon. The boss has three phases, aimed bursts, a telegraphed charge, close-range shock slam and reinforcements. Victory awards 250 saved coins.

## Source

- game.js: menus, controls, frame loop
- combat.js: held guns, ammunition, reload, automatic pickups
- world.js: shared wall geometry, swept projectile collision, navigation
- boss.js: boss phases and attacks
- career.js: saved wallet, purchases and shop UI
- simulation.js: mission update
- scene.js / weapon-art.js: articulated models and weapons
- ship-art.js: spaceship, room machinery and map rendering
- style.css / index.html: page and shop layout
- app.js: generated browser bundle; keep assets/ beside it

## Verification

Run `node smoke-test.cjs`, `node combat-test.cjs`, `node runtime-test.cjs` and `node world-career-test.cjs`. The final test covers 84 room routes, wall/door projectiles, persistent purchases and boss progression. Browser-test.cjs additionally uses Playwright and installed Microsoft Edge for local HTTP visual checks.

## Melee weapons and ranged robots

Shop → MELEE: Energy Saber (95 coins, 48 damage, 0.42 s swing) and Shock Hammer (160 coins, 95 damage, 0.95 s swing). Equip with 5 / 6; aim with the mouse and hold left click to swing. No ammunition or reload needed. Hits require range, facing and unobstructed sight. Both weapons support permanent upgrades; existing saves migrate automatically.

From wave 2, cyan-marked ranged robots keep their distance and telegraph aimed shots with a targeting line. Their projectiles stop at walls. Run `node melee-ranged-test.cjs` for the new mechanics.

## Chapter II — Planet survival

Defeating Archon now awards the existing 250 coins and starts a seven-second emergency landing scene. On the planet, hold E near deposits to gather 5 Alloy, 3 Crystals, 2 Gears and 4 Chips. Their procedural models follow the supplied material reference. The resource counter shows current amounts and requirements. M opens the planet overview. Robots and ranged sentries arrive periodically; rock formations block movement and shots.

Return to the console below the landed ship and hold E for five seconds once all materials are collected. The repair consumes materials once, awards 150 coins, and launches the return-home animation. Victory now occurs after that flight. Weapons and money carry into Chapter II. Landing replenishes health, provides some reserve ammunition and an emergency Energy Saber if needed. Mission progress is not saved on page reload; permanent wallet and weapon upgrades still are.

Run `node planet-test.cjs` for chapter transitions, harvesting, repair costs, rewards and restart coverage.

## Training with Mari

Choose Training with Mari from the start menu. Mari is a procedural 2D instructor inspired by the supplied reference (brown hair, black top, red trousers). The safe practice deck teaches movement, aiming/firing at a stationary robot, reloading, automatic bolt collection and holding E to repair a terminal. Training supplies are separate from saved career purchases, with replenishing practice ammunition. Finish to launch the mission, repeat practice or return to the menu. Esc pauses; Restart repeats training. Run `node training-test.cjs` to verify lesson progression and career isolation.

## Red Nexus main menu

Reference-inspired orbital background with live HTML controls: Start Game, Continue, Training with Mari, Armory, Settings and Exit. Continue resumes a paused mission in the current browser session; it is disabled when no resumable mission exists. Select Engineer opens crew selection. The wallet shows saved coins. Exit explains how to close the browser tab without discarding saved upgrades. The backdrop is a generated asset in assets/nexus-background.png.

## Full reference armory

The shop now includes all 12 reference weapon types: Plasma Rifle, Railgun, Energy Shotgun, Laser SMG, Rocket Launcher, Minigun, Sniper Rifle, Tactical Pistol, Energy Sword, Plasma Axe, Hammer and Pulse Turret. Existing six weapon slots retain their saved unlocks and levels under the updated names. Filter by weapon type, inspect stats and buy permanent upgrades. Prices remain balanced for this game's coin economy.

Use Q / T to cycle all owned weapons (1–6 still select the first six slots), or Equip from the shop. Rockets deal splash damage with wall occlusion. Pulse Turret deploys a 12-second automatic sentry, up to two at once, using rechargeable magazine charges and purchasable reserves. Turrets require clear sight and their shots collide with walls. Run node arsenal-test.cjs for all 12 weapons and new combat mechanics.

## Saved Chapter II access and Survival

Defeating Archon automatically saves Chapter II access in this browser (`ark-chapters-v1`). After closing and reopening the page, use CHAPTER II / SAVED to start directly on the planet with your current purchased equipment. This is a chapter-start checkpoint: it does not restore partial planet gathering or mid-combat positions. Coins and permanent upgrades remain in the career save. Storage failures display a warning.

SURVIVAL / ROUNDS opens The Crucible, a separate arena with solid cover and four enemy gates. Rounds continue indefinitely. Health and damage increase each round, speed increases up to a playable cap, ranged attackers appear from round 2, and wave size grows to 40 with at most 18 simultaneous enemies. Clearing a round grants coins, 15 health and reserve ammunition, followed by a seven-second shop break. Best cleared round is saved. Survival has no ship hull drain or campaign boss transition. Restart stays in the current mode; campaign restart restores ship geometry.

Run `node modes-test.cjs` for chapter access, round scaling, rewards and restart checks.

## Support robots and expanded survival (October 17)

Pulse Turret purchases now grant ONE consumable robot per click. Undeployed stock is saved separately from the weapon unlock and upgrades. Existing turret owners receive one unit when migrating an older save. There are no free robots on mission restart; up to four may be deployed, each with 240 HP and 60 starting rounds (120 capacity). Enemies select the nearest player/support target, including boss attacks, and enemy projectiles can hit supports. Destroyed robots are lost. There is no time limit.

Near a support, hold F to spend one bolt per 50 HP repair, or G to transfer up to 30 rounds per service action from the Pulse Turret ammunition reserve. Buy reserve ammunition in the Ammo tab. R does not reload deployment units. Undeployed units persist; deployed units belong to the current run.

The Crucible is now 4500 by 2700 with 14 cover structures. A scaling Archon boss arrives every fifth round with escorts. Preparation lasts 25 seconds before boss rounds, versus 7 seconds normally. Boss kills reward coins but do not enter the campaign landing sequence. Run support-test.cjs for stock, maintenance, enemy targeting, arena routes and boss-round verification.

## Blender forest outpost

Survival uses a Blender-rendered 4500×2700 top-down forest settlement: six roofed buildings, eight fenced pine groves, paths, meadow grass, stone perimeter and arrival pads. Building/grove footprints match the original cover collision rectangles, preserving robot and boss routes. Decorative grass and distant trees are outside the blocking areas. The editable scene is blender/survival-forest.blend; regenerate it with Blender in background mode using blender/forest_scene.py. The game loads assets/survival-forest.png with a simple fallback while loading.

PHONE PLAY
Run PLAY-ON-PHONE.cmd on the computer (Node.js required). Keep its window open.
Connect your phone to the same Wi-Fi, then open the http://address:5500 URL printed in that window in Safari or Chrome. If Windows asks, allow Node only on your private/home network. Do not enable router port forwarding.
Landscape orientation is recommended. Left joystick moves; right joystick aims and fires. Buttons reload, cycle weapons, heal, interact, repair and refill support robots.
Coins and saves remain separate in each browser/device. This is local Wi-Fi play, not a published internet version. Closing the server stops phone access.
