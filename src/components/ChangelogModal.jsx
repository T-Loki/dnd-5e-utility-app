import React, { useEffect } from 'react';
import { CHANGELOG } from '../data/changelog';

export function ChangelogModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'feature':
        return 'changelog-badge-feature';
      case 'fix':
        return 'changelog-badge-fix';
      case 'improvement':
        return 'changelog-badge-improvement';
      default:
        return 'changelog-badge-default';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'feature':
        return '✨ Feature';
      case 'fix':
        return '🐛 Fix';
      case 'improvement':
        return '⚡ Improvement';
      default:
        return '📝 Update';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog changelog-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 id="changelog-modal-title" className="modal-title">
              <span className="modal-icon">📜</span> Release Notes &amp; Changelog
            </h2>
            <div className="modal-meta-badges">
              <span className="badge-rule font-mono">Latest: v{CHANGELOG[0]?.version || '1.3.0'}</span>
              <span className="badge-ac font-mono">React Engine</span>
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

        <div className="modal-body changelog-modal-body">
          <div className="changelog-timeline">
            {CHANGELOG.map((entry, index) => {
              const isLatest = index === 0;
              return (
                <div
                  key={entry.version}
                  className={`changelog-version-card ${isLatest ? 'is-latest' : ''}`}
                >
                  <div className="changelog-card-header">
                    <div className="changelog-version-meta">
                      <span className="changelog-version-pill font-mono">
                        v{entry.version}
                      </span>
                      {isLatest && (
                        <span className="changelog-latest-tag">Latest Release</span>
                      )}
                      <span className="changelog-date font-mono">{entry.date}</span>
                    </div>
                    <h3 className="changelog-version-title">{entry.title}</h3>
                    {entry.highlight && (
                      <p className="changelog-version-highlight">{entry.highlight}</p>
                    )}
                  </div>

                  <div className="changelog-changes-list">
                    {entry.changes.map((change, cIdx) => (
                      <div key={cIdx} className="changelog-change-item">
                        <div className="changelog-change-header">
                          <span
                            className={`changelog-type-badge font-mono ${getTypeBadgeClass(
                              change.type
                            )}`}
                          >
                            {getTypeLabel(change.type)}
                          </span>
                          <span className="changelog-change-title">{change.title}</span>
                        </div>
                        <p className="changelog-change-desc">{change.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="changelog-modal-footer">
          <span className="changelog-footer-text">
            ⚔️ D&amp;D 5e Party Damage Calculator · Open Game License &amp; SRD 5.1
          </span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
