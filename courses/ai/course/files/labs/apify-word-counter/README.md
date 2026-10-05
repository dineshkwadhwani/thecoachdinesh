# Word Counter Actor

Counts how many times a specific word appears on any web page.

## What it does

1. Loads the given URL
2. Extracts all visible text (ignores scripts, styles, navigation)
3. Counts occurrences of the word using whole-word matching
4. Returns the count along with 5 sample context snippets

## Input

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | String | No | thecoachdinesh reference page | The web page to scan |
| `word` | String | **Yes** | — | The word to count |
| `caseSensitive` | Boolean | No | `false` | Count exact case only |

### Example input

```json
{
    "url": "https://www.thecoachdinesh.com/courses/ai/reference.html",
    "word": "AI",
    "caseSensitive": false
}
```

## Output

```json
{
    "url": "https://www.thecoachdinesh.com/courses/ai/reference.html",
    "pageTitle": "Reference | AI for Teachers | The Coach Dinesh",
    "wordSearched": "AI",
    "caseSensitive": false,
    "count": 312,
    "caseSensitiveCount": 287,
    "note": "Count is case-insensitive (e.g. 'AI', 'Ai', 'ai' all counted)",
    "sampleContexts": [
        "...How artificial intelligence (AI) can change the way you teach...",
        "...Today's AI applications are built for one specific task...",
        "...AI has a long way to go before being able to supplant a human..."
    ]
}
```

## Notes

- Uses **whole-word matching** — searching "AI" will NOT count "AIED" or "AI-powered" as matches unless the word boundary aligns
- Case-insensitive by default — "AI", "Ai", "ai" are all counted
- Strips nav, footer, scripts and styles before counting — only visible content is counted
- Returns up to 5 context snippets showing the word in context
