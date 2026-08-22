import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

function CustomDistributionTooltip({ active, payload, label, threshold }) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  const isAboveThreshold = threshold !== undefined && dataPoint.damage >= threshold;

  return (
    <div className="chart-tooltip-custom distribution-tooltip">
      <div className="tooltip-header">
        <span className="tooltip-ac-badge font-mono">
          Damage: <strong>{dataPoint.damage}</strong>
        </span>
        {isAboveThreshold && (
          <span className="tooltip-threshold-badge">≥ Threshold ({threshold})</span>
        )}
      </div>

      <div className="tooltip-divider" />

      <div className="tooltip-body">
        <div className="tooltip-char-row">
          <span className="tooltip-metric-label">Exact Probability P(X = {dataPoint.damage}):</span>
          <span className="tooltip-char-value font-mono text-gold">
            {dataPoint.percent.toFixed(2)}%
          </span>
        </div>

        <div className="tooltip-char-row">
          <span className="tooltip-metric-label">Chance to deal ≥ {dataPoint.damage} damage:</span>
          <span className="tooltip-char-value font-mono text-p75 font-bold">
            {dataPoint.cumulativePercent.toFixed(1)}%
          </span>
        </div>

        {(dataPoint.isP25 || dataPoint.isMedian || dataPoint.isP75) && (
          <div className="tooltip-milestone-tag">
            {dataPoint.isP25 && <span className="milestone-badge p25-badge">25th Percentile (P25)</span>}
            {dataPoint.isMedian && <span className="milestone-badge p50-badge">50th Percentile (Median)</span>}
            {dataPoint.isP75 && <span className="milestone-badge p75-badge">75th Percentile (P75)</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function DamageDistributionChart({
  distributionResult,
  title,
  subtitle,
  height = 380,
  initialThreshold,
}) {
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'
  
  const { data = [], p25 = 0, median = 0, p75 = 0, mean = 0, maxDamage = 0 } =
    distributionResult || {};

  // Default threshold to median or initialThreshold
  const defaultThreshold = useMemo(() => {
    if (typeof initialThreshold === 'number') return initialThreshold;
    return median > 0 ? Math.round(median) : Math.round(mean);
  }, [initialThreshold, median, mean]);

  const [threshold, setThreshold] = useState(defaultThreshold);

  // Keep threshold in bounds when distribution changes
  const effectiveThreshold = Math.max(0, Math.min(maxDamage, threshold));

  // Compute cumulative chance for current threshold
  const thresholdChance = useMemo(() => {
    if (!data || data.length === 0) return 0;
    const pt = data.find((d) => d.damage >= effectiveThreshold);
    return pt ? pt.cumulativePercent : 0;
  }, [data, effectiveThreshold]);

  // Gradient offset for threshold shading in area chart
  const gradientOffset = useMemo(() => {
    if (maxDamage <= 0) return 0;
    const ratio = effectiveThreshold / maxDamage;
    return Math.max(0, Math.min(1, ratio));
  }, [effectiveThreshold, maxDamage]);

  return (
    <div className="distribution-chart-container">
      {/* Header with Title & Controls */}
      <div className="distribution-chart-top">
        <div>
          {title && <h3 className="distribution-chart-title">{title}</h3>}
          {subtitle && <p className="distribution-chart-sub">{subtitle}</p>}
        </div>

        <div className="distribution-view-toggle">
          <button
            type="button"
            className={`btn btn-sm ${chartType === 'area' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setChartType('area')}
          >
            🌊 Area Curve
          </button>
          <button
            type="button"
            className={`btn btn-sm ${chartType === 'bar' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setChartType('bar')}
          >
            📊 Histogram
          </button>
        </div>
      </div>

      {/* Summary Percentile & Stat Pills */}
      <div className="distribution-stats-bar">
        <div className="dist-stat-pill">
          <span className="stat-label">Expected (Mean)</span>
          <span className="stat-value text-gold font-mono">{mean.toFixed(1)}</span>
        </div>
        <div className="dist-stat-pill pill-p25">
          <span className="stat-label">P25 (Lower)</span>
          <span className="stat-value text-p25 font-mono">{p25}</span>
        </div>
        <div className="dist-stat-pill pill-p50">
          <span className="stat-label">P50 (Median)</span>
          <span className="stat-value text-p50 font-mono">{median}</span>
        </div>
        <div className="dist-stat-pill pill-p75">
          <span className="stat-label">P75 (Upper)</span>
          <span className="stat-value text-p75 font-mono">{p75}</span>
        </div>
        <div className="dist-stat-pill">
          <span className="stat-label">Max Potential</span>
          <span className="stat-value font-mono">{maxDamage}</span>
        </div>
      </div>

      {/* Interactive Probability Threshold Slider */}
      <div className="distribution-threshold-panel">
        <div className="threshold-slider-group">
          <label htmlFor="damage-threshold-input" className="threshold-label">
            Target Damage:
          </label>
          <input
            id="damage-threshold-input"
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
            <span className="threshold-unit">DMG</span>
          </div>
        </div>

        <div className="threshold-result-badge">
          <span>Chance to deal <strong>≥ {effectiveThreshold}</strong> damage:</span>
          <span className="threshold-percent font-mono text-p75">
            {thresholdChance.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart Box */}
      <div className="chart-responsive-box" style={{ width: '100%', height, minHeight: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="damageColorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset={`${gradientOffset * 100}%`} stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset={`${gradientOffset * 100}%`} stopColor="#10b981" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="areaStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset={`${gradientOffset * 100}%`} stopColor="#38bdf8" />
                  <stop offset={`${gradientOffset * 100}%`} stopColor="#34d399" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={true} />

              <XAxis
                dataKey="damage"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={{ stroke: '#334155' }}
                label={{
                  value: 'Damage Outcome (Per Turn)',
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
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `${val}%`}
                label={{
                  value: 'Probability (%)',
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
                content={<CustomDistributionTooltip threshold={effectiveThreshold} />}
              />

              {/* Threshold Marker */}
              {effectiveThreshold > 0 && effectiveThreshold <= maxDamage && (
                <ReferenceLine
                  x={effectiveThreshold}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: `≥ ${effectiveThreshold} (${thresholdChance.toFixed(0)}%)`,
                    position: 'insideTopRight',
                    fill: '#34d399',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
              )}

              {/* 25th Percentile Reference Line */}
              {p25 > 0 && (
                <ReferenceLine
                  x={p25}
                  stroke="#f87171"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: `P25 (${p25})`,
                    position: 'top',
                    fill: '#f87171',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
              )}

              {/* 50th Percentile (Median) Reference Line */}
              {median > 0 && (
                <ReferenceLine
                  x={median}
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  label={{
                    value: `Median (${median})`,
                    position: 'top',
                    fill: '#fbbf24',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                  }}
                />
              )}

              {/* 75th Percentile Reference Line */}
              {p75 > 0 && (
                <ReferenceLine
                  x={p75}
                  stroke="#34d399"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: `P75 (${p75})`,
                    position: 'top',
                    fill: '#34d399',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="percent"
                name="Probability"
                stroke="url(#areaStrokeGradient)"
                strokeWidth={2.5}
                fill="url(#damageColorGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="damage"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={{ stroke: '#334155' }}
                label={{
                  value: 'Damage Outcome (Per Turn)',
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
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `${val}%`}
                label={{
                  value: 'Probability (%)',
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
                content={<CustomDistributionTooltip threshold={effectiveThreshold} />}
              />

              {/* Threshold Marker */}
              {effectiveThreshold > 0 && effectiveThreshold <= maxDamage && (
                <ReferenceLine
                  x={effectiveThreshold}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              )}

              {/* Percentile Lines */}
              {p25 > 0 && <ReferenceLine x={p25} stroke="#f87171" strokeWidth={2} strokeDasharray="4 4" />}
              {median > 0 && <ReferenceLine x={median} stroke="#fbbf24" strokeWidth={2.5} />}
              {p75 > 0 && <ReferenceLine x={p75} stroke="#34d399" strokeWidth={2} strokeDasharray="4 4" />}

              <Bar dataKey="percent" name="Probability" radius={[3, 3, 0, 0]}>
                {data.map((entry) => {
                  const isAbove = entry.damage >= effectiveThreshold;
                  let fill = isAbove ? '#10b981' : '#38bdf8';
                  if (entry.damage === median) fill = '#fbbf24';
                  return <Cell key={`bar-${entry.damage}`} fill={fill} opacity={isAbove ? 0.9 : 0.65} />;
                })}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
