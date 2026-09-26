// The standard expression list every new character starts with. The ids are the words weaker models
// reach for anyway, and the descriptions tell the model when to use each one.
// Only expressions that have a face in the current ascension are offered to the model.
export interface ExpressionPreset {
  key: string;
  label: string;
  description: string;
}

export const DEFAULT_EXPRESSIONS: ExpressionPreset[] = [
  { key: "neutral", label: "Neutral", description: "calm, default face" },
  { key: "smile", label: "Smile", description: "friendly, pleased" },
  { key: "gentle", label: "Gentle", description: "soft, warm, caring" },
  { key: "happy", label: "Happy", description: "openly glad, bright" },
  { key: "laugh", label: "Laugh", description: "eyes closed, laughing" },
  { key: "grin", label: "Grin", description: "big toothy grin, playful energy" },
  { key: "excited", label: "Excited", description: "eager, thrilled" },
  { key: "proud", label: "Proud", description: "confident, pleased with themselves" },
  { key: "wink", label: "Wink", description: "playful wink" },
  { key: "smirk", label: "Smirk", description: "teasing, knowing" },
  { key: "smug", label: "Smug", description: "superior, self-satisfied" },
  { key: "sly", label: "Sly", description: "narrowed eyes, scheming, seeing through someone" },
  { key: "relieved", label: "Relieved", description: "tension gone, exhaling" },
  { key: "serious", label: "Serious", description: "focused, no joking" },
  { key: "determined", label: "Determined", description: "resolved, ready to act" },
  { key: "thinking", label: "Thinking", description: "pondering, considering" },
  { key: "confused", label: "Confused", description: "puzzled, doesn't follow" },
  { key: "bored", label: "Bored", description: "half-lidded, uninterested" },
  { key: "sleepy", label: "Sleepy", description: "tired, drowsy" },
  { key: "surprised", label: "Surprised", description: "startled, caught off guard" },
  { key: "shocked", label: "Shocked", description: "stunned, can't believe it" },
  { key: "shy", label: "Shy", description: "quiet blush, bashful" },
  { key: "embarrassed", label: "Embarrassed", description: "red-faced, wants to hide" },
  { key: "flustered", label: "Flustered", description: "blushing and flailing, composure broken" },
  { key: "pout", label: "Pout", description: "sulky, didn't get their way" },
  { key: "annoyed", label: "Annoyed", description: "irritated, lips pressed" },
  { key: "angry", label: "Angry", description: "clearly mad" },
  { key: "furious", label: "Furious", description: "shouting with rage" },
  { key: "shout", label: "Shout", description: "loud outburst, yelling" },
  { key: "glare", label: "Glare", description: "fierce stare, cold anger" },
  { key: "cold", label: "Cold", description: "distant, emotionless" },
  { key: "disgusted", label: "Disgusted", description: "repulsed, grossed out" },
  { key: "worried", label: "Worried", description: "concerned, uneasy" },
  { key: "nervous", label: "Nervous", description: "anxious, sweating" },
  { key: "panic", label: "Panic", description: "plans falling apart, frantic" },
  { key: "scared", label: "Scared", description: "afraid, trembling" },
  { key: "sad", label: "Sad", description: "downcast, hurt feelings" },
  { key: "disappointed", label: "Disappointed", description: "let down" },
  { key: "crying", label: "Crying", description: "in tears" },
  { key: "hurt", label: "Hurt", description: "in pain, wincing" },
  { key: "sinister", label: "Sinister", description: "dark smile, villainous" },
  { key: "menacing", label: "Menacing", description: "threatening, dangerous" },
];
