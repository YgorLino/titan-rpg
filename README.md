# Titan RPG — Beyond the Walls

Protótipo single-player de RPG 2D inspirado na exploração e progressão dos MMORPGs clássicos e em um mundo cercado por muralhas e Titãs.

## Rodar o jogo

Requisitos: Node.js 18 ou mais recente.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente `http://localhost:3000`).

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Controles

| Tecla | Ação |
| --- | --- |
| `WASD` ou setas | Mover |
| `Espaço` | Ataque básico |
| `1`, `2`, `3` | Habilidades da vocação |
| Clique no Titã | Selecionar alvo |
| `F` | Conversar e interagir |
| `R` | Reabastecer perto da estação ou de uma caixa |
| `H` | Abrir o manual e pausar |
| `Esc` | Voltar ao menu e salvar |

## Conteúdo da versão jogável

- Seleção cinematográfica com splash art exclusiva para cada uma das cinco vocações.
- Direção visual dark fantasy, novos Titãs ilustrados e transformação de assalto exclusiva do jogador.
- Ciclos originais de caminhada e corrida para Titãs normais, Excêntricos, Colossal e transformação do jogador.
- Terreno contínuo redesenhado e interface responsiva que permanece inteira em qualquer janela.
- Cinco vocações: Portador de Titã, Tropa de Exploração, Pastor das Muralhas, Atirador da Guarnição e Engenheiro de Campo.
- Combate pela nuca, equipamento ODM, Gás, durabilidade das Lâminas, armas à distância, cura e construções.
- Transformação em Titã com Fúria e conjunto próprio de habilidades.
- Distrito de Shiganshina, rota de expedição e Floresta das Árvores Gigantes.
- Titãs normais, Excêntricos e o chefe Titã Colossal.
- Missões encadeadas, níveis, patentes militares, moedas e salvamento automático no navegador.
- Penalidade de morte de 10% do XP atual e das moedas.

## Observação sobre o protótipo

O jogo é uma vertical slice: entrega o ciclo completo de escolher uma vocação, aceitar missões, explorar, lutar, progredir, enfrentar o chefe e voltar para receber a recompensa. Multiplayer, servidor persistente e conteúdo massivo ficam fora deste protótipo single-player.

## Assets

Os sprites e tiles LPC utilizados no projeto exigem atribuição. Consulte [ASSETS.md](./ASSETS.md) para autores, fontes e licenças.
