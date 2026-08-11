# Assets Documentação

## 1. Liberated Pixel Cup (LPC) Base Assets
* **Autor:** Diversos (Lanea Zimmerman, Stephen Challener, Charles Gabriel, etc.)
* **Fonte:** [LPC GitHub (ElizaWy/LPC)](https://github.com/ElizaWy/LPC)
* **Licença:** CC-BY-SA 3.0 / GPL 3.0
* **Arquivos Usados:**
  - `grass.png` (terrain_summer.png)
  - `town_floor.png` (Tile A.png)
  - `wall.png` (Jagged Stone Walls.png)
  - `roof.png` (Gable Shingle Roof A.png)
  - `house.png` (Brick House A.png)
  - `tree.png` (trees_summer.png)
  - `bush.png` (plants_summer.png)
  - `rocks.png` (Rocks, Grasslands.png)
* **Alterações Realizadas:** Renomeados para se ajustarem à arquitetura da engine e agrupados na pasta `public/assets/`.
* **Atribuição Exigida:** Sim, conforme CC-BY-SA 3.0.

## 2. Personagens (Player e NPC)
* **Autor:** LPC Community
* **Fonte:** [LPC GitHub (ElizaWy/LPC)](https://github.com/ElizaWy/LPC)
* **Licença:** CC-BY-SA 3.0
* **Arquivos Usados na Geração (`scripts/generate-assets.js`):**
  - **Player:** `masculine_thin.png` (Body), `short_natural.png` (Hair), `tshirt.png` (Shirt), `pants.png` (Pants).
  - **NPC:** `masculine_thin.png` (Body), `bob.png` (Hair), `longsleeve.png` (Shirt), `overalls.png` (Pants).
* **Alterações Realizadas:** Camadas mescladas programmaticamente usando o script `generate-assets.js` com a biblioteca Jimp para criar o spritesheet completo e legível.

## 3. Placeholder Titã (Normal e Excêntrico)
* **Autor:** LPC Community
* **Fonte:** [LPC GitHub (ElizaWy/LPC)](https://github.com/ElizaWy/LPC)
* **Licença:** CC-BY-SA 3.0
* **Arquivos Usados:** `titan_base.png` (Body Masculine Thin)
* **Alterações Realizadas:** Como não inserimos assets customizados de gigantes, usamos o corpo nu LPC e os escalonamos via Phaser. O **Titã Normal** foi alargado (`scale 3.5, 3.5`) com tom levemente modificado (`0xffe0d0`). O **Titã Excêntrico** foi configurado mais alto e esguio (`scale 2.5, 3.5`), com tom avermelhado (`0xff6666`), e angulação (`setAngle(15)`) para transmitir velocidade e postura bestial.
* **Atribuição Exigida:** Sim.
