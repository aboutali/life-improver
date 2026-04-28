# Life Improver

> Before you arrange the stones, first see the whole garden.

An interactive framework of meaningful life practices, rooted in psychology, philosophy, and the world's contemplative traditions. The app maps **seven domains** of a complete human life — Body, Mind, Work, Relationships, Community, Inner Life, and Play — into 30 subcategories with 300+ concrete practices, each traceable back to its source.

It's a tool for three things:

- **Develop** — extend a curated body of life practices through pull requests.
- **Use** — explore practices, rate yourself across the seven grounds, and see where the water wants to go. Your assessment is saved locally to your browser.
- **Extend** — add your own practices to any subcategory directly from the UI; they live in your browser alongside the curated set.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

To build a static bundle:

```bash
npm run build
npm run preview
```

## What you get

Four tabs:

1. **Overview** — accordion of the seven domains and their subcategories with descriptions.
2. **Self-Assessment** — rate each subcategory 1–10. The app surfaces your lowest scores under "where the water wants to go" and persists everything to `localStorage`.
3. **Ideas to Improve** — ten curated practices per subcategory, plus a small input to append your own.
4. **Sources** — every theory, study, and tradition that backs the practices, organized by discipline.

## Project structure

```
src/
├── App.jsx                  # tab orchestration
├── main.jsx                 # React entry
├── styles.css               # all CSS (fonts, classes used by inline JSX styles)
├── data/
│   ├── framework.js         # the 7 domains, 30 subs, 300+ practices
│   └── sources.js           # citations, organized by discipline
├── hooks/
│   ├── usePersistentState.js  # useState mirrored to localStorage
│   ├── useScores.js           # 1–10 scores + averages + lowest list
│   └── useCustomPractices.js  # user-added practices per sub
└── components/
    ├── Header.jsx
    ├── TabBar.jsx
    ├── DomainSidebar.jsx    # shared between Self-Assessment and Ideas
    ├── Overview.jsx
    ├── SelfAssessment.jsx
    ├── Ideas.jsx
    └── Sources.jsx
```

## Extending the framework

The framework is data, not code. To add to the curated set, edit `src/data/framework.js`. The schema:

```js
{
  id: 8,                     // must be unique and stable across releases
  domain: "Domain Name",
  desc: "A paragraph explaining why this domain matters, with citations woven in.",
  subs: [
    {
      name: "Subcategory Name",
      desc: "What this subcategory is and which traditions inform it.",
      ideas: [
        "A concrete, imperative practice — short, specific, evidence-based",
        // ...
      ]
    }
  ]
}
```

A few conventions worth keeping:

- **Voice.** Practices are imperative ("Walk 8,000+ steps daily…"), terse, and evidence-flavoured. Subcategory `desc` strings name the traditions or researchers behind the area. The framing throughout is contemplative rather than productivity-blog.
- **Citations.** When you add a practice that leans on a specific source, add or update the matching entry in `src/data/sources.js` so the Sources tab stays a real index, not a museum.
- **`id` is load-bearing.** Score keys are `${domain.id}-${subIndex}`. Don't reuse or renumber existing ids — you'd silently strand stored assessments.
- **Sub order is also load-bearing** for the same reason. Append new subs; don't reorder existing ones.

## Adding your own practices (without forking)

The Ideas tab has an input at the bottom of every subcategory. Anything you add there is stored in `localStorage` under `life-improver:custom-practices:v1` and tagged "yours" in the list. Clearing your browser data clears them.

## Sources

The framework draws on, among others: Aristotle, the Buddhist canon, the Bhagavad Gita, the Tao Te Ching, the Hebrew Bible; Maslow, Frankl, Gottman, Bowlby, Erikson, Seligman, Csikszentmihalyi, Deci & Ryan, Walker, Newport, Kahneman, Putnam, Granovetter, Dunbar, Kabat-Zinn, Yalom, Becker, the Harvard Study of Adult Development. The full list — with year and a one-line note explaining each one's place in the framework — is on the Sources tab and in `src/data/sources.js`.

## License

MIT.
