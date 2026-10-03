// tools/art-identity.mjs — WHO is on each card, and WHERE.
//
//   WHO    one visual clause per recurring character, written once, so a hero is the same
//          person on every card they appear on.
//   CARDS  one entry per ART KEY (card id minus a trailing -red/-yel/-blu):
//            { who?, subject, setting }
//          `who` names a WHO entry; the builder puts that clause in front of `subject`.
//          Attacks show the move being performed by that deck's hero; equipment shows the
//          item itself; tokens show an abstract emblem of the idea.
//
// THREE CONSTANTS that never move:
//   1. no text is ever rendered in an image
//   2. no specific official illustration is reproduced
//   3. no real artist, studio, franchise or game is ever named in a prompt (the lint enforces it)
// A card key with no entry here FAILS the build. There is no generic fallback.

export const WHO = {
  dorinthea:
    'a young human woman warrior with flowing red-brown hair and a determined stare, ' +
    'wearing polished plate armour, gripping a radiant golden two-handed sword',
  kayo:
    'a towering muscular young man, a savage pit-fighter with a wild tawny mane, sharp fangs and old scars, ' +
    'a heavy tattered fur cloak draped over his entire left side, his bare right arm huge and wrapped in iron chains'
};

const D = 'dorinthea', K = 'kayo';

