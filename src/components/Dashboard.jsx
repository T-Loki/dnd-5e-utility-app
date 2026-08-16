import React from 'react';

const formatNum = (val) => {
  if (isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (val) => {
  if (isNaN(val)) return '0%';
  return (Number(val) * 100).toFixed(1) + '%';
};

export function Dashboard({
  targetAC,
  setTargetAC,
  critRule,
  setCritRule,
  partySummary,
  characters,
  getCharacterMetrics,
}) {
  return (
    <section className="dashboard-grid">
      {/* Box 1: Global Settings */}
      <div className="metric-card ac-border">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div className="metric-label" style={{ marginBottom: '0.45rem' }}>
              <span>Target Armor Class (AC)</span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="number"
                min="1"
                max="35"
                value={targetAC}
                onChange={(e) => setTargetAC(e.target.value === '' ? '' : Number(e.target.value))}
                className="target-ac-input font-mono"
                style={{
                  width: '4rem',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  background: 'var(--bg-input)',
                  border: '1.5px solid rgba(16, 185, 129, 0.45)',
                  borderRadius: '0.45rem',
                  color: '#6ee7b7',
                  padding: '0.2rem 0.35rem',
                  outline: 'none',
                }}
              />
              <div className="presets-list" style={{ marginTop: 0 }}>
                {[12, 15, 18, 20].map((ac) => (
                  <button
                    key={ac}
                    onClick={() => setTargetAC(ac)}
                    className={`preset-chip ${targetAC === ac ? 'active' : ''}`}
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                  >
                    {ac}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="metric-label" style={{ marginBottom: '0.35rem' }}>
              <span>Critical Hit Rule</span>
              <span>💥</span>
            </div>
            <select
              value={critRule}
              onChange={(e) => setCritRule(e.target.value)}
              className="table-select-dark"
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
            >
              <option value="double_dice">🎲 RAW: 2× Dice</option>
              <option value="max_damage_bonus">💥 House: Max + Roll</option>
            </select>
          </div>
        </div>
      </div>

      {/* Box 3: Total Party DPR */}
      <div className="metric-card gold-border">
        <div className="dpr-hover-wrapper" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="dpr-hover-trigger" style={{ width: '100%', borderBottom: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="metric-label">
                <span>Expected Damage Per Round (DPR)</span>
                <span title="Hover for calculation breakdown">🎯 ℹ️</span>
              </div>
              <div className="metric-value text-gold">
                {formatNum(partySummary.totalDpr)}
              </div>
            </div>
            <div className="metric-footer">
              <span>Avg Hit / Crit</span>
              <span className="text-gold font-mono font-bold">
                Hit: {formatPercent(partySummary.avgHitChance)} · Crit: {formatPercent(partySummary.avgCritChance)}
              </span>
            </div>
          </div>

          {/* Party Expected DPR Calculation Popover Tooltip */}
          <div className="dpr-tooltip tooltip-left">
            <div className="dpr-tooltip-header">
              <span>🎯 Party Total DPR Breakdown</span>
              <span className="dpr-tooltip-badge">
                {critRule === 'double_dice' ? '2× Dice RAW' : 'Max Added'}
              </span>
            </div>

            <div className="dpr-tooltip-section">
              {characters.filter((c) => c.enabled).length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  No active characters
                </div>
              ) : (
                characters
                  .filter((c) => c.enabled)
                  .map((c, cIdx) => {
                    const cMetrics = getCharacterMetrics(c);
                    return (
                      <div key={c.id || cIdx} className="dpr-tooltip-row">
                        <span
                          className="label"
                          style={{
                            maxWidth: '170px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.name || `Hero #${cIdx + 1}`}:
                        </span>
                        <span className="val text-gold">
                          {formatNum(cMetrics.dpr)} DPR
                        </span>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="dpr-tooltip-formula">
              <div className="math-step">
                Active Attacks: {partySummary.activeAttackCount} | Target AC: {targetAC}
              </div>
              <div className="math-step">
                Avg Accuracy: {formatPercent(partySummary.avgHitChance)}
              </div>
              <div className="math-result">
                <span>Total Party DPR:</span>
                <span>{formatNum(partySummary.totalDpr)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Box 4: 25th, 50th & 75th Percentile Damage (On Hit) in separate rows */}
      <div className="metric-card range-border">
        <div>
          <div className="metric-label">
            <span>On-Hit Percentiles</span>
            <span className="font-mono" style={{ color: 'var(--accent-p50)', fontSize: '0.65rem' }}>
              P25 / P50 / P75
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
            {/* Row 1: 25th Percentile (Red) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                25th %ile (Q1):
              </span>
              <span className="text-p25 font-mono" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                {formatNum(partySummary.p25)}
              </span>
            </div>

            {/* Row 2: 50th Percentile (Amber) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                50th %ile (Median):
              </span>
              <span className="text-p50 font-mono" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                {formatNum(partySummary.median)}
              </span>
            </div>

            {/* Row 3: 75th Percentile (Green) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                75th %ile (Q3):
              </span>
              <span className="text-p75 font-mono" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                {formatNum(partySummary.p75)}
              </span>
            </div>
          </div>
        </div>

        <div className="metric-footer">
          <span>Damage Range</span>
          <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>
            Q1 (Low) – Median – Q3 (High)
          </span>
        </div>
      </div>

      {/* Box 5: Max Potential Crit Damage */}
      <div className="metric-card crit-border">
        <div>
          <div className="metric-label">
            <span>Max Potential</span>
            <span>💥</span>
          </div>
          <div className="metric-value text-crit">
            {formatNum(partySummary.totalMaxDpr)}
          </div>
        </div>
        <div className="metric-footer">
          <span>Active Attacks</span>
          <span className="text-crit font-mono">
            {partySummary.activeAttackCount} atk
          </span>
        </div>
      </div>
    </section>
  );
}
