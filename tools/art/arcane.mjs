// tools/art/arcane.mjs — illustrator "arcane": Kano, Blaze, Iyslander, Oscilio, Briar, Florian, Chane.
export const WHO = {
  kano:
    'a young prodigy wizard, a slim teenage boy with untidy silver-white hair standing on end and bright wide violet eyes, ' +
    'in a long indigo academy coat with star-pattern trim and brass buttons, a tall crystal-tipped staff in one hand, ' +
    'wild crackling violet and magenta arcane energy arcing around his arms',
  blaze:
    'a young fire-minded wizard, a lean teenage boy with swept-up crimson hair and sharp amber eyes behind a calm focused gaze, ' +
    'in a cropped scarlet-and-charcoal mage jacket with a high collar, a slim wooden staff topped with a floating ember, ' +
    'small flames drifting around his temples and shoulders',
  iyslander:
    'an ice wizard, a tall poised young woman with long straight pale-blue hair and icy grey eyes, a cool intense expression, ' +
    'in a flowing white-and-sapphire robe with a frost-feathered collar, holding a staff of twisted ice crowned by a glowing snowflake crystal, ' +
    'a swirl of frost and storm wind around her',
  oscilio:
    'a lightning wizard, a wiry young man with spiky electric-yellow hair and a cheeky confident grin, tanned skin and bright gold eyes, ' +
    'in a short deep-blue cloak over a sleek black-and-gold bodysuit with glowing circuit lines, a short metal rod staff humming with current, ' +
    'sparks leaping between his fingers',
  briar:
    'a runeblade woman of thorns, earth and lightning, a fierce young woman with long wavy dark-green hair streaked with yellow, braided with small leaves, ' +
    'in leather and bark-plated armour wrapped with living thorny vines, a long steel sword in her right hand etched with glowing green glyphs, ' +
    'crackling yellow lightning running along the blade',
  florian:
    'an earth runeblade of rot and overgrowth, a stocky bearded man with moss-coloured hair and tired deep-set eyes, ' +
    'in a heavy brown robe grown over with mushrooms, ivy and pale fungus, bark pauldrons, a short iron-bound scepter in one hand ' +
    'glowing with sickly green and violet light, a calm weathered air',
  chane:
    'a shadow runeblade, a gaunt pale young man with long black hair hanging over haunted dark eyes, a sneer of quiet menace, ' +
    'in a torn black coat and dark plate pieces, heavy iron chains wrapped around his arms and torso and trailing behind him, ' +
    'a huge cursed greatsword with a jagged black blade leaking purple smoke'
};

const K = 'kano', B = 'blaze', I = 'iyslander', O = 'oscilio', R = 'briar', F = 'florian', C = 'chane';
const c = (subject, setting, who) => (who ? { who, subject, setting } : { subject, setting });
const item = (what, setting) => c(`${what}, the item itself is the focus`, setting);

