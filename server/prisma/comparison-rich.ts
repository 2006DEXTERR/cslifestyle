/**
 * Rich demo data for the seeded comparisons — grouped, typed specs + editorial content
 * for the EXISTING seed products. This is authored demo/seed data (like lib/data mock),
 * using well-known public specs of these products; it is not scraped and is clearly seed
 * data, not a live claim. Keyed by comparison slug. Per-spec winners are computed by the
 * winner engine from `winnerMode` + numeric values (or set manually for text specs).
 */

export interface RichSpec {
  specName: string;
  specGroup: string;
  displayType: 'text' | 'number' | 'boolean' | 'currency' | 'percentage' | 'badge';
  valueType: 'string' | 'integer' | 'float' | 'boolean';
  winnerMode: 'manual' | 'higher_better' | 'lower_better' | 'equal' | 'none';
  unit?: string;
  productAValue?: string;
  productBValue?: string;
  numberValueA?: number;
  numberValueB?: number;
  booleanValueA?: boolean;
  booleanValueB?: boolean;
  winner?: 'A' | 'B' | 'tie';
  details?: string;
}

export interface RichComparison {
  editorSummary?: string;
  whoShouldBuyA?: string;
  whoShouldBuyB?: string;
  bestFor?: string;
  faq?: { question: string; answer: string }[];
  comparisonScoreA?: number;
  comparisonScoreB?: number;
  featured?: boolean;
  winner?: 'A' | 'B' | 'tie';
  /** Product slugs (existing seed products) surfaced as "Recommended Alternatives". */
  alternativeSlugs?: string[];
  specs: RichSpec[];
}

const n = (
  specName: string,
  specGroup: string,
  a: number,
  b: number,
  unit: string,
  winnerMode: RichSpec['winnerMode'],
  displayType: RichSpec['displayType'] = 'number',
  details?: string,
): RichSpec => ({
  specName, specGroup, displayType, valueType: Number.isInteger(a) && Number.isInteger(b) ? 'integer' : 'float',
  winnerMode, unit, numberValueA: a, numberValueB: b,
  productAValue: `${a}${unit ? ` ${unit}` : ''}`, productBValue: `${b}${unit ? ` ${unit}` : ''}`, details,
});
const t = (specName: string, specGroup: string, a: string, b: string, winner: RichSpec['winner'], details?: string): RichSpec => ({
  specName, specGroup, displayType: 'text', valueType: 'string', winnerMode: 'manual', productAValue: a, productBValue: b, winner, details,
});
const bool = (specName: string, specGroup: string, a: boolean, b: boolean, winner: RichSpec['winner']): RichSpec => ({
  specName, specGroup, displayType: 'boolean', valueType: 'boolean', winnerMode: 'manual', booleanValueA: a, booleanValueB: b,
  productAValue: a ? 'Yes' : 'No', productBValue: b ? 'Yes' : 'No', winner,
});

