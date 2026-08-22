export const CHANGELOG = [
  {
    version: '1.3.0',
    date: '2026-08-22',
    title: 'Visual Analytics Suite & In-App Changelog',
    highlight: 'Introduced comprehensive graphical analytics including AC sensitivity curves, party damage contribution breakdowns, survival curves, and an interactive changelog modal.',
    changes: [
      {
        type: 'feature',
        title: 'AC Sensitivity Curve Analysis',
        description: 'Interactive sensitivity graph modeling Party and individual Character DPR degradation continuously across AC 10 to 25 with interactive line toggling and reference lines.',
      },
      {
        type: 'feature',
        title: 'Party Damage Share Donut & Attack Drilldown',
        description: 'Visual Recharts donut chart detailing proportional damage contributions across party members, with click-to-drilldown into individual attack breakdowns.',
      },
      {
        type: 'feature',
        title: 'Cumulative Survival Curves (P(Damage ≥ X))',
        description: 'Discrete survival step curves calculating exact odds of meeting or exceeding any damage threshold against target AC, with milestone cards and real-time threshold slider.',
      },
      {
        type: 'feature',
        title: 'In-App Interactive Changelog',
        description: 'Easily view version history, new features, bug fixes, and updates directly from the main header modal.',
      },
      {
        type: 'improvement',
        title: 'Expanded Probability Mass Function (PMF)',
        description: 'Dedicated Turn Damage Distribution histograms with on-hit percentile markers (25th, Median 50th, 75th) and dynamic target AC adjustment.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-16',
    title: 'Mathematical Inspection Tooltips & Guaranteed Hits',
    highlight: 'Added step-by-step calculation inspection tooltips and guaranteed hit support for spell saves and special abilities.',
    changes: [
      {
        type: 'feature',
        title: 'Step-by-Step Calculation Tooltips',
        description: 'Hover over any DPR badge on characters or attacks to inspect exact hit chance, crit chance, regular hit damage, and crit damage formulas.',
      },
      {
        type: 'feature',
        title: 'Guaranteed Damage & Saving Throw Support',
        description: 'Attacks with extreme attack bonuses (e.g., +99 for Magic Missile or guaranteed save halves) calculate with 100% hit rate without accidental auto-crits.',
      },
      {
        type: 'improvement',
        title: 'UI Tooltip Positioning & Polish',
        description: 'Refined hover tooltips across the dashboard and character cards with dark fantasy styling and monospace formula breakdowns.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-16',
    title: 'Attack Drag-and-Drop Reordering & Workflow Enhancements',
    highlight: 'Implemented drag-and-drop attack reordering along with keyboard-accessible move buttons.',
    changes: [
      {
        type: 'feature',
        title: 'Drag-and-Drop Attack Sequencing',
        description: 'Smooth drag-and-drop reordering of attacks within each character sheet with visual insertion indicators.',
      },
      {
        type: 'feature',
        title: 'Accessible Move Controls',
        description: 'Added Up and Down arrow buttons on every attack row for fast, accessible reordering without dragging.',
      },
      {
        type: 'improvement',
        title: 'Dynamic Roll Mode Styling',
        description: 'Color-coded visual styling for Advantage (emerald green) and Disadvantage (crimson red) dropdowns.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-08-16',
    title: 'Initial Release: D&D 5e Party Damage Calculator',
    highlight: 'First official launch of the high-precision D&D 5e probability and DPR calculator.',
    changes: [
      {
        type: 'feature',
        title: 'Core 5e Probability Engine',
        description: 'Accurate d20 mechanics modeling normal rolls, Advantage, Disadvantage, Halfling Luck, GWF, and expanded crit ranges (18-20, 19-20, 20).',
      },
      {
        type: 'feature',
        title: 'Custom Critical Hit Rules',
        description: 'Support for RAW (2× Dice + Mod) and House Rule (Max Standard Dice + Rolled Dice + Mod).',
      },
      {
        type: 'feature',
        title: 'Statistical Percentiles & Burst Ceiling',
        description: 'Detailed statistical reporting including 25th percentile (Q1), Median (50th), 75th percentile (Q3), and Max Potential Burst.',
      },
      {
        type: 'feature',
        title: 'Roster Management & Multi-Part Attacks',
        description: 'Create characters, toggle attacks, configure primary weapons, and stack bonus damage riders (Sneak Attack, Divine Smite, Hunter’s Mark, Hex).',
      },
      {
        type: 'feature',
        title: 'JSON Portability & Auto-Save',
        description: 'Browser localStorage persistence, JSON party export and import, and one-click default preset restoration.',
      },
    ],
  },
];
