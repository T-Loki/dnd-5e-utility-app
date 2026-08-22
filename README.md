# ⚔️ D&D 5e Party Damage Calculator

An interactive, high-precision D&D 5th Edition Damage Per Round (DPR) and combat probability calculator built with **React**, **TypeScript**, and **Vite**. Designed for players and Dungeon Masters to model party offensive output, simulate complex multi-attack rounds, analyze statistical distributions, and visualize build performance across arbitrary target Armor Classes (AC).

---

## 🚀 Features

### 🎯 Comprehensive Probability & Combat Engine
- **Accurate D20 Mechanics**: Full modeling of normal rolls, Advantage ($1 - (1-p)^2$), and Disadvantage ($p^2$), respecting automatic hits/misses on Natural 20s and Natural 1s.
- **Dynamic Armor Class (AC)**: Adjust target AC in real-time or pick from quick-select presets (`12`, `15`, `18`, `20`) with instant recalculation across all characters.
- **Expanded Critical Ranges**: Full support for Champion Fighters, Hexblade curses, and special weapons with configurable critical hit thresholds (`20`, `19–20`, `18–20`).
- **Flexible Critical Hit Rules**:
  - **RAW (Rules As Written)**: Roll all damage dice twice (`2× Dice + Mod`).
  - **House Rule (Max + Roll)**: Maximize standard dice and add rolled bonus dice (`Max Base + Roll + Mod`).
- **Halfling Luck (Bountiful Luck)**: Re-rolls Natural 1s on attack rolls with exact mathematical modeling.
- **Great Weapon Fighting (GWF)**: Accurately re-rolls 1s and 2s on weapon damage dice.
- **Savage Attacker**: Models rolling damage dice with advantage (taking the highest roll).
- **Damage Modifiers**: Toggle between **Normal** ($1.0\times$), **Resistance** ($0.5\times$), and **Vulnerability** ($2.0\times$) per damage component.
- **Guaranteed Damage & Saving Throws**: Supports attacks with massive to-hit bonuses (e.g. $+99$ for Magic Missile or save-for-half effects) calculating at 100% hit rate without unintended critical hits.

---

### 📈 Visual Analytics & Graphical Suite
- **AC Sensitivity Curve**: Interactive sensitivity graph sweeping across AC 10 to 25 to model damage falloff against heavily armored targets, complete with interactive line toggling and dynamic target AC markers.
- **Party Damage Contribution Breakdown**: Recharts donut chart detailing proportional damage shares across party members, with instant drilldown into individual attack contributions.
- **Turn Damage Distribution (PMF)**: Discrete probability mass function histogram modeling the exact likelihood of every discrete damage total per turn, marked with on-hit quartiles ($Q_1$, Median, $Q_3$).
- **Cumulative Survival Curves ($P(\text{Damage} \ge X)$)**: Step-survival curves calculating the exact mathematical odds of meeting or exceeding any damage threshold against monster defense, paired with an interactive threshold slider and milestone metric cards.

---

### 📊 Deep Statistical Breakdown & Percentiles
- **Expected Damage Per Round (DPR)**: Accurate mathematical expected value accounting for regular hit chance, critical hit chance, and bonus damage riders.
- **On-Hit Damage Percentiles**:
  - **25th Percentile ($Q_1$ - Low End)**: Damage floor when attacks connect.
  - **50th Percentile (Median)**: Expected median damage on successful hits.
  - **75th Percentile ($Q_3$ - High End)**: High-end damage spikes on hit.
- **Max Potential Burst**: Calculates the absolute ceiling damage output if all active attacks critically hit for maximum possible damage rolls.
- **Step-by-Step Mathematical Tooltips**: Hover over any DPR badge (Party, Character, or individual Attack) to inspect the exact mathematical formulas and intermediate variables.

---

