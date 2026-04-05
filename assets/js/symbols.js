/**
 * symbols.js
 * SVG icons for each Evangelist, drawn to match the medallion style on the
 * Ecclesiae edition covers. Each symbol references the traditional iconographic
 * creature associated with that Gospel (based on Ezekiel 1 / Revelation 4).
 */

/* global SYMBOLS */
const SYMBOLS = {

  /** Matthew — the Angel (human figure), kneeling in prayer with spread wings */
  mateus: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2.8"/>
  <circle cx="50" cy="50" r="38" stroke="currentColor" stroke-width="1" opacity=".35"/>
  <path d="M38 75 C20 65 12 45 16 25 C20 14 30 13 36 20 C32 30 30 48 38 62" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M36 20 C30 32 30 50 36 62" stroke="currentColor" stroke-width="1" opacity=".4" fill="none"/>
  <path d="M26 18 C22 30 22 46 28 58" stroke="currentColor" stroke-width="1" opacity=".3" fill="none"/>
  <path d="M62 75 C80 65 88 45 84 25 C80 14 70 13 64 20 C68 30 70 48 62 62" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M64 20 C70 32 70 50 64 62" stroke="currentColor" stroke-width="1" opacity=".4" fill="none"/>
  <path d="M74 18 C78 30 78 46 72 58" stroke="currentColor" stroke-width="1" opacity=".3" fill="none"/>
  <circle cx="50" cy="26" r="10" stroke="currentColor" stroke-width="2.2"/>
  <path d="M42 22 Q50 17 58 22" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <ellipse cx="46" cy="25" rx="1.5" ry="1.8" fill="currentColor" opacity=".8"/>
  <ellipse cx="54" cy="25" rx="1.5" ry="1.8" fill="currentColor" opacity=".8"/>
  <path d="M42 36 L38 75 Q50 80 62 75 L58 36 Q54 33 50 33 Q46 33 42 36Z" stroke="currentColor" stroke-width="2.2" fill="none"/>
  <path d="M46 52 L54 52 Q54 58 50 60 Q46 58 46 52Z" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <line x1="47" y1="38" x2="45" y2="70" stroke="currentColor" stroke-width="1" opacity=".4"/>
  <line x1="50" y1="37" x2="50" y2="72" stroke="currentColor" stroke-width="1" opacity=".4"/>
  <line x1="53" y1="38" x2="55" y2="70" stroke="currentColor" stroke-width="1" opacity=".4"/>
</svg>`,

  /** Mark — the Lion, full bust with radiating mane, frontal portrait */
  marcos: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2.8"/>
  <circle cx="50" cy="50" r="38" stroke="currentColor" stroke-width="1" opacity=".35"/>
  <path d="M50 12 C30 12 15 26 12 44 C10 60 18 76 32 83 C42 88 58 88 68 83 C82 76 90 60 88 44 C85 26 70 12 50 12Z" stroke="currentColor" stroke-width="1.8" fill="none" opacity=".6"/>
  <line x1="50" y1="14" x2="50" y2="22" stroke="currentColor" stroke-width="1.4"/>
  <line x1="64" y1="17" x2="61" y2="24" stroke="currentColor" stroke-width="1.4"/>
  <line x1="76" y1="26" x2="71" y2="31" stroke="currentColor" stroke-width="1.4"/>
  <line x1="83" y1="40" x2="77" y2="43" stroke="currentColor" stroke-width="1.4"/>
  <line x1="36" y1="17" x2="39" y2="24" stroke="currentColor" stroke-width="1.4"/>
  <line x1="24" y1="26" x2="29" y2="31" stroke="currentColor" stroke-width="1.4"/>
  <line x1="17" y1="40" x2="23" y2="43" stroke="currentColor" stroke-width="1.4"/>
  <line x1="15" y1="56" x2="21" y2="56" stroke="currentColor" stroke-width="1.4"/>
  <line x1="85" y1="56" x2="79" y2="56" stroke="currentColor" stroke-width="1.4"/>
  <line x1="82" y1="70" x2="77" y2="67" stroke="currentColor" stroke-width="1.4"/>
  <line x1="18" y1="70" x2="23" y2="67" stroke="currentColor" stroke-width="1.4"/>
  <ellipse cx="50" cy="46" rx="19" ry="18" stroke="currentColor" stroke-width="2.4"/>
  <ellipse cx="43" cy="42" rx="3.5" ry="3" stroke="currentColor" stroke-width="1.8"/>
  <ellipse cx="57" cy="42" rx="3.5" ry="3" stroke="currentColor" stroke-width="1.8"/>
  <ellipse cx="43" cy="42" rx="1.5" ry="1.5" fill="currentColor"/>
  <ellipse cx="57" cy="42" rx="1.5" ry="1.5" fill="currentColor"/>
  <path d="M47 44 Q50 46 53 44" stroke="currentColor" stroke-width="1.4" fill="none"/>
  <path d="M45 49 Q50 53 55 49 Q53 56 50 55 Q47 56 45 49Z" stroke="currentColor" stroke-width="1.8" fill="none"/>
  <path d="M42 57 Q50 62 58 57" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <line x1="47" y1="60" x2="46" y2="65" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <line x1="50" y1="62" x2="50" y2="67" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <line x1="53" y1="60" x2="54" y2="65" stroke="currentColor" stroke-width="1" opacity=".5"/>
</svg>`,

  /** Luke — the Winged Ox, frontal body with broad curved horns and open wings */
  lucas: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2.8"/>
  <circle cx="50" cy="50" r="38" stroke="currentColor" stroke-width="1" opacity=".35"/>
  <path d="M36 52 C26 46 14 36 14 22 C14 14 22 12 28 16 C26 26 28 38 36 50" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M28 16 C24 26 26 40 34 50" stroke="currentColor" stroke-width="1" opacity=".4" fill="none"/>
  <path d="M18 18 C16 28 18 42 26 52" stroke="currentColor" stroke-width="1" opacity=".3" fill="none"/>
  <path d="M64 52 C74 46 86 36 86 22 C86 14 78 12 72 16 C74 26 72 38 64 50" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M72 16 C76 26 74 40 66 50" stroke="currentColor" stroke-width="1" opacity=".4" fill="none"/>
  <path d="M82 18 C84 28 82 42 74 52" stroke="currentColor" stroke-width="1" opacity=".3" fill="none"/>
  <path d="M38 30 Q26 18 28 10 Q34 14 36 22 Q40 28 42 32" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M62 30 Q74 18 72 10 Q66 14 64 22 Q60 28 58 32" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="50" cy="38" rx="15" ry="12" stroke="currentColor" stroke-width="2.4"/>
  <circle cx="43" cy="35" r="2.8" stroke="currentColor" stroke-width="1.8"/>
  <circle cx="57" cy="35" r="2.8" stroke="currentColor" stroke-width="1.8"/>
  <circle cx="43" cy="35" r="1.2" fill="currentColor"/>
  <circle cx="57" cy="35" r="1.2" fill="currentColor"/>
  <ellipse cx="50" cy="43" rx="8" ry="5" stroke="currentColor" stroke-width="2"/>
  <ellipse cx="47" cy="43" rx="2" ry="1.5" stroke="currentColor" stroke-width="1.4"/>
  <ellipse cx="53" cy="43" rx="2" ry="1.5" stroke="currentColor" stroke-width="1.4"/>
  <path d="M36 50 L34 78 L42 78 L42 64 L50 66 L58 64 L58 78 L66 78 L64 50" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linejoin="round"/>
  <path d="M36 50 Q50 58 64 50" stroke="currentColor" stroke-width="2" fill="none"/>
  <path d="M64 72 Q72 68 74 76 Q70 82 66 78" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`,

  /** John — the Eagle, profile facing right with hooked beak and feathered wings */
  joao: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2.8"/>
  <circle cx="50" cy="50" r="38" stroke="currentColor" stroke-width="1" opacity=".35"/>
  <path d="M40 52 C24 48 12 54 10 66 C10 76 22 80 36 74 L40 66" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M38 54 C24 52 14 58 12 68" stroke="currentColor" stroke-width="1" opacity=".4" fill="none"/>
  <path d="M38 60 C26 60 16 64 14 72" stroke="currentColor" stroke-width="1" opacity=".3" fill="none"/>
  <path d="M60 52 C76 48 88 54 90 66 C90 76 78 80 64 74 L60 66" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M62 54 C76 52 86 58 88 68" stroke="currentColor" stroke-width="1" opacity=".4" fill="none"/>
  <path d="M62 60 C74 60 84 64 86 72" stroke="currentColor" stroke-width="1" opacity=".3" fill="none"/>
  <ellipse cx="50" cy="60" rx="14" ry="18" stroke="currentColor" stroke-width="2.4"/>
  <path d="M40 55 Q50 51 60 55" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".5"/>
  <path d="M38 62 Q50 58 62 62" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".5"/>
  <path d="M40 69 Q50 65 60 69" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".5"/>
  <ellipse cx="54" cy="28" rx="11" ry="12" stroke="currentColor" stroke-width="2.4"/>
  <line x1="50" y1="17" x2="48" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="54" y1="16" x2="54" y2="11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="58" y1="17" x2="60" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M64 26 L76 22 L74 28 L66 32 Q68 28 64 26Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>
  <circle cx="60" cy="25" r="3.5" stroke="currentColor" stroke-width="1.8"/>
  <circle cx="60" cy="25" r="1.5" fill="currentColor"/>
  <path d="M56 21 Q62 19 66 22" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <path d="M44 38 Q54 42 64 38" stroke="currentColor" stroke-width="2" fill="none"/>
  <path d="M42 76 L36 88" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M50 78 L50 90" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M58 76 L64 88" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`,
};
