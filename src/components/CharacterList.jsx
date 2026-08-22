import React from 'react';
import { CharacterCard } from './CharacterCard';

export function CharacterList({
  characters,
  targetAC,
  critRule,
  partySummary,
  getCharacterMetrics,
  getAttackMetrics,
  draggedAttack,
  dropTarget,
  handlers,
  onOpenDistributionModal,
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2
            className="font-dnd"
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Party Roster</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-muted)',
                fontWeight: 400,
              }}
            >
              ({partySummary.activeCharacterCount} / {characters.length} active)
            </span>
          </h2>

          <button
            onClick={handlers.handleAddCharacter}
            className="btn btn-gold btn-sm"
          >
            + Add Character
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => handlers.handleToggleAllCharacters(true)}
            className="btn btn-ghost btn-sm"
          >
            Enable All
          </button>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <button
            onClick={() => handlers.handleToggleAllCharacters(false)}
            className="btn btn-ghost btn-sm"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Empty Roster State */}
      {characters.length === 0 && (
        <div className="empty-box">
          <div className="empty-icon">🎲</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0' }}>
            No characters in party
          </h3>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginTop: '0.25rem',
            }}
          >
            Add a character manually or load the default party preset.
          </p>
          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
          >
            <button onClick={handlers.handleAddCharacter} className="btn btn-gold">
              + Add Character
            </button>
            <button onClick={handlers.handleResetDefaults} className="btn">
              Load Default Preset
            </button>
          </div>
        </div>
      )}

      {/* Character Cards List */}
      {characters.map((char, charIdx) => (
        <CharacterCard
          key={char.id}
          char={char}
          charIdx={charIdx}
          targetAC={targetAC}
          critRule={critRule}
          getCharacterMetrics={getCharacterMetrics}
          getAttackMetrics={getAttackMetrics}
          draggedAttack={draggedAttack}
          dropTarget={dropTarget}
          handlers={handlers}
          onOpenDistributionModal={onOpenDistributionModal}
        />
      ))}
    </section>
  );
}
