import React from 'react';
import { usePartyState } from './hooks/usePartyState';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CharacterList } from './components/CharacterList';

export default function App() {
  const {
    targetAC,
    setTargetAC,
    critRule,
    setCritRule,
    characters,
    setCharacters,
    isLoaded,
    draggedAttack,
    dropTarget,
    partySummary,
    getAttackMetrics,
    getCharacterMetrics,
    handlers,
  } = usePartyState();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gold" style={{ fontSize: '1.25rem', opacity: 0.7 }}>
          Loading party data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        targetAC={targetAC}
        critRule={critRule}
        characters={characters}
        setCharacters={setCharacters}
        setTargetAC={setTargetAC}
        setCritRule={setCritRule}
        handleResetDefaults={handlers.handleResetDefaults}
      />

      <main className="app-main">
        <Dashboard
          targetAC={targetAC}
          setTargetAC={setTargetAC}
          critRule={critRule}
          setCritRule={setCritRule}
          partySummary={partySummary}
          characters={characters}
          getCharacterMetrics={getCharacterMetrics}
        />

        <CharacterList
          characters={characters}
          targetAC={targetAC}
          critRule={critRule}
          partySummary={partySummary}
          getCharacterMetrics={getCharacterMetrics}
          getAttackMetrics={getAttackMetrics}
          draggedAttack={draggedAttack}
          dropTarget={dropTarget}
          handlers={handlers}
        />
      </main>
    </div>
  );
}
