import React, { useEffect, useMemo } from 'react';
import { getTurnDamagePmf, getPartyDamagePmf } from '../engine/dprEngine';
import { DamageDistributionChart } from './DamageDistributionChart';

export function DistributionModal({
  isOpen,
  onClose,
  title,
  subtitle,
  targetAC = 15,
  setTargetAC,
  critRule = 'double_dice',
  char,
  characters,
  type = 'party',
  distributionResult,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dynamically compute the PMF distribution if targetAC changes
  const activeResult = useMemo(() => {
    const currentAC = Number(targetAC) || 15;
    if (type === 'character' && char && char.attacks) {
      return getTurnDamagePmf(char.attacks, currentAC, critRule);
    }
    if (type === 'party' && characters && characters.length > 0) {
      return getPartyDamagePmf(characters, currentAC, critRule);
    }
    return distributionResult;
  }, [type, char, characters, targetAC, critRule, distributionResult]);

  if (!isOpen || !activeResult) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog distribution-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">
              <span className="modal-icon">📊</span> {title || 'Damage Distribution'}
            </h2>
            <div className="modal-meta-badges">
              {setTargetAC ? (
                <div className="dist-ac-control" style={{ margin: 0 }}>
                  <span className="dist-control-label font-mono" style={{ fontSize: '0.68rem' }}>
                    Target AC:
                  </span>
                  <div className="dist-ac-input-wrapper">
                    <input
                      type="number"
                      min="1"
                      max="35"
                      value={targetAC}
                      onChange={(e) =>
                        setTargetAC(e.target.value === '' ? '' : Number(e.target.value))
                      }
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
                          style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}
                        >
                          {ac}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="badge-ac font-mono">Target AC: {targetAC}</span>
              )}

              {critRule && (
                <span className="badge-rule font-mono">
                  {critRule === 'max_damage_bonus' ? 'Max Crit Rule' : 'Double Dice Crit'}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <DamageDistributionChart
            distributionResult={activeResult}
            subtitle={
              subtitle ||
              `Full turn probability mass function against Target AC ${targetAC}. Adjust AC above to see probability shifts.`
            }
            height={400}
          />
        </div>
      </div>
    </div>
  );
}