export const CARDS = {
  // ---- tokens: abstract emblems ----
  runechant: c('an abstract emblem of a runechant, a small floating violet sigil of glowing glyph-light spinning in a ring of sparks', 'hovering in a dark misty void with drifting motes'),
  ponder: c('an abstract emblem of pondering, a glowing blue thought-bubble orb with swirling constellations inside', 'floating above a calm starlit night sky'),
  frostbite: c('an abstract emblem of frostbite, a jagged cluster of pale blue ice crystals creeping outward in a spiral', 'spreading over dark frozen stone with cold mist'),
  'sigil-of-fate': c('an abstract emblem of fate, a glowing golden hexagonal sigil with a spinning dial of light at its centre', 'hanging in a deep blue cosmos with faint threads of light'),
  'embodiment-of-earth': c('an abstract emblem of earth, a hulking spirit of living rock and moss with glowing amber eyes rising from the ground', 'in a mossy canyon with dust and falling pebbles'),
  'embodiment-of-lightning': c('an abstract emblem of lightning, a humanoid spirit made of crackling yellow-white bolts with a blazing core', 'in a black thunderstorm sky with forked lightning'),
  'lightning-flow': c('an abstract emblem of lightning flow, a ribbon of electric blue-yellow current streaming in a loop', 'curving through a dark storm cloud with sparks, painted edge to edge as a full-bleed scene'),
  'soul-shackle': c('an abstract emblem of a soul shackle, a heavy iron chain ring wrapped around a glowing violet spirit-flame', 'floating in a black void with ghostly wisps'),

  // ---- heroes ----
  kano: c('striking a triumphant pose, the staff raised overhead as a column of wild arcane light bursts from its crystal', 'in a vast round academy observatory with a glowing star map on the dome above', K),
  'blaze-firemind': c('standing calm and focused, one palm open with a floating swirl of flame and glowing thought-sparks', 'on a stone balcony above a sunset city, warm light and drifting embers', B),
  iyslander: c('sweeping her staff in a wide arc, a spiral of snow and frost wind unfurling behind her', 'on a frozen mountain ridge in a howling blizzard with a pale moon', I),
  oscilio: c('leaping into the air with a bolt of lightning crackling from his raised rod, grinning', 'on a rain-slick rooftop under a violent night storm', O),
  briar: c('standing ready in a duelist stance, the sword held forward as green thorns and yellow lightning twine around the blade', 'in a wild overgrown forest clearing with shafts of stormy light', R),
  florian: c('standing steady with the scepter held low, fungus and vines creeping across the ground at his feet', 'in a damp rotting forest hollow with pale mushrooms glowing in the gloom', F),
  chane: c('striding forward dragging his chains, the cursed blade resting on his shoulder and trailing purple smoke', 'in a ruined black cathedral hall with broken arches and drifting ash', C),

  // ---- weapons ----
  'crucible-of-aetherweave': item('a tall two-handed staff cradling a swirling glass crucible of woven blue and violet aether threads at its head', 'resting upright in a stone alcove of an arcane laboratory'),
  'volzar-meteor-storm': item('a two-handed lightning staff topped with a crackling gold orb that circles tiny falling meteors of light', 'planted on a storm-lashed cliff top with bolts striking nearby'),
  'star-fall': item('a long two-handed sword with a star-bright blade, a streak of yellow lightning running down its length like a falling star', 'planted point-down in a meadow under a night sky streaked with falling stars'),
  'annals-of-sutcliffe': item('a heavy iron-clasped tome bound in dark leather with a softly glowing violet seal on its cover, floating with glowing violet light spilling from its edges', 'in a candlelit stone crypt library with dust in the air'),
  'scepter-of-pain': item('a short iron-bound scepter topped with a thorned green crystal that glows with sickly light', 'on a mossy tree stump in a damp forest at dusk'),
  'reaping-blade': item('a huge two-handed greatsword with a curved black blade that drips shadow, chains looped around its hilt', 'stuck in cracked stone in a bleak moonlit graveyard'),

  // ---- equipment ----
  'aetherstorm-wellingtons': item('a pair of indigo wizard boots with silver buckles and storm-cloud swirls of light around the soles', 'on a polished marble floor of an academy corridor'),
  'blade-beckoner-boots': item('a pair of sturdy steel-plated boots with fine blade edges along the toes', 'on a rack in a lantern-lit armoury'),
  'blade-beckoner-plating': item('a sleek steel chest plate with fine curved blade edges along the shoulders', 'on a stand in a quiet forge'),
  'hold-focus': item('a pair of embroidered cloth vambraces with small crystal beads glowing a soft blue', 'on a wooden desk beside a crystal lamp, painted edge to edge as a full-bleed scene'),
  'spellfire-cloak': item('a long crimson-and-gold cloak with a hem of living flame that leaves the cloth unharmed', 'draped over a stone chair before a roaring hearth'),
  'talismanic-lens': item('a round brass headpiece with a single large glowing lens that shows swirling stars', 'on a velvet cushion in a dusty observatory, painted edge to edge as a full-bleed scene'),
  'unflinching-foothold': item('a pair of heavy iron greaves with spiked soles that grip the ground', 'planted on a steep rocky slope with loose gravel'),
  'unyielding-grip': item('a pair of thick studded leather gauntlets, clenched tight as if holding on', 'on a wooden table in a rustic smithy'),
  'mage-master-boots': item('a pair of elegant violet boots with golden spiral patterns and a faint glow', 'on a stone step of a grand academy stair'),
  'nullrune-hood': item('a plain grey cloth hood with a pale silver circle stitched at the brow, shimmering faintly', 'on a peg in a quiet stone cell'),
  'robe-of-resourcefulness': item('a patched wizard robe of mixed cloth scraps in blue, green and gold, bursting with stored light', 'on a hanger in a cluttered artificer workshop'),
  'constella-waves': item('a pair of lightning-blue bracers with a constellation of tiny stars arcing between them', 'floating in a night sky full of drifting stars'),
  'garland-of-spring': item('a woven breastplate of fresh green vines and pink blossoms, light and alive', 'hung on a branch in a sunny spring meadow'),
  'olde-leather-plate': item('a battered old leather chest plate, scarred and patched, with heavy stitching', 'on a barrel in a dim tavern cellar'),
  'twinkle-toes': item('a pair of nimble yellow-and-blue boots that leave tiny trails of sparks', 'lined up on a rain-wet cobbled street at night'),
  'voltic-vanguard': item('a sleek electric-blue helm with a gold lightning crest and a crackling visor', 'on a stone pedestal in a stormy lookout tower'),
  'beckoning-haunt': item('a pair of ghostly pale bracers with wisps of spirit-smoke curling out of them', 'floating in a dim crypt lit by cold green light'),
  'flash-of-brilliance': item('a bright gold-and-yellow helm with a lightning bolt crest, glowing from within', 'on a pillar beneath a bright flash of lightning'),
  'helm-of-might-and-magic': item('a heavy steel helm with a glowing visor and an arcane crest', 'on a table in a mage knight chapel lit by candles'),
  'swiftstrike-bracers': item('a pair of light leather bracers with yellow speed-stripes', 'on a wooden training post at dawn, painted edge to edge as a full-bleed scene'),
  'arcane-lantern': item('a hooked iron lantern holding a floating violet flame', 'hanging from a mossy post in a dark forest'),
  'bloodied-oval': item('a round steel buckler shield with a dented rim and old stains', 'leaning on a stone wall in a lonely courtyard'),
  'plume-of-evergrowth': item('a green helm topped with a tall plume of living leaves and flowers', 'on a mossy boulder in a sunlit forest glade'),
  'runebleed-robe': item('a deep purple robe with veins of glowing violet running through the cloth like blood', 'on a stand in a dim ritual chamber'),
  'well-grounded': item('a pair of heavy earthen greaves of stone and root, solid and rooted', 'sunk into soft soil in a grove with roots curling around'),
  'bloodtorn-bodice': item('a torn black leather bodice with ragged edges and dark red stitching', 'draped over an iron chair in a gloomy chamber, painted edge to edge as a full-bleed scene'),
  'ebon-fold': item('a hood of folded pitch-black cloth, edges dissolving into shadow', 'resting on a black stone block in a dark void'),
  'runehold-release': item('a pair of dark gauntlets, each with a glowing violet ring that releases a spark', 'on a cold slab in a shadowy vault'),
  'sutcliffes-suede-hides': item('a pair of soft grey suede boots with silver spiral stitching and a pale glow', 'on a dusty floor of an old workshop'),

  // ---- Kano actions ----
  'absorb-in-aether': c('catching a wave of blue aether in his open palms and folding it into his staff', 'in a high tower study with swirling floating sheets of light', K),
  'aether-quickening': c('snapping his fingers as a burst of violet sparks zips out ahead of him', 'on a stone bridge at the top of an academy tower', K),
  'cindering-foresight': c('peering into a glowing ember orb that shows a flicker of the future', 'in a candlelit alcove with scattered embers', K),
  'emeritus-scolding': c('pointing his staff sternly as a heavy beam of violet energy lashes out', 'in a grand lecture hall with tiered seats and shafts of light', K),
  'painful-premonition': c('thrusting out his hand as a golden sigil flares on the ground and a bolt of energy flies', 'on a misty hilltop at dusk', K),
  'photon-splicing': c('weaving beams of pale light into a bright lance between his hands', 'in a dark crystal cave with refracting rays', K),
  'rousing-aether': c('raising his staff as a surge of cyan and violet aether rises around him', 'in a ring of ancient standing stones', K),
  'scalding-rain': c('calling down a curtain of glowing hot arcane rain from a dark cloud above', 'on a stormy plain with steam rising from the ground', K),
  snapback: c('spinning around and whipping a violet bolt back over his shoulder', 'in a narrow alley of an old academy town', K),
  'stir-the-aetherwinds': c('swirling his staff in a circle to stir a ring of glowing wind and floating motes', 'on a windy cliff with drifting clouds', K),
  'voltic-bolt': c('hurling a huge crackling purple bolt from his outstretched staff', 'on a dark stone terrace with sparks flying', K),
  'arcane-twining': c('twisting two thin strands of violet light between his fingers into a spark', 'in a quiet library nook lit by floating lights', K),
  'chorus-of-the-amphitheater': c('standing at the centre of a stone amphitheatre as echoing rings of energy pulse outward', 'in an ancient open-air amphitheatre at twilight with a shadowy audience', K),
  'overflow-the-aetherwell': c('standing beside a glowing well as a fountain of blue aether overflows', 'in a mossy courtyard with a stone well erupting with light', K),

  // ---- Blaze actions ----
  aethersling: c('whirling a sling of glowing red-orange energy overhead and releasing a fireball', 'on a rocky overlook above a valley with a smoky sky', B),
  'aether-spindle': c('spinning a thread of fiery aether around his finger into a glowing spindle', 'in a warm workshop with brass instruments and floating embers', B),
  dampen: c('sweeping his hand to cast a shimmering orange barrier while a bolt of fire flies from the other', 'in a stone cloister with heat haze', B),
  'nucleus-aetherbolt': c('gathering a glowing white-hot core and firing a bolt, small spark-bolts flying from his shoulders', 'in a round stone chamber with a glowing floor pattern', B),
  reverberate: c('striking the ground with his staff as rings of flame ripple out and echo', 'on a cracked volcanic plain with distant lava glow', B),
  'turn-to-mindfire': c('closing his eyes as a huge blazing bolt forms above his head and a thought-orb glows', 'on a hilltop at night with an enormous bonfire behind him', B),
  'open-the-flood-gates': c('flinging open his arms as a torrent of warm light surges out like a broken dam', 'at the mouth of a great stone aqueduct with spray and glow', B),

  // ---- Iyslander actions ----
  'aether-icevein': c('thrusting out her staff as a jagged spear of blue ice and arcane light launches', 'in a glittering ice cavern with veins of glowing blue', I),
  'arctic-incarceration': c('slamming her staff down as chains of ice rise to bind the ground ahead of her', 'on a frozen lake with cracks racing across the surface', I),
  'ice-bolt': c('hurling a single large spinning shard of ice from her palm', 'in a snowy pine forest at dusk', I),
  'save-the-thought': c('cupping a floating pale blue orb of memory and tucking it close to her chest', 'in a quiet frosted greenhouse with falling snow', I),
  frosting: c('flicking her fingers to scatter a glittering spray of frost needles', 'on a snowy terrace of an ice palace', I),
  'frost-spike': c('whipping her staff so a sharp spike of ice shoots up from the ground', 'on a windswept glacier under green aurora light', I),
  'winters-bite': c('breathing out a cloud of freezing mist that bites into the air around her', 'in a silent snow-laden bare forest', I),

  // ---- Oscilio actions ----
  'arc-ramp': c('running along a ramp of arcing electricity, rod raised, ramping up power', 'on a high steel gantry of a storm-tower', O),
  'cloud-cover': c('gathering a dense storm cloud around himself as a shield, lightning flickering inside', 'above a rolling sea of clouds at sunset', O),
  'comet-collision': c('slamming two glowing comet-balls of light together in front of him', 'in a star-filled night sky over dark hills', O),
  'comet-storm-shock': c('pointing his rod up as a fiery comet falls and a small shock bolt snaps from his other hand', 'in a wide desert at night with a streaking comet', O),
  'core-reaction': c('holding a pulsing yellow energy core cupped in both hands that is about to burst', 'in a dim underground generator hall with humming coils', O),
  'cosmic-flare': c('flinging his arms wide as a flare of white cosmic light blooms behind him', 'drifting among stars and colourful nebula clouds', O),
  'electrostatic-discharge': c('touching the ground as a web of static lightning spreads and discharges', 'in a dry field of tall grass crackling with sparks', O),
  'entwine-lightning': c('twisting two strands of lightning together into a thick whip', 'on an open mountain pass with dark clouds rolling in', O),
  'flash-bolt': c('snapping a quick blinding bolt from his fingertip, hair standing on end', 'in a narrow city street at night', O),
  'flittering-charge': c('dashing forward as a blur of yellow afterimages leaves flitting sparks behind', 'on a long empty highway of stone arches', O),
  'flittering-forcefield': c('twirling his rod to spin a hexagon forcefield of flickering light', 'on a rainy rooftop garden', O),
  'lightning-press': c('pressing a palm forward and thrusting a bolt of lightning into his rod', 'in a cluttered inventor workshop with coils, painted edge to edge as a full-bleed scene', O),
  'lightning-surge': c('rushing forward with arms stretched back as a surge of current floods him', 'on a coastal cliff battered by waves and storm', O),
  'meteoric-impact': c('pointing as a burning meteor slams down in the distance throwing a shock ring', 'on a barren plateau under a dark red sky', O),
  'second-strike': c('swinging his rod in a fast second blow as an after-image of the first fades', 'in a training ground with straw targets at golden hour', O),
  'strike-twice': c('lashing out with a bolt from each hand one after the other', 'on a stone pier over dark water in a storm', O),
  'voltic-veil': c('wrapping himself in a shimmering veil of blue-white electricity', 'in a candlelit stone hall with tall arched windows', O),
  'constella-contemplation': c('floating cross-legged as a constellation of stars forms in a ring around his head', 'on a quiet hilltop under a canopy of stars', O),
  'constella-uplift': c('lifting his rod high as it fills with stars rising up the shaft', 'on a high rocky peak with a night sky above', O),
  'sigil-of-lightning': c('an abstract emblem of lightning, a glowing yellow sigil in a circle with jagged bolts radiating out', 'hovering in dark storm clouds with sparks'),
  'starlight-road': c('an abstract emblem of a road of starlight, a glittering path of white stars winding into a deep blue sky', 'curving through a nebula with drifting sparkles'),

  // ---- Briar actions ----
  'arcane-seeds-life': c('an abstract emblem of arcane seeds, a glowing violet seed sprouting a green shoot and a tiny glowing leaf', 'rising from dark soil with drifting spores, painted edge to edge as a full-bleed scene'),
  'arcanic-crackle': c('swinging her sword in a quick slash that sheds crackling violet sparks', 'in a forest clearing with sunlight through the trees', R),
  'arcanic-shockwave': c('driving her sword into the ground as a ring of yellow lightning and green energy bursts out', 'on a rocky plateau with scattered moss, painted edge to edge as a full-bleed scene', R),
  fry: c('making a quick stab with her sword that sizzles in a fork of bright lightning', 'on a charred battlefield with smoking grass', R),
  'harness-lightning': c('catching a bolt of lightning on her sword blade and bending its light around her arm', 'on a stormy hill with a lone twisted tree', R),
  'malefic-incantation': c('an abstract emblem of an incantation, interlocked glowing violet circles of glyph-light above a thorn vine', 'floating in dark mist with drifting leaves, painted edge to edge as a full-bleed scene'),
  nimblism: c('darting lightly aside in a graceful low step with her sword trailing sparks', 'across a pebbled forest stream with ripples', R),
  'sigil-of-suffering': c('slashing a defensive arc as a violet sigil flares in the air and a spark lashes back', 'in a thorny bramble thicket', R),
  sizzle: c('letting sparks sizzle over her blade as she lifts it, electricity racing up the steel', 'in a hot dusty canyon with heat shimmer', R),
  'sprout-strength': c('planting her palm on the soil as vines surge up her arm and the sword', 'in a fertile meadow with seedlings bursting up', R),
  'static-shock': c('slashing her blade through the air as a branching static shock leaps out', 'on a windy field of tall grass under thunderheads', R),
  'weave-lightning': c('weaving a net of lightning around her sword like a spinning loom', 'in a mossy ancient grove with beams of light', R),
  flourish: c('performing an elegant flourish with her sword as flower petals and leaves swirl', 'in a sun-dappled forest glade with blossoms', R),
  'sigil-of-voltaris': c('an abstract emblem of lightning, a bright golden sigil of star points with a jagged bolt crossing it', 'hovering in a charged night sky'),

  // ---- Florian actions ----
  'amplify-the-arknight': c('swinging his scepter as a swelling ring of violet runechants amplifies the strike', 'in a shadowy old crypt with floating glyph-light', F),
  'autumns-touch': c('the bearded moss-robed man laying a palm on the ground as a wave of orange and red autumn leaves rolls out', 'in an orchard clearing in late autumn', F),
  'chorus-of-rotwood': c('raising his scepter as rotting stumps and mushrooms sprout around him in a chorus', 'in a decaying swamp wood with hanging moss', F),
  'colors-of-aria': c('an abstract emblem of colours, a swirl of green, blue and yellow energy twisting in a bright orb', 'floating in a misty void with prismatic sparks'),
  'fertile-ground': c('kneeling and pressing his hand to the soil as bright green life surges outward', 'in a ploughed hillside field at sunrise', F),
  'harvest-season': c('an abstract emblem of harvest, a golden sheaf of ripe grain and glowing fruits ringed by drifting leaves', 'against a warm orange sunset sky'),
  'read-the-runes': c('studying floating violet glyph-stones that circle him, eyes glowing', 'in an ivy-covered ruin with a broken arch', F),
  'reduce-to-runechant': c('crushing a rune stone in his fist, turning it into a floating runechant while blocking', 'on a muddy forest trail', F),
  'rootbound-carapace': c('crossing his arms as a shell of living roots and bark wraps around him', 'in a dark gnarled root cavern', F),
  'runeblood-incantation': c('an abstract emblem of an incantation, a dripping crimson-violet glyph circle with small candles of light', 'floating above a dark pool in mist'),
  'rune-flash': c('lashing his scepter out in a bright flash of violet light that leaves trailing glyphs', 'in a dim stone chamber with floating dust', F),
  'fruits-of-the-forest': c('thrusting out a branch laden with glowing berries and fruit, ready to strike', 'at the edge of a berry thicket in a forest', F),
  'oath-of-the-arknight': c('kneeling with his scepter held upright and a runechant glowing before him in a solemn vow', 'in a ruined chapel with shafts of light', F),
  sift: c('a cloaked traveller sifting glowing grains through a fine sieve', 'at a riverbank at dawn with gentle light'),
  'sigil-of-silphidae': c('an abstract emblem of silphidae, a green and gold sigil ringed by tiny winged beetles of light', 'floating above leaf litter in a dark wood'),

  // ---- Chane actions ----
  'arcane-cussing': c('an abstract emblem of a curse, a swirl of dark violet glyph-light and ghostly mouths whispering in smoke', 'floating in a black void with ash'),
  'deathly-delight': c('grinning darkly as his blade slashes a wide crescent and drinks in dark vitality', 'in an abandoned banquet hall with candles guttering', C),
  'deathly-wail': c('rearing back as a wailing shadow spirit bursts from his blade and streaks forward', 'in a moonlit graveyard of broken tombs', C),
  'envelop-in-darkness': c('flinging his arms wide as a cloak of black shadow wraps over him and the blade', 'in a gloomy dead forest at midnight', C),
  'putrid-stirrings': c('lifting a hand as sickly purple things stir up from a dark pit at his feet', 'in a rotted crypt with bones strewn about', C),
  'soul-reaping': c('swinging his greatsword in a huge arc that harvests glowing souls from the air', 'on a black battlefield under a blood moon', C),
  'spellblade-assault': c('lunging forward with a spell-lit sword thrust, violet runechants flying off the tip', 'on a cracked stone bridge over a dark chasm', C),
  'vantom-banshee': c('slashing as a screaming banshee shape of dark smoke leaps from the blade', 'in a fog-choked moor with gnarled trees', C),
  'vantom-wraith': c('slashing as a hooded wraith of black mist unfurls from the blade', 'in a dark stone cloister with cold green torchlight', C),
  'mauvrion-skies': c('pointing his sword up as bruised purple storm skies swirl and shed dark light', 'on a ruined hilltop beneath a huge purple storm', C),

  // ---- generic cards ----
  'fyendals-fighting-spirit': c('a lone red-cloaked fighter with fists raised and a glowing spirit-wolf rising behind', 'on a wind-swept plain at dawn'),
  'arcane-polarity': c('an abstract emblem of polarity, a swirling orb split into warm gold and cool blue halves', 'floating in a dim starry void'),
  'on-the-horizon': c('a lone shielded guard peering toward a bright glowing horizon with a lifted hand', 'on a castle wall at first light, painted edge to edge as a full-bleed scene'),
  'ravenous-rabble': c('a snarling pack of wild beasts charging out of a dark wood, eyes glinting', 'at the edge of a moonlit forest'),
  snatch: c('a quick hooded thief snatching a glowing pouch from the air with a smile', 'in a lantern-lit market street at night'),
  'whisper-of-the-oracle': c('a veiled seer whispering as glowing visions swirl above her cupped hands', 'in a candlelit temple with floating lights, painted edge to edge as a full-bleed scene'),
  'wounded-bull': c('a huge scarred bull with a bloodied flank lowering its horns to charge', 'in a dusty fighting ring at noon'),
  'chest-puff': c('a swaggering brawler puffing out his chest and flexing with a grin', 'in a rowdy tavern yard with hanging lanterns'),
  'look-tuff': c('a scowling bruiser with folded arms staring down an opponent', 'on a dusty street at sundown'),
  'timesnap-potion': item('a small round glass flask of swirling blue liquid with a floating golden clock-hand of light inside', 'on a wooden shelf among alchemy tools'),
  'right-behind-you': c('a quick ambusher leaping from the shadows behind a startled figure', 'in a narrow torchlit corridor')
};
