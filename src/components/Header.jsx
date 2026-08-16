import React, { useRef } from 'react';

export function Header({
  targetAC,
  critRule,
  characters,
  setCharacters,
  setTargetAC,
  setCritRule,
  handleResetDefaults,
}) {
  const fileInputRef = useRef(null);

  const handleExportJson = () => {
    const data = {
      version: '1.3',
      exportedAt: new Date().toISOString(),
      targetAC,
      critRule,
      characters,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd-party-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && Array.isArray(parsed.characters)) {
          setCharacters(parsed.characters);
          if (parsed.targetAC !== undefined) {
            setTargetAC(Number(parsed.targetAC) || 15);
          }
          if (parsed.critRule === 'max_damage_bonus' || parsed.critRule === 'double_dice') {
            setCritRule(parsed.critRule);
          }
          alert('Party configuration imported successfully!');
        } else {
          alert('Invalid file format. Missing "characters" array.');
        }
      } catch (err) {
        alert('Error parsing JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="logo-group">
          <div className="logo-badge">⚔️</div>
          <div>
            <div className="title-text">
              D&amp;D 5e Party Damage Calculator
              <span className="version-tag">React Engine</span>
            </div>
            <div className="subtitle-text">
              Full 5e probability engine · Advantage/Disadvantage · Custom Crit Rules &amp; Ranges · Halfling Luck &amp; GWF · Resistance · On-Hit Percentiles
            </div>
          </div>
        </div>

        <div className="header-actions">
          <input
            type="file"
            ref={fileInputRef}
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <button
            onClick={handleImportClick}
            className="btn btn-sm"
            title="Import party JSON"
          >
            📥 Import JSON
          </button>

          <button
            onClick={handleExportJson}
            className="btn btn-sm"
            title="Export party JSON"
          >
            📤 Export JSON
          </button>

          <button
            onClick={handleResetDefaults}
            className="btn btn-sm btn-ghost"
            title="Reset default preset"
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </header>
  );
}