### 👥 Party & Attack Management
- **Modular Party Roster**: Add, rename, and manage multiple characters in a single unified encounter.
- **Per-Attack & Per-Character Toggles**: Instantly include or exclude individual attacks or entire characters to simulate different tactical rounds (e.g. Action Surge, Bonus Action off-hand attacks, Smite usage).
- **Drag-and-Drop & Accessible Attack Reordering**: Reorder attack sequences easily with drag handles or direct Up/Down arrow buttons.
- **Multi-Part Attacks & Damage Riders**: Configure primary damage dice, flat modifiers, bonus dice (Sneak Attack, Divine Smite, Hunter's Mark, Hex), and bonus flat damage per attack.
- **Quick Duplicate & Delete**: Duplicate complex attacks with a single click or remove obsolete entries.

---

### 💾 Data Persistence & Portability
- **Auto-Save**: State is automatically persisted to browser `localStorage` on every change.
- **Export to JSON**: Download your entire party and encounter configuration as a portable JSON file.
- **Import from JSON**: Load party builds from previously exported files or share them with fellow players and DMs.
- **Reset to Defaults**: One-click reset to restore sample balanced party presets (Rogue, Barbarian, Paladin, etc.).
- **In-App Changelog Modal**: Access release notes, new features, and patch history directly from the header.

---

## 🧮 How DPR is Calculated

For each active attack:

$$P(\text{Crit}) = \text{Probability of rolling within the critical threat range}$$

$$P(\text{Hit}) = \max\left(P(\text{Crit}), \min\left(0.95, \frac{21 - (\text{Target AC} - \text{To-Hit Bonus})}{20}\right)\right)$$

$$P(\text{Regular Hit}) = P(\text{Hit}) - P(\text{Crit})$$

$$\text{Expected DPR} = \left[ P(\text{Regular Hit}) \times \text{Avg Hit Damage} \right] + \left[ P(\text{Crit}) \times \text{Avg Crit Damage} \right]$$

Damage resistance ($0.5\times$) or vulnerability ($2.0\times$) multipliers are applied directly to each damage component before computing the final sum.

---

## 🛠️ Project Structure

```
dnd-5e-utility-app/
├── index.html                  # HTML entry point
├── package.json                # Project dependencies & scripts
├── vite.config.js              # Vite configuration
└── src/
    ├── main.jsx                # React root mount
    ├── App.jsx                 # Top-level state orchestration & presets
    ├── index.css               # Dark fantasy design system & styling
    ├── data/
    │   └── changelog.js        # Version history & patch notes data
    ├── components/
    │   ├── Header.jsx              # App navigation, JSON Import/Export, Changelog trigger
    │   ├── Dashboard.jsx           # Global target AC, Crit rules, Party DPR & percentiles
    │   ├── CharacterList.jsx       # Party character cards container & add character action
    │   ├── CharacterCard.jsx       # Character header, DPR breakdown, attack table
    │   ├── AttackItem.jsx          # Attack row with drag-and-drop, roll modes, and damage fields
    │   ├── AnalyticsView.jsx       # Analytics tab container (AC Sensitivity, Distribution, Survival)
    │   ├── PartyShareChart.jsx     # Recharts donut chart with attack drilldown
    │   ├── DamageDistributionChart.jsx # PMF discrete histogram with quartile markers
    │   ├── CumulativeDamageChart.jsx   # CDF survival curves & threshold calculator
    │   ├── DistributionModal.jsx   # Pop-up distribution modal for quick inspection
    │   └── ChangelogModal.jsx      # In-app release notes & changelog dialog
    ├── engine/
    │   ├── calculator.ts           # Core mathematical formulas & dice expectation algorithms
    │   ├── dprEngine.ts            # Modular DPR calculation engine & PMF convolutions
    │   ├── types.ts                # TypeScript interfaces & types
    │   ├── models/
    │   │   ├── Attack.ts           # Attack data model
    │   │   └── Character.ts        # Character data model
    │   ├── stats/
    │   │   └── percentileCalculator.ts # Exact discrete PMF & percentile convolutions
    │   └── tests/
    │       └── engine.test.ts      # Unit test suite for probability & calculation engine
    └── hooks/
        └── usePartyState.js        # Party state management and persistence hook
```

---

## 📜 Recent Changelog Highlights

| Version | Date | Key Highlights |
| :--- | :--- | :--- |
| **v1.3.0** | 2026-08-22 | Visual Analytics Suite (AC sensitivity curves, party damage share donut with attack drilldown, cumulative survival $P \ge X$ curves, interactive threshold slider), and in-app Changelog modal. |
| **v1.2.0** | 2026-08-16 | Step-by-step mathematical inspection tooltips for DPR badges, and guaranteed hit / saving throw support (+99 attack bonus). |
| **v1.1.0** | 2026-08-16 | Attack drag-and-drop sequencing, accessible Up/Down move buttons, and Advantage/Disadvantage dynamic UI styling. |
| **v1.0.0** | 2026-08-16 | Initial release: Complete D&D 5e DPR engine, character roster management, custom crit rules, on-hit percentiles, and JSON import/export. |

*Full patch notes and detailed change categories can be viewed in-app by clicking the **📜 Changelog** button in the header.*

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- `npm` or `yarn`

### Installation & Local Development

1. Navigate to the project directory:
   ```bash
   cd dnd-5e-utility-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

### Running Tests
To run the automated probability engine tests:
```bash
npm test
```

### Production Build
To create an optimized production bundle:
```bash
npm run build
```
The output files will be generated in the `dist/` directory, ready to deploy to GitHub Pages, Vercel, Netlify, or any static host.

---

## 📜 License & Acknowledgments
- Built for the Dungeons & Dragons 5th Edition community under the Open Game License (OGL) and System Reference Document (SRD 5.1).
