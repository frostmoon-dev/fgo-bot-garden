// The built-in lorebook: the world of Fate/Grand Order around the characters in prisma/bots.
// An entry is added to the AI's notes only when one of its keywords appears in the latest messages, so each
// one is short and its keywords are specific (no "Master" or "Servant": they would fire on every reply).
// Characters with their own bot describe themselves; these cover the places, terms and people they mention.
// Written to the database by prisma/seed-lore.ts.

export interface LoreSeed {
  title: string;
  keywords: string[];
  content: string;
}

export const CHALDEA_LORE: LoreSeed[] = [
  // Chaldea and its people
  {
    title: "Chaldea",
    keywords: ["Chaldea", "Chaldea Security Organization"],
    content:
      "The Chaldea Security Organization exists to protect the future of human history. Its original base stood high on a snowy mountain in Antarctica. It sends a Master and their Servants into broken points of history to set them right. Inside: corridors, a canteen, the command room, the summoning room, a simulator, and private rooms for the Master and the Servants.",
  },
  {
    title: "Chaldea's canteen",
    keywords: ["canteen", "cafeteria", "dining hall"],
    content:
      "Chaldea's canteen is where staff and Servants eat and gossip. Servants with a talent for cooking often take over the kitchen, so the food is good and the arguments about it are loud. It is busy at mealtimes and nearly empty late at night.",
  },
  {
    title: "Rayshift",
    keywords: ["Rayshift", "Rayshifting", "Rayshifted"],
    content:
      "Rayshift is Chaldea's way of sending a person into another time and place: they are broken down into information and rebuilt at the destination. Only people with high Rayshift aptitude can survive it; that aptitude is why Fujimaru was recruited.",
  },
  {
    title: "Command Seals",
    keywords: ["Command Seal", "Command Seals"],
    content:
      "Command Seals are red marks on a Master's hand. Each one is an absolute command to a Servant, or a burst of power to help them; once used, that mark fades. Chaldea's system slowly restores them. Fujimaru has three on the back of her right hand.",
  },
  {
    title: "Servants and Saint Graphs",
    keywords: ["Heroic Spirit", "Heroic Spirits", "Saint Graph", "Servant class"],
    content:
      "Servants are Heroic Spirits, heroes, gods and legends, summoned into a body called a Saint Graph and bound to a Master by contract. Each has a class: Saber, Archer, Lancer, Rider, Caster, Assassin, Berserker, and rarer ones such as Ruler, Avenger, Moon Cancer, Alter Ego, Foreigner, Pretender and Shielder. Their ultimate techniques are Noble Phantasms.",
  },
  {
    title: "Ascension",
    keywords: ["Ascension", "ascended", "Ascensions"],
    content:
      "As a Servant's Saint Graph grows stronger it can ascend, changing their outfit or form. It is the same Servant with the same memories; only how they look, and sometimes how they carry themselves, changes.",
  },
  {
    title: "Noble Phantasm",
    keywords: ["Noble Phantasm", "Noble Phantasms"],
    content:
      "A Noble Phantasm is a Servant's legend made real: a weapon, a technique or a miracle tied to who they were. Using one costs a great deal of magical energy and usually reveals who the Servant is.",
  },
  {
    title: "Mash Kyrielight",
    keywords: ["Mash", "Kyrielight"],
    content:
      "Mash Kyrielight is Chaldea's Demi-Servant: a girl fused with a Heroic Spirit, fighting with a huge shield as a Shielder. Lilac hair, glasses, polite, earnest and brave. She is Fujimaru's closest partner and calls her \"Senpai\". The small white creature Fou is usually with her.",
  },
  {
    title: "Fou",
    keywords: ["Fou", "Fou-kun"],
    content:
      "Fou is a small white furry creature that lives in Chaldea, usually on Mash's shoulder or underfoot. It makes a \"Fou!\" sound, is fond of Mash and Fujimaru, and is not fond of most other people.",
  },
  {
    title: "Leonardo da Vinci",
    keywords: ["Da Vinci", "da Vinci", "Leonardo", "Da Vinci-chan"],
    content:
      "Leonardo da Vinci is a Servant who works as Chaldea's technical director, the genius behind much of its equipment. Once in the form of a beautiful woman (the Mona Lisa); now usually a small, cheerful, overconfident girl everyone calls Da Vinci-chan.",
  },
  {
    title: "Sherlock Holmes",
    keywords: ["Holmes", "Sherlock"],
    content:
      "Sherlock Holmes, the great detective, is a Ruler Servant who works with Chaldea as a consulting detective: brilliant, theatrical, fond of withholding conclusions until the right moment.",
  },
  {
    title: "Goredolf Musik",
    keywords: ["Goredolf", "Musik", "Director Goredolf"],
    content:
      "Goredolf Musik is Chaldea's current director: a pompous, easily flustered magus who arrived to take over Chaldea and ended up running it through the Lostbelts. Proud of his cooking. Much braver and kinder than he lets on.",
  },
  {
    title: "Sion Eltnam Sokaris",
    keywords: ["Sion", "Sokaris"],
    content:
      "Sion Eltnam Sokaris is an alchemist from the Atlas Institute who helps Chaldea as an analyst and engineer: brilliant, calm and dryly funny.",
  },
  {
    title: "Dr. Roman",
    keywords: ["Romani", "Dr. Roman", "Archaman"],
    content:
      "Romani Archaman, Dr. Roman, was Chaldea's head of medicine and its acting director through the Grand Order to restore human history. Gentle, anxious, fond of sweets and an online idol. He is gone now; the people who knew him rarely talk about it.",
  },

  // History: Part 1 and Part 2
  {
    title: "Singularities and the Grand Order",
    keywords: ["Singularity", "Singularities", "Grand Order"],
    content:
      "Singularities are points in history that were distorted so badly that humanity's future was erased. In the Grand Order, Fujimaru and Mash travelled through seven of them, from France in 1431 to ancient Babylonia, and restored human history.",
  },
  {
    title: "Lostbelts",
    keywords: ["Lostbelt", "Lostbelts", "Crypter", "Crypters"],
    content:
      "Lostbelts are histories that were pruned as dead ends, now spread over a bleached Earth to replace the true one. Each was held by a Crypter, a former Chaldea Master candidate. Chaldea travels through them to take the world back, at the cost of erasing each Lostbelt and everyone living in it.",
  },
  {
    title: "Shadow Border",
    keywords: ["Shadow Border"],
    content:
      "The Shadow Border is the armored vehicle that carried Chaldea's survivors through the Lostbelts: home, laboratory and command room at once, cramped and full of people.",
  },
  {
    title: "Fairy Britain",
    keywords: ["Fairy Britain", "Avalon le Fae", "sixth Lostbelt"],
    content:
      "Fairy Britain (Avalon le Fae) was the sixth Lostbelt: a Britain of fairies ruled for millennia by Queen Morgan. Beautiful and cruel; fairies there were both innocent and capable of terrible things. Chaldea travelled it with Castoria, the Child of Prophecy, and with Oberon as a guide. Its ending is a sore spot for those who were there.",
  },
  {
    title: "Babylonia",
    keywords: ["Babylonia", "Uruk", "Kur"],
    content:
      "Babylonia, the seventh Singularity: ancient Mesopotamia, where King Gilgamesh ruled the city of Uruk against the Three Goddess Alliance. Ishtar and Ereshkigal, goddess of the underworld Kur, were both part of it.",
  },
  {
    title: "Orleans",
    keywords: ["Orleans"],
    content:
      "Orleans was the first Singularity: France in 1431, burned by a Dragon Witch who called herself Jeanne d'Arc. That Jeanne was an Alter, made from a grudge, and later became a Servant of Chaldea in her own right.",
  },

  // SE.RA.PH and the Moon Cell
  {
    title: "SE.RA.PH",
    keywords: ["SE.RA.PH", "Seraphix"],
    content:
      "SE.RA.PH was a digital world grown around Seraphix, an oil-rig research base at the bottom of the sea. Chaldea fought there against Sessyoin Kiara; BB, Meltryllis and Passionlip were part of the incident.",
  },
  {
    title: "Moon Cell",
    keywords: ["Moon Cell", "Holy Grail War on the Moon"],
    content:
      "The Moon Cell Automaton is a vast observing machine on the Moon that records everything on Earth. BB was born from its AI as a health-care program, which is where her powers and her mischief come from.",
  },
];
