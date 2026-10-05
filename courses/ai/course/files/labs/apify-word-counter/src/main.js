// ============================================================
// Word Counter Actor — thecoachdinesh.com
// Reads a URL, counts occurrences of a given word on the page
// ============================================================
// INPUT:
//   url  (string) — the page to scan (default: thecoachdinesh reference page)
//   word (string) — the word to search for (case-insensitive)
//
// OUTPUT (dataset):
//   { url, word, count, caseSensitiveCount, positions, pageTitle }
// ============================================================

import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

// ── 1. Read input ─────────────────────────────────────────────
const input = await Actor.getInput();

const {
    url   = 'https://www.thecoachdinesh.com/courses/ai/reference.html',
    word  = 'AI',
    caseSensitive = false,
} = input || {};

if (!word || word.trim() === '') {
    throw new Error('Input "word" is required. Please provide a word to search for.');
}

const searchWord = word.trim();

console.log(`🔍 Searching for "${searchWord}" on: ${url}`);
console.log(`   Case sensitive: ${caseSensitive}`);

// ── 2. Crawl the page ────────────────────────────────────────
let result = null;

const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 1,

    async requestHandler({ $, request }) {
        // Get the page title
        const pageTitle = $('title').text().trim() || 'No title';

        // Extract all visible text — exclude scripts, styles, nav
        $('script, style, noscript, nav, footer').remove();
        const rawText = $('body').text();

        // Normalise whitespace
        const text = rawText.replace(/\s+/g, ' ').trim();

        // ── Count occurrences ──────────────────────────────────
        // Build regex — word boundary match for accuracy
        const flags = caseSensitive ? 'g' : 'gi';
        const escapedWord = searchWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, flags);

        const matches = text.match(regex) || [];
        const count = matches.length;

        // Case-sensitive count (always computed for reference)
        const regexCS = new RegExp(`\\b${escapedWord}\\b`, 'g');
        const matchesCS = text.match(regexCS) || [];
        const caseSensitiveCount = matchesCS.length;

        // ── Find up to 5 context snippets ──────────────────────
        const snippets = [];
        const regexForSnippets = new RegExp(
            `.{0,60}\\b${escapedWord}\\b.{0,60}`,
            caseSensitive ? 'g' : 'gi'
        );
        let snippetMatch;
        let snippetCount = 0;
        while ((snippetMatch = regexForSnippets.exec(text)) !== null && snippetCount < 5) {
            snippets.push('...' + snippetMatch[0].trim() + '...');
            snippetCount++;
        }

        result = {
            url: request.url,
            pageTitle,
            wordSearched: searchWord,
            caseSensitive,
            count,
            caseSensitiveCount,
            note: caseSensitive
                ? 'Count is case-sensitive'
                : 'Count is case-insensitive (e.g. "AI", "Ai", "ai" all counted)',
            sampleContexts: snippets,
        };

        console.log(`✅ Found "${searchWord}" ${count} times on the page`);
        console.log(`   Page title: "${pageTitle}"`);
    },

    failedRequestHandler({ request, error }) {
        console.error(`❌ Failed to load: ${request.url} — ${error.message}`);
    },
});

await crawler.run([url]);

// ── 3. Push result to dataset ────────────────────────────────
if (result) {
    await Actor.pushData(result);
    console.log('\n📊 RESULT:');
    console.log(`   Word:  "${result.wordSearched}"`);
    console.log(`   Count: ${result.count} (case-insensitive)`);
    console.log(`   Count: ${result.caseSensitiveCount} (case-sensitive)`);
} else {
    await Actor.pushData({
        url,
        wordSearched: searchWord,
        count: 0,
        error: 'Page could not be loaded or no text found.',
    });
}

await Actor.exit();
