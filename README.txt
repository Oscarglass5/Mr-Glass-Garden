MR GLASS' GARDEN — Phaser edition
==================================

WHAT'S IN HERE
  index.html      <- the game (open this)
  phaser.min.js   <- game engine (bundled, works offline)
  game.js         <- world, player, beds, creatures
  ui.js           <- the pop-up panels (syllabus, quizzes, etc.)
  config.js       <- YOUR CONTENT: edit syllabus, quizzes, messages here
  assets/         <- all the sprite images

HOW TO RUN IT
  This is a Phaser game, which loads its images as separate files.
  Browsers BLOCK that when you open index.html directly from disk
  (double-clicking gives a blank screen, especially in Safari).

  So it must be served, not opened directly. Two easy options:

  OPTION A — Host it (recommended for students)
    Upload this whole folder to GitHub Pages (or any web host).
    Students open the link. Works in Safari, no install, no download.

  OPTION B — Run a local server (for testing on your own machine)
    Open Terminal, cd into this folder, and run:
        python3 -m http.server 8000
    Then open  http://localhost:8000  in your browser.

EDITING CONTENT
  Open config.js in any text editor to change the syllabus dot points,
  quiz names, practical list, assessment tasks, and mailbox messages.
  Save, then refresh the page.

CONTROLS
  WASD or arrow keys to move.  E to interact near a building.

SAVES
  Progress saves automatically in the browser (localStorage), per device.
