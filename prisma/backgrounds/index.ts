// The built-in backgrounds in public/assets/backgrounds, written to the database by prisma/seed-backgrounds.ts.
// Each place has one or more versions (day, sunset, night, ...). Labels read "Place — Version", and every
// version's description starts with the place's, so the prompt can list a place once with all its keys
// (see backgroundLines in src/lib/prompt/builder.ts). A key that names a time of day ("_night", "_sunset")
// tells the stage the image already shows it, so it isn't tinted again (paintedTime in src/lib/scene.ts).
//
// Left out on purpose, as exact duplicates or animation frames of another file: 140 (= 139), 168 (= 167),
// 181 (= 180), 188 (= 185), 194–196 (= 193), 198–200 (= 197).

export interface BackgroundSeed {
  key: string;
  label: string;
  imageUrl: string;
  description: string;
}

// [key, file number, version, what this version adds to the place's description]
type Version = [key: string, file: number, version?: string, detail?: string];

const TIME: Record<string, string> = {
  Day: "by day",
  Morning: "in the morning",
  Evening: "in the evening",
  Sunset: "at sunset",
  Night: "at night",
  Dawn: "at dawn",
};

function place(name: string, about: string, versions: Version[]): BackgroundSeed[] {
  return versions.map(([key, file, version, detail]) => ({
    key,
    label: version ? `${name} — ${version}` : name,
    imageUrl: `/assets/backgrounds/${file}.png`,
    description: detail || (version && TIME[version]) ? `${about}, ${detail || TIME[version!]}` : about,
  }));
}

