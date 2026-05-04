// The thinking behind the framework.
//
// Sources cite the practices in `framework.js`. Many `note` fields explicitly
// map a source back to a domain or subcategory — when you add a new practice
// that leans on a specific source, add or update the corresponding entry here.
//
// Schema:
//   { category, items: [ { author, title, year, note } ] }
//
// `year` may be a number or a string (e.g. "c. 340 BCE"). It's rendered as-is.

export const SOURCES = [
  {
    category: "Psychology — Foundational Theories",
    items: [
      { author: "Maslow, A.", title: "Motivation and Personality", year: 1954, note: "Hierarchy of needs, self-actualization as the peak of human development. Foundation for the framework's structure." },
      { author: "Frankl, V.", title: "Man's Search for Meaning", year: 1946, note: "Logotherapy — meaning as the primary human drive. Basis for the Inner World & Meaning domain and 'creative values' in Work & Craft." },
      { author: "Deci, E. & Ryan, R.", title: "Self-Determination Theory: Basic Psychological Needs in Motivation, Development, and Wellness", year: 2017, note: "The three innate needs: autonomy, competence, and relatedness. Mapped to Work & Craft, Relationships, and Working Conditions." },
      { author: "Csikszentmihalyi, M.", title: "Flow: The Psychology of Optimal Experience", year: 1990, note: "Flow states from challenge-skill balance. Basis for Mind & Learning and Creative Expression subcategories." },
      { author: "Seligman, M.", title: "Flourish: A Visionary New Understanding of Happiness and Well-being", year: 2011, note: "PERMA model (Positive emotion, Engagement, Relationships, Meaning, Achievement). Cross-referenced across all seven domains." },
      { author: "Erikson, E.", title: "Identity and the Life Cycle", year: 1959, note: "Eight stages of psychosocial development. Basis for Culture & Identity subcategory." },
    ]
  },
  {
    category: "Psychology — Relationships",
    items: [
      { author: "Gottman, J. & Silver, N.", title: "The Seven Principles for Making Marriage Work", year: 1999, note: "5:1 ratio, 'turning toward' bids, Four Horsemen. Primary source for Romantic Partnership subcategory." },
      { author: "Bowlby, J.", title: "Attachment and Loss (3 vols.)", year: "1969–1980", note: "Attachment theory. Foundation for Family of Origin and Romantic Partnership subcategories." },
      { author: "Levine, A. & Heller, R.", title: "Attached: The New Science of Adult Attachment", year: 2010, note: "Applied attachment theory for adult romantic relationships." },
      { author: "Waldinger, R. & Schulz, M.", title: "The Good Life: Lessons from the World's Longest Scientific Study of Happiness", year: 2023, note: "Harvard Study of Adult Development — 85+ years. Relationship quality as the strongest predictor of health and happiness." },
      { author: "Bowen, M.", title: "Family Therapy in Clinical Practice", year: 1978, note: "Family systems theory, genograms, inherited emotional patterns. Basis for Family of Origin subcategory." },
      { author: "Chapman, G.", title: "The Five Love Languages", year: 1992, note: "Love languages framework referenced in Romantic Partnership practices." },
      { author: "Neff, K.", title: "Self-Compassion: The Proven Power of Being Kind to Yourself", year: 2011, note: "Mindfulness + common humanity + self-kindness. Referenced in Mental Health & Emotional Regulation." },
    ]
  },
  {
    category: "Psychology — Cognitive & Behavioral",
    items: [
      { author: "Barrett, L.F.", title: "How Emotions Are Made: The Secret Life of the Brain", year: 2017, note: "Emotion granularity — naming more emotions improves regulation. Referenced in Mental Health subcategory." },
      { author: "Pennebaker, J.", title: "Writing to Heal: A Guided Journal for Recovering from Trauma and Emotional Upheaval", year: 2004, note: "Expressive writing reduces rumination and improves immune function. Basis for journaling practices." },
      { author: "Ericsson, A. & Pool, R.", title: "Peak: Secrets from the New Science of Expertise", year: 2016, note: "Deliberate practice theory. Foundation for Skill & Mastery subcategory." },
      { author: "Kahneman, D.", title: "Thinking, Fast and Slow", year: 2011, note: "Cognitive biases and dual-process theory. Background for Cognitive Maintenance practices." },
      { author: "Newport, C.", title: "Deep Work: Rules for Focused Success in a Distracted World", year: 2016, note: "Deep work, digital minimalism, attention management. Basis for Cognitive Maintenance subcategory." },
      { author: "Gable, S. et al.", title: "What Do You Do When Things Go Right? (Journal of Personality and Social Psychology, 87(2))", year: 2004, note: "Active constructive responding — celebrating others' wins. Referenced in Close Friendships." },
    ]
  },
  {
    category: "Psychology — Health & Sleep",
    items: [
      { author: "Walker, M.", title: "Why We Sleep: Unlocking the Power of Sleep and Dreams", year: 2017, note: "Sleep as foundation of cognition, immunity, and emotional health. Primary source for Sleep & Recovery subcategory." },
      { author: "Huberman, A.", title: "Huberman Lab Podcast — Master Your Sleep", year: 2021, note: "Morning sunlight protocol, circadian rhythm optimization. Referenced in Sleep & Recovery practices." },
      { author: "McDonald, D. et al.", title: "American Gut: An Open Platform for Citizen Science Microbiome Research (mSystems, 3(3))", year: 2018, note: "30+ plants/week as strongest predictor of gut microbiome diversity. Referenced in Nutrition subcategory." },
      { author: "Warburton, D. et al.", title: "Health Benefits of Physical Activity: A Systematic Review (CMAJ, 174(6))", year: 2006, note: "Meta-analysis on exercise and health outcomes. Background for Movement & Fitness." },
      { author: "Paluch, A. et al.", title: "Daily Steps and All-Cause Mortality (The Lancet Public Health, 7(3))", year: 2022, note: "8,000+ steps/day as longevity sweet spot. Referenced in Movement & Fitness practices." },
    ]
  },
  {
    category: "Sociology & Social Science",
    items: [
      { author: "Granovetter, M.", title: "The Strength of Weak Ties (American Journal of Sociology, 78(6))", year: 1973, note: "Weak ties as bridges to opportunity and information. Foundation for Social Network & Acquaintances subcategory." },
      { author: "Putnam, R.", title: "Bowling Alone: The Collapse and Revival of American Community", year: 2000, note: "Social capital, civic participation, community decline. Basis for Community & Belonging domain." },
      { author: "Durkheim, É.", title: "Suicide: A Study in Sociology", year: 1897, note: "Social integration as protection against anomie and despair. Background for Community & Belonging." },
      { author: "Dunbar, R.", title: "How Many Friends Does One Person Need?", year: 2010, note: "Dunbar's number (~150 social connections, ~5 intimate). Referenced in Close Friendships subcategory." },
      { author: "Turkle, S.", title: "Alone Together: Why We Expect More from Technology and Less from Each Other", year: 2011, note: "Digital community's impact on belonging and self-concept. Basis for Digital Presence subcategory." },
      { author: "Gallup Organization", title: "Q12 Employee Engagement Survey", year: "2006–present", note: "Workplace friendship (Q10) as buffer against stress. Referenced in Working Conditions." },
    ]
  },
  {
    category: "Philosophy — Classical & Modern",
    items: [
      { author: "Aristotle", title: "Nicomachean Ethics", year: "c. 340 BCE", note: "Eudaimonia (human flourishing), virtue ethics, philia (friendship), zoon politikon (political animal), leisure as life's purpose. Referenced across all seven domains." },
      { author: "Marcus Aurelius", title: "Meditations", year: "c. 170 CE", note: "Stoic practice — what you can and cannot control, memento mori, self-examination. Referenced in Inner World & Meaning." },
      { author: "Epictetus", title: "Discourses and Enchiridion", year: "c. 108 CE", note: "Stoic cognitive reframing — distinguishing impressions from judgments. Background for Mental Health practices." },
      { author: "Nietzsche, F.", title: "Twilight of the Idols", year: 1889, note: "'He who has a why can bear almost any how.' Referenced in Purpose & Intention." },
      { author: "Heidegger, M.", title: "Being and Time", year: 1927, note: "Being-toward-death — authentic existence through confronting mortality. Referenced in Relationship with Suffering." },
      { author: "Kant, I.", title: "Critique of Judgment", year: 1790, note: "Aesthetic judgment and the experience of beauty. Background for Aesthetics & Beauty subcategory." },
      { author: "Huizinga, J.", title: "Homo Ludens: A Study of the Play-Element in Culture", year: 1938, note: "Play as foundational to culture. Basis for Leisure Activities & Hobbies." },
    ]
  },
  {
    category: "Existential & Meaning-Making",
    items: [
      { author: "Frankl, V.", title: "The Will to Meaning: Foundations and Applications of Logotherapy", year: 1969, note: "Logotherapy — meaning through creative values, experiential values, and attitudinal values. Underpins Inner World domain." },
      { author: "Yalom, I.", title: "Staring at the Sun: Overcoming the Terror of Death", year: 2008, note: "Existential therapy — facing mortality reduces anxiety. Referenced in Relationship with Suffering subcategory." },
      { author: "Becker, E.", title: "The Denial of Death", year: 1973, note: "Terror management theory precursor — death awareness as driver of human behavior." },
      { author: "James, W.", title: "The Varieties of Religious Experience", year: 1902, note: "Psychological study of mystical and spiritual experience. Background for Spirituality & Mindfulness subcategory." },
      { author: "Winnicott, D.W.", title: "Playing and Reality", year: 1971, note: "'Good enough' parent — perfection is neither possible nor desirable. Referenced in Family You Build." },
    ]
  },
  {
    category: "Religious & Contemplative Traditions",
    items: [
      { author: "Buddhist Canon", title: "Dhammapada; Anicca (impermanence); Noble Eightfold Path; Samadhi (concentration)", year: "c. 3rd century BCE", note: "Impermanence, right intention, mindfulness practice. Referenced in Relationship with Suffering, Purpose, Cognitive Maintenance, and Spirituality & Mindfulness." },
      { author: "Lao Tzu", title: "Tao Te Ching", year: "c. 6th century BCE", note: "Wu wei (non-action), naturalness, simplicity. Referenced in Recovery & Relaxation subcategory." },
      { author: "Bhagavad Gita", title: "Hindu scripture", year: "c. 2nd century BCE", note: "Karma yoga (selfless action), dharma (purpose), detachment from outcomes. Referenced in Purpose & Intention, Spirituality & Mindfulness." },
      { author: "Book of Psalms", title: "Hebrew Bible / Old Testament", year: "c. 10th–5th century BCE", note: "Contemplative prayer, lament, praise. Referenced in Spirituality & Mindfulness." },
      { author: "Confucius", title: "Analects — Xiao (filial piety)", year: "c. 5th century BCE", note: "Filial duty and family obligation. Referenced in Family of Origin." },
      { author: "Islamic tradition", title: "Niyyah (intention); Taqwa (God-consciousness); Jamal (divine beauty); Ummah (community)", year: "", note: "Intention as foundation of action, moral compass, beauty as divine attribute, communal belonging. Referenced across Inner World, Ethical Integrity, Aesthetics, Community." },
      { author: "Judeo-Christian tradition", title: "Sabbath; Klal Yisrael (communal belonging); Catholic social teaching (subsidiarity)", year: "", note: "Mandatory rest, community as obligation, local governance. Referenced in Leisure & Pleasure, Community." },
      { author: "Kabat-Zinn, J.", title: "Full Catastrophe Living: Using the Wisdom of Your Body and Mind to Face Stress, Pain, and Illness", year: 1990, note: "Mindfulness-Based Stress Reduction (MBSR). Bridge between contemplative tradition and clinical psychology." },
    ]
  },
  {
    category: "Personal Development & Applied",
    items: [
      { author: "Herzberg, F.", title: "The Motivation to Work", year: 1959, note: "Hygiene factors vs. motivators. Basis for Working Conditions subcategory — absence causes dissatisfaction." },
      { author: "Adams, S.", title: "How to Fail at Almost Everything and Still Win Big", year: 2013, note: "Skill stacking — combining top-20% competencies. Referenced in Career." },
      { author: "Allen, D.", title: "Getting Things Done: The Art of Stress-Free Productivity", year: 2001, note: "Single capture system, clearing working memory. Referenced in Cognitive Maintenance." },
      { author: "Emmons, R. & McCullough, M.", title: "Counting Blessings Versus Burdens (Journal of Personality and Social Psychology, 84(2))", year: 2003, note: "Gratitude journaling improves well-being. Referenced in Spirituality & Mindfulness." },
      { author: "Keltner, D.", title: "Awe: The New Science of Everyday Wonder", year: 2023, note: "Awe as a documented well-being intervention. Referenced in Aesthetics & Beauty." },
      { author: "Stokes, P.", title: "Creativity from Constraints: The Psychology of Breakthrough", year: 2005, note: "Constraints boost creative output. Referenced in Creative Expression." },
      { author: "Housel, M.", title: "The Psychology of Money", year: 2020, note: "Behavioral finance and wealth-building mindset. Referenced in Finances." },
      { author: "Bogle, J.", title: "The Little Book of Common Sense Investing", year: 2007, note: "Index investing philosophy. Referenced in Finances practices." },
      { author: "Kaplan, S.", title: "The Restorative Benefits of Nature (Journal of Environmental Psychology, 15(3))", year: 1995, note: "Attention restoration theory — nature and plants reduce cognitive fatigue. Referenced in Environment & Body." },
    ]
  },
];
