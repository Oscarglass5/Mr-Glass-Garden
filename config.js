// ============================================================
//  MR GLASS' GARDEN — TEACHER CONFIGURATION
//  Edit this file to update content. No coding needed for text.
// ============================================================

var CONFIG_TITLE    = "MR GLASS' GARDEN";
var CONFIG_SUBTITLE = "YEAR 11 BIOLOGY · 2025";
var CONFIG_TEACHER  = "Mr Glass";
var CONFIG_SEASON_BADGE = "SPRING · TERM 1";

var CONFIG_MAIL = [
  { from: "Mr Glass",
    subject: "Welcome to Year 11 Biology!",
    body: "Welcome to Mr Glass's Garden. Walk with WASD or arrow keys and press E near any building to open it. Your farm reflects your year — keep it growing!" }
];

var CONFIG_ASSESSMENTS = [
  { key: 'at1', label: 'TASK 1', desc: 'Depth Study',    term: 'Term 1' },
  { key: 'at2', label: 'TASK 2', desc: 'Knowledge Task', term: 'Term 2' },
  { key: 'at3', label: 'TASK 3', desc: 'Skills Task',    term: 'Term 3' },
  { key: 'at4', label: 'EXAM',   desc: 'End of Year Exam',term: 'Term 4' }
];

var CONFIG_PRACTICALS = [
  'Practical 1: Microscopy and cell observation',
  'Practical 2: Osmosis in plant cells',
  'Practical 3: Enzyme activity',
  'Practical 4: Blood smear analysis',
  'Practical 5: Heart dissection',
  'Practical 6: Quadrat sampling',
  'Practical 7: Food web fieldwork',
  'Practical 8: Water quality testing'
];

function quizList(n, count){
  var a = [];
  for (var i = 1; i <= count; i++) a.push('Module ' + n + ' Quiz ' + i);
  return a;
}
var CONFIG_QUIZZES = {
  m1: quizList(1,10), m2: quizList(2,10), m3: quizList(3,10), m4: quizList(4,10)
};

var CONFIG_SYLLABUS = {
  m1: {
    title: 'MODULE 1: Cells as the Basis of Life',
    iq: [
      { label: 'IQ1: What distinguishes living from non-living things?',
        points: [
          'Construct and analyse a timeline of cell theory development, including contributions of Hooke and Brown',
          'Compare contributions of light and electron microscopy to understanding of cell structure',
          'Identify and describe structure and function of organelles',
          'Compare the structure of prokaryotic and eukaryotic cells',
          'Explain how the fluid mosaic model accounts for movement of molecules across the membrane' ] },
      { label: 'IQ2: How do cells maintain an internal environment?',
        points: [
          'Explain how surface area to volume ratio affects rate of diffusion in cells',
          'Describe the role of diffusion, osmosis and active transport across membranes',
          'Investigate osmosis and its effects on plant and animal cells',
          'Explain the effects of isotonic, hypotonic and hypertonic solutions on cells',
          'Explain how water potential affects movement of water across cell membranes' ] },
      { label: 'IQ3: What is the role of the nucleus in cell reproduction?',
        points: [
          'Describe the roles of DNA and RNA including transcription and translation',
          'Identify the location and role of ATP in cells',
          'Describe the role of enzymes as biological catalysts',
          'Model the stages of mitosis and explain its significance in growth and repair',
          'Explain the significance of meiosis including crossing over and independent assortment',
          'Compare mitosis and meiosis including chromosome number of daughter cells' ] }
    ]
  },
  m2: {
    title: 'MODULE 2: Organisation of Living Things',
    iq: [
      { label: 'IQ1: How are cells arranged in a multicellular organism?',
        points: [
          'Investigate different types of cells and the relationship between structure and function',
          'Compare unicellular, colonial and multicellular organisms',
          'Distinguish between autotrophs and heterotrophs',
          'Explain the hierarchical structure: cells, tissues, organs, systems' ] },
      { label: 'IQ2: What is the relationship between structure and function?',
        points: [
          'Investigate the structure and function of the digestive system',
          'Investigate gas exchange surfaces in plants and animals',
          'Compare the structure of arteries, veins and capillaries',
          'Trace the path of blood through the body',
          'Investigate the structure of the leaf and its role in photosynthesis' ] },
      { label: 'IQ3: How do plant and animal systems compare?',
        points: [
          'Compare the transport systems in plants and animals',
          'Investigate the role of the xylem and phloem in transport',
          'Analyse the relationship between cell requirements and exchange surfaces' ] }
    ]
  },
  m3: {
    title: 'MODULE 3: Biological Diversity',
    iq: [
      { label: 'IQ1: How do environmental pressures promote biodiversity?',
        points: [
          'Explain how the theory of evolution by natural selection accounts for diversity',
          'Describe how a species responds to environmental change',
          'Investigate adaptations: structural, physiological and behavioural',
          'Explain the role of variation in a population' ] },
      { label: 'IQ2: How can biodiversity change over time?',
        points: [
          'Explain how mutation introduces new variation',
          'Investigate gene flow and genetic drift in populations',
          'Explain how selection pressures lead to changes in allele frequency',
          'Describe the conditions required for speciation' ] },
      { label: 'IQ3: How is biodiversity measured and conserved?',
        points: [
          'Investigate the methods used to measure biodiversity',
          'Analyse the impact of human activity on biodiversity',
          'Evaluate strategies used to conserve biodiversity' ] }
    ]
  },
  m4: {
    title: 'MODULE 4: Ecosystem Dynamics',
    iq: [
      { label: 'IQ1: What effect can one species have on others?',
        points: [
          'Investigate the relationships between organisms in an ecosystem',
          'Construct and interpret food webs and energy flow diagrams',
          'Explain the cycling of matter through ecosystems',
          'Investigate the impact of an introduced or keystone species' ] },
      { label: 'IQ2: How can ecosystems be investigated over time?',
        points: [
          'Investigate past ecosystems using fossil and geological evidence',
          'Analyse changes in an ecosystem using field and historical data',
          'Investigate the abiotic and biotic factors of an ecosystem' ] },
      { label: 'IQ3: How can human activity affect ecosystems?',
        points: [
          'Evaluate human impacts on the dynamics of an ecosystem',
          'Investigate strategies used to restore or manage ecosystems',
          'Predict future ecosystem changes from current trends' ] }
    ]
  }
};

var CONFIG_NPC_MESSAGES = [
  'Good to see you back. The garden keeps growing when you do.',
  "Don't forget the cave unlocks at 75% confident dot points.",
  'Mark a dot point in progress today — even one.',
  'The well fills as you log your practicals. How many are left?',
  'Check the mailbox — there may be something new.',
  'A full study tree takes the whole year. Keep going.',
  'Year 11 Biology is a long game. Every session counts.'
];

var CONFIG_ACHIEVEMENTS = [
  { key: 'first_dp', toast: 'First dot point logged!',
    check: function(s){ return Object.keys(s.dp).some(function(k){return s.dp[k]!=='none';}); } },
  { key: 'first_quiz', toast: 'First quiz complete — the tree stirs!',
    check: function(s){ return Object.keys(s.qz).some(function(k){return s.qz[k];}); } },
  { key: 'm1_done', toast: 'Module 1 fully confident!',
    check: function(s){ return moduleConfidentPct('m1') >= 1; } },
  { key: 'cave_unlock', toast: 'The cave has opened!',
    check: function(s){ return overallConfidentPct() >= 0.75; } }
];
