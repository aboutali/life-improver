// The seven dimensions of a life.
//
// Each domain contains a description, plus subcategories that each carry
// their own description and a list of concrete practices. To extend the
// framework, add new entries here — the UI renders whatever this module
// exports.
//
// Schema:
//   { id, domain, desc, subs: [ { name, desc, ideas: string[] } ] }
//
// Domain `id` is part of the score key — keep it stable and unique.
// Sub order within a domain is also part of the score key (by index) —
// append, never reorder.

export const FRAMEWORK = [
  {
    id: 1,
    domain: "Body & Vitality",
    desc: "The vessel that carries everything else. Every wisdom tradition begins here — Aristotle's eudaimonia requires physical health as foundation, Buddhism treats the body as the vehicle for awakening, and modern health psychology confirms that physical wellbeing is the strongest predictor of life satisfaction after basic needs are met. Without the body, no path can be walked.",
    subs: [
      {
        name: "Movement & Fitness",
        desc: "Strength, endurance, flexibility. Sport in any form that builds physical capacity.",
        ideas: [
          "Follow a structured strength program (e.g. 5/3/1, Starting Strength) instead of improvising at the gym",
          "Walk 8,000+ steps daily — the longevity sweet spot per large-scale meta-analyses",
          "Add one weekly mobility session (yoga, stretching, or animal flow) to offset desk hours",
          "Train a physical skill: swimming, martial arts, climbing — performance goals beat aesthetic goals for adherence",
          "Track your VO2max estimate and aim to stay in the top quartile for your age",
          "Do a monthly fitness test (pushups, plank hold, 1-mile run) to catch stagnation early",
          "Replace one sedentary commute per week with walking or cycling",
          "Find an exercise partner or group — social accountability doubles long-term adherence",
          "Set a non-negotiable minimum: 20 minutes of movement on your worst days",
          "Periodize rest weeks every 4–6 weeks to prevent overtraining and sustain progress"
        ]
      },
      {
        name: "Nutrition",
        desc: "Quantity and macros, quality, toxins, supplements, drinks and alcohol.",
        ideas: [
          "Eat 30+ different plants per week — the single strongest predictor of gut microbiome diversity",
          "Front-load protein: 30g+ at breakfast to stabilize blood sugar and reduce cravings",
          "Cook 5+ dinners per week at home — the most reliable way to control quality and cost",
          "Track intake for 2 weeks annually to recalibrate portion intuition — as a diagnostic, not a lifestyle",
          "Audit your alcohol: try a 30-day zero-alcohol experiment and notice sleep, mood, and energy changes",
          "Eliminate or reduce liquid calories (soda, juice, fancy coffees) — they bypass satiety signals",
          "Learn 10 fast, healthy meals you can cook on autopilot so tiredness never becomes an excuse",
          "Hydrate first thing: 500ml water before coffee reduces the cortisol spike",
          "Reduce ultra-processed food to under 20% of intake — the NOVA classification is a useful guide",
          "If you use caffeine, set a hard cutoff 8–10 hours before bed to protect sleep architecture"
        ]
      },
      {
        name: "Sleep & Recovery",
        desc: "Quantity, quality, sleep cycles, depth, and regulation of the autonomic nervous system.",
        ideas: [
          "Fix your wake time (±30 min, even weekends) — regularity matters more than duration",
          "Create a 30-minute wind-down ritual: dim lights, no screens, same sequence nightly",
          "Keep bedroom at 18–19°C — the single most impactful environmental lever for deep sleep",
          "Use a sleep tracker for 1 month to identify actual patterns vs. assumptions",
          "Eliminate blue light after sunset or use hardware-level filters (f.lux, Night Shift)",
          "Get morning sunlight within 30 minutes of waking — resets circadian rhythm",
          "Nap strategically: 20 minutes before 2pm if needed, never longer",
          "Audit your caffeine, alcohol, and screen habits through the lens of sleep quality first",
          "Practice a physiological sigh (double inhale, long exhale) as a sleep onset tool",
          "Treat chronic snoring or apnea seriously — get a sleep study if your partner reports it"
        ]
      },
      {
        name: "Medical & Preventive Health",
        desc: "Check-ups, repairs, and the ongoing management of chronic conditions.",
        ideas: [
          "Schedule an annual comprehensive blood panel (lipids, HbA1c, thyroid, vitamin D, B12, iron)",
          "Get a dental cleaning every 6 months — oral health correlates with cardiovascular risk",
          "Know your family medical history and share it with your doctor for targeted screening",
          "Keep vaccinations current — check your national schedule, including boosters",
          "Get a skin check annually, especially with light skin or sun exposure history",
          "Know your blood pressure, resting heart rate, and basic metabolic markers by heart",
          "If over 40, discuss colonoscopy and age-appropriate cancer screenings with your physician",
          "Build a relationship with one GP you trust — continuity of care improves outcomes",
          "Maintain an up-to-date personal health record (meds, allergies, surgeries) in one place",
          "Don't postpone nagging symptoms — early investigation almost always costs less than delay"
        ]
      },
      {
        name: "Environment & Body",
        desc: "Light, noise, pollution, cleanliness, order, home, and safety.",
        ideas: [
          "Declutter one room using the 'does it earn its space?' test — environment shapes cognition",
          "Optimize desk ergonomics: monitor at eye height, 90° elbows, feet flat",
          "Maximize natural light in your workspace — daylight improves mood, focus, and sleep",
          "Add plants: even 3–5 reduce stress and increase perceived air quality",
          "Create distinct zones for work, rest, and play — spatial boundaries support mode-switching",
          "Make your home secure: working locks, smoke and CO detectors, an emergency contact list everyone knows",
          "Invest in air quality: open windows daily, consider a purifier if in a polluted area",
          "Control noise: use white noise, earplugs, or acoustic panels if your environment is loud",
          "Do a seasonal deep clean (4x/year) — maintenance is easier than recovery",
          "Make your bedroom a sleep sanctuary: blackout curtains, no screens, minimal furniture"
        ]
      }
    ]
  },
  {
    id: 2,
    domain: "Mind & Learning",
    desc: "The quality of your life is the quality of your attention. Aristotle opens the Metaphysics with 'all humans by nature desire to know.' Buddhism treats mental training as the path itself. Csikszentmihalyi's flow research shows that optimal experience comes from challenges matched to skill. A mind that isn't growing is stagnating.",
    subs: [
      {
        name: "Learning & Intellectual Stimulation",
        desc: "Formal and informal education, reading (fiction and non-fiction), curiosity.",
        ideas: [
          "Read 20+ books per year across genres — alternate between depth and breadth",
          "Take one structured course per quarter on a topic outside your profession",
          "Start a commonplace book or Zettelkasten to connect ideas across domains",
          "Join or start a reading group — discussion deepens retention 3x vs. passive reading",
          "Learn a new language — even basics rewire cognitive flexibility",
          "Subscribe to 2–3 high-quality long-form sources instead of news feeds",
          "Teach something you're learning — the protégé effect forces deeper encoding",
          "Attend one conference, lecture, or workshop per quarter outside your usual circle",
          "Practice the Feynman Technique: explain a concept in plain language to test understanding",
          "Spend 30 minutes weekly on a 'hard problem' with no immediate practical value"
        ]
      },
      {
        name: "Mental Health & Emotional Regulation",
        desc: "Therapy, introspection, self-knowledge, anxiety and depression, emotional literacy.",
        ideas: [
          "Try therapy even when things are 'fine' — maintenance therapy prevents crises",
          "Build an emotion vocabulary: name 10+ distinct emotions beyond 'good' and 'bad'",
          "Practice cognitive defusion: notice a thought as a thought, not as reality",
          "Journal 10 minutes daily — expressive writing reduces rumination and improves immune function",
          "Identify your top 3 cognitive distortions and practice catching them in real time",
          "Build a 'coping menu' — a written list of 10 things that help when you're dysregulated",
          "Schedule regular emotional check-ins with a trusted person",
          "Learn to distinguish anxiety from excitement — the physiology is identical, the interpretation is learned",
          "Practice self-compassion: mindfulness + common humanity + self-kindness",
          "Audit your media diet for its emotional impact — reduce inputs that trigger rumination"
        ]
      },
      {
        name: "Cognitive Maintenance",
        desc: "Attention (digital and analog), memory, digital hygiene, concentration.",
        ideas: [
          "Time-block deep work in 90-minute ultradian cycles with genuine breaks between",
          "Use a single capture system so nothing lives rent-free in working memory",
          "Practice digital minimalism: remove non-essential notifications, batch email 2–3x/day",
          "Train sustained attention with a daily focus practice — even 10 minutes of meditation",
          "Do cognitively demanding leisure (chess, crosswords, learning instruments)",
          "Protect your peak cognitive hours for your hardest work, never for email",
          "Take a weekly digital sabbath — 24 hours with no screens",
          "Use spaced repetition (Anki) for anything you want to retain long-term",
          "Limit context-switching: batch similar tasks and use visual cues to signal modes",
          "Get bored on purpose — unstructured idle time is where creative connections form"
        ]
      },
      {
        name: "Creative Expression",
        desc: "Writing, music, design, images, crafts — making things that didn't exist before.",
        ideas: [
          "Commit to a daily creative practice — even 15 minutes compounds over months",
          "Ship something: publish, share, record — finishing matters more than perfecting",
          "Take a class in a medium you've never tried: pottery, improv, photography",
          "Keep a creative journal of things that inspire you — patterns emerge over time",
          "Collaborate with someone in a different creative domain",
          "Study the masters in your chosen medium: reverse-engineer great work",
          "Set constraints: write in exactly 100 words, paint with 2 colors — constraints boost creativity",
          "Separate creation from editing — first draft with no judgment, revision later",
          "Enter a contest, open mic, or exhibition — external deadlines create productive pressure",
          "Document your creative process, not just outputs — tracking evolution reveals your voice"
        ]
      }
    ]
  },
  {
    id: 3,
    domain: "Work & Craft",
    desc: "Your contribution through professional effort — mastery, impact, and financial sustainability. Frankl's 'creative values' (meaning through what you give), Ikigai's intersection of skill and need, and Self-Determination Theory's need for competence. Work is how you leave a mark on the world.",
    subs: [
      {
        name: "Skill & Mastery",
        desc: "The deliberate development of your craft. Practice, technique, vocation.",
        ideas: [
          "Identify the 2–3 skills that drive your professional value and invest 80% of growth time there",
          "Practice deliberately: target weaknesses with focused drills, not comfortable repetition",
          "Find a mentor for pattern recognition you can't see from inside your experience",
          "Request 360° feedback annually — blind spots are by definition invisible",
          "Study adjacent disciplines: the best strategists read operations, engineers read design",
          "Teach your skill to juniors — articulating tacit knowledge reveals gaps",
          "Set a 'mastery project' each quarter that stretches beyond current capability",
          "Benchmark against the best in your field, not just your team",
          "Maintain a 'brag document' — it clarifies what you're actually good at",
          "Read 2–3 foundational books in your field annually — fundamentals sharpen advanced practice"
        ]
      },
      {
        name: "Impact & Contribution",
        desc: "Your added value for others and for the world.",
        ideas: [
          "Define your personal theory of impact: what change do you want your work to create?",
          "Measure output in outcomes delivered, not hours logged",
          "Volunteer your professional skills pro bono to multiply impact beyond your employer",
          "Align daily work with your organization's highest-priority problems",
          "Write and share your knowledge: internal memos, blog posts, talks",
          "Identify who benefits from your work and talk to them directly",
          "Automate or delegate low-impact tasks to free capacity for high-leverage work",
          "Pursue projects at the intersection of what you're great at and what is desperately needed",
          "Track your 'contribution portfolio' — balance delivery and capability building",
          "Ask quarterly: if I left tomorrow, what would be harder to do? Double down on that"
        ]
      },
      {
        name: "Career",
        desc: "Career goals and direction, reputation, network, optionality.",
        ideas: [
          "Write a personal career strategy memo every 12 months",
          "Build a skill stack — combine 2–3 competencies where you're top 20% to become unique",
          "Cultivate sponsors (who advocate), mentors (who advise), and peers (who push you)",
          "Maintain an updated 'career options' list — alternatives increase confidence",
          "Invest in public reputation: speak at events, publish, be visible",
          "Say no to opportunities that build the wrong brand",
          "Network for the role 2 steps ahead, not the one you're in now",
          "Negotiate compensation at every transition — the gap compounds over decades",
          "Develop a portable skill set: don't over-index on firm-specific knowledge",
          "Review your career quarterly against strategy — adjust heading, don't drift"
        ]
      },
      {
        name: "Finances",
        desc: "Income, savings, wealth, debt, investments, insurance, financial literacy.",
        ideas: [
          "Automate savings: automatic transfers on payday so saving isn't a monthly decision",
          "Build a 6-month emergency fund before optimizing investments",
          "Know your net worth and update it quarterly — the trend matters more than the number",
          "Maximize tax-advantaged accounts first before taxable investments",
          "Learn the basics of index investing — Bogle's philosophy outperforms most active strategies",
          "Insure catastrophic risks and self-insure small ones — never the reverse",
          "Track spending for one month annually to catch lifestyle creep",
          "Eliminate high-interest debt with intensity — the highest guaranteed return",
          "Have 'the money conversation' with your partner openly",
          "Invest in financial literacy: read one book per year on personal finance"
        ]
      },
      {
        name: "Working Conditions",
        desc: "Hours, autonomy, stress, commute, leadership.",
        ideas: [
          "Set hard boundaries on work hours — protect at least 2 evenings per week",
          "Negotiate for autonomy over schedule and location — the #1 driver of job satisfaction",
          "Take all your vacation days — burnout prevention is a performance strategy",
          "Identify your top 3 energy drains and systematically reduce or eliminate them",
          "Design your workday around energy, not time: creative work when sharp, admin when depleted",
          "Have a shutdown ritual marking the transition from work to personal life",
          "Audit your meeting load quarterly — decline any without a clear agenda",
          "Audit your commute: long stressful commutes correlate strongly with low life satisfaction. Reduce, change, or relocate",
          "Cultivate at least one genuine friendship at work — belonging buffers stress",
          "If conditions are chronically bad despite effort, treat job change as a health decision"
        ]
      }
    ]
  },
  {
    id: 4,
    domain: "Relationships & Love",
    desc: "The Harvard Study of Adult Development — 85+ years running — concluded that relationship quality is the single strongest predictor of health and happiness. Every major religion places love at the center. Self-Determination Theory calls it relatedness. No one arrives at the end wishing they had spent less time on the people who mattered.",
    subs: [
      {
        name: "Romantic Partnership",
        desc: "Psychological intimacy, physical intimacy, sexuality, shared goals, conflict and harmony.",
        ideas: [
          "Schedule a weekly 'state of us' check-in — 20 minutes for feelings, not logistics",
          "Maintain a 5:1 positive-to-negative interaction ratio — the empirical stability threshold",
          "Learn your partner's love language and practice it deliberately",
          "Fight about the issue, not the person: 'I feel X when Y' instead of 'You always Z'",
          "Protect a weekly date — novelty sustains desire, routine sustains security",
          "Discuss money, children, career, and aging proactively",
          "Practice 'turning toward' bids for connection — predicts outcomes with 94% accuracy",
          "Maintain individual identities: separate hobbies, friendships, goals prevent enmeshment",
          "Read one relationship book together per year and discuss it",
          "Seek couples therapy before you 'need' it — the average couple waits 6 years too long"
        ]
      },
      {
        name: "Family of Origin",
        desc: "Parents, siblings, relatives — and the quality of those relationships.",
        ideas: [
          "Map your family system with a genogram — it reveals inherited patterns",
          "Have at least one honest conversation per year with each parent about something real",
          "Identify one inherited pattern and work on it consciously in therapy",
          "Set boundaries with love: 'I care about you and I need X' is complete",
          "Record family stories and history — oral tradition disappears within 2 generations",
          "Forgive strategically: forgiveness is for your nervous system, not their behavior",
          "Accept your parents as flawed humans, not as the archetypes you needed",
          "Show up physically for key moments — presence matters more than presents",
          "If a relationship is toxic and unchangeable, reduce contact without guilt",
          "Write a letter (sent or unsent) about something you've never said"
        ]
      },
      {
        name: "Family You Build",
        desc: "Children, parenting, the satisfaction you find in your chosen family.",
        ideas: [
          "Define your 3 core parenting values with your partner and align explicitly",
          "Be the parent who is present, not perfect — perfection backfires",
          "Create family rituals (weekly dinner, annual trip, bedtime routine)",
          "Model emotional regulation rather than demanding it",
          "Discuss division of domestic labor openly and regularly",
          "Invest in your partnership first — the best gift to children is a strong parental bond",
          "If childless by choice: build intentional 'chosen family' structures",
          "Document family life: photos, journals, videos for future selves",
          "Discuss education, values, screen time, and discipline before conflicts arise",
          "Protect couple time fiercely after children arrive"
        ]
      },
      {
        name: "Close Friendships",
        desc: "The quality of your closest friendships — intimacy, support, having someone to lean on.",
        ideas: [
          "Audit your friendship circle: who energizes vs. drains you? Invest accordingly",
          "Initiate proactively — the person who reaches out keeps the friendship",
          "Schedule recurring 1:1 time: monthly lunch, quarterly hike, annual trip",
          "Be vulnerable first: share something real to give permission for depth",
          "Show up during hard times, not just good — crisis presence cements bonds",
          "Maintain 2–3 friends outside work and romance — diversification prevents loneliness",
          "Resolve conflict directly rather than withdrawing — most friendships die of avoidance",
          "Celebrate friends' wins genuinely — active constructive responding",
          "Accept that friendships have seasons — fading is not failure",
          "Make new friends in every life stage — don't rely solely on old connections"
        ]
      }
    ]
  },
  {
    id: 5,
    domain: "Community & Belonging",
    desc: "Beyond your inner circle. Aristotle saw humans as zoon politikon. Durkheim showed that social integration protects against despair. Putnam's research confirms that weak ties and community matter independently of close relationships. You are part of something larger than your household.",
    subs: [
      {
        name: "Social Network & Acquaintances",
        desc: "Diversity, quantity, and quality of acquaintances — beyond your intimate relationships.",
        ideas: [
          "Have a 5-minute genuine conversation with one acquaintance per week",
          "Attend one social event per month outside your usual circle",
          "Be a connector: introduce people who should know each other",
          "Remember and use people's names consistently",
          "Follow up within 48 hours after meeting someone interesting",
          "Maintain a lightweight CRM for professional contacts",
          "Join a club, league, or group — proximity + repeated interaction = friendship",
          "Be a 'regular' somewhere: same café, gym class, farmer's market",
          "Help people without keeping score — generosity compounds through reputation",
          "Host a gathering quarterly — conveners sit at the center of networks"
        ]
      },
      {
        name: "Culture & Identity",
        desc: "Satisfaction with your identity and origin, plus knowledge of the cultures and traditions you identify with.",
        ideas: [
          "Learn about your cultural heritage: read history, visit ancestral places, talk to elders",
          "Practice or revive a tradition: ancestral recipes, traditional holidays, heritage language",
          "Join a diaspora or cultural community group if far from your origins",
          "Explore how your identity shapes your worldview — what do you take for granted?",
          "Expose yourself to radically different cultures — travel, literature, food, friendships",
          "Discuss identity openly with trusted friends — especially heritage-vs-present tensions",
          "Contribute to your cultural community: mentor newcomers, preserve traditions",
          "If you hold multiple identities, name them — integration beats compartmentalization",
          "Read thinkers from your background who articulate your experience at high resolution",
          "Create something that reflects your identity — expression deepens belonging"
        ]
      },
      {
        name: "Civic & Political Participation",
        desc: "Voting, volunteering, local leadership, activism, associations and clubs.",
        ideas: [
          "Vote in every election — local ones often matter more for daily life",
          "Attend one local government meeting per year — witness how decisions get made",
          "Volunteer for one cause that doesn't benefit you directly",
          "Donate to 2–3 verified organizations — effective giving beats scattered small amounts",
          "Read your local newspaper — local journalism is the immune system of democracy",
          "Know your local representatives and contact them on issues you care about",
          "Join a neighborhood association, cooperative, or community board",
          "Discuss politics with people who disagree — in person, not online",
          "Mentor a young person from a different background",
          "Run for a small local office if you care about how your community works"
        ]
      },
      {
        name: "Digital Presence",
        desc: "Your identity in cyberspace, social media, and the public square.",
        ideas: [
          "Curate feeds: unfollow comparison triggers, follow what inspires or informs",
          "Contribute more than you consume: post useful content, answer questions",
          "Join one high-quality online community in your area of interest",
          "Set screen time limits and review actual usage weekly",
          "Protect your digital reputation: Google yourself, clean up old profiles",
          "Use social media as a tool with purpose, not as a habitat",
          "Practice disagreeing respectfully online or not at all",
          "Build something that outlasts the scroll: blog, portfolio, open-source contribution",
          "Meet online connections in person when possible — it deepens everything",
          "Take a 7-day social media fast quarterly to reset"
        ]
      }
    ]
  },
  {
    id: 6,
    domain: "Inner World & Meaning",
    desc: "Purpose, values, spiritual practice, and your relationship with mortality. Frankl's core insight: meaning is the deepest human need. The Stoic examined life, the Buddhist path, the Islamic niyyah. Whether through religion, meditation, or philosophy, this domain asks the only question that matters: what is this all for?",
    subs: [
      {
        name: "Purpose & Intention",
        desc: "Your personal answer to the purpose of your existence — why am I here?",
        ideas: [
          "Write a personal mission statement and revise it annually",
          "Ask the deathbed test: at 90, what would you regret not doing?",
          "Identify 3 core values through a card sort exercise, then audit alignment",
          "Map your Ikigai: the intersection of love, skill, need, and livelihood",
          "Set 10-year directional goals — long horizons permit bolder thinking",
          "Do Frankl's exercise: what task is life asking of you right now?",
          "Talk to people 20+ years older about what mattered and what didn't",
          "Distinguish goals (endpoints) from purpose (direction) — you need both",
          "Revisit purpose during transitions — meaning is reconstructed, not found once",
          "Read broadly: Stoicism, Existentialism, Pragmatism — different lenses, different answers"
        ]
      },
      {
        name: "Ethical Integrity & Values",
        desc: "Defining your own value compass and living in congruence with it.",
        ideas: [
          "Rank your top 5 values — hierarchy resolves conflicts between them",
          "Track your value-action gap: where do you say one thing and do another?",
          "Practice small acts of integrity when nobody is watching",
          "Write a personal code of conduct — make the implicit explicit",
          "When you violate your values, repair rather than rationalize",
          "Study ethical frameworks: virtue ethics, deontology, consequentialism — each reveals blind spots",
          "Surround yourself with people whose values you admire",
          "Say no to money that requires compromising core values",
          "Practice moral courage: speak up when something is wrong",
          "Review values alignment annually — are you becoming who you want to be?"
        ]
      },
      {
        name: "Spirituality & Mindfulness",
        desc: "Rituals, faith, religion, meditation, connection with nature — theistic and secular.",
        ideas: [
          "Establish a daily contemplative practice — even 10 minutes of meditation, prayer, or silence",
          "Try multiple traditions before settling: Vipassana, Zen, Centering Prayer, yoga",
          "Read primary texts: Bhagavad Gita, Tao Te Ching, Psalms, Dhammapada",
          "Attend a retreat annually: silent, prayer, or intensive workshop",
          "Spend time in nature with no agenda, no podcast, no phone",
          "Keep a gratitude practice: 3 things each evening — evidence for well-being is strong",
          "Find or build a sangha, congregation, or circle — shared practice deepens individual practice",
          "Practice surrender on one thing you cannot control this week",
          "Study the mystics — they describe inner experience with unusual precision",
          "Integrate practice into daily life: mindful eating, walking meditation, prayer before meetings"
        ]
      },
      {
        name: "Relationship with Suffering",
        desc: "Acceptance and equanimity with your own and others' suffering, death, and impermanence.",
        ideas: [
          "Practice memento mori: keep a visual reminder of death — it sharpens life",
          "Write or update your will, advance directive, and letter of wishes",
          "Visit a cemetery or attend a funeral with full presence — it clarifies priorities",
          "Read Yalom's 'Staring at the Sun' or Becker's 'Denial of Death'",
          "Have the 'what if I die' conversation with partner and family",
          "When suffering arises, ask 'what is this teaching me?' before 'how do I stop it?'",
          "Sit with grief fully when it comes — don't rush to 'move on'",
          "Practice impermanence meditation: observe a candle, a sunset, a breath",
          "Keep a mortality journal: when did you last feel truly alive?",
          "Talk about death openly with people you trust — what can be spoken can be faced"
        ]
      }
    ]
  },
  {
    id: 7,
    domain: "Leisure & Pleasure",
    desc: "Joy, recreation, beauty, restoration. Aristotle argued that leisure — not work — is the purpose of life. Sabbath traditions encode mandatory rest. Burnout research confirms recovery is not optional. The bowl must be emptied to be filled.",
    subs: [
      {
        name: "Leisure Activities & Hobbies",
        desc: "Sports, games, projects done for pleasure, travel.",
        ideas: [
          "Maintain at least one hobby with zero productivity pressure",
          "Try one completely new activity per quarter: surfing, dancing, woodworking",
          "Schedule play like meetings — if it's not in the calendar, it won't happen",
          "Find a play partner: someone who makes fun things more fun",
          "Revisit a childhood hobby — the joy often returns intact",
          "Set a 'fun budget' — money for experiences with no ROI expected",
          "Join a league or club for your hobby — structure increases frequency",
          "Travel to practice your hobby in a new context",
          "Document your hobby: photos, logs, sharing with friends",
          "Protect hobby time from work creep — the point is that it has no point"
        ]
      },
      {
        name: "Recovery & Relaxation",
        desc: "Media consumption, down-time, doing nothing.",
        ideas: [
          "Schedule one full rest day per week — the Sabbath principle transcends religion",
          "Practice doing nothing for 20 minutes: no phone, no book — just sit",
          "Watch a film or listen to an album start-to-finish with no multitasking",
          "Take a bath, massage, or sauna regularly — physical restoration is maintenance",
          "Spend an evening in total silence: no talking, screens, or music",
          "Allow 'guilty pleasures' without guilt — the guilt costs more than the activity",
          "Nap without shame — short naps improve cognition and emotional regulation",
          "Walk slowly with no destination and no podcast",
          "Spend time near water — 'blue mind' research shows cortisol drops",
          "Protect your restoration window from obligations at least 3x per week"
        ]
      },
      {
        name: "Aesthetics & Beauty",
        desc: "Art, music, nature, design, sensory pleasure.",
        ideas: [
          "Visit a museum, gallery, or exhibition once per month",
          "Listen to one full album per week: headphones, no distractions",
          "Beautify one space in your home — a single well-chosen object changes a room",
          "Watch a sunset, stare at the sky, or sit among trees for 20 minutes",
          "Curate your visual environment: phone wallpaper, desktop, wardrobe",
          "Read poetry: even one poem per week — it slows perception",
          "Cook a beautiful meal: plate it well, set the table, light a candle",
          "Study one art form enough to appreciate its craft",
          "Keep a 'beauty log': photograph 3 beautiful things per week",
          "Dress with intention at least 3 days per week"
        ]
      },
      {
        name: "Humor",
        desc: "Laughter, lightness, not taking yourself too seriously.",
        ideas: [
          "Watch one comedy special per month — laughter is a physiological reset",
          "Practice laughing at yourself when you mess up — it reduces shame",
          "Spend time with funny people and notice how they see the world",
          "Play absurd games: improv, Cards Against Humanity, would-you-rather",
          "Don't kill humor with perfectionism — a bad joke is more alive than polished silence",
          "Use humor in conflict carefully — lightness de-escalates without dismissing",
          "Build a personal humor library: memes, videos, passages for bad days",
          "Explore humor from other cultures — it expands what you find funny",
          "Practice comic timing in storytelling — one of the most powerful social skills",
          "Remember: if you can laugh about it, it has less power over you"
        ]
      }
    ]
  }
];

export const TOTAL_IDEAS = FRAMEWORK.reduce(
  (a, d) => a + d.subs.reduce((b, s) => b + s.ideas.length, 0),
  0
);

export const TOTAL_SUBS = FRAMEWORK.reduce((a, d) => a + d.subs.length, 0);
