import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, '../public/assets/tiles');
const OBJ_DIR = path.join(__dirname, '../public/assets/objects');
const OUT_DIR = path.join(__dirname, '../public/assets/single');

async function extractTile(source, name, x, y, w, h, isObject = false) {
    const img = await Jimp.read(path.join(isObject ? OBJ_DIR : RAW_DIR, source));
    img.crop({ x, y, w, h });
    const outPath = path.join(OUT_DIR, `${name}.png`);
    await img.write(outPath);
    console.log(`Extracted ${name}.png`);
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Grass base (32x32)
  await extractTile('grass.png', 'grass_single', 0, 0, 32, 32);
  
  // Dirt floor (32x32)
  await extractTile('grass.png', 'dirt_single', 32, 160, 32, 32); // Usually dirt is around here in LPC terrain
  
  // Town floor (32x32)
  await extractTile('town_floor.png', 'town_single', 0, 0, 32, 32);

  // Wall front (32x96)
  await extractTile('wall.png', 'wall_single', 32, 96, 32, 96); // Middle of a wall

  // Small House (96x96)
  await extractTile('house.png', 'house_single', 0, 0, 96, 128); // Try to grab whole house

  // Tree (96x128)
  await extractTile('tree.png', 'tree_single', 0, 0, 96, 128, true);
  
  // Bush (32x32)
  await extractTile('bush.png', 'bush_single', 0, 32, 32, 32, true);

  // Rock (32x32)
  await extractTile('rocks.png', 'rock_single', 32, 0, 32, 32, true);

  console.log('Done extracting single tiles!');
}

run().catch(console.error);
