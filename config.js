// ============================================================
//  MR GLASS' GARDEN — TEACHER CONFIGURATION FILE
//  Edit this file to update content without touching the game.
//  After saving changes, commit and push to GitHub.
// ============================================================


// ── GAME IDENTITY ─────────────────────────────────────────
// Change these if you reuse the game for a different class.
const CONFIG_TITLE      = "MR GLASS' GARDEN";
const CONFIG_SUBTITLE   = "YEAR 11 BIOLOGY · 2025";
const CONFIG_TEACHER    = "Mr Glass";   // Name shown in dialogs


// ── SEASON / TERM BADGE ───────────────────────────────────
// Shown in the top-left corner of the game canvas.
// Change this each term. Emoji + label shown as-is.
const CONFIG_SEASON_BADGE = "🌱 SPRING · TERM 1";


// ── MAILBOX MESSAGES ──────────────────────────────────────
// Add objects to this array to send messages to students.
// 'from' appears as the sender, 'subject' is the bold line,
// 'body' is the message text. Students see [NEW] until read.
// The welcome message is always first — edit or keep it.
const CONFIG_MAIL = [
  {
    from: "Mr Glass",
    subject: "Welcome to Year 11 Biology!",
    body: "Welcome to Mr Glass's Garden. Walk with WASD and press E near any building or object to open it. Your farm reflects your year — keep it growing!"
  },
  // Add more messages below. Copy the block above and paste.
  // {
  //   from: "Mr Glass",
  //   subject: "Term 2 begins",
  //   body: "Module 2 content is now unlocked in the Farmhouse. Quizzes 11-20 are live on Canvas."
  // },
];


// ── ASSESSMENTS ───────────────────────────────────────────
// Four assessment beds in the Garden. Edit labels, task
// descriptions and term labels to match your actual tasks.
const CONFIG_ASSESSMENTS = [
  { key: 'at1', label: 'BED 1 — TASK 1', desc: 'Depth Study',        term: 'Term 1' },
  { key: 'at2', label: 'BED 2 — TASK 2', desc: 'Knowledge Task',     term: 'Term 2' },
  { key: 'at3', label: 'BED 3 — TASK 3', desc: 'Skills Task',        term: 'Term 3' },
  { key: 'at4', label: 'BED 4 — EXAM',   desc: 'End of Year Exam',   term: 'Term 4' },
];


// ── PRACTICALS ────────────────────────────────────────────
// Listed in the Well. Add or remove items to match your
// actual practical schedule. Keep keys as p0, p1, p2 etc.
const CONFIG_PRACTICALS = [
  'Practical 1: Microscopy and cell observation',
  'Practical 2: Osmosis in plant cells',
  'Practical 3: Enzyme activity',
  'Practical 4: Blood smear analysis',
  'Practical 5: Heart dissection',
  'Practical 6: Quadrat sampling',
  'Practical 7: Food web fieldwork',
  'Practical 8: Water quality testing',
];


// ── QUIZ LABELS ───────────────────────────────────────────
// 40 quizzes total (10 per module). These labels appear in
// the Study Tree. Change them to match your Canvas quiz names.
const CONFIG_QUIZZES = {
  m1: Array.from({ length: 10 }, (_, i) => `Module 1 Quiz ${i + 1}`),
  m2: Array.from({ length: 10 }, (_, i) => `Module 2 Quiz ${i + 1}`),
  m3: Array.from({ length: 10 }, (_, i) => `Module 3 Quiz ${i + 1}`),
  m4: Array.from({ length: 10 }, (_, i) => `Module 4 Quiz ${i + 1}`),
};