export const BACKGROUNDS: BackgroundSeed[] = [
  // Open country
  ...place("Meadow", "rolling green meadow with a lone tree on a gentle hill", [
    ["meadow_day", 97, "Day"],
    ["meadow_sunset", 98, "Sunset"],
    ["meadow_night", 99, "Night"],
    ["meadow_dawn", 101, "Dawn", "violet morning light over wildflowers"],
    ["meadow_crashed_capsule", 100, "Crashed Capsule", "a white-and-blue capsule half-buried in a fresh crater"],
    ["meadow_stream_day", 356, "Stream", "a winding stream and scattered trees under a bright sky"],
    ["meadow_star_trails", 357, "Star Trails", "at night, stars wheeling in long trails overhead"],
    ["meadow_blinding_light", 321, "Blinding Light", "everything washed out by a blinding white glare"],
  ]),
  ...place("Above the Clouds", "high above the clouds, the curve of the Earth below", [
    ["above_clouds_day", 102, "Day"],
    ["above_clouds_sunset", 103, "Sunset"],
    ["above_clouds_night", 104, "Night"],
  ]),
  ...place("Open Sky", "nothing but open sky and clouds", [
    ["sky_day", 261, "Day"],
    ["sky_sunset", 262, "Sunset"],
    ["sky_night", 263, "Night"],
  ]),
  ...place("Wasteland", "dry, cracked wasteland of scrub with distant mountains", [
    ["wasteland_day", 125, "Day"],
    ["wasteland_sunset", 126, "Sunset"],
    ["wasteland_night", 127, "Night"],
    ["wasteland_rocks_day", 128, "Rocks, Day", "boulders in the foreground, by day"],
    ["wasteland_rocks_sunset", 129, "Rocks, Sunset", "boulders in the foreground, at sunset"],
    ["wasteland_rocks_night", 130, "Rocks, Night", "boulders in the foreground, at night"],
  ]),
  ...place("Frontier Desert", "Wild West desert of cacti and red mesas, a broken covered wagon", [
    ["frontier_desert_day", 131, "Day"],
    ["frontier_desert_sunset", 132, "Sunset"],
    ["frontier_desert_night", 133, "Night"],
  ]),
  ...place("Sand Dunes", "endless golden sand dunes", [
    ["dunes_day", 276, "Day"],
    ["dunes_sandstorm", 277, "Sandstorm", "the sun dimmed by a sandstorm"],
    ["dunes_night", 278, "Night"],
  ]),
  ...place("Scorched Land", "cracked, scorched earth with small fires burning and a dead tree", [
    ["scorched_land_day", 264, "Day"],
    ["scorched_land_sunset", 265, "Sunset"],
    ["scorched_land_night", 266, "Night"],
  ]),
  ...place("Crater Plain", "plain pocked with huge craters, seen from a rocky ledge", [
    ["crater_plain_day", 267, "Day"],
    ["crater_plain_sunset", 268, "Sunset"],
    ["crater_plain_night", 269, "Night"],
  ]),
  ...place("Snowfield", "snowy plain ringed by pine trees and mountains", [
    ["snowfield_day", 206, "Day"],
    ["snowfield_dawn", 207, "Dawn", "pink dawn light on the snow"],
    ["snowfield_night", 208, "Night"],
    ["snowfield_blizzard", 209, "Blizzard", "in a blizzard"],
    ["snowfield_blizzard_night", 210, "Blizzard, Night", "in a blizzard at night"],
  ]),
  ...place("Aurora Lake", "the northern lights over a frozen lake and pines at night", [["aurora_lake_night", 212]]),

  // Forests, jungles and mountains
  ...place("Forest", "deep forest of moss and old trees", [
    ["forest_day", 137, "Day", "sunbeams through the leaves"],
    ["forest_evening", 138, "Evening"],
    ["forest_night", 139, "Night"],
    ["forest_camp_day", 134, "Camp, Day", "a pile of firewood in a clearing, by day"],
    ["forest_camp_evening", 135, "Camp, Evening", "a pile of firewood in a clearing, in the evening"],
    ["forest_campfire_night", 136, "Campfire, Night", "a small campfire burning in the dark"],
  ]),
  ...place("Giant Forest", "forest of giant ancient trees around a fallen trunk", [
    ["giant_forest_day", 141, "Day"],
    ["giant_forest_evening", 142, "Evening"],
    ["giant_forest_night", 143, "Night"],
  ]),
  ...place("Jungle", "dense tropical jungle of palms and red flowers", [
    ["jungle_day", 323, "Day"],
    ["jungle_sunset", 324, "Sunset"],
    ["jungle_night", 325, "Night"],
  ]),
  ...place("Jungle Waterfall", "jungle waterfall pouring into a clear turquoise pool", [
    ["jungle_waterfall_day", 326, "Day"],
    ["jungle_waterfall_sunset", 327, "Sunset"],
    ["jungle_waterfall_night", 328, "Night"],
  ]),
  ...place("Green Mountains", "rocky mountains patched with green under an open sky", [
    ["green_mountains_day", 329, "Day"],
    ["green_mountains_sunset", 330, "Sunset"],
    ["green_mountains_night", 331, "Night"],
  ]),
  ...place("Sea of Clouds", "green mountains rising out of a sea of clouds", [
    ["cloud_mountains_day", 270, "Day"],
    ["cloud_mountains_sunset", 271, "Sunset"],
    ["cloud_mountains_night", 272, "Night"],
  ]),
  ...place("Stone Spires", "towering stone spires rising from the clouds", [
    ["stone_spires_day", 273, "Day"],
    ["stone_spires_sunset", 274, "Sunset"],
    ["stone_spires_night", 275, "Night"],
  ]),
  ...place("Jagged Peaks", "jagged rocky peaks", [
    ["jagged_peaks_day", 252, "Day"],
    ["jagged_peaks_storm", 256, "Thunderstorm", "lightning striking all around"],
  ]),
  ...place("Volcano", "volcanic mountains running with lava", [["volcano", 251]]),
  ...place("Cherry Blossom Valley", "river valley with a great cherry tree in full bloom", [
    ["sakura_valley_day", 244, "Day"],
    ["sakura_valley_mist", 245, "Mist", "a strange violet mist on the ground"],
    ["sakura_valley_night", 246, "Night"],
  ]),

  // Coast and sea
  ...place("Beach", "white sand beach along a wooded coast", [
    ["beach_day", 161, "Day"],
    ["beach_sunset", 162, "Sunset"],
    ["beach_night", 163, "Night"],
    ["beach_bonfire_night", 164, "Bonfire, Night", "a bonfire on the sand at night"],
    ["beach_rain", 165, "Rain", "in pouring rain"],
    ["beach_cloudy", 166, "Cloudy", "under a grey, overcast sky"],
  ]),
  ...place("Tropical Beach", "tropical beach of turquoise water and palms, a thatched shelter", [["tropical_beach_day", 362]]),
  ...place("Rocky Beach", "grey rocky beach with wooden boats pulled up on the sand", [["rocky_beach", 257]]),
  ...place("Coastal Cliffs", "rocky cliffs above a sea cove", [["coastal_cliffs", 253]]),
  ...place("Stormy Shore", "grey shore under a stormy sky", [
    ["stormy_shore", 333],
    ["stormy_shore_sunset", 337, "Sunset"],
    ["stormy_shore_night", 338, "Night"],
    ["statue_shore", 334, "Statue", "a giant broken statue of a woman rising from the waves"],
    ["statue_shore_sunset", 339, "Statue, Sunset", "a giant broken statue of a woman rising from the waves, at sunset"],
    ["statue_shore_night", 340, "Statue, Night", "a giant broken statue of a woman rising from the waves, at night"],
    ["winged_statue_shore", 335, "Winged Statue", "a giant broken winged statue in the surf"],
    ["winged_statue_shore_sunset", 341, "Winged Statue, Sunset", "a giant broken winged statue in the surf, at sunset"],
    ["winged_statue_shore_night", 342, "Winged Statue, Night", "a giant broken winged statue in the surf, at night"],
    ["staff_statue_shore", 336, "Statue with Staff", "a giant broken statue holding a staff, in the surf"],
    ["staff_statue_shore_sunset", 343, "Statue with Staff, Sunset", "a giant broken statue holding a staff, at sunset"],
    ["staff_statue_shore_night", 344, "Statue with Staff, Night", "a giant broken statue holding a staff, at night"],
  ]),
  ...place("Ship's Deck", "the main deck of a wooden sailing ship, cannons and the stairs to the stern", [
    ["ship_deck_day", 170, "Day"],
    ["ship_deck_sunset", 171, "Sunset"],
    ["ship_deck_night", 172, "Night"],
    ["ship_deck_island_day", 173, "Island, Day", "an island on the horizon, by day"],
    ["ship_deck_island_sunset", 174, "Island, Sunset", "an island on the horizon, at sunset"],
    ["ship_deck_island_night", 175, "Island, Night", "an island on the horizon, at night"],
    ["ship_deck_other_ship_day", 176, "Another Ship, Day", "another ship sailing alongside, by day"],
    ["ship_deck_other_ship_sunset", 177, "Another Ship, Sunset", "another ship sailing alongside, at sunset"],
    ["ship_deck_other_ship_night", 178, "Another Ship, Night", "another ship sailing alongside, at night"],
    ["ship_deck_storm", 167, "Storm", "lashed by a storm, lightning and huge waves"],
    ["ship_deck_storm_ghost_ship", 169, "Storm, Ghost Ship", "lashed by a storm, a ghostly ship in the lightning"],
    ["ship_deck_rainbow", 179, "Rainbow", "a rainbow over calm sea"],
  ]),
  ...place("Ship's Bow", "the bow of a sailing ship under full sail, open sea ahead", [
    ["ship_bow_day", 183, "Day"],
    ["ship_bow_sunset", 184, "Sunset"],
    ["ship_bow_night", 185, "Night"],
    ["ship_bow_island_day", 186, "Island, Day", "an island on the horizon, by day"],
    ["ship_bow_island_sunset", 187, "Island, Sunset", "an island on the horizon, at sunset"],
    ["ship_bow_other_ship_day", 189, "Another Ship, Day", "another ship close by, by day"],
    ["ship_bow_other_ship_sunset", 190, "Another Ship, Sunset", "another ship close by, at sunset"],
    ["ship_bow_other_ship_night", 191, "Another Ship, Night", "another ship close by, at night"],
    ["ship_bow_storm", 180, "Storm", "plunging through a storm, lightning and huge waves"],
    ["ship_bow_storm_ghost_ship", 182, "Storm, Ghost Ship", "plunging through a storm, a ghostly ship in the lightning"],
    ["ship_bow_rainbow", 192, "Rainbow", "a rainbow over calm sea"],
  ]),

  // Camps
  ...place("Army Camp", "camp of canvas tents in a green valley below cliffs", [
    ["army_camp_day", 150, "Day"],
    ["army_camp_sunset", 151, "Sunset"],
    ["army_camp_night", 152, "Night", "a campfire burning at night"],
    ["army_camp_night_dark", 153, "Night, Fire Out", "at night, the campfire out"],
    ["army_camp_banner_day", 154, "Banner, Day", "a red banner with a white cross, by day"],
    ["army_camp_banner_sunset", 155, "Banner, Sunset", "a red banner with a white cross, at sunset"],
    ["army_camp_banner_night", 156, "Banner, Night", "a red banner with a white cross, a campfire at night"],
    ["army_camp_banner_night_dark", 157, "Banner, Night, Fire Out", "a red banner with a white cross, at night, the campfire out"],
  ]),
  ...place("Command Tent", "inside a command tent: a table, candles, axes and halberds", [
    ["command_tent", 158, "Map", "a map pinned to the canvas"],
    ["command_tent_plain", 159],
  ]),
  ...place("Barracks Tent", "inside a large tent of camp beds and drying laundry", [["barracks_tent", 160]]),
  ...place("Desert Camp", "canvas tents pitched on desert sand", [["desert_camp", 322]]),

  // Castles, palaces and temples
  ...place("Throne Room", "domed palace throne room of gold walls and a long red carpet", [
    ["throne_room", 144, "Weapon Racks", "weapon racks along the walls"],
    ["throne_room_plain", 145],
    ["throne_room_halloween", 146, "Halloween Feast", "decked out for a Halloween feast, pumpkins and a laden table"],
    ["throne_room_flags", 148, "American Flags", "green walls hung with American flags"],
  ]),
  ...place("Dark Throne Room", "dark throne room guarded by armoured knight statues, lit by torches", [["dark_throne_room", 147]]),
  ...place("Imperial Throne Hall", "Chinese imperial throne hall of red lacquer and gold", [["imperial_throne_hall", 149]]),
  ...place("Palace Corridor", "long palace corridor of gold-trimmed walls and lamps", [["palace_corridor", 124]]),
  ...place("Castle Battlements", "on a castle's stone battlements overlooking green plains", [
    ["castle_battlements_day", 213, "Day"],
    ["castle_battlements_sunset", 214, "Sunset"],
    ["castle_battlements_night", 215, "Night"],
  ]),
  ...place("Demon Gate", "palace wall around a huge carved demon-face gate", [
    ["demon_gate_red", 258, "Red"],
    ["demon_gate_blue", 259, "Blue"],
    ["demon_gate_green", 260, "Green"],
  ]),
  ...place("Holy City Wall", "towering white walls of a holy city, refugee tents at their foot", [
    ["city_wall_day", 279, "Day"],
    ["city_wall_campfires_day", 280, "Campfires", "small campfires among the tents, by day"],
    ["city_wall_smoke", 281, "Smoke", "a column of smoke rising behind the wall"],
    ["city_wall_sunset", 282, "Sunset"],
    ["city_wall_night", 283, "Night"],
    ["city_wall_glowing_night", 284, "Glowing", "the walls glowing bright blue at night"],
  ]),
  ...place("White City", "white castle city of spires behind its walls", [
    ["white_city_day", 285, "Day"],
    ["white_city_sunset", 286, "Sunset"],
    ["white_city_night", 287, "Night"],
  ]),
  ...place("White Castle", "white castle of blue banners and marble", [
    ["white_castle_corridor", 301, "Corridor", "a bright corridor hung with blue banners"],
    ["white_castle_throne", 303, "Throne Hall", "a throne hall with a tall throne between blue banners"],
    ["white_castle_throne_void", 304, "Throne in the Light", "the tall throne alone in a void of white light"],
    ["white_castle_courtyard", 305, "Courtyard", "a courtyard with a fountain under the spires"],
    ["white_castle_courtyard_2", 306, "Courtyard, Other View", "a courtyard with a fountain, seen from another spot"],
    ["white_castle_courtyard_burning", 307, "Courtyard, Burning", "the courtyard burning, smoke over the spires"],
    ["white_castle_courtyard_blast", 308, "Courtyard, Blast", "a blinding golden blast over the courtyard"],
  ]),
  ...place("Egyptian Temple", "Egyptian temple of pharaoh statues and carved walls", [
    ["egyptian_temple_avenue", 299, "Avenue", "an avenue of statues leading to a pyramid under blue sky"],
    ["egyptian_temple_sky", 320, "Looking Up", "looking up at the statues against the sky"],
    ["egyptian_temple_chamber", 298, "Inner Chamber", "a dark inner chamber guarded by statues"],
    ["egyptian_throne_hall", 300, "Throne Hall", "a golden throne hall at the top of a great stair"],
  ]),
  ...place("Colosseum", "Roman colosseum arena packed with spectators", [["colosseum", 204]]),
  ...place("Pierced Mansion", "grey neoclassical mansion with dragon statues, run through by a giant red spear", [["pierced_mansion", 205]]),
  ...place("Ancient Hall", "grey stone temple hall of carved pillars before a doorway", [
    ["ancient_hall", 202],
    ["ancient_hall_bones", 201, "Bones", "bones scattered on the floor"],
  ]),
  ...place("Stone Corridor", "white stone corridor with stairs and an archway", [["stone_corridor", 203]]),
  ...place("Crystal Ruin", "blue crystal monoliths in a ruined round hall open to the sky", [["crystal_ruin", 302]]),
  ...place("Crystal Throne Hall", "blue crystal throne hall under an ice chandelier", [["crystal_throne_hall", 353]]),

  // Dungeons
  ...place("Dungeon", "torch-lit stone dungeon", [
    ["dungeon_chamber", 193, "Chamber", "a chamber with an arched doorway"],
    ["dungeon_tunnel", 197, "Tunnel", "a damp tunnel"],
    ["dungeon_cell", 361, "Cell", "a dim cell with a bench, shackles and candles"],
    ["prison_corridor", 216, "Prison Corridor", "a corridor of barred cells and hanging chains"],
  ]),
  ...place("Dark Stone Chamber", "empty round stone chamber in darkness, one small door", [["dark_stone_chamber", 230]]),
  ...place("Green Vault", "dark vault of pillars lit an eerie green", [["green_vault", 234]]),

  // Villages and old towns
  ...place("Cliffside Village", "village of stone houses climbing a mountainside", [
    ["cliff_village_day", 288, "Day"],
    ["cliff_village_ruined", 289, "Ruined", "smoke rising from broken houses"],
    ["cliff_village_sunset", 290, "Sunset"],
    ["cliff_village_sunset_close", 291, "Sunset, Close", "seen from closer, at sunset"],
    ["cliff_village_night", 292, "Night", "windows lit at night"],
    ["cliff_village_night_dark", 294, "Night, Dark", "at night, every light out"],
    ["cliff_village_burning", 293, "Burning", "houses burning in the night"],
    ["river_village_day", 295, "Riverside, Day", "beside a river, by day"],
    ["river_village_sunset", 296, "Riverside, Sunset", "beside a river, at sunset"],
    ["river_village_night", 297, "Riverside, Night", "beside a river, at night"],
  ]),
  ...place("Old Japanese Town", "wide street of old Japanese walls and gates, a pagoda beyond", [
    ["edo_street_day", 247, "Day"],
    ["edo_street_mist", 248, "Mist", "filled with a strange violet mist"],
    ["edo_street_sunset", 249, "Sunset"],
  ]),
  ...place("Crimson Temple Gate", "great red temple gate under an eerie crimson night sky", [["crimson_temple_gate_night", 250]]),
  ...place("Ruined Village", "run-down wooden village under grey skies", [
    ["ruined_village", 254],
    ["ruined_village_teahouse", 255, "Teahouse", "a thatched teahouse with a red parasol and benches"],
  ]),

  // Modern town and city
  ...place("City Street", "city avenue of glass skyscrapers", [
    ["city_street_day", 348, "Day"],
    ["city_street_sunset", 349, "Sunset"],
    ["city_street_night", 350, "Night"],
  ]),
  ...place("City Towers", "modern city of lit towers under a crescent moon at night", [["city_towers_night", 217]]),
  ...place("Moon over the City", "huge moon hanging low over a city skyline at night", [["moon_over_city_night", 225]]),
  ...place("Balcony", "balcony with red pillars overlooking a city at night", [
    ["balcony_city_night", 218, "Night"],
    ["balcony_city_night_wide", 219, "Night, Wide", "a wider view of the skyline at night"],
    ["balcony_city_night_cloudy", 220, "Night, Cloudy", "low clouds over the skyline at night"],
  ]),
  ...place("Riverside Promenade", "riverside promenade under a red arched bridge", [
    ["riverside_day", 229, "Day"],
    ["riverside_night", 238, "Night"],
  ]),
  ...place("Red Bridge", "driving across a red steel bridge at night", [["red_bridge_night", 237]]),
  ...place("Harbor", "container harbor at night, street lamps over empty docks", [["harbor_night", 232]]),
  ...place("Town at Night", "quiet town at night", [
    ["town_crossing_night", 239, "Crossing", "a crossroads with shops still lit"],
    ["back_alley_night", 240, "Back Alley", "a narrow, grimy back alley"],
    ["residential_street_night", 241, "Residential Street", "houses and street lamps along a quiet road"],
  ]),
  ...place("Park at Night", "wooded park at night under a street lamp", [["park_night", 224]]),
  ...place("Mansion Gate", "western-style mansion behind a high wall and wooden gate", [
    ["mansion_gate_night", 242, "Night"],
    ["mansion_gate_burning", 243, "Burning", "the mansion in flames behind the gate"],
  ]),
  ...place("Mansion Courtyard", "courtyard of an old brick mansion at night", [["mansion_courtyard_night", 235]]),
  ...place("Haunted Mansion", "iron gates of a haunted mansion at night, fog and dead trees", [["haunted_mansion_night", 355]]),
  ...place("Ruined City", "ruined skyscrapers half-buried in a dusty wasteland", [
    ["ruined_city_day", 345, "Day"],
    ["ruined_city_sunset", 346, "Sunset"],
    ["ruined_city_night", 347, "Night"],
  ]),
  ...place("Rift Street", "ruined European street under a strange blue rift in the sky", [["rift_street", 354]]),

  // Indoors
  ...place("Apartment", "modern apartment", [
    ["apartment_entrance_night", 221, "Entrance, Night", "the entrance hall at night"],
    ["apartment_kitchen", 222, "Kitchen", "a tidy kitchen with a fridge and wooden floor"],
    ["apartment_kitchen_abandoned", 223, "Kitchen, Abandoned", "the kitchen dark and abandoned, the walls cracked"],
    ["apartment_messy_kitchen", 226, "Messy Kitchen", "a cluttered dining kitchen piled with boxes and trash bags"],
  ]),
  ...place("Modern Office", "bright, minimal modern office with leather chairs", [["modern_office", 236]]),
  ...place("Art Gallery", "long art gallery of framed paintings under a glass roof", [["art_gallery", 231]]),
  ...place("Underground Tunnel", "dark underground tunnel lit by rows of lamps", [["underground_tunnel", 233]]),
  ...place("Machine Hall", "vast hall of blue-lit machinery", [["machine_hall", 332]]),

  // Holidays and fantasy
  ...place("Halloween Town", "castle town at night hung with grinning pumpkin lanterns", [["halloween_town_night", 117]]),
  ...place("Halloween Party", "room decorated for a Halloween party: pumpkins, bats and ghosts", [["halloween_party", 358]]),
  ...place("Christmas Village", "snowy Christmas scene: a decorated tree, snowmen and presents", [["christmas_village", 211]]),
  ...place("Christmas Bedroom", "cosy bedroom decorated for Christmas: a tree, a fireplace, garlands", [["christmas_bedroom", 359]]),
  ...place("New Year Room", "Japanese room dressed for New Year: a golden screen, a kotatsu and decorations", [["new_year_room", 360]]),
  ...place("Candy Town", "fairy-tale town of candy and gingerbread houses", [["candy_town", 351]]),
  ...place("Crystal Forest", "forest of ice crystals under wheeling star trails", [["crystal_forest", 352]]),

  // Moods and effects
  ...place("Darkness", "pitch darkness over a wooden floor", [["darkness", 227]]),
  ...place("Petal Light", "dreamlike haze of pink light and falling petals", [["petal_light", 228]]),
  ...place("Pillar of Light", "pillar of light over a sea of clouds, a white path leading to it", [["pillar_of_light", 309]]),
  ...place("Battle Flash", "burst of light for a Noble Phantasm or a great clash", [
    ["flash_blue_burst", 311, "Blue", "a blue burst crackling with lightning"],
    ["flash_cyan_blast", 315, "Cyan", "a cyan explosion"],
    ["flash_star", 312, "Star", "a violet star-shaped flash"],
    ["flash_explosion", 314, "Explosion", "a fiery explosion cut by a blue beam"],
    ["flash_clash", 317, "Clash", "sparks flying from crossed blades"],
    ["flash_white", 318, "White", "a white flash with red embers"],
    ["flash_golden_pillar", 313, "Golden Pillar", "a golden pillar of light over the white castle"],
    ["flash_pyramid_blue", 310, "Pyramid, Blue", "a blue sun blazing over a pyramid between statues"],
    ["flash_pyramid_gold", 316, "Pyramid, Gold", "a golden sunburst over a pyramid between statues"],
    ["flash_pyramid_white", 319, "Pyramid, White", "a white blast over a pyramid"],
  ]),
];
