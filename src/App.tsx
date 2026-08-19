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
import type { AlgorithmCase } from './data/cfopAlgorithms';
import { generateScramble, getCubeStateFromScramble, getInitialCubeState } from './utils/scrambleGenerator';
import { calculateStats } from './utils/statsCalculator';
import { Box, Timer as TimerIcon, BookOpen, BarChart2, User as UserIcon, Cloud } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import {
  loadCloudUserData,
  migrateLocalToCloud,
  saveSolveToCloud,
  deleteSolveFromCloud,
  saveSessionToCloud,
  renameSessionInCloud
} from './services/syncService';
import type { User } from '@supabase/supabase-js';

const SESSIONS_KEY = 'cubetimer_sessions_v1';
const SOLVES_KEY = 'cubetimer_solves_v1';
const ALG_FAVS_KEY = 'cubetimer_alg_favs_v1';
const ALG_SOLVES_KEY = 'cubetimer_alg_solves_v1';
const SOLVE_MODE_KEY = 'cubetimer_solve_mode_v1';

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
  const [isSolveMode, setIsSolveMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOLVE_MODE_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectivelySolveMode = !isMobile || isSolveMode;

  useEffect(() => {
    localStorage.setItem(SOLVE_MODE_KEY, JSON.stringify(isSolveMode));
  }, [isSolveMode]);

  // App Navigation & History State
  const [activeTab, setActiveTab] = useState<'timer' | 'stats' | 'algorithms'>('timer');
  const [trainingAlg, setTrainingAlg] = useState<AlgorithmCase | null>(null);

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

  // User Authentication & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  const handleUserLoggedIn = useCallback(async (userId: string) => {
    const cloudData = await loadCloudUserData(userId);
    if (cloudData && cloudData.sessions.length > 0) {
      setSessions(cloudData.sessions);
      setSolves(cloudData.solves);
      setFavorites(cloudData.favorites);
      setAlgSolves(cloudData.algSolves);
      if (cloudData.sessions[0]) {
        setActiveSessionId(cloudData.sessions[0].id);
      }
    } else {
      // Migração automática na primeira vez que o usuário loga
      await migrateLocalToCloud(userId, sessions, solves, favorites, algSolves);
    }
  }, [sessions, solves, favorites, algSolves]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        handleUserLoggedIn(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        handleUserLoggedIn(user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleUserLoggedIn]);

  // Synchronize browser history (popstate) for mobile back button navigation
  useEffect(() => {
    window.history.replaceState({ tab: 'timer' }, '');

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (!state || state.tab === 'timer') {
        setActiveTab('timer');
        setTrainingAlg(null);
      } else if (state.tab === 'stats') {
        setActiveTab('stats');
        setTrainingAlg(null);
      } else if (state.tab === 'algorithms') {
        setActiveTab('algorithms');
        if (state.modal !== 'trainer') {
          setTrainingAlg(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (newTab: 'timer' | 'stats' | 'algorithms') => {
    if (newTab === activeTab && !trainingAlg) return;
    setTrainingAlg(null);

    if (newTab === 'timer') {
      if (window.history.state?.tab && window.history.state.tab !== 'timer') {
        window.history.pushState({ tab: 'timer' }, '');
      }
    } else {
      if (window.history.state?.tab === 'stats' || window.history.state?.tab === 'algorithms') {
        window.history.replaceState({ tab: newTab }, '');
      } else {
        window.history.pushState({ tab: newTab }, '');
      }
    }
    setActiveTab(newTab);
  };

  const handleOpenTrainer = (alg: AlgorithmCase) => {
    setTrainingAlg(alg);
    window.history.pushState({ tab: 'algorithms', modal: 'trainer' }, '');
  };

  const handleCloseTrainer = () => {
    setTrainingAlg(null);
    if (window.history.state?.modal === 'trainer') {
      window.history.back();
    }
  };

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
    if (currentUser) {
      saveSolveToCloud(currentUser.id, newSolve);
    }
    newScramble();
  };

  // Toggle Penalty (+2 / DNF / none)
  const handleTogglePenalty = (solveId: string, penalty: 'none' | '+2' | 'dnf') => {
    setSolves((prev) =>
      prev.map((s) => {
        if (s.id === solveId) {
          let updatedTime = s.rawTime;
          if (penalty === '+2') updatedTime = s.rawTime + 2000;
          const updatedSolve = { ...s, penalty, time: updatedTime };
          if (currentUser) {
            saveSolveToCloud(currentUser.id, updatedSolve);
          }
          return updatedSolve;
        }
        return s;
      })
    );
  };

  // Delete Solve
  const handleDeleteSolve = (solveId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta resolução?')) {
      setSolves((prev) => prev.filter((s) => s.id !== solveId));
      if (currentUser) {
        deleteSolveFromCloud(currentUser.id, solveId);
      }
    }
  };

  // Clear all solves in session
  const handleClearSolves = () => {
    if (window.confirm('Tem certeza que deseja limpar TODAS as resoluções desta sessão?')) {
      const solvesToDelete = solves.filter((s) => s.sessionId === activeSessionId);
      setSolves((prev) => prev.filter((s) => s.sessionId !== activeSessionId));
      if (currentUser) {
        solvesToDelete.forEach((s) => deleteSolveFromCloud(currentUser.id, s.id));
      }
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
    if (currentUser) {
      saveSessionToCloud(currentUser.id, newSess);
    }
  };

  // Rename Session
  const handleRenameSession = (id: string, newName: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    );
    if (currentUser) {
      renameSessionInCloud(currentUser.id, id, newName);
    }
  };

  // Helper to parse csTimer backup format
  const parseCsTimerBackup = (data: any): { sessions: Session[], solves: Solve[] } | null => {
    const hasProperties = 'properties' in data;
    const sessionKeys = Object.keys(data).filter(k => /^session\d+$/.test(k));
    if (!hasProperties && sessionKeys.length === 0) {
      return null;
    }

    const parsedSessions: Session[] = [];
    const parsedSolves: Solve[] = [];

    let sessionMetadata: Record<string, any> = {};
    if (data.properties && typeof data.properties.sessionData === 'string') {
      try {
        sessionMetadata = JSON.parse(data.properties.sessionData);
      } catch (e) {
        console.error("Erro ao ler sessionData do csTimer", e);
      }
    }

    const sortedKeys = sessionKeys.sort((a, b) => {
      const numA = parseInt(a.replace('session', ''), 10);
      const numB = parseInt(b.replace('session', ''), 10);
      return numA - numB;
    });

    sortedKeys.forEach((key) => {
      const sessionIdx = key.replace('session', '');
      const meta = sessionMetadata[sessionIdx] || {};
      const sessionName = meta.name || `Sessão ${sessionIdx}`;
      
      const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      
      parsedSessions.push({
        id: sessionId,
        name: String(sessionName),
        createdAt: Date.now()
      });

      const rawSolves = data[key];
      if (Array.isArray(rawSolves)) {
        rawSolves.forEach((solveArr) => {
          if (!Array.isArray(solveArr) || solveArr.length < 4) return;
          
          const innerVal = solveArr[0];
          const scramble = solveArr[1];
          const notes = solveArr[2];
          const timestampSec = solveArr[3];

          if (!Array.isArray(innerVal) || innerVal.length < 2) return;
          const penaltyCode = innerVal[0];
          const timeMs = innerVal[1];

          let penalty: 'none' | '+2' | 'dnf' = 'none';
          if (penaltyCode === 2000 || penaltyCode === 2) {
            penalty = '+2';
          } else if (penaltyCode === -1) {
            penalty = 'dnf';
          }

          let rawTime = timeMs;
          if (penalty === '+2') {
            rawTime = Math.max(0, timeMs - 2000);
          }

          parsedSolves.push({
            id: 'solve_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            time: timeMs,
            rawTime: rawTime,
            scramble: String(scramble || ''),
            timestamp: (Number(timestampSec) || Math.floor(Date.now() / 1000)) * 1000,
            penalty: penalty,
            sessionId: sessionId,
            notes: notes ? String(notes) : undefined
          });
        });
      }
    });

    return { sessions: parsedSessions, solves: parsedSolves };
  };

  // Export JSON in csTimer format
  const handleExportData = () => {
    const backup: Record<string, any> = {};
    const sessionDataObj: Record<string, any> = {};

    sessions.forEach((session, index) => {
      const sessionKey = `session${index + 1}`;
      const sessionSolves = solves.filter(s => s.sessionId === session.id);
      
      const formattedSolves = sessionSolves.map(s => {
        let penaltyCode = 0;
        if (s.penalty === '+2') penaltyCode = 2000;
        else if (s.penalty === 'dnf') penaltyCode = -1;

        return [
          [penaltyCode, s.time],
          s.scramble,
          s.notes || "",
          Math.floor(s.timestamp / 1000)
        ];
      });

      backup[sessionKey] = formattedSolves;

      sessionDataObj[String(index + 1)] = {
        name: session.name,
        opt: {},
        rank: index + 1,
        stat: [formattedSolves.length, 0, 0],
        date: formattedSolves.length > 0 
          ? [formattedSolves[0][3], formattedSolves[formattedSolves.length - 1][3]] 
          : [Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]
      };
    });

    backup["properties"] = {
      sessionData: JSON.stringify(sessionDataObj),
      sessionN: sessions.length,
      scrHide: true,
      tools: true,
      toolsfunc: "[\"trend\",\"stats\",\"cross\",\"distribution\"]"
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cstimer_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON / TXT (supports csTimer format and old CubeTimer format)
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Atenção: A importação irá substituir todos os tempos e sessões atuais por completo. Deseja prosseguir?')) {
      e.target.value = ''; // Clear file input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let jsonText = (event.target?.result as string) || '';
        // Remove possible UTF-8 BOM
        if (jsonText.charCodeAt(0) === 0xFEFF) {
          jsonText = jsonText.slice(1);
        }
        
        let data = JSON.parse(jsonText);
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (_) {}
        }
        
        // 1. Try parsing as csTimer format
        const csTimerParsed = parseCsTimerBackup(data);
        if (csTimerParsed) {
          if (csTimerParsed.sessions.length > 0) {
            setSessions(csTimerParsed.sessions);
            setSolves(csTimerParsed.solves);
            setActiveSessionId(csTimerParsed.sessions[0].id);
            alert(`Sucesso! ${csTimerParsed.sessions.length} sessões e ${csTimerParsed.solves.length} resoluções importadas do csTimer.`);
          } else {
            alert('Nenhuma sessão encontrada no arquivo do csTimer.');
          }
          return;
        }

        // 2. Fallback to old native format
        if (data.sessions && data.solves) {
          setSessions(data.sessions);
          setSolves(data.solves);
          if (data.sessions[0]) setActiveSessionId(data.sessions[0].id);
          alert('Dados do CubeTimer importados com sucesso!');
        } else {
          alert('Arquivo inválido ou formato não reconhecido.');
        }
      } catch (err) {
        alert('Erro ao carregar o arquivo. Certifique-se de que é um arquivo de backup válido do csTimer (.txt ou .json).');
      } finally {
        e.target.value = ''; // Reset input to allow selecting the same file again
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`app-container ${activeTab === 'timer' ? 'timer-tab-active' : ''}`}>
      {/* App Header */}
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-icon" title="CubeTimer">
            <Box size={24} />
          </div>
          <h1 className="app-title desktop-only">CubeTimer</h1>

          {/* Mode Switch (Resolução vs Opções/Gerenciamento) */}
          {activeTab === 'timer' && (
            <div className="solve-mode-lever-container mobile-only fade-in">
              <button
                onClick={() => setIsSolveMode(!isSolveMode)}
                className={`solve-mode-pill ${isSolveMode ? 'mode-solve' : 'mode-manage'}`}
                title={isSolveMode ? "Modo Resolução Ativo" : "Modo Opções Ativo"}
              >
                <span className="lever-indicator" />
                <span className="lever-text">
                  {isSolveMode ? 'Resolução' : 'Opções'}
                </span>
              </button>
            </div>
          )}

          <nav className="header-tabs desktop-only" style={{ marginLeft: 'auto' }}>
            <button
              className={`tab-btn ${activeTab === 'timer' || activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => handleTabChange('timer')}
            >
              <TimerIcon size={18} />
              <span>Cronômetro & Estatísticas</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'algorithms' ? 'active' : ''}`}
              onClick={() => handleTabChange('algorithms')}
            >
              <BookOpen size={18} />
              <span>Algoritmos CFOP</span>
            </button>
          </nav>

          {/* User Account / Auth Button */}
          <div className="auth-header-btn-container" style={{ marginLeft: '12px' }}>
            <button
              onClick={() => setShowAuthModal(true)}
              className={`auth-header-btn ${currentUser ? 'logged-in' : ''}`}
              title={currentUser ? `Conta: ${currentUser.email}` : "Entrar / Sincronizar na Nuvem"}
            >
              {currentUser ? (
                <>
                  <UserIcon size={16} className="text-green" />
                  <span className="user-name-span desktop-only">
                    {currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
                  </span>
                </>
              ) : (
                <>
                  <Cloud size={16} />
                  <span className="desktop-only">Entrar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="app-content">
        {(activeTab === 'timer' || activeTab === 'stats') ? (
          <div className="dashboard-layout">
            
            {/* TIMER VIEW (Shown on desktop always, on mobile only if 'timer' tab) */}
            <div className={`timer-section ${activeTab === 'timer' ? 'mobile-active' : 'mobile-hidden'}`}>
              {!effectivelySolveMode && (
                <div className="fade-in session-bar-wrapper">
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
                </div>
              )}

              <ScrambleDisplay
                scramble={currentScramble}
                cubeState={cubeState}
                onNewScramble={newScramble}
                disabled={!effectivelySolveMode}
              />

              <Timer
                onSolveComplete={handleSolveComplete}
                inspectionEnabled={inspectionEnabled}
                cfopModeEnabled={cfopModeEnabled}
                disabled={!effectivelySolveMode}
              />
            </div>

            {/* STATS VIEW (Shown on desktop always, on mobile only if 'stats' tab) */}
            <div className={`stats-section ${activeTab === 'stats' ? 'mobile-active' : 'mobile-hidden'}`}>
              
              {/* Optional Session Selector duplicate for mobile stats view so user can switch sessions without going back to timer */}
              <div className="mobile-only fade-in session-bar-wrapper" style={{ marginBottom: '8px' }}>
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
              </div>

              <div className="dashboard-grid">
                <div className="sidebar-column">
                  <StatsPanel stats={stats} solves={activeSolves} />
                </div>
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
            </div>

          </div>
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
            onDeleteAlgSolve={(algId: string, solveIndex: number) => {
              if (window.confirm('Excluir esta resolução do histórico?')) {
                setAlgSolves(prev => {
                  const current = prev[algId] || [];
                  const newSolves = [...current];
                  newSolves.splice(solveIndex, 1);
                  return { ...prev, [algId]: newSolves };
                });
              }
            }}
            trainingAlg={trainingAlg}
            onOpenTrainer={handleOpenTrainer}
            onCloseTrainer={handleCloseTrainer}
          />
        )}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-bottom-nav">
        <button className={`bottom-nav-item ${activeTab === 'timer' ? 'active' : ''}`} onClick={() => handleTabChange('timer')}>
          <TimerIcon size={22} />
          <span>Timer</span>
        </button>
        <button className={`bottom-nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleTabChange('stats')}>
          <BarChart2 size={22} />
          <span>Estatísticas</span>
        </button>
        <button className={`bottom-nav-item ${activeTab === 'algorithms' ? 'active' : ''}`} onClick={() => handleTabChange('algorithms')}>
          <BookOpen size={22} />
          <span>Algoritmos</span>
        </button>
      </nav>

      {/* AUTH & CLOUD SYNC MODAL */}
      {showAuthModal && (
        <AuthModal
          user={currentUser}
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={() => {
            if (currentUser) handleUserLoggedIn(currentUser.id);
          }}
          onLogout={() => {
            setCurrentUser(null);
          }}
          totalSolvesCount={solves.length}
          totalSessionsCount={sessions.length}
        />
      )}
    </div>
  );
};

export default App;
