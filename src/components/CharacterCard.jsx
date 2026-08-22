import React from 'react';
import { AttackItem } from './AttackItem';
import { getTurnDamagePmf } from '../engine/dprEngine';

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

export function CharacterCard({
  char,
  charIdx,
  targetAC,
  critRule,
  getCharacterMetrics,
  getAttackMetrics,
  draggedAttack,
  dropTarget,
  handlers,
  onOpenDistributionModal,
}) {
  const charMetrics = getCharacterMetrics(char);

  const handleOpenCharCurve = (e) => {
    e.stopPropagation();
    if (!onOpenDistributionModal) return;
    const distResult = getTurnDamagePmf(char.attacks || [], Number(targetAC) || 15, critRule);
    onOpenDistributionModal({
      type: 'character',
      char,
      title: `${char.name || 'Hero'} Damage Distribution`,
      subtitle: `Full turn damage probability mass function convolving all active attacks against Target AC ${targetAC}`,
      distributionResult: distResult,
      targetAC,
      critRule,
    });
  };

  return (
    <div className={`char-card ${!char.enabled ? 'disabled' : ''}`}>
      {/* Character Header */}
      <div className="char-header">
        <div className="char-title-group">
          <label className="switch" title="Toggle character in party total">
            <input
              type="checkbox"
              checked={char.enabled}
              onChange={() => handlers.handleToggleCharacter(charIdx)}
            />
            <span className="slider"></span>
          </label>

          <input
            type="text"
            value={char.name}
            onChange={(e) =>
              handlers.handleUpdateCharacterName(charIdx, e.target.value)
            }
            placeholder="Character Name (e.g. Rogue, Barbarian)"
            className="char-name-input"
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Character Metrics Badge with Separated Percentiles */}
          <div className="char-summary-badge">
            {/* Expected DPR with Hover Tooltip */}
            <div className="dpr-hover-wrapper">
              <div className="summary-col dpr-hover-trigger">
                <div className="summary-sub">Expected DPR ℹ️</div>
                <div
                  className="summary-num text-gold"
                  style={{
                    opacity: char.enabled ? 1 : 0.6,
                  }}
                >
                  {formatNum(charMetrics.dpr)}
                </div>
              </div>

              {/* Character DPR Breakdown Tooltip */}
              <div className="dpr-tooltip tooltip-center">
                <div className="dpr-tooltip-header">
                  <span>🛡️ {char.name || 'Hero'} DPR Breakdown</span>
                  <span className="dpr-tooltip-badge">
                    {charMetrics.activeAttackCount} / {char.attacks.length} {char.attacks.length === 1 ? 'Attack' : 'Attacks'} Active
                  </span>
                </div>

                <div className="dpr-tooltip-section">
                  {char.attacks.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      No attacks configured
                    </div>
                  ) : (
                    char.attacks.map((atk, aIdx) => {
                      const atkMet = getAttackMetrics(atk);
                      const isAtkEnabled = atk.enabled !== false;
                      return (
                        <div
                          key={atk.id || aIdx}
                          className="dpr-tooltip-row"
                          style={{
                            opacity: isAtkEnabled ? 1 : 0.5,
                          }}
                        >
                          <span
                            className="label"
                            style={{
                              textDecoration: isAtkEnabled ? 'none' : 'line-through',
                            }}
                          >
                            {atk.name || `Attack #${aIdx + 1}`}:
                          </span>
                          <span className={`val ${isAtkEnabled ? 'text-gold' : ''}`}>
                            {formatNum(atkMet.dpr)} DPR {isAtkEnabled ? `(${formatPercent(atkMet.pHit)} hit)` : '(Excluded)'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="dpr-tooltip-formula">
                  <div className="math-step">
                    Target AC: {targetAC} | Crit Rule:{' '}
                    {critRule === 'double_dice' ? '2× Dice RAW' : 'Max Added'}
                  </div>
                  <div className="math-step">
                    Active Attacks: {charMetrics.activeAttackCount} of {char.attacks.length}
                  </div>
                  <div className="math-result">
                    <span>Total Character DPR:</span>
                    <span>{formatNum(charMetrics.dpr)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 22,
                background: 'var(--border-color)',
              }}
            />

            {/* Combined 25th – 75th Percentile (On Hit) */}
            <div className="summary-col">
              <div className="summary-sub">25th – 75th %ile (On Hit)</div>
              <div
                className="summary-num"
                style={{
                  opacity: char.enabled ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.2rem',
                }}
              >
                <span className="text-p25">{formatNum(charMetrics.p25)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>–</span>
                <span className="text-p75">{formatNum(charMetrics.p75)}</span>
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 22,
                background: 'var(--border-color)',
              }}
            />

            {/* Max Potential */}
            <div className="summary-col">
              <div className="summary-sub">Max Pot.</div>
              <div
                className="summary-num text-crit"
                style={{
                  opacity: char.enabled ? 1 : 0.6,
                }}
              >
                {formatNum(charMetrics.maxDpr)}
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 22,
                background: 'var(--border-color)',
              }}
            />

            {/* View PMF Curve Button */}
            <button
              type="button"
              onClick={handleOpenCharCurve}
              className="btn-card-curve"
              title={`View ${char.name || 'Character'} PMF Damage Distribution Curve`}
            >
              📊 Curve
            </button>
          </div>

          {/* Character Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => handlers.handleAddAttack(charIdx)}
              className="btn btn-sm"
              style={{ color: 'var(--accent-gold-light)' }}
              title="Add attack"
            >
              + Attack
            </button>

            <button
              onClick={() => handlers.handleDuplicateCharacter(charIdx)}
              className="btn btn-sm btn-ghost"
              title="Duplicate Character"
            >
              📋
            </button>

            {/* Matching Cross Delete Button for Character */}
            <button
              onClick={() => handlers.handleDeleteCharacter(charIdx)}
              className="btn-delete-cross"
              title="Delete Character"
              aria-label="Delete Character"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Attacks Table */}
      <div className="attacks-container">
        {char.attacks.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
            }}
          >
            No attacks configured.{' '}
            <button
              onClick={() => handlers.handleAddAttack(charIdx)}
              style={{
                color: 'var(--accent-gold-light)',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Add an attack
            </button>{' '}
            to calculate damage.
          </div>
        ) : (
          <table className="attacks-table">
            <thead>
              <tr>
                <th style={{ width: '3%', minWidth: '32px' }} className="text-center" title="Drag to reorder attacks">
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>⠿</span>
                </th>
                <th style={{ width: '4%', minWidth: '46px' }} className="text-center" title="Toggle attack inclusion in DPR and Max damage calculations">
                  Incl
                </th>
                <th style={{ width: '15%', minWidth: '130px' }}>Attack Name</th>
                <th
                  style={{ width: '8%', minWidth: '70px' }}
                  className="text-center"
                >
                  <div className="dpr-hover-wrapper" style={{ cursor: 'help' }}>
                    <span
                      className="dpr-hover-trigger"
                      style={{
                        borderBottom: '1px dotted rgba(245, 158, 11, 0.6)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      Atk Bonus ℹ️
                    </span>

                    <div
                      className="dpr-tooltip tooltip-center"
                      style={{
                        width: '280px',
                        maxWidth: '90vw',
                        boxSizing: 'border-box',
                        whiteSpace: 'normal',
                        wordBreak: 'normal',
                        textTransform: 'none',
                        fontWeight: 'normal',
                        letterSpacing: 'normal',
                      }}
                    >
                      <div className="dpr-tooltip-header">
                        <span>🎯 Attack Bonus Tip</span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.45,
                          whiteSpace: 'normal',
                          wordBreak: 'normal',
                        }}
                      >
                        Set attack bonus to{' '}
                        <strong className="text-gold font-mono">99</strong> (or{' '}
                        <span className="font-mono">&gt;21</span>) to make the attack a{' '}
                        <strong className="text-gold">guaranteed 100% hit</strong> with{' '}
                        <strong style={{ color: 'var(--accent-crit)' }}>
                          0% chance to crit
                        </strong>
                        .
                      </div>
                    </div>
                  </div>
                </th>
                <th style={{ width: '13%', minWidth: '115px' }}>Attack Formula</th>
                <th style={{ width: '11%', minWidth: '105px' }}>
                  Roll Mode
                </th>
                <th style={{ width: '7%', minWidth: '60px' }} className="text-center">
                  Crit On
                </th>
                <th style={{ width: '5%', minWidth: '50px' }} className="text-center">
                  Resist
                </th>
                <th style={{ width: '12%', minWidth: '100px' }} className="text-right">
                  Expected DPR
                </th>
                <th style={{ width: '12%', minWidth: '105px' }} className="text-right">
                  25th – 75th %ile
                </th>
                <th style={{ width: '8%', minWidth: '75px' }} className="text-right">
                  Max Damage
                </th>
                <th style={{ width: '7%', minWidth: '94px' }} className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {char.attacks.map((atk, atkIdx) => {
                const metrics = getAttackMetrics(atk);
                // Make a shallow copy of handlers and attach attackCount
                const atkHandlers = { ...handlers, attackCount: char.attacks.length };
                return (
                  <AttackItem
                    key={atk.id}
                    atk={atk}
                    atkIdx={atkIdx}
                    charIdx={charIdx}
                    metrics={metrics}
                    targetAC={targetAC}
                    critRule={critRule}
                    draggedAttack={draggedAttack}
                    dropTarget={dropTarget}
                    handlers={atkHandlers}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
