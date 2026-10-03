// tools/art/martial.mjs — illustrator "martial": Brute, Guardian and Warrior decks.
export const WHO = {
  rhinar:
    'a huge hulking savage brute of a man with a shaggy dark mane, heavy brow and bared tusk-like teeth, ' +
    'thick scarred bare arms and chest crossed with leather straps, a fur loincloth and spiked bone bracers, wild-eyed and snarling',
  'valda-brightaxe':
    'a stout broad-shouldered dwarven-built woman guardian with a thick auburn braid and a freckled determined face, ' +
    'in heavy brass-trimmed plate armour and a short fur-lined cape, gripping a massive double-bladed great axe, proud and unshakeable',
  olympia:
    'a tall athletic gladiator-champion woman with a long black ponytail and a fierce confident smile, ' +
    'in gleaming gold-and-crimson gladiator armour, wielding a short blade and a round shield, a champion of the arena',
  oldhim:
    'an ancient towering guardian of ice and earth, a giant with a long frost-white beard and a face like weathered granite, ' +
    'clad in rough stone-grey plate rimed with ice and moss, bearing an enormous slab-like tower shield, calm and immovable',
  terra:
    'a sturdy young woman guardian tied to earth and stone, with short brown hair, tanned skin and bright green eyes, ' +
    'in layered clay-brown armour with living vines and small crystals growing from the pauldrons, carrying a heavy stone-headed maul, steady and resolute'
};

const R = 'rhinar', V = 'valda-brightaxe', O = 'olympia', H = 'oldhim', T = 'terra', D = 'dorinthea', K = 'kayo';