export const COMPARISON_RICH: Record<string, RichComparison> = {
  'iphone-15-vs-samsung-s24': {
    featured: true,
    winner: 'B',
    comparisonScoreA: 92,
    comparisonScoreB: 94,
    bestFor: 'Premium flagship buyers',
    alternativeSlugs: ['oneplus-12'],
    editorSummary:
      "Two of the finest flagships you can buy. The Galaxy S24 Ultra edges ahead on display, battery, zoom range and the built-in S Pen; the iPhone 15 Pro Max counters with class-leading video, tighter integration and a lighter build.",
    whoShouldBuyA:
      "Buy the iPhone 15 Pro Max if you're invested in the Apple ecosystem, want the best video recording on a phone, prefer a lighter body, and value long, predictable iOS updates.",
    whoShouldBuyB:
      "Buy the Galaxy S24 Ultra if you want the S Pen, the brightest and largest display, longer battery life, and the most versatile camera system with true 10x optical zoom.",
    faq: [
      { question: 'Which phone has the better camera?', answer: 'Both are excellent. The iPhone leads for video and colour consistency; the S24 Ultra wins for reach with its 200MP main sensor and 10x optical zoom.' },
      { question: 'Which one lasts longer on a charge?', answer: 'The S24 Ultra generally lasts longer thanks to its larger 5000mAh battery and faster 45W charging versus the iPhone’s 4422mAh and 27W.' },
      { question: 'Does either phone have a stylus?', answer: 'Only the Galaxy S24 Ultra includes a built-in S Pen; the iPhone 15 Pro Max does not support an integrated stylus.' },
    ],
    specs: [
      n('Screen Size', 'Display', 6.7, 6.8, 'in', 'higher_better'),
      n('Refresh Rate', 'Display', 120, 120, 'Hz', 'equal'),
      n('Peak Brightness', 'Display', 2000, 2600, 'nits', 'higher_better', 'number', 'The S24 Ultra gets noticeably brighter outdoors.'),
      t('Chipset', 'Performance', 'Apple A17 Pro', 'Snapdragon 8 Gen 3', 'A', 'A17 Pro leads single-core; both are extremely fast.'),
      n('RAM', 'Memory', 8, 12, 'GB', 'higher_better'),
      n('Main Camera', 'Camera', 48, 200, 'MP', 'higher_better'),
      n('Optical Zoom', 'Camera', 5, 10, 'x', 'higher_better'),
      n('Battery', 'Battery', 4422, 5000, 'mAh', 'higher_better'),
      n('Charging', 'Charging', 27, 45, 'W', 'higher_better'),
      n('Weight', 'Build', 221, 232, 'g', 'lower_better'),
      t('Water Resistance', 'Build', 'IP68', 'IP68', 'tie'),
      bool('Stylus (S Pen)', 'Software', false, true, 'B'),
      t('OS Updates', 'Software', '5 years', '7 years', 'B'),
      n('Launch Price', 'Value', 149900, 129999, '', 'lower_better', 'currency'),
    ],
  },

  'boat-vs-noise-earbuds': {
    winner: 'tie',
    comparisonScoreA: 86,
    comparisonScoreB: 84,
    bestFor: 'Budget wireless earbuds',
    alternativeSlugs: ['samsung-galaxy-buds-pro-2', 'sony-wh-1000xm5'],
    editorSummary:
      'Two of India’s most popular value earbud brands. boAt wins on battery life and price, while the Noise pair offers a more balanced sound signature and solid ANC for the money.',
    whoShouldBuyA: 'Choose the boAt buds if you want the longest battery life, punchy bass, and the best price for everyday listening and calls.',
    whoShouldBuyB: 'Choose the Noise buds if you prefer a more balanced, detailed sound and want capable active noise cancellation.',
    faq: [
      { question: 'Which has better battery life?', answer: 'The boAt buds last longer overall, with a larger charging case capacity for more total playback.' },
      { question: 'Do both support noise cancellation?', answer: 'Both offer ANC in this range; the Noise pair edges ahead on ANC effectiveness while boAt focuses on battery and value.' },
    ],
    specs: [
      n('Total Playback', 'Battery', 50, 40, 'hrs', 'higher_better', 'number', 'Includes the charging case.'),
      n('Driver Size', 'Audio', 10, 10, 'mm', 'equal'),
      t('Sound Signature', 'Audio', 'Bass-heavy', 'Balanced', 'B'),
      bool('Active Noise Cancellation', 'Audio', true, true, 'B'),
      t('Bluetooth', 'Connectivity', 'v5.3', 'v5.3', 'tie'),
      t('Water Resistance', 'Build', 'IPX4', 'IPX5', 'B'),
      n('Price', 'Value', 1299, 1799, '', 'lower_better', 'currency'),
    ],
  },

  'macbook-vs-dell-xps': {
    winner: 'A',
    comparisonScoreA: 93,
    comparisonScoreB: 89,
    bestFor: 'Premium creator laptops',
    editorSummary:
      'The MacBook Pro 14" leads on battery life, efficiency and sustained performance, while the Dell XPS 15 offers a stunning OLED option, a discrete NVIDIA GPU and the flexibility of Windows.',
    whoShouldBuyA: 'Buy the MacBook Pro if you want the best battery life, silent efficient performance, and a first-class macOS creative workflow.',
    whoShouldBuyB: 'Buy the Dell XPS 15 if you need Windows, want a gorgeous OLED screen with touch, and value a discrete RTX GPU for gaming or CUDA work.',
    faq: [
      { question: 'Which laptop has better battery life?', answer: 'The MacBook Pro’s Apple silicon delivers noticeably longer real-world battery life than the XPS 15.' },
      { question: 'Which is better for gaming?', answer: 'The Dell XPS 15 with its discrete NVIDIA RTX GPU is the stronger gaming and CUDA machine.' },
    ],
    specs: [
      t('Processor', 'Performance', 'Apple M3 Pro', 'Intel Core i7', 'A', 'M3 Pro leads on efficiency and sustained performance.'),
      n('RAM', 'Memory', 18, 16, 'GB', 'higher_better'),
      n('Storage', 'Storage', 512, 512, 'GB', 'equal'),
      t('Display', 'Display', '14.2" Liquid Retina XDR', '15.6" OLED', 'tie', 'Both are excellent; XDR is brighter, OLED has deeper blacks.'),
      bool('Touchscreen', 'Display', false, true, 'B'),
      bool('Discrete GPU', 'Gaming', false, true, 'B'),
      n('Battery', 'Battery', 70, 86, 'Wh', 'higher_better', 'number', 'Despite a smaller battery, the MacBook lasts longer thanks to efficiency.'),
      n('Weight', 'Build', 1.61, 1.86, 'kg', 'lower_better'),
      n('Price', 'Value', 169900, 149990, '', 'lower_better', 'currency'),
    ],
  },
};
