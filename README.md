# Life Improver

> Before you arrange the stones, first see the whole garden.

An interactive framework of meaningful life practices, rooted in psychology, philosophy, and the world's contemplative traditions. The app maps **seven domains** of a complete human life — Body, Mind, Work, Relationships, Community, Inner Life, and Play — into 30 subcategories with 300+ concrete practices, each traceable back to its source.

It's a tool for two things:

- **Develop** — extend a curated body of life practices through pull requests.
- **Use.** Tend one focus each week, check in, and watch the trend. Everything stays in your browser.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173/life-improver/.

To build a static bundle:

```bash
npm run build
npm run preview
```

To run the tests and the linter:

```bash
npm test
npm run lint
```

`npm test` runs the Vitest suite. `npm run lint` runs ESLint.

## Install as an app

Life Improver is a PWA. Open the app in your browser. Then choose the browser's option to add it to your home screen or install it. The installed app opens in its own window. The service worker caches the app files. A new version reloads the page by itself.

## What you get

The app opens on **Today**. The weekly loop has four steps:

1. **Welcome.** Rate the seven domains with sliders. Rate at least four to continue. Then keep the suggested focus or choose another.
2. **Today.** See this week's focus: the domain, the subcategory, a practice, and the reason for the choice. Swap the practice, choose another focus, or add the practice and a weekly check-in to your calendar.
3. **Check-in.** Answer three questions. Did you practise this week? How is the focus subcategory now, from 1 to 10? Add an optional note of up to 500 characters. Then keep the practice or swap it.
4. **Journey.** See the weeks you were active and the number of check-ins. See one sparkline per subcategory, with the change since the first check-in. Read the log of notes, newest first.

The rest of the app:

- **Assess.** The full assessment. Rate each subcategory from 1 to 10 on a slider. A results dashboard then summarizes your overall score, per-domain averages, a tier distribution, your strongest and weakest areas, and a generated read on the pattern. You can create a share image. Numbers are hidden by default.
- **Practices.** Ten curated practices per subcategory, navigated by domain and subcategory.
- **Framework.** The seven domains and their subcategories, with descriptions.
- **Sources.** Every theory, study, and tradition behind the practices, organized by discipline.
- **Settings & privacy.** Download a copy of your data as a JSON file, restore a copy, or erase all data. The page also holds the health disclaimer and the privacy note. There are no accounts, no server, and no tracking.

## Project structure

```
src/
├── App.jsx                    # route, data hooks, screen switch, footer
├── main.jsx                   # React entry, migrations, service worker
├── styles.css                 # all CSS, one section per v2 screen
├── __tests__/                 # tests (contents not listed)
├── test/
│   └── setup.js               # Vitest setup
├── data/
│   ├── framework.js           # the 7 domains, 30 subs, 300 practices
│   └── sources.js             # citations, organized by discipline
├── hooks/
│   ├── usePersistentState.js  # useState mirrored to localStorage, with validation
│   ├── useScores.js           # full 1–10 scores per subcategory
│   ├── useQuickScores.js      # 1–10 quick score per domain
│   ├── useFocus.js            # this week's focus
│   ├── useCheckins.js         # weekly check-ins
│   ├── useToday.js            # today's local date
│   └── __tests__/             # tests (contents not listed)
├── lib/
│   ├── dates.js               # local dates and ISO weeks
│   ├── recommend.js           # suggested focus and practice
│   ├── trends.js              # score series and change over time
│   ├── ics.js                 # calendar files
│   ├── storage.js             # storage keys, migration, export and import
│   ├── router.js              # hash routes and useRoute()
│   ├── shareCard.js           # share image on a canvas
│   └── __tests__/             # tests (contents not listed)
└── components/
    ├── CalendarButton.jsx     # day and time picker that downloads a .ics file
    ├── CheckIn.jsx            # weekly check-in
    ├── ErrorBoundary.jsx      # calm fallback when a screen cannot render
    ├── FocusPicker.jsx        # choose another focus
    ├── Garden.jsx             # seven bars, one per domain
    ├── Header.jsx             # wordmark bar
    ├── Ideas.jsx              # Practices
    ├── Journey.jsx            # history and trends
    ├── Onboarding.jsx         # Welcome
    ├── Overview.jsx           # Framework
    ├── SelfAssessment.jsx     # Assess: sliders and results dashboard
    ├── Settings.jsx           # data, privacy, disclaimer
    ├── ShareButton.jsx        # share image
    ├── Sources.jsx            # Sources
    ├── Sparkline.jsx          # inline score trend
    ├── TabBar.jsx             # top tabs and mobile bottom navigation
    ├── Today.jsx              # home: focus, check-in, calendar, garden
    └── __tests__/             # tests (contents not listed)
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

## Sources

The framework draws on, among others: Aristotle, the Buddhist canon, the Bhagavad Gita, the Tao Te Ching, the Hebrew Bible; Maslow, Frankl, Gottman, Bowlby, Erikson, Seligman, Csikszentmihalyi, Deci & Ryan, Walker, Newport, Kahneman, Putnam, Granovetter, Dunbar, Kabat-Zinn, Yalom, Becker, the Harvard Study of Adult Development. The full list — with year and a one-line note explaining each one's place in the framework — is on the Sources tab and in `src/data/sources.js`.

## License

MIT.