export const CARDS = {
  // ---- tokens ----
  gold: {
    subject: 'an abstract emblem of wealth, a single large embossed gold coin spinning in the air with glittering sparks',
    setting: 'floating above a dark velvet vault glow with drifting golden dust'
  },
  quicken: {
    subject: 'an abstract emblem of sudden speed, a glowing violet lightning spiral wrapped around a winged hourglass shape',
    setting: 'in a night sky of streaking purple and white light trails'
  },

  // ---- heroes ----
  rhinar: {
    who: R,
    subject: 'roaring with both massive arms thrown wide, veins bulging, shockwaves rippling out around him',
    setting: 'on a bone-strewn ridge in a stormy savage wilderness at dusk'
  },
  'valda-brightaxe': {
    who: V,
    subject: 'planting her great axe in the ground and standing firm, golden light glinting along the blades',
    setting: 'on a rocky mountain pass with a vast stone fortress behind her'
  },
  olympia: {
    who: O,
    subject: 'raising her blade high in a champion salute, gold coins glittering in the air around her',
    setting: 'at the centre of a vast sunlit colosseum floor with distant cheering stands'
  },
  oldhim: {
    who: H,
    subject: 'facing the viewer with a stern gaze, standing like a mountain behind his huge shield, frost swirling and stones lifting around him',
    setting: 'on a snowbound cliff above a frozen valley under pale northern light'
  },
  terra: {
    who: T,
    subject: 'slamming her maul into the ground, a ring of stone spikes and flowering vines bursting outward',
    setting: 'in a mossy forest clearing ringed by ancient standing stones'
  },

  // ---- weapons ----
  'ball-breaker': {
    subject: 'a brutal spiked iron flail with a heavy studded ball on a thick chain, the weapon itself is the focus',
    setting: 'hanging from a hook on a wall of rough timber in a smoky tribal hall'
  },
  'ravenous-meataxe': {
    subject: 'a huge crude two-handed cleaver axe with a notched blood-dark blade and a bound bone haft, the weapon itself is the focus',
    setting: 'buried in a butcher block beside a campfire in the wilds'
  },
  'millers-grindstone': {
    subject: 'a heavy war hammer whose head is a round stone grinding wheel with chips flying off, the weapon itself is the focus',
    setting: 'leaning against a stone water mill beside a rushing stream'
  },
  'decimator-great-axe': {
    subject: 'an immense two-handed great axe with a crescent steel blade and a long ringed haft, glowing at the edge, the weapon itself is the focus',
    setting: 'planted in cracked stone before a ruined battle tower at sunset'
  },

  // ---- equipment: Brute ----
  'buzzard-helm': {
    subject: 'a rough iron helm shaped like a hunched vulture head with a hooked beak and black feathers, the helmet itself is the focus',
    setting: 'perched on a dead tree stump in a bleak scavenger wasteland'
  },
  'monstrous-veil': {
    subject: 'a ragged monstrous hood of stitched hide with ridged horns and a ghastly open maw, the headgear itself is the focus',
    setting: 'hanging from a gnarled branch in a foggy swamp at night'
  },
  'skera-strapping': {
    subject: 'a pair of crude arm wraps of braided leather and bone studs with a faint pale glow, the armour itself is the focus',
    setting: 'lying on a flat rock beside a smouldering fire pit'
  },

  // ---- equipment: Guardian ----
  'civic-steps': {
    subject: 'a pair of heavy stone-plated greaves with a glowing teal crest of speed on each shin, the greaves themselves are the focus',
    setting: 'standing on the worn stone steps of a grand city hall at sunrise'
  },
  'gauntlet-of-boulderhold': {
    subject: 'a massive stone-knuckled gauntlet shaped like a rounded boulder with iron bands, the gauntlet itself is the focus',
    setting: 'resting on a heap of broken rock at the foot of a mountain fortress'
  },
  'richter-scale': {
    subject: 'a thick slate breastplate cracked by glowing amber fault lines, tremors shaking loose dust, the armour itself is the focus',
    setting: 'on a stone plinth inside a rumbling underground hall'
  },
  'civic-peak': {
    subject: 'a heavy steel helm with a tall pointed crest like a mountain peak and a white glow in the visor, the helmet itself is the focus',
    setting: 'on a pedestal in a high alpine hall with sunbeams slanting in'
  },
  craterhoof: {
    subject: 'a pair of massive hoofed iron greaves that leave round craters in the ground, the greaves themselves are the focus',
    setting: 'stamped into a dusty plain with fresh craters and rising smoke'
  },
  'civic-duty': {
    subject: 'a stout bronze breastplate with a golden glowing heart-shaped boss, the armour itself is the focus',
    setting: 'on a wooden stand in a warm lantern-lit town armoury'
  },

  // ---- equipment: Warrior and generic ----
  'plating-of-unity': {
    subject: 'a polished silver chest plate with a fine glowing seam running down the middle where two halves join, the armour itself is the focus',
    setting: 'on a mannequin in a bright castle armoury with shafts of light in the windows'
  },
  'pillar-of-unity': {
    subject: 'a pair of sturdy armoured greaves shaped like twin stone pillars with a thin glowing line joining them, the greaves themselves are the focus',
    setting: 'standing in a sunlit castle courtyard between marble columns'
  },
  'prized-galea': {
    subject: 'an ornate golden gladiator helm with a high crimson crest and a polished cheek guard, the helmet itself is the focus',
    setting: 'on a velvet cushion in a champion trophy room full of gleaming spoils'
  },
  'blade-beckoner-boots': {
    subject: 'a pair of sleek steel boots with thin curved blades along the ankles, the boots themselves are the focus',
    setting: 'laid on a weapon table inside a lantern-lit armoury'
  },
  'nullrune-hood': {
    subject: 'a dark smooth cloth hood faintly shimmering with a pale violet ward, the hood itself is the focus',
    setting: 'draped over a stone bust in a quiet candle-lit mage study'
  },
  'arcane-lantern': {
    subject: 'a small ornate brass lantern holding a steady blue-white arcane flame, protective light spilling out, the lantern itself is the focus',
    setting: 'hanging from an iron hook in a dark stone corridor'
  },

  // ---- Rhinar and Brute attacks ----
  'aggressive-pounce': {
    who: R,
    subject: 'leaping through the air with clawed hands outstretched, mouth wide in a snarl, blurred motion behind him',
    setting: 'across a moonlit jungle clearing with torn leaves flying'
  },
  'barraging-beatdown': {
    who: R,
    subject: 'pounding his huge fists on his chest then swinging both fists down in a flurry of blows, trailing afterimages',
    setting: 'inside a cracked stone arena with dust and rubble in the air'
  },
  'vigorous-smashup': {
    who: R,
    subject: 'locked forehead to forehead with a rival in a clash of strength, golden energy bursting between them',
    setting: 'on a trampled dirt arena floor lit by flaring torches'
  },
  'give-em-a-piece-of-your-mind': {
    who: R,
    subject: 'swinging a thunderous overhead club blow that misses and smashes the ground, splinters flying',
    setting: 'in a ruined wooden fort with a collapsing watchtower behind'
  },
  'mighty-windup': {
    who: R,
    subject: 'twisting his whole body back with a huge fist cocked, red energy gathering around the arm',
    setting: 'on a windswept cliff edge above a thundering waterfall'
  },
  'smash-with-big-tree': {
    who: R,
    subject: 'swinging an entire uprooted tree trunk sideways like a club, leaves and bark exploding off it',
    setting: 'in a ravaged forest of broken trees under a red dawn'
  },
  'smell-fear': {
    who: R,
    subject: 'crouching low and sniffing the air with a predatory grin, pale eyes glowing',
    setting: 'at the edge of a dark misty swamp with glowing eyes watching from the reeds'
  },
  'wrecker-romp': {
    who: R,
    subject: 'charging through a wooden wall in a shower of planks with his shoulder lowered',
    setting: 'through a burning village gate at night'
  },
  'assault-and-battery': {
    who: K,
    subject: 'hammering his chained fist into a rival then slamming his chest in triumph, teal speed streaks trailing',
    setting: 'in a torchlit fighting pit ringed with rusted iron'
  },

  // ---- Valda and Guardian attacks ----
  'blinding-of-the-old-ones': {
    who: V,
    subject: 'bringing her great axe down in a huge arc that releases a blinding white shockwave of ancient light',
    setting: 'before a ruined titan statue on a desolate plateau'
  },
  'disenchantment-of-the-old-ones': {
    who: V,
    subject: 'smashing her great axe into the ground so shimmering magical auras shatter like glass shards around her',
    setting: 'in a ruined moonlit temple of broken pillars'
  },
  'smelting-of-the-old-ones': {
    who: V,
    subject: 'swinging her great axe, the blade glowing molten orange and spraying sparks from armour it cleaves',
    setting: 'inside an ancient dwarven forge-hall with rivers of lava'
  },
  'smack-of-reality': {
    who: V,
    subject: 'delivering a monstrous flat-bladed axe blow that cracks a floating glowing aura apart',
    setting: 'on a mountaintop observatory ledge under a swirling violet sky'
  },
  thunk: {
    who: V,
    subject: 'dropping a single enormous overhead axe strike that lands with a heavy thud, a golden ring of force spreading out',
    setting: 'in a stone training yard with split logs scattered around'
  },
  concuss: {
    who: T,
    subject: 'swinging her stone maul in a wide crushing arc, a visible ripple of force rolling off the head',
    setting: 'on a rocky canyon floor with falling pebbles'
  },
  'renounce-grandeur': {
    who: T,
    subject: 'smashing her maul through a floating glowing aura bubble, shards of magic scattering',
    setting: 'in a grand ruined ballroom open to the sky and overgrown with moss'
  },
  'glacial-footsteps': {
    who: H,
    subject: 'stomping forward so a wave of sharp ice crystals races across the ground ahead of him, frost clouds billowing',
    setting: 'across a frozen lake under a pale winter sun'
  },
  'winters-grasp': {
    who: H,
    subject: 'thrusting a gauntleted fist out so a huge claw of ice erupts from the ground and closes',
    setting: 'in a snowy pine forest during a blizzard'
  },

  // ---- Earth attacks ----
  'autumns-touch': {
    who: T,
    subject: 'sweeping her maul in a low arc that whips up a whirl of red and gold autumn leaves with an earthen shockwave',
    setting: 'in an orchard grove at golden hour'
  },
  'fruits-of-the-forest': {
    subject: 'a huge tangle of fruiting vines bursting from cracked ground, heavy with glowing berries and golden fruit, an abstract emblem of forest bounty',
    setting: 'deep in a lush emerald woodland with shafts of green light'
  },
  evergreen: {
    who: T,
    subject: 'striking with her maul as a towering pine sprouts instantly behind her, needles flying',
    setting: 'on a forested hillside in morning mist'
  },

  // ---- Guardian auras and actions ----
  'crash-down': {
    subject: 'a huge boulder-strewn avalanche of rock glowing amber gathering above, about to fall, an abstract emblem of impending impact',
    setting: 'looming over a shadowy mountain pass with dust drifting'
  },
  'rites-of-earthlore': {
    subject: 'a ring of ancient standing stones glowing amber with a sprouting seedling at the centre, an abstract emblem of earth power',
    setting: 'on a quiet hilltop at twilight with gentle drifting light motes'
  },
  'tension-in-the-air': {
    subject: 'a sharp taut crackle of golden energy stretched like a drawn bowstring between two stone pillars, an abstract emblem of held suspense',
    setting: 'in a dim hush before a storm, with a faint glow on the horizon'
  },
  'draw-a-crowd': {
    who: V,
    subject: 'thumping the haft of her great axe down so a ring of golden light draws a shadowy audience of spectators toward her',
    setting: 'at the heart of a lively festival square at dusk'
  },
  'promising-terrain': {
    subject: 'rolling hills of rich dark earth with glowing amber cracks and young shoots rising, an abstract emblem of fertile ground',
    setting: 'under a soft golden sky with floating dust motes'
  },
  'tectonic-instability': {
    who: V,
    subject: 'stamping a boot so the ground splits and heaves in huge shifting plates, golden light pouring from the fissures',
    setting: 'on a vast plain splitting under a stormy sky'
  },
  'blessing-of-patience': {
    who: H,
    subject: 'kneeling calmly with a gentle green glow rising from his palm as small frost flowers bloom around him',
    setting: 'on a quiet snowy mountain shelf at first light'
  },
  steadfast: {
    who: H,
    subject: 'planting his giant shield in the earth as an enormous rolling wave of force breaks harmlessly against it',
    setting: 'on a barren battlefield under thunderous clouds'
  },

  // ---- Guardian blocks ----
  'test-of-vigor': {
    who: V,
    subject: 'braced against a rival in a straining shoving contest, golden energy rippling between their hands',
    setting: 'on a packed dirt training ground beside a stone wall'
  },
  sit: {
    who: T,
    subject: 'holding up one palm to stop a charging beast, who skids to a halt and settles on its haunches',
    setting: 'on a grassy forest path in the morning'
  },
  'clash-of-arms': {
    who: H,
    subject: 'catching a rival arm-guard on his giant shield so the bracer cracks apart, shards of metal flying',
    setting: 'on a stony mountain road in a flurry of snow'
  },
  'clash-of-chests': {
    who: H,
    subject: 'meeting a rival chest to chest in a colossal bump that cracks their breastplate, shockwaves rolling out',
    setting: 'in a snow-dusted stone courtyard'
  },
  'clash-of-heads': {
    who: H,
    subject: 'headbutting a rival so their helmet splits with a flare of light, sparks scattering',
    setting: 'on a frozen battlement at dawn'
  },
  'clash-of-legs': {
    who: H,
    subject: 'sweeping a heavy leg into a rival so their greaves crack apart in a spray of ice and metal shards',
    setting: 'on an icy riverbank beneath bare black trees'
  },
  'clash-of-shields': {
    who: H,
    subject: 'slamming his giant shield into a rival shield so it splinters and fractures, ice flying',
    setting: 'before the gate of a frost-bitten citadel'
  },
  'canopy-shelter': {
    who: T,
    subject: 'sheltering under a vast arching canopy of living branches she raised, leaves glowing green with a red energy mote above',
    setting: 'in a rainy forest with droplets beading on the leaves'
  },
  'rootbound-carapace': {
    who: T,
    subject: 'wrapped in a hard shell of knotted roots and bark that rises around her to deflect a blow',
    setting: 'in a deep ancient wood with twisting roots underfoot'
  },
  'turn-timber': {
    who: T,
    subject: 'raising a toppling tree trunk with her bare hands to block a charge, bark and chips bursting out',
    setting: 'at a logging clearing with fallen timber and sawdust in sunlight'
  },
  'fertile-ground': {
    subject: 'a cupped patch of rich dark soil with a glowing green seedling unfurling and soft gold light spreading out, an abstract emblem of renewal',
    setting: 'in a sunlit meadow with drifting petals'
  },

  // ---- Warrior cards ----
  'felling-swing': {
    who: D,
    subject: 'swinging a sturdy axe in a powerful horizontal sweep that topples a tree, golden light trailing the blade',
    setting: 'in a sun-dappled forest clearing with timber falling'
  },
  'steelblade-shunt': {
    who: D,
    subject: 'turning a rival sword aside with a twist of her blade so the strike rebounds with a spark',
    setting: 'on the sand of an arena with a blurred stone gate behind'
  },
  'display-of-craftsmanship': {
    who: D,
    subject: 'raising her honed golden blade to catch the light, a bright whetstone glow running along the edge',
    setting: 'in a smithy yard beside a warm anvil and glowing coals'
  },
  'cut-the-deck': {
    who: O,
    subject: 'slicing a stack of gleaming gold cards in half with a quick stroke of her blade, cards fluttering through the air',
    setting: 'at a lavish gambling table under crystal chandeliers'
  },
  'test-of-strength': {
    subject: 'two armoured arms locked in a straining arm-wrestle on a heavy table, golden energy rippling between their fists',
    setting: 'in a rowdy firelit tavern, a shadowy audience behind'
  },

  // ---- generic cards ----
  'sirens-of-safe-harbor': {
    subject: 'a graceful sea-nymph woman with flowing teal hair singing from a rock, glowing blue mist curling around her and a soft healing light',
    setting: 'at a moonlit harbour with calm silver water and distant ship lanterns'
  },
  'arcane-polarity': {
    subject: 'a swirling purple orb of arcane energy being pulled apart into a glowing green healing light, an abstract emblem',
    setting: 'floating in a dark void with drifting violet sparks'
  },
  'chest-puff': {
    subject: 'a burly warrior puffing out his chest and flexing with a smug grin, a glowing red aura swelling around him',
    setting: 'on a sunny village green with startled birds scattering'
  },
  'look-tuff': {
    subject: 'a scowling heavy-set mercenary in spiked pauldrons flexing his shoulders and glaring, gold sparks around his fists',
    setting: 'on a dusty road before a desert fort at midday'
  },
  'on-the-horizon': {
    subject: 'a lone armoured scout shading her eyes with one hand and gazing across the land, a faint glow spilling from the far horizon',
    setting: 'on a high rock outcrop above sweeping plains at sunrise'
  },
  'lay-low': {
    subject: 'a cloaked fighter crouched behind a low stone wall, shadows hiding him as a rival searches, a faint red mark glowing in the dark',
    setting: 'in a narrow moonlit alley between old stone houses'
  },
  'fyendals-fighting-spirit': {
    subject: 'a battered but defiant swordsman rising from one knee with a bright green life glow flaring around him',
    setting: 'on a rain-slick mountain trail after a hard skirmish'
  },
  'raging-onslaught': {
    subject: 'an armoured soldier surging forward with a roaring cry and a heavy sword, a crimson aura blazing behind him',
    setting: 'across a smoking battlefield at the edge of a burning forest'
  },
  sift: {
    subject: 'a pair of hands sifting a stream of glowing cards like sand through a sieve, the unwanted ones falling away as sparkling dust',
    setting: 'in a dim candle-lit study with soft drifting motes'
  },
  'brush-off': {
    subject: 'a cloaked fighter casually flicking an incoming blow away with the back of his hand, a pale shield of light rippling',
    setting: 'on a quiet village road with a blurred cart behind'
  },
  'unflinching-foothold': {
    subject: 'a pair of sturdy iron-shod boots driven deep into the earth, cracked ground fanning out around them, the boots themselves are the focus',
    setting: 'on a windswept ridge as a storm rolls in'
  },
  'battlefront-bastion': {
    subject: 'a lone armoured soldier planted behind a half-wall of stacked shields and stones, a pale protective glow around him',
    setting: 'on a muddy ridgeline at the front of a quiet battlefield'
  }
};
