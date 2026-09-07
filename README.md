<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/2d5c9dda-044b-49e2-5255-4a0be1085d00/public">
  <source media="(prefers-color-scheme: light)" srcset="https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/064ebb1f-5153-4581-badd-42b42272fc00/public">
  <img alt="Srcbook banner" src="https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/064ebb1f-5153-4581-badd-42b42272fc00/public">
</picture>

<p align="center">
  <a href="https://badge.fury.io/js/srcbook"><img src="https://badge.fury.io/js/srcbook.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="Apache 2.0 license" /></a>
</p>

<p align="center">
  <a href="https://hub.srcbook.com">Examples</a> ·
  <a href="https://discord.gg/shDEGBSe2d">Discord</a> ·
  <a href="https://www.youtube.com/@srcbook">Youtube</a> ·
  <a href="https://hub.srcbook.com">Hub</a> 
</p>

## Maintainers Note

Srcbook is not under active development.

## Srcbook

Srcbook is a TypeScript notebook that runs locally on your machine.

Srcbook is open-source (apache2) and runs locally on your machine. You'll need to bring your own API key for AI usage (we strongly recommend Anthropic with `claude-3-5-sonnet-latest`).

## Features

- Create, run, and share TypeScript notebooks
- Export to valid markdown format (.src.md)
- AI features for exploring and iterating on ideas
- Diagraming with [mermaid](https://mermaid.js.org) for rich annotations
- Local execution with a web interface
- Powered by Node.js

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/2a4fa0f6-ef1b-4606-c9fa-b31d61b7c300/public">
  <source media="(prefers-color-scheme: light)" srcset="https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/ebfa2bfe-f805-4398-a348-0f48d4f93400/public">
  <img alt="Example Srcbook" src="https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/ebfa2bfe-f805-4398-a348-0f48d4f93400/public">
</picture>

## FAQ

See [FAQ](https://github.com/srcbookdev/srcbook/blob/main/FAQ.md).

## Getting Started

Srcbook runs locally on your machine as a CLI application with a web interface.

### Requirements

- Node 18+, we recommend using [nvm](https://github.com/nvm-sh/nvm) to manage local node versions
- [corepack](https://nodejs.org/api/corepack.html) to manage package manager versions

### Installing

We recommend using npx to always run the latest version from npm

```bash
# Using npm
npx srcbook@latest start

# Using your pm equivalent
pnpm dlx srcbook@latest start
```

> You can instead use a global install with `<pkg manager> i -g srcbook`
> and then directly call srcbook with `srcbook start`

### Using Docker

You can also run Srcbook using Docker:

```bash
# Build the Docker image
docker build -t srcbook .

# Run the container
# The -p flag maps port 2150 from the container to your host machine
# First -v flag mounts your local .srcbook directory to persist data
# Second -v flag shares your npm cache for better performance
docker run -p 2150:2150 -v ~/.srcbook:/root/.srcbook -v ~/.npm:/root/.npm srcbook
```

Make sure to set up your API key after starting the container. You can do this through the web interface at `http://localhost:2150`.

### Current Commands

```bash
$ srcbook -h
Usage: srcbook [options] [command]

Srcbook is a interactive programming environment for TypeScript

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  start [options]               Start the Srcbook server
  import [options] <specifier>  Import a notebook
  help [command]                display help for command
```

### Uninstalling

You can remove srcbook by first removing the package, and then cleaning it's local directory on disk:

```bash
rm -rf ~/.srcbook

# if you configured a global install
npm uninstall -g srcbook
```

> if you used another pm you will need to use it's specific uninstall command

## Analytics and tracking

In order to improve Srcbook, we collect some behavioral analytics. We don't collect any Personal Identifiable Information (PII), our goals are simply to improve the application. The code is open source so you don't have to trust us, you can verify! You can find more information in our [privacy policy](https://github.com/srcbookdev/srcbook/blob/main/PRIVACY-POLICY.md).

If you want to disable tracking, you can run Srcbook with `SRCBOOK_DISABLE_ANALYTICS=true` set in the environment.

## Contributing

For development instructions, see [CONTRIBUTING.md](https://github.com/srcbookdev/srcbook/blob/main/CONTRIBUTING.md).


## 🌐 Web Resources & Interactive Index
- [CATEGORY ADVENTURE 3](https://learnaction.netlify.app/category-adventure-3.html)
- [GROW A GARDEN FOR BRAINROTS](https://learnaction.netlify.app/grow-a-garden-for-brainrots.html)
- [BILLYTHEBOX](https://learnaction.github.io/billythebox.html)
- [SITEMAP](https://studyquests.github.io/sitemap.html)
- [TERMS](https://cryptotify.pages.dev/terms.html)
- [SITEMAP](https://cryptotify.netlify.app/sitemap.html)
- [PRIVACY](https://cryptotify.pages.dev/privacy.html)
- [TERMS](https://cryptotify.web.app/terms.html)
- [SITEMAP](https://brainquests.github.io/sitemap.html)
- [ONLINE PORTAL](https://brainquests-fb2c5.web.app/)
- [PRIVACY](https://cryptotify.web.app/privacy.html)
- [CATEGORY AGILITY](https://learnaction.netlify.app/category-agility.html)
- [PRIVACY](https://brainquests.onrender.com/privacy.html)
- [CATEGORY CASUAL 9](https://learnaction.netlify.app/category-casual-9.html)
- [SITEMAP](https://brainquests.pages.dev/sitemap.html)
- [CATEGORY BASKETBALL](https://learnaction.netlify.app/category-basketball.html)
- [CATEGORY BUBBLE SHOOTER](https://learnaction.netlify.app/category-bubble-shooter.html)
- [ONE SHOT TOWER PHYSICS DESTROYER](https://learnaction.netlify.app/one-shot-tower-physics-destroyer.html)
- [HOLE EAT GROW ATTACK](https://learnaction.netlify.app/hole-eat-grow-attack.html)
- [CATEGORY IO](https://learnaction.netlify.app/category-io.html)
- [INDEX21](https://learnaction.netlify.app/index21.html)
- [ONLINE PORTAL](https://cryptotify.web.app/)
- [CATEGORY AGILITY 2](https://learnaction.netlify.app/category-agility-2.html)
- [CATEGORY CASUAL 4](https://learnaction.netlify.app/category-casual-4.html)
- [PARKING DRIVER](https://learnaction.netlify.app/parking-driver.html)
- [ONLINE PORTAL](https://brainquests.github.io/)
- [CATEGORY TOWER DEFENSE118](https://welearnaction.onrender.com/category-tower-defense118.html)
- [BACKROOMS](https://learnaction.netlify.app/backrooms.html)
- [CATEGORY BATTLESHIP19](https://learnaction.netlify.app/category-battleship19.html)
- [CATEGORY CAR 2](https://learnaction.netlify.app/category-car-2.html)
- [CATEGORY ESCAPE 2](https://welearnaction.onrender.com/category-escape-2.html)
- [CATEGORY ARENA255](https://welearnaction.onrender.com/category-arena255.html)
- [INDEX17](https://learnaction.netlify.app/index17.html)
- [SITEMAP](https://cryptotify.pages.dev/sitemap.html)
- [SITEMAP](https://brainquests-fb2c5.web.app/sitemap.html)
- [ONLINE PORTAL](https://cryptotify.netlify.app/)
- [SPRUNKI PHASE BRAINROT](https://learnaction.netlify.app/sprunki-phase-brainrot.html)
- [CATEGORY MEME BLOXY24](https://learnaction.netlify.app/category-meme-bloxy24.html)
- [MINEBLOCK OBBY](https://learnaction.netlify.app/mineblock-obby.html)
- [CATEGORY FLASH](https://learnaction.netlify.app/category-flash.html)
- [BATTLE ZONE 2D](https://learnaction.netlify.app/battle-zone-2d.html)
- [XYTRIAN RUNNER](https://learnaction.netlify.app/xytrian-runner.html)
- [INDEX18](https://learnaction.netlify.app/index18.html)
- [CATEGORY BLOCK94](https://welearnaction.onrender.com/category-block94.html)
- [TIC TAC TOE MATCH THREE](https://learnaction.netlify.app/tic-tac-toe-match-three.html)
- [BRAINROT HOLE](https://learnaction.netlify.app/brainrot-hole.html)
- [ONLINE PORTAL](https://quizverses.github.io/)
- [CATEGORY ARENA254](https://welearnaction.onrender.com/category-arena254.html)
- [WILD TANKS](https://learnaction.netlify.app/wild-tanks.html)
- [INDEX16](https://learnaction.netlify.app/index16.html)
- [MERGE BALLS SHOOTER 2048 CONNECT FRUITS](https://learnaction.netlify.app/merge-balls-shooter-2048-connect-fruits.html)
- [MOJICON SPRING CONNECT](https://learnaction.netlify.app/mojicon-spring-connect.html)
- [FIGHT TO THE END](https://learnaction.netlify.app/fight-to-the-end.html)
- [CARD SOLITAIRE WORD GAME](https://learnaction.netlify.app/card-solitaire-word-game.html)
- [BUBBLE MATCH MERGE](https://welearnaction.onrender.com/bubble-match-merge.html)
- [CATEGORY BATTLE CATEGORY](https://welearnaction.onrender.com/category-battle-category.html)
- [CATEGORY RACING127](https://learnaction.netlify.app/category-racing127.html)
- [INDEX11](https://learnaction.github.io/index11.html)
- [CATEGORY BASKETBALL 2](https://welearnaction.onrender.com/category-basketball-2.html)
- [CATEGORY MAHJONG 2](https://learnaction.netlify.app/category-mahjong-2.html)
- [COFFEE CRAZE SORTING GAME](https://welearnaction.onrender.com/coffee-craze-sorting-game.html)
- [BRAINROT CLICKER](https://learnaction.netlify.app/brainrot-clicker.html)
- [BATTLE SHOT ELITE](https://welearnaction.onrender.com/battle-shot-elite.html)
- [INDEX3](https://welearnaction.onrender.com/index3.html)
- [COMBINATIONS DAILY](https://welearnaction.onrender.com/combinations-daily.html)
- [MONSTER HIGH SPOOKY FASHION](https://welearnaction.onrender.com/monster-high-spooky-fashion.html)
- [SQUARE WORLD 3D](https://welearnaction.onrender.com/square-world-3d.html)
- [FAT CAT LIFE](https://learnaction.netlify.app/fat-cat-life.html)
- [STICKMAN ADVENTURE](https://welearnaction.onrender.com/stickman-adventure.html)
- [CATEGORY MAHJONG CONNECT](https://learnaction.netlify.app/category-mahjong-connect.html)
- [CONTACT](https://welearnaction.onrender.com/contact.html)
- [STICKMAN DUO ESCAPE THE TOMB](https://welearnaction.onrender.com/stickman-duo-escape-the-tomb.html)
- [CATEGORY MISSION207](https://welearnaction.onrender.com/category-mission207.html)
- [CATEGORY MAGIC46](https://learnaction.github.io/category-magic46.html)
- [AMMO RUSH MASTER](https://welearnaction.onrender.com/ammo-rush-master.html)
- [PARKING FURY 3D NIGHT CITY](https://welearnaction.onrender.com/parking-fury-3d-night-city.html)
- [MATH LAVA TOWER RACE](https://welearnaction.onrender.com/math-lava-tower-race.html)
- [CATEGORY TRAFFIC34](https://welearnaction.onrender.com/category-traffic34.html)
- [STYLE ICONS 2024 REWIND EDITION](https://learnaction.netlify.app/style-icons-2024-rewind-edition.html)
- [CATEGORY PUZZLE 4](https://welearnaction.onrender.com/category-puzzle-4.html)
- [FASHION WEEK 2025](https://welearnaction.onrender.com/fashion-week-2025.html)
- [CATEGORY CAN T STOP PLAYING212](https://learnaction.github.io/category-can-t-stop-playing212.html)
- [MINI GAMES RELAX COLLECTION 2](https://welearnaction.onrender.com/mini-games-relax-collection-2.html)
- [CAKE MERGE 2](https://welearnaction.onrender.com/cake-merge-2.html)
- [MAHJONG TILE CLUB](https://welearnaction.onrender.com/mahjong-tile-club.html)
- [CRAFTY TOWN MERGE CITY](https://welearnaction.onrender.com/crafty-town-merge-city.html)
- [CHRISTMAS SORTING](https://welearnaction.onrender.com/christmas-sorting.html)
- [SINGLE LINE PUZZLE DRAWING](https://welearnaction.onrender.com/single-line-puzzle-drawing.html)
- [ULTIMATE FLYING CAR 2](https://welearnaction.onrender.com/ultimate-flying-car-2.html)
- [CHOCO BLOCKS](https://welearnaction.onrender.com/choco-blocks.html)
- [BBQ SORT PUZZLE](https://welearnaction.onrender.com/bbq-sort-puzzle.html)
- [PIXEL PATH](https://welearnaction.onrender.com/pixel-path.html)
- [CATEGORY CONTROLLER](https://learnaction.github.io/category-controller.html)
- [GUNS VS MAGIC](https://welearnaction.onrender.com/guns-vs-magic.html)
- [DOG MERGE MANIA](https://welearnaction.onrender.com/dog-merge-mania.html)
- [HAZEL TANGLE ROPE 3D SORTING PUZZLE](https://welearnaction.onrender.com/hazel-tangle-rope-3d-sorting-puzzle.html)
- [CATEGORY LOVE12](https://learnaction.netlify.app/category-love12.html)
- [SOLITAIRE EMPEROR SECRETS OF FATE](https://welearnaction.onrender.com/solitaire-emperor-secrets-of-fate.html)
- [VEGA MIX SEA ADVENTURES](https://learnaction.netlify.app/vega-mix-sea-adventures.html)
- [FIND RESTORE HIDDEN PUZZLE](https://welearnaction.onrender.com/find-restore-hidden-puzzle.html)
- [CATEGORY CAT](https://learnaction.netlify.app/category-cat.html)
- [CATEGORY LOL41](https://welearnaction.onrender.com/category-lol41.html)
- [IDLE FACTORY EMPIRE](https://learnaction.netlify.app/idle-factory-empire.html)
- [CATEGORY CONTROLLER59](https://learnaction.github.io/category-controller59.html)
- [UFO ATTACK](https://welearnaction.onrender.com/ufo-attack.html)
- [DRAW AND ESCAPE](https://welearnaction.onrender.com/draw-and-escape.html)
- [CHESSFIELD](https://welearnaction.onrender.com/chessfield.html)
- [BOLT CLIMB TAP TO THE TOP](https://welearnaction.onrender.com/bolt-climb-tap-to-the-top.html)
- [HELICOPTER BATTLE STEVE 2 PLAYER](https://welearnaction.onrender.com/helicopter-battle-steve-2-player.html)
- [PET SALON](https://welearnaction.onrender.com/pet-salon.html)
- [EPIC RACING DESCENT ON CARS](https://welearnaction.onrender.com/epic-racing-descent-on-cars.html)
- [PRIVACY](https://esskillcrafts.pages.dev/privacy.html)
- [ASCENT](https://welearnaction.onrender.com/ascent.html)
- [TERMS](https://cryptotify9.onrender.com/terms.html)
- [CATEGORY BUSINESS135](https://learnaction.github.io/category-business135.html)
- [PRIVACY](https://brainquests.pages.dev/privacy.html)
- [CATEGORY MANAGEMENT](https://learnaction.netlify.app/category-management.html)
- [CATEGORY COOKING](https://learnaction.github.io/category-cooking.html)
- [CATEGORY IO](https://learnaction.github.io/category-io.html)
- [CUTE ANIMAL WORLD](https://learnaction.netlify.app/cute-animal-world.html)
- [TERMS](https://ilearnworldkr.pages.dev/terms.html)
- [CATEGORY MINECRAFT 2](https://learnaction.netlify.app/category-minecraft-2.html)
- [TERMS](https://studyquests.pages.dev/terms.html)
- [HELIX CRUSH](https://welearnaction.onrender.com/helix-crush.html)
- [INDEX11](https://learnaction.netlify.app/index11.html)
- [GT FORMULA CHAMPIONSHIP](https://welearnaction.onrender.com/gt-formula-championship.html)
- [CARJAMCOLOR](https://welearnaction.onrender.com/carjamcolor.html)
- [CATEGORY GUN241](https://welearnaction.onrender.com/category-gun241.html)
- [TILE FRUITS](https://learnaction.netlify.app/tile-fruits.html)
- [SITEMAP](https://quizverses.github.io/sitemap.html)
