import fs from 'fs';

const css = fs.readFileSync('app/globals.css', 'utf-8');

// Simple selector extractor for checking duplicate root rules
const lines = css.split('\n');
const declaredSelectors = new Map();
let duplicateCount = 0;

lines.forEach((line, index) => {
  const trimmed = line.trim();
  // Check lines that look like standard class definitions (e.g., .my-class {)
  if (trimmed.startsWith('.') && trimmed.endsWith('{') && !trimmed.includes(',') && !trimmed.includes(':')) {
    const selector = trimmed.replace(/\s*\{$/, '').trim();
    if (declaredSelectors.has(selector)) {
      console.warn(`Duplicate rule found for "${selector}" at line ${index + 1} (previous at line ${declaredSelectors.get(selector)})`);
      duplicateCount++;
    } else {
      declaredSelectors.set(selector, index + 1);
    }
  }
});

if (duplicateCount === 0) {
  console.log('✓ check-css-duplicates: No duplicate single-class selectors detected.');
} else {
  console.log(`Found ${duplicateCount} duplicate selector(s).`);
}
