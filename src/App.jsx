import React, { useState } from 'react';
import { usePartyState } from './hooks/usePartyState';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CharacterList } from './components/CharacterList';
import { AnalyticsView } from './components/AnalyticsView';
import { DistributionModal } from './components/DistributionModal';
import { ChangelogModal } from './components/ChangelogModal';

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
    activeTab,
    setActiveTab,
    acSweepData,
    handlers,
  } = usePartyState();

  const [modalConfig, setModalConfig] = useState(null);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const handleOpenDistributionModal = (config) => {
    setModalConfig({
      isOpen: true,
      targetAC,
      critRule,
      ...config,
    });
  };

  const handleCloseDistributionModal = () => {
    setModalConfig(null);
  };

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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenChangelog={() => setIsChangelogOpen(true)}
      />

      <main className="app-main">
        {activeTab === 'roster' ? (
          <>
            <Dashboard
              targetAC={targetAC}
              setTargetAC={setTargetAC}
              critRule={critRule}
              setCritRule={setCritRule}
              partySummary={partySummary}
              characters={characters}
              getCharacterMetrics={getCharacterMetrics}
              onOpenDistributionModal={handleOpenDistributionModal}
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
              onOpenDistributionModal={handleOpenDistributionModal}
            />
          </>
        ) : (
          <AnalyticsView
            targetAC={targetAC}
            setTargetAC={setTargetAC}
            critRule={critRule}
            setCritRule={setCritRule}
            characters={characters}
            acSweepData={acSweepData}
          />
        )}
      </main>

      {modalConfig && (
        <DistributionModal
          isOpen={modalConfig.isOpen}
          onClose={handleCloseDistributionModal}
          title={modalConfig.title}
          subtitle={modalConfig.subtitle}
          targetAC={targetAC}
          setTargetAC={setTargetAC}
          critRule={critRule}
          char={modalConfig.char}
          characters={characters}
          type={modalConfig.type}
          distributionResult={modalConfig.distributionResult}
        />
      )}

      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </div>
  );
}
