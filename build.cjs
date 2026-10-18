// One browser entry point prevents partial loading and mixed script versions.
const fs=require('fs');
const files=['game.js','combat.js','world.js','boss.js','melee-ranged.js','arsenal.js','career.js','simulation.js','scene.js','ship-art.js','weapon-art.js','planet.js','training.js','modes.js','mobile.js'];
const code=files.map(file=>`\n// --- ${file} ---\n${fs.readFileSync(file,'utf8')}`).join('\n');
fs.writeFileSync('app.js',`/* ARK 2026-10-11: run node build.cjs after editing the source files. */\n(()=>{\n'use strict';\n${code}\nbootGame();\n})();\n`);
console.log('Built app.js from '+files.join(', '));
