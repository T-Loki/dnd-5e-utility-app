import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { calculatePartyDprShare, calculateCharacterAttackShare } from '../engine/dprEngine';

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

const ATTACK_PALETTE = [
  '#fbbf24', // Amber
  '#38bdf8', // Sky
  '#34d399', // Emerald
  '#f43f5e', // Rose
  '#a78bfa', // Violet
  '#2dd4bf', // Teal
  '#fb923c', // Orange
  '#e879f9', // Fuchsia
];

function CustomPieTooltip({ active, payload, isDrilldown, totalDpr }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="chart-tooltip-custom share-tooltip">
      <div className="tooltip-header" style={{ borderBottom: 'none', paddingBottom: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            className="tooltip-color-dot"
            style={{ backgroundColor: data.color || payload[0]?.color }}
          />
          <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{data.name}</strong>
        </div>
        <span className="tooltip-share-percent font-mono text-gold">
          {data.share.toFixed(1)}%
        </span>
      </div>

      <div className="tooltip-divider" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Expected DPR:</span>
          <span className="font-mono text-gold" style={{ fontWeight: 700 }}>
            {data.dpr.toFixed(2)} DPR
          </span>
        </div>

        {isDrilldown ? (
          <>
            {data.diceString && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Formula:</span>
                <span className="font-mono" style={{ color: '#94a3b8' }}>
                  {data.diceString}
                </span>
              </div>
            )}
            {typeof data.pHit === 'number' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Accuracy:</span>
                <span className="font-mono" style={{ color: '#34d399' }}>
                  {(data.pHit * 100).toFixed(1)}%
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Character Share:</span>
              <span className="font-mono" style={{ color: '#e2e8f0' }}>
                {data.share.toFixed(1)}% of hero DPR
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Attacks:</span>
              <span className="font-mono" style={{ color: '#94a3b8' }}>
                {data.attackCount} {data.attackCount === 1 ? 'atk' : 'atks'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Party Share:</span>
              <span className="font-mono" style={{ color: '#e2e8f0' }}>
                {data.share.toFixed(1)}% of {totalDpr.toFixed(1)} total
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PartyShareChart({
  characters = [],
  targetAC = 15,
  critRule = 'double_dice',
}) {
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  // Compute party shares
  const partyShareData = useMemo(() => {
    const rawShares = calculatePartyDprShare(characters, Number(targetAC) || 15, critRule);
    return rawShares.map((item, index) => ({
      ...item,
      color: PALETTE[index % PALETTE.length],
    }));
  }, [characters, targetAC, critRule]);

  const totalPartyDpr = useMemo(() => {
    return partyShareData.reduce((sum, item) => sum + item.dpr, 0);
  }, [partyShareData]);

  // Selected character for drilldown
  const selectedCharacter = useMemo(() => {
    if (!selectedCharId) return null;
    return characters.find((c) => c.id === selectedCharId || c.name === selectedCharId) || null;
  }, [characters, selectedCharId]);

  // Compute attack shares for drilled-down character
  const attackShareData = useMemo(() => {
    if (!selectedCharacter) return [];
    const rawAttacks = calculateCharacterAttackShare(selectedCharacter, Number(targetAC) || 15, critRule);
    return rawAttacks.map((item, index) => ({
      ...item,
      color: ATTACK_PALETTE[index % ATTACK_PALETTE.length],
    }));
  }, [selectedCharacter, targetAC, critRule]);

  const selectedCharTotalDpr = useMemo(() => {
    return attackShareData.reduce((sum, item) => sum + item.dpr, 0);
  }, [attackShareData]);

  const isDrilldown = Boolean(selectedCharacter);
  const activeData = isDrilldown ? attackShareData : partyShareData;
  const currentTotalDpr = isDrilldown ? selectedCharTotalDpr : totalPartyDpr;

  const handlePieClick = (entry) => {
    if (!isDrilldown && entry?.id) {
      setSelectedCharId(entry.id);
      setActiveIndex(null);
    }
  };

  const handleRowClick = (item) => {
    if (!isDrilldown && item?.id) {
      setSelectedCharId(item.id);
      setActiveIndex(null);
    }
  };

  if (!partyShareData || partyShareData.length === 0 || totalPartyDpr === 0) {
    return (
      <div className="party-share-container">
        <div className="analytics-empty-state">
          <div className="empty-state-icon">🥧</div>
          <div className="empty-state-title">No Active Damage Configured</div>
          <p className="empty-state-desc">
            Enable characters and attacks in the <strong>Roster Builder</strong> tab to view damage contribution shares.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="party-share-container">
      {/* Drilldown Navigation Breadcrumb Header */}
      <div className="party-share-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isDrilldown ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost btn-breadcrumb"
                  onClick={() => {
                    setSelectedCharId(null);
                    setActiveIndex(null);
                  }}
                  title="Return to entire party contribution breakdown"
                >
                  ⬅️ Party Breakdown
                </button>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <span className="font-dnd" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  {selectedCharacter?.name || 'Character'} Attack Share
                </span>
              </>
            ) : (
              <h3 className="party-share-title">
                👥 Party DPR Contribution Share
              </h3>
            )}
          </div>
          <p className="party-share-sub">
            {isDrilldown
              ? `Relative DPR share per attack for ${selectedCharacter?.name} against Target AC ${targetAC}. Click 'Party Breakdown' to return.`
              : `Proportional damage contribution per character vs. Target AC ${targetAC}. Click any character to drill into their individual attacks.`}
          </p>
        </div>

        {isDrilldown && (
          <button
            type="button"
            className="btn btn-sm btn-gold"
            onClick={() => {
              setSelectedCharId(null);
              setActiveIndex(null);
            }}
          >
            ⬅️ Back to Party
          </button>
        )}
      </div>

      {/* Main Content: Donut Chart + Ranked Breakdown Table */}
      <div className="party-share-layout">
        {/* Left: Donut Chart with Center Metric */}
        <div className="party-share-donut-wrapper">
          <div className="donut-relative-container">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={activeData}
                  dataKey="dpr"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={108}
                  paddingAngle={3}
                  onClick={handlePieClick}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  cursor={isDrilldown ? 'default' : 'pointer'}
                  animationDuration={600}
                >
                  {activeData.map((entry, index) => {
                    const isActive = activeIndex === index;
                    return (
                      <Cell
                        key={`cell-${entry.id || index}`}
                        fill={entry.color}
                        stroke={isActive ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        style={{
                          filter: isActive ? 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' : 'none',
                          transform: isActive ? 'scale(1.03)' : 'scale(1)',
                          transformOrigin: 'center center',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  content={
                    <CustomPieTooltip
                      isDrilldown={isDrilldown}
                      totalDpr={currentTotalDpr}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Metric */}
            <div className="donut-center-metric" pointerEvents="none">
              <span className="donut-center-num font-mono text-gold">
                {currentTotalDpr.toFixed(1)}
              </span>
              <span className="donut-center-label">
                {isDrilldown ? 'Hero DPR' : 'Total Party DPR'}
              </span>
              <span className="donut-center-sub">
                AC {targetAC}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Ranked Contribution Breakdown Table */}
        <div className="party-share-table-wrapper">
          <div className="party-share-table-header">
            <span className="col-identity">{isDrilldown ? 'Attack' : 'Character'}</span>
            <span className="col-dpr">DPR</span>
            <span className="col-share">Share (% of Total)</span>
          </div>

          <div className="party-share-table-body">
            {activeData.map((item, index) => {
              const isActive = activeIndex === index;
              return (
                <div
                  key={item.id || index}
                  className={`party-share-row ${isActive ? 'active' : ''} ${!isDrilldown ? 'clickable' : ''}`}
                  onClick={() => handleRowClick(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  title={!isDrilldown ? `Click to view attack breakdown for ${item.name}` : undefined}
                >
                  <div className="share-row-identity">
                    <span className="share-rank-badge font-mono">#{index + 1}</span>
                    <span
                      className="share-dot"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="share-name-group">
                      <span className="share-name">{item.name}</span>
                      <span className="share-details">
                        {isDrilldown
                          ? `${item.diceString || ''} ${item.attackBonus >= 0 ? `(+${item.attackBonus})` : item.attackBonus}`
                          : `${item.attackCount} active ${item.attackCount === 1 ? 'attack' : 'attacks'}`}
                      </span>
                    </div>
                  </div>

                  <div className="share-row-dpr font-mono text-gold">
                    {item.dpr.toFixed(2)}
                  </div>

                  <div className="share-row-bar-group">
                    <div className="share-progress-track">
                      <div
                        className="share-progress-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.share))}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <span className="share-percent-label font-mono">
                      {item.share.toFixed(1)}%
                    </span>
                    {!isDrilldown && (
                      <span className="share-drilldown-arrow" title="Drill into attacks">
                        🔍
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
