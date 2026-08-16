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

export function AttackItem({
  atk,
  atkIdx,
  charIdx,
  metrics,
  targetAC,
  critRule,
  draggedAttack,
  dropTarget,
  handlers,
}) {
  const isAtkEnabled = atk.enabled !== false;
  const isBeingDragged =
    draggedAttack &&
    draggedAttack.charIndex === charIdx &&
    draggedAttack.attackIndex === atkIdx;
  const isTarget =
    dropTarget &&
    dropTarget.charIndex === charIdx &&
    dropTarget.attackIndex === atkIdx;
  const dropClass = isTarget
    ? dropTarget.position === 'before'
      ? 'drag-over-top'
      : 'drag-over-bottom'
    : '';

  return (
    <tr
      key={atk.id}
      draggable={true}
      onDragStart={(e) => handlers.handleDragStart(e, charIdx, atkIdx)}
      onDragOver={(e) => handlers.handleDragOver(e, charIdx, atkIdx)}
      onDragEnd={handlers.handleDragEnd}
      onDrop={(e) => handlers.handleDrop(e, charIdx, atkIdx)}
      className={`attack-row ${!isAtkEnabled ? 'disabled' : ''} ${
        isBeingDragged ? 'is-dragging' : ''
      } ${dropClass}`}
    >
      {/* Drag Handle Column */}
      <td className="text-center drag-handle-cell">
        <div
          className="drag-handle"
          title="Drag to reorder attack (drag above or below another attack)"
          aria-label="Drag to reorder attack"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ display: 'block', pointerEvents: 'none' }}
          >
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>
      </td>

      {/* 0. Include Toggle Switch */}
      <td className="text-center">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <label
            className="switch-sm"
            title={
              isAtkEnabled
                ? 'Included in DPR & Max calculations (click to exclude)'
                : 'Excluded from DPR & Max calculations (click to include)'
            }
          >
            <input
              type="checkbox"
              checked={isAtkEnabled}
              onChange={(e) =>
                handlers.handleUpdateAttack(
                  charIdx,
                  atkIdx,
                  'enabled',
                  e.target.checked
                )
              }
            />
            <span className="slider"></span>
          </label>
        </div>
      </td>

      {/* 1. Attack Name */}
      <td>
        <input
          type="text"
          value={atk.name}
          onChange={(e) =>
            handlers.handleUpdateAttack(
              charIdx,
              atkIdx,
              'name',
              e.target.value
            )
          }
          placeholder="e.g. Longsword"
          className="table-input"
        />
      </td>

      {/* 2. Attack Bonus */}
      <td className="text-center">
        <input
          type="number"
          value={atk.attackBonus}
          onChange={(e) =>
            handlers.handleUpdateAttack(
              charIdx,
              atkIdx,
              'attackBonus',
              Number(e.target.value) || 0
            )
          }
          placeholder="+0"
          className="table-input font-mono"
          style={{ textAlign: 'center' }}
        />
      </td>

      {/* 3. Dice String */}
      <td>
        <input
          type="text"
          value={atk.diceString}
          onChange={(e) =>
            handlers.handleUpdateAttack(
              charIdx,
              atkIdx,
              'diceString',
              e.target.value
            )
          }
          placeholder="e.g. 2d6 + 4"
          className="table-input font-mono"
          style={{
            borderColor: metrics.isValid
              ? 'var(--border-color)'
              : 'rgba(239, 68, 68, 0.6)',
          }}
        />
      </td>

      {/* 4. Advantage Mode (Full Dark Mode Select) */}
      <td>
        <select
          value={atk.advantageMode}
          onChange={(e) =>
            handlers.handleUpdateAttack(
              charIdx,
              atkIdx,
              'advantageMode',
              e.target.value
            )
          }
          className={`table-select-dark ${
            atk.advantageMode === 'advantage'
              ? 'mode-adv'
              : atk.advantageMode === 'disadvantage'
              ? 'mode-dis'
              : 'mode-norm'
          }`}
        >
          <option value="normal">Normal</option>
          <option value="advantage">Advantage</option>
          <option value="disadvantage">Disadvantage</option>
        </select>
      </td>

      {/* 5. Crit Threshold (Numerical Input) */}
      <td className="text-center">
        <input
          type="number"
          min="1"
          max="20"
          value={atk.critThreshold ?? ''}
          onChange={(e) =>
            handlers.handleUpdateAttack(
              charIdx,
              atkIdx,
              'critThreshold',
              e.target.value === ''
                ? ''
                : isNaN(Number(e.target.value))
                ? e.target.value
                : Number(e.target.value)
            )
          }
          placeholder="20"
          className="table-input font-mono"
          style={{ textAlign: 'center' }}
          title="Critical hit threshold (1–20). Invalid values yield 0% crit chance."
        />
      </td>

      {/* 6. Resistance */}
      <td className="text-center">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={atk.isResisted}
            onChange={(e) =>
              handlers.handleUpdateAttack(
                charIdx,
                atkIdx,
                'isResisted',
                e.target.checked
              )
            }
            className="checkbox-custom"
            title="Halves damage (resistance)"
          />
        </div>
      </td>

      {/* 7. Expected DPR Column with Calculation Hover Tooltip */}
      <td className="text-right">
        <div className="dpr-hover-wrapper" style={{ textAlign: 'right' }}>
          <div className="dpr-hover-trigger" style={{ textAlign: 'right' }}>
            <div className={`damage-pill ${isAtkEnabled ? 'text-gold' : ''}`} style={{ opacity: isAtkEnabled ? 1 : 0.7, textAlign: 'right' }}>
              {formatNum(metrics.dpr)}
            </div>
            <div className="table-sublabel" style={{ textAlign: 'right' }}>
              Hit: {formatPercent(metrics.pHit)} · Crit: {formatPercent(metrics.pCrit)}
            </div>
          </div>

          {/* Attack DPR Calculation Popover Tooltip */}
          <div className="dpr-tooltip">
            <div className="dpr-tooltip-header">
              <span>⚔️ {atk.name || 'Attack'} DPR Calculation</span>
              <span
                className="dpr-tooltip-badge"
                style={{
                  color: isAtkEnabled
                    ? 'var(--accent-gold-light)'
                    : 'var(--text-muted)',
                }}
              >
                {isAtkEnabled
                  ? critRule === 'double_dice'
                    ? '2× Dice RAW'
                    : 'Max Added'
                  : 'Excluded from Totals'}
              </span>
            </div>

            <div className="dpr-tooltip-section">
              <div className="dpr-tooltip-row">
                <span className="label">Attack Roll:</span>
                <span className="val">
                  d20 + {metrics.attackBonus} vs AC {targetAC} ({atk.advantageMode})
                </span>
              </div>
              <div className="dpr-tooltip-row">
                <span className="label">Roll Needed:</span>
                <span className="val">{metrics.targetRollNeeded}+ on d20</span>
              </div>
              <div className="dpr-tooltip-row">
                <span className="label">Probabilities:</span>
                <span className="val">
                  Reg: {formatPercent(metrics.pRegularHit)} | Crit: {formatPercent(metrics.pCrit)}
                </span>
              </div>
              <div className="dpr-tooltip-row">
                <span className="label">Regular Hit Avg:</span>
                <span className="val">{formatNum(metrics.regularAvgDamage)} ({atk.diceString})</span>
              </div>
              <div className="dpr-tooltip-row">
                <span className="label">Crit Hit Avg:</span>
                <span className="val text-gold">
                  {formatNum(metrics.critAvgDamage)} {critRule === 'max_damage_bonus' ? '(+Max Roll)' : '(2× Dice)'}
                </span>
              </div>
              {atk.isResisted && (
                <div className="dpr-tooltip-row">
                  <span className="label">Multiplier:</span>
                  <span className="val text-crit">0.5× (Resisted)</span>
                </div>
              )}
              {atk.isVulnerable && (
                <div className="dpr-tooltip-row">
                  <span className="label">Multiplier:</span>
                  <span className="val text-gold">2.0× (Vulnerable)</span>
                </div>
              )}
            </div>

            <div className="dpr-tooltip-formula">
              <div className="math-step">
                DPR = (P(Reg) × Avg) + (P(Crit) × Avg_Crit)
              </div>
              <div className="math-step">
                = ({formatPercent(metrics.pRegularHit)} × {formatNum(metrics.regularAvgDamage)}) + ({formatPercent(metrics.pCrit)} × {formatNum(metrics.critAvgDamage)})
              </div>
              <div className="math-step">
                = {formatNum(metrics.pRegularHit * metrics.regularAvgDamage)} + {formatNum(metrics.pCrit * metrics.critAvgDamage)} = {formatNum(metrics.pRegularHit * metrics.regularAvgDamage + metrics.pCrit * metrics.critAvgDamage)}
              </div>
              {atk.isResisted && (
                <div className="math-step" style={{ color: 'var(--accent-crit)' }}>
                  × 0.5 (Resisted)
                </div>
              )}
              {atk.isVulnerable && (
                <div className="math-step" style={{ color: 'var(--accent-gold-light)' }}>
                  × 2.0 (Vulnerable)
                </div>
              )}
              <div className="math-result">
                <span>Expected DPR:</span>
                <span>{formatNum(metrics.dpr)}</span>
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* 8. Combined 25th – 75th Percentile Column */}
      <td className="text-right">
        <div className="damage-pill" style={{ whiteSpace: 'nowrap', textAlign: 'right', opacity: isAtkEnabled ? 1 : 0.7 }}>
          <span className="text-p25">{formatNum(metrics.p25)}</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 0.15rem' }}>–</span>
          <span className="text-p75">{formatNum(metrics.p75)}</span>
        </div>
        <div className="table-sublabel" style={{ textAlign: 'right' }}>
          Q1 – Q3 on Hit
        </div>
      </td>

      {/* 9. Max Damage Column */}
      <td className="text-right">
        <div className="damage-pill text-crit" style={{ textAlign: 'right', opacity: isAtkEnabled ? 1 : 0.7 }}>
          {formatNum(metrics.maxPotentialDamage)}
        </div>
        <div className="table-sublabel" style={{ textAlign: 'right' }}>
          Max Potential
        </div>
      </td>

      {/* 11. Row Actions */}
      <td className="text-right">
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.2rem',
          }}
        >
          {/* Move Up Button */}
          <button
            onClick={() => handlers.handleMoveAttack(charIdx, atkIdx, 'up')}
            disabled={atkIdx === 0}
            className="btn btn-sm btn-ghost btn-icon-move"
            title="Move attack up"
            aria-label="Move attack up"
          >
            ↑
          </button>
          {/* Move Down Button */}
          <button
            onClick={() => handlers.handleMoveAttack(charIdx, atkIdx, 'down')}
            disabled={atkIdx === handlers.attackCount - 1} // we need attackCount for disable check
            className="btn btn-sm btn-ghost btn-icon-move"
            title="Move attack down"
            aria-label="Move attack down"
          >
            ↓
          </button>
          <button
            onClick={() =>
              handlers.handleDuplicateAttack(charIdx, atkIdx)
            }
            className="btn btn-sm btn-ghost"
            title="Duplicate Attack"
            style={{ padding: '0.2rem 0.35rem' }}
          >
            📋
          </button>
          {/* Attack Delete Button - Matching Cross */}
          <button
            onClick={() =>
              handlers.handleDeleteAttack(charIdx, atkIdx)
            }
            className="btn-delete-cross"
            title="Delete Attack"
            aria-label="Delete Attack"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
