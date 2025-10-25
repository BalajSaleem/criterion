/**
 * Topic Pages Configuration
 * 
 * Each topic has:
 * - slug: URL-friendly identifier
 * - title: Display name
 * - titleAr: Arabic name (optional)
 * - query: Search query for RAG (optimized for semantic search)
 * - description: Brief explanation (1-2 sentences)
 * - keywords: SEO keywords
 * - icon: Emoji for visual appeal (optional)
 * - priority: For sitemap (0.1-1.0)
 */

export interface Topic {
  slug: string;
  title: string;
  titleAr?: string;
  query: string;
  description: string;
  keywords: string[];
  icon?: string;
  priority: number;
  category?: string; // Category for grouping topics
  relatedTopics?: string[]; // slugs of related topics
}

export const TOPICS: Record<string, Topic> = {
  // Tier 1: Core Practices (5 Pillars + Faith)
  prayer: {
    slug: "prayer",
    title: "Prayer (Salah)",
    titleAr: "الصلاة",
    query: "prayer salah namaz sujood ruku prostration worship",
    description: "The second pillar of Islam and the connection between a believer and Allah. Discover verses and hadiths about establishing prayer, its importance, and its spiritual benefits.",
    keywords: ["prayer in Islam", "Salah", "namaz", "Islamic prayer", "how to pray", "prayer importance"],
    icon: "🤲",
    priority: 0.9,
    category: "Core Practices",
    relatedTopics: ["patience", "gratitude", "trust-in-allah"],
  },

  fasting: {
    slug: "fasting",
    title: "Fasting (Ramadan)",
    titleAr: "الصيام",
    query: "fasting ramadan sawm iftar suhoor abstinence self-control",
    description: "The spiritual practice of fasting during Ramadan, the holy month. Learn about the wisdom of fasting, its rules, and its transformative power in developing self-discipline and empathy.",
    keywords: ["Ramadan fasting", "sawm", "Islamic fasting", "Ramadan", "fasting rules"],
    icon: "🌙",
    priority: 0.9,
    category: "Core Practices",
    relatedTopics: ["patience", "gratitude", "forgiveness"],
  },

  charity: {
    slug: "charity",
    title: "Charity (Zakat)",
    titleAr: "الزكاة والصدقة",
    query: "charity zakat sadaqah giving poor needy generosity alms",
    description: "The obligation to give to those in need. Explore teachings about mandatory charity (Zakat), voluntary giving (Sadaqah), and the spiritual purification that comes from generosity.",
    keywords: ["Zakat", "charity in Islam", "sadaqah", "Islamic giving", "helping poor"],
    icon: "💚",
    priority: 0.85,
    category: "Core Practices",
    relatedTopics: ["gratitude", "justice", "family"],
  },

  hajj: {
    slug: "hajj",
    title: "Pilgrimage (Hajj)",
    titleAr: "الحج",
    query: "hajj pilgrimage mecca kaaba umrah sacred journey",
    description: "The sacred pilgrimage to Mecca, the fifth pillar of Islam. Understand the rites, significance, and spiritual dimensions of this once-in-a-lifetime obligation.",
    keywords: ["Hajj", "pilgrimage to Mecca", "Umrah", "Kaaba", "Islamic pilgrimage"],
    icon: "🕋",
    priority: 0.85,
    category: "Core Practices",
    relatedTopics: ["prayer", "faith", "prophets"],
  },

  faith: {
    slug: "faith",
    title: "Faith (Tawhid)",
    titleAr: "التوحيد",
    query: "tawhid oneness allah monotheism belief faith creed",
    description: "The fundamental belief in the Oneness of Allah. Explore the core of Islamic faith, the concept of Tawhid, and what it means to truly believe.",
    keywords: ["Tawhid", "Islamic faith", "oneness of Allah", "monotheism", "belief in Allah"],
    icon: "☝️",
    priority: 0.85,
    category: "Core Practices",
    relatedTopics: ["prophets", "trust-in-allah", "day-of-judgment"],
  },

  // Tier 2: Moral & Spiritual Virtues
  patience: {
    slug: "patience",
    title: "Patience (Sabr)",
    titleAr: "الصبر",
    query: "patience sabr endurance steadfastness perseverance trials hardship",
    description: "The virtue of remaining steadfast through life's trials. Discover how patience is rewarded, its different forms, and why it's considered half of faith.",
    keywords: ["patience in Islam", "Sabr", "endurance", "dealing with hardship", "perseverance"],
    icon: "🌱",
    priority: 0.85,
    category: "Spiritual Virtues",
    relatedTopics: ["trust-in-allah", "gratitude", "prayer"],
  },

  gratitude: {
    slug: "gratitude",
    title: "Gratitude (Shukr)",
    titleAr: "الشكر",
    query: "gratitude shukr thankfulness alhamdulillah appreciation blessings",
    description: "The practice of being thankful to Allah for all blessings. Learn why gratitude is the key to contentment and how it transforms our relationship with the Creator.",
    keywords: ["gratitude in Islam", "Shukr", "being thankful", "Alhamdulillah", "thankfulness"],
    icon: "🙏",
    priority: 0.8,
    category: "Spiritual Virtues",
    relatedTopics: ["patience", "prayer", "trust-in-allah"],
  },

  forgiveness: {
    slug: "forgiveness",
    title: "Forgiveness & Mercy",
    titleAr: "المغفرة والرحمة",
    query: "forgiveness mercy repentance tawbah pardon compassion",
    description: "Allah's infinite mercy and the path to forgiveness. Understand the beauty of divine forgiveness, the power of repentance, and how to forgive others.",
    keywords: ["forgiveness in Islam", "Allah's mercy", "repentance", "Tawbah", "seeking forgiveness"],
    icon: "💫",
    priority: 0.9,
    category: "Spiritual Virtues",
    relatedTopics: ["patience", "humility", "prayer"],
  },

  "trust-in-allah": {
    slug: "trust-in-allah",
    title: "Trust in Allah (Tawakkul)",
    titleAr: "التوكل",
    query: "trust allah tawakkul reliance faith dependence certainty",
    description: "Complete reliance on Allah while taking action. Learn about the balance between effort and trust, and how Tawakkul brings peace to the heart.",
    keywords: ["Tawakkul", "trust in Allah", "reliance on God", "faith in Allah", "Islamic trust"],
    icon: "🤝",
    priority: 0.8,
    category: "Spiritual Virtues",
    relatedTopics: ["faith", "patience", "prayer"],
  },

  humility: {
    slug: "humility",
    title: "Humility (Tawadu)",
    titleAr: "التواضع",
    query: "humility tawadu modesty pride arrogance meekness",
    description: "The virtue of lowering oneself before Allah and others. Discover teachings about humility, the danger of pride, and the beauty of modesty.",
    keywords: ["humility in Islam", "Tawadu", "modesty", "avoiding pride", "Islamic character"],
    icon: "🕊️",
    priority: 0.75,
    category: "Spiritual Virtues",
    relatedTopics: ["gratitude", "patience", "knowledge"],
  },

  // Tier 3: Life & Relationships
  family: {
    slug: "family",
    title: "Family & Parents",
    titleAr: "الأسرة والوالدين",
    query: "family parents children rights responsibilities kindness respect",
    description: "The sacred bonds of family in Islam. Learn about the rights of parents, the duties toward children, and the importance of maintaining family ties.",
    keywords: ["family in Islam", "parents rights", "children in Islam", "family bonds", "respecting parents"],
    icon: "👨‍👩‍👧‍👦",
    priority: 0.85,
    category: "Life & Relationships",
    relatedTopics: ["marriage", "justice", "knowledge"],
  },

  marriage: {
    slug: "marriage",
    title: "Marriage & Spouse",
    titleAr: "النكاح والزوجية",
    query: "marriage nikah spouse rights responsibilities love mercy companionship",
    description: "The sacred union between husband and wife. Explore teachings about choosing a spouse, marital rights, love, mercy, and building a strong Islamic family.",
    keywords: ["marriage in Islam", "nikah", "spouse rights", "Islamic marriage", "husband wife"],
    icon: "💍",
    priority: 0.85,
    category: "Life & Relationships",
    relatedTopics: ["family", "women-in-islam", "justice"],
  },

  "women-in-islam": {
    slug: "women-in-islam",
    title: "Women in Islam",
    titleAr: "المرأة في الإسلام",
    query: "women rights islam equality dignity honor modesty protection",
    description: "The honored status and rights of women in Islam. Understand what the Quran and Hadith actually say about women's rights, education, work, and dignity.",
    keywords: ["women in Islam", "women's rights Islam", "Islamic feminism", "hijab", "women equality"],
    icon: "👩",
    priority: 0.9,
    category: "Life & Relationships",
    relatedTopics: ["marriage", "family", "justice"],
  },

  justice: {
    slug: "justice",
    title: "Justice & Fairness",
    titleAr: "العدل",
    query: "justice fairness equality rights oppression stand truth",
    description: "The Islamic command to uphold justice for all. Learn about the importance of fairness, standing against oppression, and the accountability before Allah.",
    keywords: ["justice in Islam", "fairness", "equality Islam", "standing against oppression", "Islamic justice"],
    icon: "⚖️",
    priority: 0.85,
    category: "Life & Relationships",
    relatedTopics: ["women-in-islam", "charity", "knowledge"],
  },

  knowledge: {
    slug: "knowledge",
    title: "Knowledge & Learning",
    titleAr: "العلم",
    query: "knowledge learning wisdom education seek study understanding",
    description: "The obligation to seek knowledge. Discover why learning is an act of worship, the value of wisdom, and the pursuit of beneficial knowledge.",
    keywords: ["knowledge in Islam", "seeking knowledge", "Islamic education", "learning Islam", "wisdom"],
    icon: "📚",
    priority: 0.8,
    category: "Life & Relationships",
    relatedTopics: ["humility", "prophets", "prayer"],
  },

  // Tier 4: Afterlife & Belief
  paradise: {
    slug: "paradise",
    title: "Paradise (Jannah)",
    titleAr: "الجنة",
    query: "paradise jannah heaven afterlife eternal reward bliss",
    description: "The ultimate reward for believers. Explore descriptions of Paradise, its levels, pleasures, and the eternal joy promised to the righteous.",
    keywords: ["Jannah", "Paradise Islam", "Islamic heaven", "afterlife reward", "eternal paradise"],
    icon: "🌸",
    priority: 0.85,
    category: "Afterlife & Belief",
    relatedTopics: ["hell", "day-of-judgment", "death"],
  },

  hell: {
    slug: "hell",
    title: "Hell (Jahannam)",
    titleAr: "جهنم",
    query: "hell jahannam punishment fire warning consequences sin",
    description: "The place of punishment for the wicked. Understand the reality of Hell, its levels, and the warning against actions that lead to it.",
    keywords: ["Jahannam", "Hell Islam", "punishment", "hellfire", "Islamic hell"],
    icon: "🔥",
    priority: 0.75,
    category: "Afterlife & Belief",
    relatedTopics: ["paradise", "day-of-judgment", "forgiveness"],
  },

  "day-of-judgment": {
    slug: "day-of-judgment",
    title: "Day of Judgment",
    titleAr: "يوم القيامة",
    query: "judgment day qiyamah resurrection accountability reckoning",
    description: "The Day when all will be resurrected and judged. Learn about the signs, the reckoning, and the ultimate accountability before Allah.",
    keywords: ["Day of Judgment", "Qiyamah", "resurrection", "accountability", "Last Day"],
    icon: "⏰",
    priority: 0.85,
    category: "Afterlife & Belief",
    relatedTopics: ["paradise", "hell", "death"],
  },

  death: {
    slug: "death",
    title: "Death & the Hereafter",
    titleAr: "الموت والآخرة",
    query: "death dying soul barzakh grave life after mortality",
    description: "The inevitable reality and what comes after. Understand Islamic teachings about death, the soul's journey, the grave, and preparing for the Hereafter.",
    keywords: ["death in Islam", "life after death", "soul", "grave", "Islamic afterlife"],
    icon: "🌅",
    priority: 0.8,
    category: "Afterlife & Belief",
    relatedTopics: ["day-of-judgment", "paradise", "hell"],
  },

  prophets: {
    slug: "prophets",
    title: "Prophets & Messengers",
    titleAr: "الأنبياء والرسل",
    query: "prophets messengers muhammad moses jesus abraham noah",
    description: "The noble messengers sent by Allah throughout history. Learn about the prophets, their missions, their struggles, and the continuity of divine guidance.",
    keywords: ["Prophets Islam", "Muhammad", "Moses", "Jesus Islam", "messengers", "Islamic prophets"],
    icon: "✨",
    priority: 0.9,
    category: "Afterlife & Belief",
    relatedTopics: ["faith", "knowledge", "patience"],
  },
};

/**
 * Get all topic slugs for static generation
 */
export function getAllTopicSlugs(): string[] {
  return Object.keys(TOPICS);
}

/**
 * Get topic by slug
 */
export function getTopicBySlug(slug: string): Topic | undefined {
  return TOPICS[slug];
}

/**
 * Get related topics
 */
export function getRelatedTopics(slug: string): Topic[] {
  const topic = TOPICS[slug];
  if (!topic?.relatedTopics) return [];
  
  return topic.relatedTopics
    .map((relatedSlug) => TOPICS[relatedSlug])
    .filter(Boolean);
}

/**
 * Get all topics sorted by priority
 */
export function getAllTopicsSorted(): Topic[] {
  return Object.values(TOPICS).sort((a, b) => b.priority - a.priority);
}
