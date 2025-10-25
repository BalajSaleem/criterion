/**
 * Test suite for getQuranByReference tool
 * Run with: pnpm tsx scripts/test-quran-reference.ts
 */

import {
  parseQuranReference,
  validateReference,
  calculateContextWindow,
} from "../lib/quran-reference-parser";
import { getVerseRange } from "../lib/db/queries";

console.log("🧪 Testing getQuranByReference Tool\n");

// Test 1: Parse valid single verse
console.log("Test 1: Parse single verse");
const test1 = parseQuranReference("2:255");
console.log("Input: '2:255'");
console.log("Result:", test1);
console.log("✓ Expected: { surahNumber: 2, startAyah: 255, endAyah: 255, isRange: false }\n");

// Test 2: Parse valid range
console.log("Test 2: Parse verse range");
const test2 = parseQuranReference("2:10-20");
console.log("Input: '2:10-20'");
console.log("Result:", test2);
console.log("✓ Expected: { surahNumber: 2, startAyah: 10, endAyah: 20, isRange: true }\n");

// Test 3: Parse invalid format
console.log("Test 3: Parse invalid format");
const test3 = parseQuranReference("2-255");
console.log("Input: '2-255'");
console.log("Result:", test3);
console.log("✓ Expected: null\n");

// Test 4: Validate valid reference
console.log("Test 4: Validate valid reference");
const parsed4 = parseQuranReference("2:255");
if (parsed4) {
  const validation4 = validateReference(parsed4);
  console.log("Input: '2:255'");
  console.log("Result:", validation4);
  console.log("✓ Expected: { valid: true }\n");
}

// Test 5: Validate invalid Surah
console.log("Test 5: Validate invalid Surah number");
const parsed5 = parseQuranReference("115:1");
if (parsed5) {
  const validation5 = validateReference(parsed5);
  console.log("Input: '115:1'");
  console.log("Result:", validation5);
  console.log("✓ Expected: { valid: false, error: '...' }\n");
}

// Test 6: Validate invalid Ayah
console.log("Test 6: Validate invalid Ayah number");
const parsed6 = parseQuranReference("2:300");
if (parsed6) {
  const validation6 = validateReference(parsed6);
  console.log("Input: '2:300' (Al-Baqarah has 286 verses)");
  console.log("Result:", validation6);
  console.log("✓ Expected: { valid: false, error: '...' }\n");
}

// Test 7: Validate invalid range (start > end)
console.log("Test 7: Validate invalid range");
const parsed7 = parseQuranReference("2:20-10");
if (parsed7) {
  const validation7 = validateReference(parsed7);
  console.log("Input: '2:20-10'");
  console.log("Result:", validation7);
  console.log("✓ Expected: { valid: false, error: '...' }\n");
}

// Test 8: Calculate context window at start of Surah
console.log("Test 8: Context window at Surah start");
const context8 = calculateContextWindow(2, 2, 10);
console.log("Input: Surah 2, Ayah 2, contextWindow 10");
console.log("Result:", context8);
console.log("✓ Expected: { startAyah: 1, endAyah: 12 } (clamped to start)\n");

// Test 9: Calculate context window at end of Surah
console.log("Test 9: Context window at Surah end");
const context9 = calculateContextWindow(2, 285, 10);
console.log("Input: Surah 2, Ayah 285, contextWindow 10");
console.log("Result:", context9);
console.log("✓ Expected: { startAyah: 275, endAyah: 286 } (clamped to end)\n");

// Test 10: Calculate context window in middle
console.log("Test 10: Context window in middle");
const context10 = calculateContextWindow(2, 150, 5);
console.log("Input: Surah 2, Ayah 150, contextWindow 5");
console.log("Result:", context10);
console.log("✓ Expected: { startAyah: 145, endAyah: 155 }\n");

// Test 11: Database query for single verse (if DB is available)
console.log("Test 11: Database query test");
console.log("Skipping database tests - run via integration test\n");

console.log("✅ All parser and validation tests complete!");
console.log("\nTo test the full tool integration:");
console.log("1. Start dev server: pnpm dev");
console.log("2. Open chat UI at localhost:3000");
console.log("3. Try queries like:");
console.log("   - 'Show me verse 2:255'");
console.log("   - 'Read verses 1:1-7'");
console.log("   - 'Compare verses 2:255, 18:10, and 67:2'");
console.log("   - 'Show verse 2:10 with surrounding context'");
