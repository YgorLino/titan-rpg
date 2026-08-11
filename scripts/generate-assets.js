import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, '../assets_raw');
const OUT_DIR = path.join(__dirname, '../public/assets/characters');

async function compositeCharacter(name, layers) {
  if (layers.length === 0) return;
  
  console.log(`Generating ${name}...`);
  // Load all layer images
  const images = await Promise.all(layers.map(l => Jimp.read(path.join(RAW_DIR, l))));
  
  // Create a new blank image based on the first layer's dimensions
  const base = images[0];
  const out = new Jimp({ width: base.bitmap.width, height: base.bitmap.height });
  
  // Composite each layer
  for (const img of images) {
    out.composite(img, 0, 0);
  }
  
  const outPath = path.join(OUT_DIR, `${name}.png`);
  await out.write(outPath);
  console.log(`Saved ${outPath}`);
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Generate Player
  await compositeCharacter('player', [
    'body/masculine_thin.png',
    'pants/pants.png',
    'shirt/tshirt.png',
    'hair/short_natural.png'
  ]);

  // Generate NPC
  await compositeCharacter('npc', [
    'body/masculine_thin.png',
    'pants/overalls.png',
    'shirt/longsleeve.png',
    'hair/bob.png'
  ]);

  // Generate Titan Base (just naked body, will scale and tint in-engine)
  await compositeCharacter('titan_base', [
    'body/masculine_thin.png'
  ]);

  console.log('Done!');
}

run().catch(console.error);
