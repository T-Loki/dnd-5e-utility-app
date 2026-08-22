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

function CustomSurvivalTooltip({ active, payload, label, charactersMap }) {
  if (!active || !payload || !payload.length) return null;

  const partyEntry = payload.find((p) => p.dataKey === 'partyTotal');
  const characterEntries = payload.filter((p) => p.dataKey !== 'partyTotal');

  return (
    <div className="chart-tooltip-custom survival-tooltip">
      <div className="tooltip-header">
        <span className="tooltip-ac-badge font-mono">
          Threshold: <strong>≥ {label} DMG</strong>
        </span>
        {partyEntry && (
          <span className="tooltip-party-total">
            Party Odds: <strong className="text-gold font-mono">{Number(partyEntry.value).toFixed(1)}%</strong>
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
                {Number(entry.value).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CumulativeDamageChart({
  survivalData = [],
  characters = [],
  targetAC,
  title,
  subtitle,
  height = 420,
  initialThreshold,
}) {
  const [hiddenKeys, setHiddenKeys] = useState(new Set());

  const activeCharacters = useMemo(() => {
    return (characters || []).filter((char) => char && char.enabled !== false);
  }, [characters]);

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

  const maxDamage = useMemo(() => {
    if (!survivalData || survivalData.length === 0) return 50;
    return survivalData[survivalData.length - 1]?.damage || 50;
  }, [survivalData]);

  const defaultThreshold = useMemo(() => {
    if (typeof initialThreshold === 'number') return initialThreshold;
    return Math.min(maxDamage, Math.max(10, Math.round(maxDamage * 0.35)));
  }, [initialThreshold, maxDamage]);

  const [threshold, setThreshold] = useState(defaultThreshold);
  const effectiveThreshold = Math.max(0, Math.min(maxDamage, threshold));

  // Lookup survival probabilities at current effectiveThreshold
  const currentProbabilities = useMemo(() => {
    if (!survivalData || survivalData.length === 0) {
      return { party: 0, chars: {} };
    }
    const pt = survivalData.find((p) => p.damage === effectiveThreshold) || survivalData[survivalData.length - 1];
    if (!pt) return { party: 0, chars: {} };

    const chars = {};
    for (const s of characterSeries) {
      chars[s.dataKey] = pt[s.dataKey] !== undefined ? pt[s.dataKey] : 0;
    }
    return { party: pt.partyTotal !== undefined ? pt.partyTotal : 0, chars };
  }, [survivalData, effectiveThreshold, characterSeries]);

  // Quick stat milestone cards
  const milestones = useMemo(() => {
    if (!survivalData || survivalData.length === 0) return [];
    const getPartyOdds = (dmg) => {
      const pt = survivalData.find((p) => p.damage === dmg);
      return pt ? pt.partyTotal : 0;
    };

    const thresholds = [10, 25, 50, 75].filter((val) => val <= maxDamage);
    if (thresholds.length === 0 && maxDamage > 0) thresholds.push(Math.round(maxDamage / 2));

    return thresholds.map((t) => ({
      damage: t,
      partyOdds: getPartyOdds(t),
    }));
  }, [survivalData, maxDamage]);

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

  return (
    <div className="cumulative-chart-container">
      {/* Top Header */}
      <div className="cumulative-chart-header">
        <div>
          {title && <h3 className="cumulative-chart-title">{title}</h3>}
          {subtitle && <p className="cumulative-chart-sub">{subtitle}</p>}
        </div>

        <div className="chart-header-controls">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleShowAll}
            title="Show all curves"
          >
            👁️ Show All
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleHideAll}
            title="Hide all curves"
          >
            🚫 Hide All
          </button>
        </div>
      </div>

      {/* Quick Stat Insight Ribbon */}
      {milestones.length > 0 && (
        <div className="survival-milestone-grid">
          {milestones.map((m) => (
            <div
              key={m.damage}
              className="survival-milestone-card"
              onClick={() => setThreshold(m.damage)}
              title={`Set target threshold to ${m.damage} damage`}
            >
              <span className="milestone-sub">Chance to deal ≥ {m.damage} DMG</span>
              <span className="milestone-num font-mono text-gold">
                {m.partyOdds.toFixed(1)}%
              </span>
              <span className="milestone-hint">Party Round Total</span>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Target Threshold Control */}
      <div className="distribution-threshold-panel survival-threshold-panel">
        <div className="threshold-slider-group">
          <label htmlFor="survival-threshold-input" className="threshold-label">
            Target HP / Threshold:
          </label>
          <input
            id="survival-threshold-input"
            type="range"
            min={0}
            max={maxDamage || 50}
            step={1}
            value={effectiveThreshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="threshold-slider"
          />
          <div className="threshold-number-wrapper">
            <input
              type="number"
              min={0}
              max={maxDamage || 50}
              value={effectiveThreshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              className="threshold-number-input font-mono"
            />
            <span className="threshold-unit">HP</span>
          </div>
        </div>

        <div className="threshold-result-badge">
          <span>Party Odds (≥ {effectiveThreshold} DMG):</span>
          <span className="threshold-percent font-mono text-gold">
            {currentProbabilities.party.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Interactive Legend */}
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
          <span className="legend-pill-name font-bold">
            Party Total: {currentProbabilities.party.toFixed(0)}%
          </span>
          {hiddenKeys.has('partyTotal') && <span className="legend-pill-off">OFF</span>}
        </button>

        {characterSeries.map((char) => {
          const isHidden = hiddenKeys.has(char.dataKey);
          const charChance = currentProbabilities.chars[char.dataKey] || 0;
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
              <span className="legend-pill-name">
                {char.name}: {charChance.toFixed(0)}%
              </span>
              {isHidden && <span className="legend-pill-off">OFF</span>}
            </button>
          );
        })}
      </div>

      {/* Recharts Step LineChart */}
      <div className="chart-responsive-box" style={{ width: '100%', height, minHeight: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={survivalData}
            margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
          >
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

            <XAxis
              dataKey="damage"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={{ stroke: '#334155' }}
              label={{
                value: 'Target Damage Threshold (X)',
                position: 'insideBottom',
                offset: -15,
                fill: '#94a3b8',
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
              }}
            />

            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(val) => `${val}%`}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={{ stroke: '#334155' }}
              label={{
                value: 'Probability P(Damage ≥ X)',
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
              content={<CustomSurvivalTooltip charactersMap={charactersMap} />}
            />

            {/* Threshold Reference Line */}
            {effectiveThreshold >= 0 && (
              <ReferenceLine
                x={effectiveThreshold}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `Threshold (${effectiveThreshold} DMG: ${currentProbabilities.party.toFixed(0)}%)`,
                  position: 'top',
                  fill: '#34d399',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              />
            )}

            {/* 50% Survival Probability Baseline Line */}
            <ReferenceLine
              y={50}
              stroke="rgba(245, 158, 11, 0.3)"
              strokeWidth={1}
              strokeDasharray="2 2"
              label={{
                value: '50% Coin-Flip Odds',
                position: 'insideRight',
                fill: '#94a3b8',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
            />

            {/* Party Total Line (stepAfter) */}
            <Line
              type="stepAfter"
              dataKey="partyTotal"
              name="Party Total"
              stroke={PARTY_COLOR}
              strokeWidth={3.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 6, fill: PARTY_COLOR, stroke: '#fff', strokeWidth: 2 }}
              hide={hiddenKeys.has('partyTotal')}
            />

            {/* Character Step Lines (stepAfter) */}
            {characterSeries.map((char) => (
              <Line
                key={char.dataKey}
                type="stepAfter"
                dataKey={char.dataKey}
                name={char.name}
                stroke={char.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: char.color, stroke: '#fff', strokeWidth: 2 }}
                hide={hiddenKeys.has(char.dataKey)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
