# ⚔️ D&D 5e Party Damage Calculator

An interactive, high-precision D&D 5th Edition Damage Per Round (DPR) and combat probability calculator built with **React** and **Vite**. Designed for players and Dungeon Masters to accurately model party offensive output, analyze attack distributions, and compare builds across arbitrary target Armor Classes (AC).

---

## 🚀 Features

### 🎯 Comprehensive Probability & Combat Engine
- **Accurate D20 Mechanics**: Full modeling of normal rolls, Advantage ($1 - (1-p)^2$), and Disadvantage ($p^2$), respecting automatic hits/misses on Natural 20s and Natural 1s.
- **Dynamic Armor Class (AC)**: Adjust target AC in real-time or pick from quick-select presets (`12`, `15`, `18`, `20`) with instant recalculation across all characters.
- **Expanded Critical Ranges**: Full support for Champion Fighters and Hexblade curses with configurable critical hit thresholds (`20`, `19–20`, `18–20`).
- **Flexible Critical Hit Rules**:
  - **RAW (Rules As Written)**: Roll all damage dice twice (`2× Dice + Mod`).
  - **House Rule (Max + Roll)**: Maximize standard dice and add rolled bonus dice (`Max Base + Roll + Mod`).
- **Halfling Luck (Bountiful Luck)**: Re-rolls Natural 1s on attack rolls with exact mathematical modeling.
- **Great Weapon Fighting (GWF)**: Accurately re-rolls 1s and 2s on weapon damage dice.
- **Savage Attacker**: Models rolling damage dice with advantage (taking the highest roll).
- **Damage Modifiers**: Toggle between **Normal** ($1.0\times$), **Resistance** ($0.5\times$), and **Vulnerability** ($2.0\times$) per damage component.

---

### 📊 Deep Statistical Breakdown & Percentiles
- **Expected Damage Per Round (DPR)**: Accurate mathematical expected value accounting for regular hit chance, critical hit chance, and bonus damage riders.
- **On-Hit Damage Percentiles**:
  - **25th Percentile (Q1 - Low End)**: Damage floor when attacks connect.
  - **50th Percentile (Median)**: Expected median damage on successful hits.
  - **75th Percentile (Q3 - High End)**: High-end damage spikes on hit.
- **Max Potential Burst**: Calculates the absolute ceiling damage output if all active attacks critically hit for maximum possible damage rolls.
- **Interactive Calculation Tooltips**: Hover over any DPR badge (Party, Character, or individual Attack) to inspect the exact mathematical step-by-step breakdown.

---

### 👥 Party & Attack Management
- **Modular Party Roster**: Add, rename, and manage multiple characters in a single unified encounter.
- **Per-Attack & Per-Character Toggles**: Instantly include or exclude individual attacks or entire characters to simulate different tactical rounds (e.g. Action Surge, Bonus Action off-hand attacks, Smite usage).
- **Drag-and-Drop Attack Reordering**: Reorder attack sequences easily within each character's sheet.
- **Multi-Part Attacks & Damage Riders**: Configure primary damage dice, flat modifiers, bonus dice (Sneak Attack, Divine Smite, Hunter's Mark, Hex), and bonus flat damage per attack.
- **Quick Duplicate & Delete**: Duplicate complex attacks with a single click or remove obsolete entries.

---

### 💾 Data Persistence & JSON Portability
- **Auto-Save**: State is automatically persisted to browser `localStorage` on every change.
- **Export to JSON**: Download your entire party and encounter configuration as a portable JSON file.
- **Import from JSON**: Load party builds from previously exported files or share them with fellow players and DMs.
- **Reset to Defaults**: One-click reset to restore sample balanced party presets (Rogue, Barbarian, Paladin, etc.).

---

## 🧮 How DPR is Calculated

For each active attack:

$$P(\text{Crit}) = \text{Probability of rolling within the critical threat range}$$

$$P(\text{Hit}) = \max\left(P(\text{Crit}), \min\left(0.95, \frac{21 - (\text{Target AC} - \text{To-Hit Bonus})}{20}\right)\right)$$

$$P(\text{Regular Hit}) = P(\text{Hit}) - P(\text{Crit})$$

$$\text{Expected DPR} = \left[ P(\text{Regular Hit}) \times \text{Avg Hit Damage} \right] + \left[ P(\text{Crit}) \times \text{Avg Crit Damage} \right]$$

Damage resistance or vulnerability multipliers are applied directly to each damage component before computing the final sum.

---

## 🛠️ Project Structure

```
dnd-5e-utility-app/
├── index.html              # HTML entry point
├── package.json            # Project dependencies & scripts
├── vite.config.js          # Vite configuration
└── src/
    ├── main.jsx            # React root mount
    ├── App.jsx             # Top-level state orchestration & presets
    ├── index.css           # Custom dark fantasy CSS design system
    ├── components/
    │   ├── Header.jsx          # App navigation, JSON Import/Export, preset reset
    │   ├── Dashboard.jsx       # Global target AC, Crit rules, Party DPR & percentiles
    │   ├── CharacterList.jsx   # List of party character cards & add character action
    │   ├── CharacterCard.jsx   # Character header, DPR breakdown, attack table
    │   └── AttackItem.jsx      # Attack row with drag-and-drop, roll modes, and damage fields
    ├── engine/
    │   ├── calculator.ts       # Core mathematical formulas & dice expectation algorithms
    │   ├── dprEngine.ts        # Modular DPR calculation engine
    │   ├── types.ts            # TypeScript interfaces & types
    │   └── stats/              # Statistical distribution utilities
    └── hooks/
        └── usePartyState.js    # Party state management and persistence hook
```

---

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16 or later recommended)
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

4. Open `http://localhost:5173` (or the port specified by Vite) in your browser.

### Production Build
To create an optimized production bundle:
```bash
npm run build
```
The output files will be generated in the `dist/` directory, ready to be deployed to any static web hosting service (GitHub Pages, Vercel, Netlify, etc.).

---

## 📜 License & Acknowledgments
- Built for the Dungeons & Dragons 5th Edition community under the Open Game License (OGL) and System Reference Document (SRD 5.1).