// ── SYLLABUS DOT POINTS ───────────────────────────────────
// Shown in the Farmhouse tracker. Edit dot points to match
// the current NESA syllabus. Structure: modules → inquiry
// questions → dot points (points array).
// m1–m4 keys must stay the same (they're used for save data).
const CONFIG_SYLLABUS = {
  m1: {
    title: 'MODULE 1: Cells as the Basis of Life',
    iq: [
      {
        label: 'IQ1: What distinguishes living from non-living things?',
        points: [
          'Construct and analyse a timeline of cell theory development, including contributions of Hooke and Brown',
          'Compare contributions of light and electron microscopy to understanding of cell structure',
          'Identify and describe structure and function of organelles: nucleus, mitochondria, chloroplasts, ER, Golgi, ribosomes, lysosomes, vacuoles, cell wall, cell membrane',
          'Compare the structure of prokaryotic and eukaryotic cells',
          'Explain how the fluid mosaic model accounts for movement of molecules across the membrane',
        ],
      },
      {
        label: 'IQ2: How do cells maintain an internal environment?',
        points: [
          'Explain how surface area to volume ratio affects rate of diffusion in cells',
          'Describe the role of diffusion, osmosis and active transport across membranes',
          'Investigate osmosis and its effects on plant and animal cells using a range of solutions',
          'Explain the effects of isotonic, hypotonic and hypertonic solutions on cells',
          'Explain how water potential affects movement of water across cell membranes',
        ],
      },
      {
        label: 'IQ3: What is the role of the nucleus in cell reproduction?',
        points: [
          'Describe the roles of DNA and RNA in cells including transcription and translation',
          'Identify the location and role of ATP in cells',
          'Describe the role of enzymes as biological catalysts including in cellular respiration',
          'Model the stages of mitosis and explain its significance in growth and repair',
          'Explain the significance of meiosis including crossing over and independent assortment',
          'Compare mitosis and meiosis including chromosome number of daughter cells',
        ],
      },
    ],
  },
  m2: {
    title: 'MODULE 2: Organisation of Living Things',
    iq: [
      {
        label: 'IQ1: How are cells arranged in a multicellular organism?',
        points: [
          'Describe the relationship between cell specialisation and development of tissues, organs and organ systems',
          'Examine and describe the histology of animal and plant tissues',
          'Explain the relationship between structure and function of cells within tissues and organs',
          'Compare single-celled and multicellular organisms for advantages and disadvantages',
        ],
      },
      {
        label: 'IQ2: How does the composition of blood relate to its function?',
        points: [
          'Identify the components of blood and explain the function of each',
          'Explain the role of haemoglobin and plasma in transport of oxygen and carbon dioxide',
          'Describe the structure and function of red blood cells, white blood cells and platelets',
          'Explain the ABO blood group system and Rhesus factor',
          'Explain the process of blood clotting and its importance',
        ],
      },
      {
        label: 'IQ3: How does the structure of the heart relate to its function?',
        points: [
          'Describe the gross structure of the heart including chambers, valves and associated vessels',
          'Trace the pathway of blood through the heart explaining the roles of valves',
          'Explain the cardiac cycle including systole and diastole',
          'Explain how heart rate is regulated through the sinoatrial node and nervous system',
          'Analyse data on cardiovascular disease and evaluate lifestyle factors',
        ],
      },
      {
        label: 'IQ4: What are the roles of the digestive system?',
        points: [
          'Describe the overall function of the digestive system in providing nutrients for cells',
          'Identify the organs of the digestive system and their roles in digestion',
          'Explain the role of enzymes in digestion including amylase, protease and lipase',
          'Describe the structure of the small intestine in relation to absorption',
          'Explain the role of the liver in regulation of blood glucose and metabolism',
        ],
      },
    ],
  },
  m3: {
    title: 'MODULE 3: Biological Diversity',
    iq: [
      {
        label: 'IQ1: What is the relationship between biodiversity and interconnectedness of life?',
        points: [
          'Explain the binomial nomenclature system and its advantages',
          'Describe the hierarchical classification: domain, kingdom, phylum, class, order, family, genus, species',
          'Compare features of organisms from each kingdom: Animalia, Plantae, Fungi, Protista, Monera',
          'Explain the concept of biodiversity and the value of maintaining it',
          'Describe methods to measure biodiversity including species richness and Simpsons Diversity Index',
        ],
      },
      {
        label: 'IQ2: How does evolution account for past and present biodiversity?',
        points: [
          'Explain the theory of evolution by natural selection as proposed by Charles Darwin',
          'Explain the role of mutation, variation and selection pressure in natural selection',
          'Describe the evidence for evolution: fossil record, comparative anatomy, biogeography',
          'Explain speciation as a result of geographic and reproductive isolation',
          'Explain convergent and divergent evolution with examples',
          'Evaluate the use of phylogenetic trees and cladistics in classification',
        ],
      },
      {
        label: 'IQ3: How do environmental pressures promote change in species diversity?',
        points: [
          'Explain how changes in selection pressures can alter allele frequencies',
          'Describe adaptations as structural, physiological and behavioural',
          'Explain the role of reproductive strategies in survival of species',
          'Analyse the impact of human activity on species diversity and extinction rates',
          'Evaluate conservation strategies including in situ and ex situ methods',
        ],
      },
    ],
  },
  m4: {
    title: 'MODULE 4: Ecosystem Dynamics',
    iq: [
      {
        label: 'IQ1: How do organisms obtain energy?',
        points: [
          'Describe the roles of producers, consumers and decomposers in an ecosystem',
          'Construct and interpret food chains, food webs and trophic pyramids',
          'Explain the flow of energy through an ecosystem using the 10% rule',
          'Compare photosynthesis and cellular respiration as complementary processes',
          'Explain the role of decomposers in nutrient cycling',
        ],
      },
      {
        label: 'IQ2: What happens to ecosystems when equilibrium is disturbed?',
        points: [
          'Explain abiotic and biotic factors and their roles in ecosystem stability',
          'Describe the effects of changes in abiotic factors on population dynamics',
          'Explain predator-prey relationships and their cyclical nature',
          'Analyse the impact of introduced species on native ecosystems',
          'Describe primary and secondary succession following disturbance',
        ],
      },
      {
        label: 'IQ3: How do humans affect species diversity and abundance?',
        points: [
          'Analyse the impact of habitat destruction, fragmentation and degradation on biodiversity',
          'Explain the greenhouse effect and evaluate evidence for anthropogenic climate change',
          'Assess the impact of pollution, over-harvesting and invasive species on ecosystems',
          'Evaluate the effectiveness of conservation strategies in maintaining ecosystem health',
          'Analyse the relationship between human population growth and resource consumption',
        ],
      },
    ],
  },
};