export const CARDS = {
  // ---- tokens: abstract emblems ----
  agility: {
    subject: 'an abstract emblem of agility, swirling wind-speed lines spiralling around a glowing teal crest',
    setting: 'floating in a dark swirling sky of cyan streaks and sparks'
  },
  might: {
    subject: 'an abstract emblem of might, a single clenched fist wreathed in glowing crimson energy',
    setting: 'bursting out of cracked dark stone with embers flying'
  },
  vigor: {
    subject: 'an abstract emblem of vigor, a radiant burst of golden energy blooming like a star',
    setting: 'against a deep warm amber glow with rising motes of light'
  },

  // ---- heroes ----
  dorinthea: {
    who: D,
    subject: 'standing tall in a heroic pose, the golden blade raised beside her and trailing light',
    setting: 'on the sunlit sand of a grand arena at dawn, cheering stands blurred behind her'
  },
  kayo: {
    who: K,
    subject: 'roaring in a triumphant pose, his single huge fist raised and clenched',
    setting: 'inside a torchlit fighting pit ringed with rough timber and rusted iron'
  },

  // ---- weapons ----
  dawnblade: {
    subject: 'a radiant golden two-handed sword planted point-down, glowing along its edge like sunrise, the sword itself is the focus',
    setting: 'on an ancient stone dais at the crest of misty highlands as the sun breaks'
  },
  'mandible-claw': {
    subject: 'a huge curved bone-and-iron claw weapon strapped to a heavy gauntlet, jagged and wicked, the weapon itself is the focus',
    setting: 'resting on bloodstained sand in a torchlit fighting pit'
  },

  // ---- equipment (item as focus) ----
  knucklehead: {
    subject: 'a battered brute helmet made from a thick skull plate with crude rivets and a cracked crest, the helmet itself is the focus',
    setting: 'on a splintered wooden post in a savage wilds camp'
  },
  'predatory-plating': {
    subject: 'a heavy spiked chest plate of dark hide and bone ribs, the armour itself is the focus',
    setting: 'hung on a rack of antlers in a smoky tribal war hall'
  },
  'blade-beckoner-gauntlets': {
    subject: 'a pair of sleek steel gauntlets with fine curved blade edges along the knuckles, the gauntlets themselves are the focus',
    setting: 'laid on a weapon table inside a lantern-lit armoury'
  },
  'beaten-trackers': {
    subject: 'a pair of scuffed leather boots with iron-shod toes, dented and worn from endless pursuit, the boots themselves are the focus',
    setting: 'planted in churned mud on a rainy forest trail'
  },
  'helm-of-unity': {
    subject: 'a gleaming steel knight helm with a smooth crest and a soft white glow in the visor, the helmet itself is the focus',
    setting: 'on a velvet cushion in a quiet castle hall with shafts of light'
  },
  'blossom-of-spring': {
    subject: 'a light breastplate of pale green enamel with pink blossoms etched across it and petals drifting off, the armour itself is the focus',
    setting: 'on a mannequin in a sunny garden courtyard with falling petals'
  },
  'gauntlets-of-unity': {
    subject: 'a pair of polished silver gauntlets pressed together, a thin glow joining them, the gauntlets themselves are the focus',
    setting: 'on a stone table in a castle training yard at midday'
  },
  'refraction-bolters': {
    subject: 'a pair of armoured greaves with mirror-bright plates that scatter light into rainbow shards, the greaves themselves are the focus',
    setting: 'standing on wet sand with a shimmering reflection beneath them'
  },

  // ---- Dorinthea's cards ----
  'agile-engagement': {
    who: D,
    subject: 'sidestepping a clumsy blow and lunging forward with her blade trailing a teal streak',
    setting: 'in a castle training yard with wooden dummies and hay bales'
  },
  'ironsong-response': {
    who: D,
    subject: 'meeting an incoming strike with a ringing parry, sparks bursting where the blades cross',
    setting: 'on a windswept stone bridge in misty highlands'
  },
  'lead-with-speed': {
    who: D,
    subject: 'dashing forward ahead of a rival, her golden blade held low and glowing, motion lines behind her',
    setting: 'across the open sand of a sunlit arena'
  },
  'out-for-blood': {
    who: D,
    subject: 'driving her glowing sword forward in a fierce thrust, a crimson aura flaring around the blade',
    setting: 'on a battlefield at dusk with smoke drifting across a red sky'
  },
  overpower: {
    who: D,
    subject: 'bringing the golden blade down in a crushing overhead strike that shatters the ground',
    setting: 'on a cracked flagstone courtyard with dust and debris flying'
  },
  puncture: {
    who: D,
    subject: 'thrusting the tip of her sword through a gap in a rival shield, a thin piercing beam of light leading the point',
    setting: 'in a torch-lit castle corridor of grey stone'
  },
  'sharpen-steel': {
    who: D,
    subject: 'drawing a whetstone along her golden blade, bright sparks streaming off the edge',
    setting: 'at a campfire beside a ridge of misty highlands at twilight'
  },
  'stroke-of-foresight': {
    who: D,
    subject: 'closing her eyes and slicing exactly where an unseen foe will appear, a faint ghost image of the strike hovering ahead',
    setting: 'in a silent bamboo grove with drifting pale mist'
  },
  'warriors-valor': {
    who: D,
    subject: 'raising her sword to the sky as golden light pours down and swells around her',
    setting: 'on a hilltop at sunrise with a torn battle flag streaming in the wind'
  },
  'run-through': {
    who: D,
    subject: 'sprinting past a foe in a flowing sword slash, the blade leaving a long golden arc',
    setting: 'across a torchlit arena floor of packed sand'
  },
  'goblet-of-bloodrun-wine': {
    who: D,
    subject: 'raising an ornate goblet of deep red wine, golden and teal sparks swirling up out of it',
    setting: 'at a victory feast in a castle hall with warm firelight'
  },
  'hit-and-run': {
    who: D,
    subject: 'striking a swift blow and vaulting away in the same motion, afterimages trailing behind her',
    setting: 'over the rooftops of a stone fortress at dusk'
  },

  // ---- Kayo's cards ----
  'bare-fangs': {
    who: K,
    subject: 'lunging with his tusks bared and snapping, claws swiping forward',
    setting: 'in a torchlit fighting pit with a baying shadowy ring around it'
  },
  buckwild: {
    who: K,
    subject: 'charging wildly with his arm flung wide, bellowing, debris flying off his shoulders',
    setting: 'through the splintered gate of a savage wilds outpost'
  },
  'clash-of-agility': {
    who: K,
    subject: 'locked in a head-to-head clash with a lean quick fighter, a teal burst of wind between them',
    setting: 'in the centre of a torchlit fighting pit'
  },
  'clash-of-might': {
    who: K,
    subject: 'locked in a head-to-head clash with a huge armoured guardian, a crimson shockwave between them',
    setting: 'in a ring of cracked stone lit by burning braziers'
  },
  'high-pitched-howl': {
    who: K,
    subject: 'throwing back his head and howling, a golden shockwave rippling out from his mouth',
    setting: 'on a rocky cliff in the savage wilds under a huge pale moon'
  },
  pulping: {
    who: K,
    subject: 'hammering his one fist down again and again, the stone cracking beneath it',
    setting: 'in a grimy fighting pit with the sand ripped into flying clods'
  },
  'rough-up': {
    who: K,
    subject: 'grabbing a rival by the collar and shoving him back with a heavy shoulder',
    setting: 'against the timber wall of a rowdy torchlit tavern pit'
  },
  'savage-feast': {
    who: K,
    subject: 'tearing into a huge haunch of roasted meat with wild hunger, grease and sparks flying',
    setting: 'beside a roaring fire in the savage wilds at night'
  },
  'strongest-survive': {
    who: K,
    subject: 'standing over a fallen rival with a boot on his chest, fist cocked and daring him to rise',
    setting: 'on blood-flecked sand in a torchlit fighting pit'
  },
  'test-of-might': {
    who: K,
    subject: 'bracing against a towering armoured opponent, both gripping each other in a straining shove',
    setting: 'in a ring of stone pillars lit by embers'
  },
  'wild-ride': {
    who: K,
    subject: 'clinging to the back of a charging horned beast, his fist raised to smash',
    setting: 'across the open plains of the savage wilds at dusty sunset'
  },
  'bear-hug': {
    who: K,
    subject: 'crushing a smaller fighter in a one-armed hold, armour plates buckling',
    setting: 'in the shadowy heart of a torchlit fighting pit'
  },
  reincarnate: {
    who: K,
    subject: 'rising from a pile of rubble with a fiery orange aura, scars glowing like embers',
    setting: 'amid a collapsed arena with falling dust and red light'
  },
  'run-roughshod': {
    who: K,
    subject: 'trampling through a line of wooden barricades with his shoulder low, splinters exploding around him',
    setting: 'across a smoky savage wilds battlefield'
  },
  'smash-instinct': {
    who: K,
    subject: 'glaring forward with a menacing stare while his fist smashes a stone pillar to dust',
    setting: 'in an ancient ruin on the edge of the savage wilds'
  },
  'unexpected-backhand': {
    who: K,
    subject: 'whipping a sudden backhand across the frame, a streak of force whipping out of it',
    setting: 'in a torchlit fighting pit seen mid-brawl'
  },
  'agile-windup': {
    who: K,
    subject: 'coiling his single arm back in a deep windup, teal wind spiralling around his fist',
    setting: 'on a rocky ledge in the savage wilds with swirling wind'
  },

  // ---- generic cards ----
  'rally-the-coast-guard': {
    who: D,
    subject: 'raising her blade as armoured guards rally and form a line behind her',
    setting: 'on a sea cliff fortress at dawn with waves breaking below'
  },
  'scar-for-a-scar': {
    who: D,
    subject: 'pressing a hand to a fresh wound and swinging back in anger, a red afterglow trailing the blade',
    setting: 'on a rain-soaked battlefield under dark clouds'
  },
  'wreck-havoc': {
    who: K,
    subject: 'smashing aside a defensive line of shields in an explosion of splinters and fragments',
    setting: 'inside a wrecked torchlit fighting pit'
  },
  'springboard-somersault': {
    who: D,
    subject: 'vaulting off a wall in a graceful somersault over a rival, her cape fanning out',
    setting: 'in a castle training yard with colourful pennants overhead'
  },
  'trot-along': {
    who: D,
    subject: 'cantering a sturdy horse at an easy pace, blade sheathed, easy confidence on her face',
    setting: 'along a sunny country road through misty green highlands'
  },
  'put-in-context': {
    who: K,
    subject: 'planting his forearm in front of him to stop a modest blow cold, a shockwave rippling past',
    setting: 'in a torchlit fighting pit with the sand kicked up'
  },
  'oasis-respite': {
    subject: 'a still blue oasis pool ringed by palms with a soft healing glow over the water, the oasis itself is the focus',
    setting: 'in a golden desert at sunset with far dunes'
  },
  'energy-potion': {
    subject: 'a round glass flask of glowing yellow liquid with a cork stopper and crackling sparks inside, the flask itself is the focus',
    setting: 'on a rough wooden shelf in a dim alchemist workshop'
  },
  'nip-at-the-heels': {
    who: K,
    subject: 'snapping at the ankles of a fleeing rival, tusks flashing, a quick sharp slash',
    setting: 'across a torchlit fighting pit with scattering onlookers'
  }
};
