import { useState, useEffect, useMemo } from 'react';
import {
  calculateAttackDpr,
  calculateAttackProbabilities,
  DiceParser,
  buildAttackOnHitPmf,
  combineAttackPercentiles,
  calculateAcSweep,
} from '../engine/dprEngine';

const STORAGE_KEY = 'dnd_party_damage_calc_react_v1';

const DEFAULT_PRESET = {
  targetAC: 15,
  characters: [
    {
      id: 'char-1',
      name: 'Valeros (Champion Fighter)',
      enabled: true,
      attacks: [
        {
          id: 'atk-1a',
          name: 'Greatsword Strike #1',
          attackBonus: 7,
          diceString: '2d6 + 4',
          advantageMode: 'normal',
          critThreshold: 19,
          isResisted: false,
          isVulnerable: false,
          enabled: true,
        },
        {
          id: 'atk-1b',
          name: 'Greatsword Strike #2',
          attackBonus: 7,
          diceString: '2d6 + 4',
          advantageMode: 'normal',
          critThreshold: 19,
          isResisted: false,
          isVulnerable: false,
          enabled: true,
        },
      ],
    },
    {
      id: 'char-2',
      name: 'Malaroc (Eldritch Blaster)',
      enabled: true,
      attacks: [
        {
          id: 'atk-2a',
          name: 'Eldritch Blast Beam 1',
          attackBonus: 8,
          diceString: '1d10 + 5',
          advantageMode: 'advantage',
          critThreshold: 20,
          isResisted: false,
          isVulnerable: false,
          enabled: true,
        },
        {
          id: 'atk-2b',
          name: 'Eldritch Blast Beam 2 + Hex',
          attackBonus: 8,
          diceString: '1d10 + 1d6 + 5',
          advantageMode: 'advantage',
          critThreshold: 20,
          isResisted: false,
          isVulnerable: false,
          enabled: true,
        },
      ],
    },
  ],
};

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function usePartyState() {
  const [targetAC, setTargetAC] = useState(15);
  const [critRule, setCritRule] = useState('double_dice');
  const [characters, setCharacters] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draggedAttack, setDraggedAttack] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('roster');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.characters)) {
          setTargetAC(Number(parsed.targetAC) || 15);
          if (parsed.critRule === 'max_damage_bonus' || parsed.critRule === 'double_dice') {
            setCritRule(parsed.critRule);
          }
          setCharacters(parsed.characters);
          setIsLoaded(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }
    setTargetAC(DEFAULT_PRESET.targetAC);
    setCritRule('double_dice');
    setCharacters(JSON.parse(JSON.stringify(DEFAULT_PRESET.characters)));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          targetAC,
          critRule,
          characters,
        })
      );
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [targetAC, critRule, characters, isLoaded]);

  const getAttackMetrics = (attack) => {
    const isAtkEnabled = attack.enabled !== false;
    try {
      const damageResult = calculateAttackDpr(
        {
          id: attack.id,
          name: attack.name,
          attackBonus: Number(attack.attackBonus) || 0,
          diceString: attack.diceString || '1d8',
          advantageMode: attack.advantageMode || 'normal',
          critThreshold: attack.critThreshold,
          isResisted: Boolean(attack.isResisted),
          isVulnerable: Boolean(attack.isVulnerable),
          critRule: critRule,
          enabled: isAtkEnabled,
        },
        Number(targetAC) || 10
      );

      const probs = calculateAttackProbabilities(
        attack.advantageMode || 'normal',
        Number(targetAC) || 10,
        Number(attack.attackBonus) || 0,
        attack.critThreshold
      );

      return {
        dpr: damageResult.dpr || 0,
        maxPotentialDamage: damageResult.maxPotentialDamage || 0,
        regularAvgDamage: damageResult.regularAvgDamage || 0,
        critAvgDamage: damageResult.critAvgDamage || 0,
        p25: damageResult.p25 || 0,
        p75: damageResult.p75 || 0,
        median: damageResult.median || 0,
        pHit: probs.pHit || 0,
        pCrit: probs.pCrit || 0,
        pRegularHit: probs.pRegularHit || 0,
        targetRollNeeded: probs.targetRollNeeded,
        attackBonus: Number(attack.attackBonus) || 0,
        diceString: attack.diceString || '1d8',
        advantageMode: attack.advantageMode || 'normal',
        critThreshold: attack.critThreshold,
        isResisted: Boolean(attack.isResisted),
        isVulnerable: Boolean(attack.isVulnerable),
        critRule: critRule,
        enabled: isAtkEnabled,
        isValid: true,
      };
    } catch {
      return {
        dpr: 0,
        maxPotentialDamage: 0,
        regularAvgDamage: 0,
        critAvgDamage: 0,
        p25: 0,
        p75: 0,
        median: 0,
        pHit: 0,
        pCrit: 0,
        pRegularHit: 0,
        targetRollNeeded: 0,
        attackBonus: 0,
        diceString: '1d8',
        advantageMode: 'normal',
        critThreshold: 20,
        isResisted: false,
        isVulnerable: false,
        critRule: critRule,
        enabled: isAtkEnabled,
        isValid: false,
      };
    }
  };

  const getCharacterMetrics = (character) => {
    if (!character || !character.attacks) {
      return {
        dpr: 0,
        maxDpr: 0,
        p25: 0,
        p75: 0,
        median: 0,
        hitChanceAvg: 0,
        activeAttackCount: 0,
        totalAttackCount: 0,
      };
    }

    let charDpr = 0;
    let charMaxDpr = 0;
    let totalHitProb = 0;
    let activeAttackCount = 0;
    const pmfs = [];

    character.attacks.forEach((atk) => {
      if (atk.enabled !== false) {
        activeAttackCount++;
        const res = getAttackMetrics(atk);
        charDpr += res.dpr;
        charMaxDpr += res.maxPotentialDamage;
        totalHitProb += res.pHit;

        try {
          const expr = DiceParser.parse(atk.diceString || '1d8');
          const probs = calculateAttackProbabilities(
            atk.advantageMode || 'normal',
            Number(targetAC) || 10,
            Number(atk.attackBonus) || 0,
            atk.critThreshold
          );
          const mult = atk.isResisted ? 0.5 : atk.isVulnerable ? 2.0 : 1.0;
          pmfs.push(buildAttackOnHitPmf(expr, probs, mult, critRule));
        } catch {
        }
      }
    });

    const percentiles = combineAttackPercentiles(pmfs);

    return {
      dpr: charDpr,
      maxDpr: charMaxDpr,
      p25: percentiles.p25,
      p75: percentiles.p75,
      median: percentiles.median,
      hitChanceAvg: activeAttackCount > 0 ? totalHitProb / activeAttackCount : 0,
      activeAttackCount,
      totalAttackCount: character.attacks.length,
    };
  };

  const partySummary = useMemo(() => {
    let totalDpr = 0;
    let totalMaxDpr = 0;
    let totalHit = 0;
    let totalCrit = 0;
    let activeAttackCount = 0;
    let activeCharacterCount = 0;
    const allActivePmfs = [];

    characters.forEach((char) => {
      if (char.enabled) {
        activeCharacterCount++;
        char.attacks.forEach((atk) => {
          if (atk.enabled !== false) {
            const res = getAttackMetrics(atk);
            totalDpr += res.dpr;
            totalMaxDpr += res.maxPotentialDamage;
            totalHit += res.pHit;
            totalCrit += res.pCrit;
            activeAttackCount++;

            try {
              const expr = DiceParser.parse(atk.diceString || '1d8');
              const probs = calculateAttackProbabilities(
                atk.advantageMode || 'normal',
                Number(targetAC) || 10,
                Number(atk.attackBonus) || 0,
                atk.critThreshold
              );
              const mult = atk.isResisted ? 0.5 : atk.isVulnerable ? 2.0 : 1.0;
              allActivePmfs.push(buildAttackOnHitPmf(expr, probs, mult, critRule));
            } catch {
            }
          }
        });
      }
    });

    const combinedPercentiles = combineAttackPercentiles(allActivePmfs);
    const avgHitChance = activeAttackCount > 0 ? totalHit / activeAttackCount : 0;
    const avgCritChance = activeAttackCount > 0 ? totalCrit / activeAttackCount : 0;

    return {
      totalDpr,
      totalMaxDpr,
      p25: combinedPercentiles.p25,
      p75: combinedPercentiles.p75,
      median: combinedPercentiles.median,
      avgHitChance,
      avgCritChance,
      activeAttackCount,
      activeCharacterCount,
    };
  }, [characters, targetAC, critRule]);

  const acSweepData = useMemo(() => {
    return calculateAcSweep(characters, critRule, 10, 25);
  }, [characters, critRule]);

  const handleAddCharacter = () => {
    const newChar = {
      id: generateId('char'),
      name: `Hero #${characters.length + 1}`,
      enabled: true,
      attacks: [
        {
          id: generateId('atk'),
          name: 'Primary Attack',
          attackBonus: 5,
          diceString: '1d8 + 3',
          advantageMode: 'normal',
          critThreshold: 20,
          isResisted: false,
          isVulnerable: false,
          enabled: true,
        },
      ],
    };
    setCharacters((prev) => [...prev, newChar]);
  };

  const handleDuplicateCharacter = (index) => {
    const orig = characters[index];
    if (!orig) return;
    const clone = JSON.parse(JSON.stringify(orig));
    clone.id = generateId('char');
    clone.name = `${clone.name} (Copy)`;
    clone.attacks.forEach((a) => {
      a.id = generateId('atk');
      if (a.enabled === undefined) a.enabled = true;
    });
    setCharacters((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

  const handleDeleteCharacter = (index) => {
    setCharacters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleCharacter = (index) => {
    setCharacters((prev) =>
      prev.map((char, i) =>
        i === index ? { ...char, enabled: !char.enabled } : char
      )
    );
  };

  const handleToggleAllCharacters = (enabled) => {
    setCharacters((prev) => prev.map((char) => ({ ...char, enabled })));
  };

  const handleUpdateCharacterName = (index, name) => {
    setCharacters((prev) =>
      prev.map((char, i) => (i === index ? { ...char, name } : char))
    );
  };

  const handleAddAttack = (charIndex) => {
    setCharacters((prev) =>
      prev.map((char, i) => {
        if (i !== charIndex) return char;
        const newAtk = {
          id: generateId('atk'),
          name: `Attack #${char.attacks.length + 1}`,
          attackBonus: 5,
          diceString: '1d8 + 3',
          advantageMode: 'normal',
          critThreshold: 20,
          isResisted: false,
          isVulnerable: false,
          enabled: true,
        };
        return { ...char, attacks: [...char.attacks, newAtk] };
      })
    );
  };

  const handleDuplicateAttack = (charIndex, attackIndex) => {
    setCharacters((prev) =>
      prev.map((char, i) => {
        if (i !== charIndex) return char;
        const orig = char.attacks[attackIndex];
        const clone = JSON.parse(JSON.stringify(orig));
        clone.id = generateId('atk');
        clone.name = `${clone.name} (Copy)`;
        const newAttacks = [...char.attacks];
        newAttacks.splice(attackIndex + 1, 0, clone);
        return { ...char, attacks: newAttacks };
      })
    );
  };

  const handleDeleteAttack = (charIndex, attackIndex) => {
    setCharacters((prev) =>
      prev.map((char, i) => {
        if (i !== charIndex) return char;
        return {
          ...char,
          attacks: char.attacks.filter((_, aIdx) => aIdx !== attackIndex),
        };
      })
    );
  };

  const handleUpdateAttack = (charIndex, attackIndex, field, value) => {
    setCharacters((prev) =>
      prev.map((char, i) => {
        if (i !== charIndex) return char;
        const newAttacks = char.attacks.map((atk, aIdx) => {
          if (aIdx !== attackIndex) return atk;
          return { ...atk, [field]: value };
        });
        return { ...char, attacks: newAttacks };
      })
    );
  };

  const handleMoveAttack = (charIndex, attackIndex, direction) => {
    setCharacters((prev) =>
      prev.map((char, cIdx) => {
        if (cIdx !== charIndex) return char;
        const targetIndex = direction === 'up' ? attackIndex - 1 : attackIndex + 1;
        if (targetIndex < 0 || targetIndex >= char.attacks.length) return char;

        const newAttacks = [...char.attacks];
        const temp = newAttacks[attackIndex];
        newAttacks[attackIndex] = newAttacks[targetIndex];
        newAttacks[targetIndex] = temp;
        return { ...char, attacks: newAttacks };
      })
    );
  };

  const handleDragStart = (e, charIndex, attackIndex) => {
    setDraggedAttack({ charIndex, attackIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ charIndex, attackIndex }));

    const row = e.target.closest('tr');
    if (row && e.dataTransfer.setDragImage) {
      e.dataTransfer.setDragImage(row, 20, 20);
    }
  };

  const handleDragOver = (e, charIndex, attackIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedAttack) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const position = offsetY < rect.height / 2 ? 'before' : 'after';

    if (draggedAttack.charIndex === charIndex && draggedAttack.attackIndex === attackIndex) {
      setDropTarget(null);
      return;
    }

    if (
      !dropTarget ||
      dropTarget.charIndex !== charIndex ||
      dropTarget.attackIndex !== attackIndex ||
      dropTarget.position !== position
    ) {
      setDropTarget({ charIndex, attackIndex, position });
    }
  };

  const handleDragEnd = () => {
    setDraggedAttack(null);
    setDropTarget(null);
  };

  const handleDrop = (e, targetCharIdx, targetAtkIdx) => {
    e.preventDefault();
    if (!draggedAttack) return;

    const sourceCharIdx = draggedAttack.charIndex;
    const sourceAtkIdx = draggedAttack.attackIndex;
    const position = dropTarget?.position || 'before';

    if (sourceCharIdx === targetCharIdx && sourceAtkIdx === targetAtkIdx) {
      setDraggedAttack(null);
      setDropTarget(null);
      return;
    }

    setCharacters((prev) => {
      const next = prev.map((char) => ({
        ...char,
        attacks: [...char.attacks],
      }));

      const sourceChar = next[sourceCharIdx];
      const targetChar = next[targetCharIdx];
      if (!sourceChar || !targetChar) return prev;

      const [movedAtk] = sourceChar.attacks.splice(sourceAtkIdx, 1);
      if (!movedAtk) return prev;

      let insertIdx = targetAtkIdx;
      if (sourceCharIdx === targetCharIdx && sourceAtkIdx < targetAtkIdx) {
        insertIdx = position === 'after' ? targetAtkIdx : targetAtkIdx - 1;
      } else {
        insertIdx = position === 'after' ? targetAtkIdx + 1 : targetAtkIdx;
      }

      if (insertIdx < 0) insertIdx = 0;
      if (insertIdx > targetChar.attacks.length) insertIdx = targetChar.attacks.length;

      targetChar.attacks.splice(insertIdx, 0, movedAtk);
      return next;
    });

    setDraggedAttack(null);
    setDropTarget(null);
  };

  const handleResetDefaults = () => {
    setTargetAC(DEFAULT_PRESET.targetAC);
    setCritRule('double_dice');
    setCharacters(JSON.parse(JSON.stringify(DEFAULT_PRESET.characters)));
  };

  return {
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
    handlers: {
      handleAddCharacter,
      handleDuplicateCharacter,
      handleDeleteCharacter,
      handleToggleCharacter,
      handleToggleAllCharacters,
      handleUpdateCharacterName,
      handleAddAttack,
      handleDuplicateAttack,
      handleDeleteAttack,
      handleUpdateAttack,
      handleMoveAttack,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDrop,
      handleResetDefaults,
    },
  };
}