// ── DIALOG LINES ──────────────────────────────────────────
// Three lines spoken by Mr Glass when the player approaches
// each location. Keep lines short — they appear in a small
// pixel-font dialog box. Empty strings are skipped.
const CONFIG_DIALOGS = {
  house: [
    "Welcome home. Each room holds a module.",
    "Tick dot points honestly — confident means you could explain it to someone else.",
    "Work through each module as we cover it in class.",
  ],
  tree: [
    "Your quiz tree grows with every Canvas quiz completed.",
    "A bare tree at term end is a conversation worth having.",
    "Full bloom means all 40 quizzes done — something to be proud of.",
  ],
  garden: [
    "Four beds, one per assessment task.",
    "Mark a bed when you have submitted or sat the task.",
    "A harvested bed is a milestone — each one matters.",
  ],
  well: [
    "The well fills as you log practicals.",
    "Eight practicals across the year — don't let it run dry.",
    "A full well shows you've engaged with the lab work.",
  ],
  mailbox: [
    "Check here for messages from Mr Glass.",
    "New mail lights up the flag.",
    "",
  ],
  cave: [
    "Something stirs behind these vines.",
    "75% of dot points marked confident unlocks the entrance.",
    "What's inside? Only the dedicated find out.",
  ],
};


// ── ACHIEVEMENTS ──────────────────────────────────────────
// Each achievement fires a toast when its condition is met.
// 'key'       — unique string, never change once set (used in save data)
// 'toast'     — message shown to the student
// 'check(ST)' — function receiving the state object; return true to award
const CONFIG_ACHIEVEMENTS = [
  {
    key: 'first_confident',
    toast: 'First dot point marked confident — the garden is growing.',
    check: (ST) => Object.values(ST.dp).filter(v => v === 'conf').length >= 1,
  },
  {
    key: 'ten_confident',
    toast: '10 dot points confident — solid foundation.',
    check: (ST) => Object.values(ST.dp).filter(v => v === 'conf').length >= 10,
  },
  {
    key: 'twenty_five_confident',
    toast: '25 dot points confident — well over halfway.',
    check: (ST) => Object.values(ST.dp).filter(v => v === 'conf').length >= 25,
  },
  {
    key: 'all_confident',
    toast: 'All dot points confident. The garden is in full bloom.',
    check: (ST) => Object.values(ST.dp).every(v => v === 'conf'),
  },
  {
    key: 'first_quiz',
    toast: 'First quiz logged. The study tree stirs.',
    check: (ST) => Object.values(ST.qz).filter(Boolean).length >= 1,
  },
  {
    key: 'half_quizzes',
    toast: '20 quizzes done — halfway up the tree.',
    check: (ST) => Object.values(ST.qz).filter(Boolean).length >= 20,
  },
  {
    key: 'explorer',
    toast: 'Explorer — you have walked every corner of the farm.',
    check: (ST) => ST.stepCount >= 300,
  },
  {
    key: 'thousand_steps',
    toast: '1000 steps — you know this garden well.',
    check: (ST) => ST.stepCount >= 1000,
  },
];


// ── DEMO MODE ─────────────────────────────────────────────────────────
// Set to true to cycle through all times of day quickly in class.
// Each cycle takes ~30 seconds when enabled. Set back to false normally.
const CONFIG_DEMO_MODE = false;

// ── NPC DAILY MESSAGES ────────────────────────────────────────────────
// Mr Glass says one of these when the player first approaches each day.
// Add or change lines freely — one is picked based on the day of the week.
const CONFIG_NPC_MESSAGES = [
  'Good to see you back. The garden keeps growing when you do.',
  'Don't forget the cave unlocks at 75% confident dot points.',
  'Mark a dot point in progress today — even one.',
  'The well fills as you log your practicals. How many are left?',
  'Check the mailbox — there may be something new.',
  'A full study tree takes the whole year. Keep going.',
  'Year 11 Biology is a long game. Every session counts.',
];

// ── FIRST VISIT GREETING ──────────────────────────────────────────────
// Shown once, the very first time a student enters the garden.
const CONFIG_FIRST_VISIT_GREETING = [
  'Welcome to the garden. This space is yours for Year 11 Biology.',
  'Walk to each building and press E to open it.',
  'The Farmhouse tracks your dot points. The Well logs your practicals.',
  'The Study Tree grows as you complete Canvas quizzes.',
  'The Garden beds mark your assessment tasks.',
  'When 75% of dot points are confident — the Cave unlocks.',
  'See you in class, ' // student name appended at runtime
];
