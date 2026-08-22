import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { getTurnDamagePmf, getPartyDamagePmf, calculateSurvivalCdf } from '../engine/dprEngine';
import { DamageDistributionChart } from './DamageDistributionChart';
import { CumulativeDamageChart } from './CumulativeDamageChart';
import { PartyShareChart } from './PartyShareChart';

const PALETTE = [
  '#38bdf8', // Sky
  '#34d399', // Emerald
  '#a78bfa', // Violet
  '#f43f5e', // Rose
  '#fb923c', // Orange
  '#2dd4bf', // Teal
  '#e879f9', // Fuchsia
  '#818cf8', // Indigo
  '#facc15', // Yellow
  '#4ade80', // Green
  '#60a5fa', // Blue
  '#fb7185', // Rose Light
];

const PARTY_COLOR = '#f59e0b';

function CustomTooltip({ active, payload, label, charactersMap }) {
  if (!active || !payload || !payload.length) return null;

  // Find party total entry if available
  const partyEntry = payload.find((p) => p.dataKey === 'partyTotal');
  const characterEntries = payload.filter((p) => p.dataKey !== 'partyTotal');

  return (
    <div className="chart-tooltip-custom">
      <div className="tooltip-header">
        <span className="tooltip-ac-badge">Target AC {label}</span>
        {partyEntry && (
          <span className="tooltip-party-total">
            Party DPR: <strong>{Number(partyEntry.value).toFixed(2)}</strong>
          </span>
        )}
      </div>

      <div className="tooltip-divider" />

      <div className="tooltip-body">
        {characterEntries.map((entry) => {
          const charName = (charactersMap && charactersMap[entry.dataKey]) || entry.name || entry.dataKey;
          return (
            <div key={entry.dataKey} className="tooltip-char-row">
              <div className="tooltip-char-label">
                <span
                  className="tooltip-color-dot"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="tooltip-char-name">{charName}</span>
              </div>
              <span className="tooltip-char-value font-mono">
                {Number(entry.value).toFixed(2)} <span className="tooltip-unit">DPR</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsView({
  targetAC,
  setTargetAC,
  critRule,
  setCritRule,
  characters = [],
  acSweepData = [],
}) {
  // Track hidden lines by dataKey
  const [hiddenKeys, setHiddenKeys] = useState(new Set());
  const [selectedDistEntity, setSelectedDistEntity] = useState('party');
  const [distViewMode, setDistViewMode] = useState('pmf'); // 'pmf' | 'survival'

  // Filter only enabled characters
  const activeCharacters = useMemo(() => {
    return characters.filter((char) => char.enabled !== false);
  }, [characters]);

  // Create a mapping from character dataKey (id or name) to display name and color
  const { characterSeries, charactersMap } = useMemo(() => {
    const map = {};
    const series = activeCharacters.map((char, index) => {
      const dataKey = char.id || char.name;
      const color = PALETTE[index % PALETTE.length];
      map[dataKey] = char.name;
      return {
        id: char.id,
        dataKey,
        name: char.name,
        color,
      };
    });
    return { characterSeries: series, charactersMap: map };
  }, [activeCharacters]);

  const handleToggleLine = (dataKey) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  const handleShowAll = () => {
    setHiddenKeys(new Set());
  };

  const handleHideAll = () => {
    const allKeys = new Set(['partyTotal', ...characterSeries.map((s) => s.dataKey)]);
    setHiddenKeys(allKeys);
  };

  // Extract key milestone metrics from acSweepData
  const metrics = useMemo(() => {
    if (!acSweepData || acSweepData.length === 0) {
      return { ac10: 0, ac15: 0, ac20: 0, acCurrent: 0, dprDropPercent: 0 };
    }
    const getPartyDprAt = (acVal) => {
      const pt = acSweepData.find((p) => p.ac === acVal);
      return pt ? pt.partyTotal : 0;
    };

    const ac10 = getPartyDprAt(10);
    const ac15 = getPartyDprAt(15);
    const ac20 = getPartyDprAt(20);
    const acCurrent = getPartyDprAt(Number(targetAC) || 15);

    const dprDrop = ac10 > 0 ? ((ac10 - ac20) / ac10) * 100 : 0;

    return {
      ac10,
      ac15,
      ac20,
      acCurrent,
      dprDropPercent: Math.max(0, dprDrop),
    };
  }, [acSweepData, targetAC]);

  const hasActiveAttacks = activeCharacters.some((c) =>
    c.attacks && c.attacks.some((a) => a.enabled !== false)
  );

  // Compute active PMF distribution for selected entity (Party or specific Character)
  const activeDistributionResult = useMemo(() => {
    if (selectedDistEntity === 'party') {
      return getPartyDamagePmf(characters, Number(targetAC) || 15, critRule);
    }
    const targetChar = characters.find(
      (c) => (c.id && c.id === selectedDistEntity) || c.name === selectedDistEntity
    );
    if (targetChar) {
      return getTurnDamagePmf(targetChar.attacks || [], Number(targetAC) || 15, critRule);
    }
    return getPartyDamagePmf(characters, Number(targetAC) || 15, critRule);
  }, [selectedDistEntity, characters, targetAC, critRule]);

  const selectedEntityName = useMemo(() => {
    if (selectedDistEntity === 'party') return 'Entire Party Total';
    const char = characters.find(
      (c) => (c.id && c.id === selectedDistEntity) || c.name === selectedDistEntity
    );
    return char ? char.name : 'Selected Character';
  }, [selectedDistEntity, characters]);

  // Compute full survival CDF for entire party & all characters
  const survivalData = useMemo(() => {
    return calculateSurvivalCdf(characters, Number(targetAC) || 15, critRule);
  }, [characters, targetAC, critRule]);

  return (
    <div className="analytics-view-container">
      {/* Summary Metrics Ribbon */}
      <div className="analytics-ribbon-grid">
        <div className="analytics-ribbon-card">
          <div className="ribbon-card-header">
            <span className="ribbon-badge">Low AC</span>
            <span className="ribbon-label">AC 10 Party DPR</span>
          </div>
          <div className="ribbon-value text-gold font-mono">
            {metrics.ac10.toFixed(1)}
          </div>
          <div className="ribbon-footer">Baseline against low defense</div>
        </div>

        <div className="analytics-ribbon-card">
          <div className="ribbon-card-header">
            <span className="ribbon-badge badge-standard">Standard</span>
            <span className="ribbon-label">AC 15 Party DPR</span>
          </div>
          <div className="ribbon-value text-gold font-mono">
            {metrics.ac15.toFixed(1)}
          </div>
          <div className="ribbon-footer">Typical Tier 1-2 Monster AC</div>
        </div>

        <div className="analytics-ribbon-card">
          <div className="ribbon-card-header">
            <span className="ribbon-badge badge-high">High AC</span>
            <span className="ribbon-label">AC 20 Party DPR</span>
          </div>
          <div className="ribbon-value text-gold font-mono">
            {metrics.ac20.toFixed(1)}
          </div>
          <div className="ribbon-footer">Armored / Boss Encounter</div>
        </div>

        <div className="analytics-ribbon-card highlight-card">
          <div className="ribbon-card-header">
            <span className="ribbon-badge badge-target">Current Target</span>
            <span className="ribbon-label">Target AC {targetAC} DPR</span>
          </div>
          <div className="ribbon-value text-gold font-mono">
            {metrics.acCurrent.toFixed(1)}
          </div>
          <div className="ribbon-footer">
            Drop from AC 10: <strong className="text-crit">-{metrics.dprDropPercent.toFixed(0)}%</strong>
          </div>
        </div>
      </div>

      {/* Main Chart Container 0: Party Damage Contribution Breakdown (Donut + Attack Drilldown) */}
      <div className="analytics-chart-wrapper">
        <PartyShareChart
          characters={characters}
          targetAC={targetAC}
          critRule={critRule}
        />
      </div>

      {/* Main Chart Container 1: AC Sensitivity Curve */}
      <div className="analytics-chart-wrapper">
        <div className="analytics-chart-header">
          <div>
            <h2 className="analytics-chart-title">
              <span className="chart-icon">📈</span> AC Sensitivity Curve (Expected DPR vs. Target AC)
            </h2>
            <p className="analytics-chart-subtitle">
              Interactive sensitivity analysis modeling party damage degradation across Armor Class 10 through 25.
            </p>
          </div>

          <div className="chart-header-controls">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleShowAll}
              title="Show all character lines"
            >
              👁️ Show All
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleHideAll}
              title="Hide all character lines"
            >
              🚫 Hide All
            </button>
          </div>
        </div>

        {!hasActiveAttacks ? (
          <div className="analytics-empty-state">
            <div className="empty-state-icon">🛡️</div>
            <div className="empty-state-title">No Active Attacks Configured</div>
            <p className="empty-state-desc">
              Enable characters and attacks in the <strong>Roster Builder</strong> tab to visualize the AC sensitivity curves.
            </p>
          </div>
        ) : (
          <>
            {/* Custom Interactive Legend */}
            <div className="chart-legend-custom">
              <button
                type="button"
                className={`legend-pill ${hiddenKeys.has('partyTotal') ? 'is-hidden' : ''}`}
                onClick={() => handleToggleLine('partyTotal')}
                style={{
                  borderColor: hiddenKeys.has('partyTotal') ? 'var(--border-subtle)' : PARTY_COLOR,
                }}
              >
                <span
                  className="legend-pill-color"
                  style={{
                    backgroundColor: hiddenKeys.has('partyTotal') ? '#475569' : PARTY_COLOR,
                  }}
                />
                <span className="legend-pill-name font-bold">Party Total</span>
                {hiddenKeys.has('partyTotal') && <span className="legend-pill-off">OFF</span>}
              </button>

              {characterSeries.map((char) => {
                const isHidden = hiddenKeys.has(char.dataKey);
                return (
                  <button
                    key={char.dataKey}
                    type="button"
                    className={`legend-pill ${isHidden ? 'is-hidden' : ''}`}
                    onClick={() => handleToggleLine(char.dataKey)}
                    style={{
                      borderColor: isHidden ? 'var(--border-subtle)' : char.color,
                    }}
                  >
                    <span
                      className="legend-pill-color"
                      style={{
                        backgroundColor: isHidden ? '#475569' : char.color,
                      }}
                    />
                    <span className="legend-pill-name">{char.name}</span>
                    {isHidden && <span className="legend-pill-off">OFF</span>}
                  </button>
                );
              })}
            </div>

            {/* Recharts LineChart */}
            <div className="chart-responsive-box">
              <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                <LineChart
                  data={acSweepData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                >
                  <CartesianGrid
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                    vertical={true}
                    horizontal={true}
                  />

                  <XAxis
                    dataKey="ac"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    tickLine={{ stroke: '#334155' }}
                    domain={[10, 25]}
                    type="number"
                    ticks={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]}
                    label={{
                      value: 'Target Armor Class (AC)',
                      position: 'insideBottom',
                      offset: -15,
                      fill: '#94a3b8',
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                    }}
                  />

                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                    tickLine={{ stroke: '#334155' }}
                    label={{
                      value: 'Expected DPR',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 5,
                      fill: '#94a3b8',
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                    }}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip
                        charactersMap={charactersMap}
                      />
                    }
                  />

                  {/* Reference line indicating current target AC */}
                  {Number(targetAC) >= 10 && Number(targetAC) <= 25 && (
                    <ReferenceLine
                      x={Number(targetAC)}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: `Target AC (${targetAC})`,
                        position: 'top',
                        fill: '#fbbf24',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                      }}
                    />
                  )}

                  {/* Party Total Line */}
                  <Line
                    type="monotone"
                    dataKey="partyTotal"
                    name="Party Total"
                    stroke={PARTY_COLOR}
                    strokeWidth={3.5}
                    strokeDasharray="6 3"
                    dot={{ r: 4, fill: PARTY_COLOR, stroke: '#0b0f19', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: PARTY_COLOR, stroke: '#fff', strokeWidth: 2 }}
                    hide={hiddenKeys.has('partyTotal')}
                  />

                  {/* Individual Character Lines */}
                  {characterSeries.map((char) => (
                    <Line
                      key={char.dataKey}
                      type="monotone"
                      dataKey={char.dataKey}
                      name={char.name}
                      stroke={char.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: char.color, stroke: '#0b0f19', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: char.color, stroke: '#fff', strokeWidth: 2 }}
                      hide={hiddenKeys.has(char.dataKey)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Main Chart Container 2: Turn Damage Distributions & Survival CDF */}
      <div className="analytics-chart-wrapper">
        <div className="analytics-chart-header">
          <div>
            <h2 className="analytics-chart-title">
              <span className="chart-icon">{distViewMode === 'survival' ? '📉' : '🎲'}</span>{' '}
              {distViewMode === 'survival'
                ? 'Cumulative Survival Curve (P(Damage ≥ X))'
                : 'Turn Damage Distribution (PMF / Histogram)'}
            </h2>
            <p className="analytics-chart-subtitle">
              {distViewMode === 'survival'
                ? `Descending step-survival curves showing the exact odds of dealing at least X damage against Target AC ${targetAC}. Adjust AC to simulate changing monster armor.`
                : `Exact discrete probability mass function across all damage outcomes against Target AC ${targetAC}. Adjust AC to observe how defense shifts probability between misses and hit peaks.`}
            </p>
          </div>

          <div className="distribution-controls-bar">
            {/* Target AC Editor */}
            <div className="dist-ac-control">
              <span className="dist-control-label font-mono">Target AC:</span>
              <div className="dist-ac-input-wrapper">
                <input
                  type="number"
                  min="1"
                  max="35"
                  value={targetAC}
                  onChange={(e) => setTargetAC(e.target.value === '' ? '' : Number(e.target.value))}
                  className="target-ac-mini-input font-mono"
                  title="Edit Target Armor Class"
                />
                <div className="presets-list" style={{ marginTop: 0 }}>
                  {[12, 15, 18, 20].map((ac) => (
                    <button
                      key={ac}
                      type="button"
                      onClick={() => setTargetAC(ac)}
                      className={`preset-chip ${Number(targetAC) === ac ? 'active' : ''}`}
                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem' }}
                    >
                      {ac}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* View Mode Segmented Switcher */}
            <div className="distribution-view-mode-toggle">
              <button
                type="button"
                className={`mode-toggle-btn ${distViewMode === 'pmf' ? 'active' : ''}`}
                onClick={() => setDistViewMode('pmf')}
              >
                📊 Probability Mass (PMF)
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${distViewMode === 'survival' ? 'active' : ''}`}
                onClick={() => setDistViewMode('survival')}
              >
                📉 Cumulative Survival (P ≥ X)
              </button>
            </div>

            {/* View Target Dropdown (only relevant for PMF single view) */}
            {distViewMode === 'pmf' && (
              <div className="distribution-entity-selector">
                <label className="entity-select-label">Target:</label>
                <select
                  className="table-select-dark distribution-select"
                  value={selectedDistEntity}
                  onChange={(e) => setSelectedDistEntity(e.target.value)}
                >
                  <option value="party">👥 Entire Party</option>
                  {activeCharacters.map((char) => (
                    <option key={char.id || char.name} value={char.id || char.name}>
                      👤 {char.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {distViewMode === 'survival' ? (
          <CumulativeDamageChart
            survivalData={survivalData}
            characters={characters}
            targetAC={targetAC}
            title="Multi-Character Cumulative Survival (P(Damage ≥ X))"
            subtitle={`Step-after survival curves against Target AC ${targetAC} under ${critRule === 'max_damage_bonus' ? 'Max Crit Rule (Max + Roll)' : 'RAW 2× Dice Crit'}`}
            height={430}
          />
        ) : (
          <DamageDistributionChart
            distributionResult={activeDistributionResult}
            title={`Distribution: ${selectedEntityName}`}
            subtitle={`Exact probability mass modeled against Target AC ${targetAC} under ${critRule === 'max_damage_bonus' ? 'Max Crit Rule (Max + Roll)' : 'RAW 2× Dice Crit'}`}
            height={420}
          />
        )}
      </div>
    </div>
  );
}
