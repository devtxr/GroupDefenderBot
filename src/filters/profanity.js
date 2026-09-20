// Common Hindi/Hinglish/English abusive-word roots.
// Keep this list configurable; add/remove terms with /filter commands.
// Matching is normalized to catch spacing and punctuation variants.

const DEFAULT_TERMS = [
  "bc", "b.c", "bkl", "b.k.l", "bsdk", "b.s.d.k",
  "mc", "m.c", "madarchod", "madar chod",
  "chutiya", "chutia", "chod", "chodu",
  "gandu", "gaand", "gand", "harami", "haraami",
  "kamina", "kamine", "kaminey", "kutte", "kutta",
  "randi", "rand", "besharam",
  "fuck", "fucking", "fucker", "motherfucker",
  "bitch", "asshole", "dickhead", "shit", "bullshit",
  "bastard", "slut", "whore"
];

function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[@#$%^&*()_+\-=\[\]{};:'",.<>/?\\|`~!]/g, "")
    .replace(/\s+/g, "");
}

function containsProfanity(text, customWords = []) {
  const raw = String(text || "").toLowerCase();
  const compact = normalize(raw);
  const terms = [...DEFAULT_TERMS, ...customWords]
    .map(x => String(x).toLowerCase().trim())
    .filter(Boolean);

  for (const term of terms) {
    const compactTerm = normalize(term);
    if (compactTerm && (compact.includes(compactTerm) || raw.includes(term))) {
      return term;
    }
  }
  return null;
}

module.exports = { containsProfanity, DEFAULT_TERMS };
