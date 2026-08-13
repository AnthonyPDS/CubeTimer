import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Timer } from './components/Timer';
import { ScrambleDisplay } from './components/ScrambleDisplay';
import { StatsPanel } from './components/StatsPanel';
import { SolvesHistory } from './components/SolvesHistory';
import { ProgressChart } from './components/ProgressChart';
import { SessionSelector } from './components/SessionSelector';
import { AlgorithmLibrary } from './components/AlgorithmLibrary';
import type { Solve, Session, CubeState, SolveSplits } from './types';
import { generateScramble, getCubeStateFromScramble, getInitialCubeState } from './utils/scrambleGenerator';
import { calculateStats } from './utils/statsCalculator';
import { Box, Timer as TimerIcon, BookOpen } from 'lucide-react';

const SESSIONS_KEY = 'cubetimer_sessions_v1';
const SOLVES_KEY = 'cubetimer_solves_v1';
const ALG_FAVS_KEY = 'cubetimer_alg_favs_v1';
const ALG_SOLVES_KEY = 'cubetimer_alg_solves_v1';

export const App: React.FC = () => {
  // Load initial sessions
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [{ id: 'session_1', name: 'Sessão 1', createdAt: Date.now() }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || 'session_1';
  });

  // Load initial solves
  const [solves, setSolves] = useState<Solve[]>(() => {
    const saved = localStorage.getItem(SOLVES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [inspectionEnabled, setInspectionEnabled] = useState<boolean>(false);
  const [cfopModeEnabled, setCfopModeEnabled] = useState<boolean>(false);

  // App Navigation State
  const [activeTab, setActiveTab] = useState<'timer' | 'algorithms'>('timer');

  // Algorithm Library State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(ALG_FAVS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [algSolves, setAlgSolves] = useState<Record<string, number[]>>(() => {
    const saved = localStorage.getItem(ALG_SOLVES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem(ALG_FAVS_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(ALG_SOLVES_KEY, JSON.stringify(algSolves));
  }, [algSolves]);

  // Scramble State
  const [currentScramble, setCurrentScramble] = useState<string>('');
  const [cubeState, setCubeState] = useState<CubeState>(getInitialCubeState());

  // Generate initial scramble
  const newScramble = useCallback(() => {
    const scr = generateScramble(21);
    setCurrentScramble(scr);
    setCubeState(getCubeStateFromScramble(scr));
  }, []);

  useEffect(() => {
    newScramble();
  }, [newScramble]);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Save solves to localStorage
  useEffect(() => {
    localStorage.setItem(SOLVES_KEY, JSON.stringify(solves));
  }, [solves]);

  // Filter solves for current active session
  const activeSolves = useMemo(() => {
    return solves.filter((s) => s.sessionId === activeSessionId);
  }, [solves, activeSessionId]);

  // Calculate statistics for active session
  const stats = useMemo(() => {
    return calculateStats(activeSolves);
  }, [activeSolves]);

  // Handle new solve completed (with optional penalty and CFOP splits)
  const handleSolveComplete = (
    timeMs: number,
    penalty: 'none' | '+2' | 'dnf' = 'none',
    splits?: SolveSplits
  ) => {
    let finalTime = timeMs;
    if (penalty === '+2') finalTime = timeMs + 2000;

    const newSolve: Solve = {
      id: 'solve_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      time: finalTime,
      rawTime: timeMs,
      scramble: currentScramble,
      timestamp: Date.now(),
      penalty: penalty,
      sessionId: activeSessionId,
      splits: splits,
    };

    // Check if PB single
    const previousBest = stats.bestSingle;
    if (penalty !== 'dnf' && (previousBest === null || finalTime < previousBest)) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setSolves((prev) => [...prev, newSolve]);
    newScramble();
  };

  // Toggle Penalty (+2 / DNF / none)
  const handleTogglePenalty = (solveId: string, penalty: 'none' | '+2' | 'dnf') => {
    setSolves((prev) =>
      prev.map((s) => {
        if (s.id === solveId) {
          let updatedTime = s.rawTime;
          if (penalty === '+2') updatedTime = s.rawTime + 2000;
          return { ...s, penalty, time: updatedTime };
        }
        return s;
      })
    );
  };

  // Delete Solve
  const handleDeleteSolve = (solveId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta resolução?')) {
      setSolves((prev) => prev.filter((s) => s.id !== solveId));
    }
  };

  // Clear all solves in session
  const handleClearSolves = () => {
    if (window.confirm('Tem certeza que deseja limpar TODAS as resoluções desta sessão?')) {
      setSolves((prev) => prev.filter((s) => s.sessionId !== activeSessionId));
    }
  };

  // Create Session
  const handleCreateSession = (name: string) => {
    const newSess: Session = {
      id: 'session_' + Date.now(),
      name,
      createdAt: Date.now(),
    };
    setSessions((prev) => [...prev, newSess]);
    setActiveSessionId(newSess.id);
  };

  // Rename Session
  const handleRenameSession = (id: string, newName: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    );
  };

  // Export JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify({ sessions, solves }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cubetimer_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.sessions && data.solves) {
          setSessions(data.sessions);
          setSolves(data.solves);
          if (data.sessions[0]) setActiveSessionId(data.sessions[0].id);
          alert('Dados importados com sucesso!');
        } else {
          alert('Arquivo JSON inválido.');
        }
      } catch (err) {
        alert('Erro ao carregar o arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-icon">
            <Box size={24} />
          </div>
          <div>
            <h1 className="app-title">CubeTimer Minimal</h1>
            <span className="subtitle">Speedcubing Timer & WCA Stats</span>
          </div>
          <nav className="header-tabs" style={{ marginLeft: '20px' }}>
            <button
              className={`tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
              onClick={() => setActiveTab('timer')}
            >
              <TimerIcon size={18} />
              <span>Cronômetro</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'algorithms' ? 'active' : ''}`}
              onClick={() => setActiveTab('algorithms')}
            >
              <BookOpen size={18} />
              <span>Algoritmos CFOP</span>
            </button>
          </nav>
        </div>
      </header>

      {activeTab === 'timer' ? (
        <>
          {/* Session selector & Toolbar */}
      <SessionSelector
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onRenameSession={handleRenameSession}
        onExportData={handleExportData}
        onImportData={handleImportData}
        inspectionEnabled={inspectionEnabled}
        onToggleInspection={() => setInspectionEnabled(!inspectionEnabled)}
        cfopModeEnabled={cfopModeEnabled}
        onToggleCfopMode={() => setCfopModeEnabled(!cfopModeEnabled)}
      />

      {/* Scramble Display & 2D Preview */}
      <ScrambleDisplay
        scramble={currentScramble}
        cubeState={cubeState}
        onNewScramble={newScramble}
      />

      {/* Main Digital Timer */}
      <Timer
        onSolveComplete={handleSolveComplete}
        inspectionEnabled={inspectionEnabled}
        cfopModeEnabled={cfopModeEnabled}
      />

      {/* Statistics & Solves Dashboard */}
      <div className="dashboard-grid">
        {/* Left Column: Stats */}
        <div className="sidebar-column">
          <StatsPanel stats={stats} solves={activeSolves} />
        </div>

        {/* Right Column: Solves List & Progress Chart */}
        <div className="main-column">
          <SolvesHistory
            solves={activeSolves}
            onTogglePenalty={handleTogglePenalty}
            onDeleteSolve={handleDeleteSolve}
            onClearSolves={handleClearSolves}
            bestSingleTime={stats.bestSingle}
          />
          <ProgressChart solves={activeSolves} />
        </div>
      </div>
        </>
      ) : (
        <AlgorithmLibrary
          favorites={favorites}
          onToggleFavorite={(algId) => {
            setFavorites(prev => 
              prev.includes(algId) ? prev.filter(id => id !== algId) : [...prev, algId]
            );
          }}
          algSolves={algSolves}
          onSaveAlgSolve={(algId: string, timeMs: number) => {
            setAlgSolves(prev => {
              const current = prev[algId] || [];
              return { ...prev, [algId]: [timeMs, ...current] };
            });
          }}
        />
      )}
    </div>
  );
};

export default App;
