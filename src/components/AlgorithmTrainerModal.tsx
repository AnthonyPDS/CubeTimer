import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AlgorithmCase } from '../data/cfopAlgorithms';
import { formatTime, calculateMoN, calculateAoN } from '../utils/statsCalculator';
import type { Solve } from '../types';
import confetti from 'canvas-confetti';
import { X, Zap, RotateCcw, SkipBack, Pause, Play, SkipForward } from 'lucide-react';
import 'cubing/twisty';

interface AlgorithmTrainerModalProps {
  alg: AlgorithmCase | null;
  onClose: () => void;
  solves: number[];
  onSaveSolve: (algId: string, timeMs: number) => void;
  onDeleteSolve: (algId: string, solveIndex: number) => void;
}

export const AlgorithmTrainerModal: React.FC<AlgorithmTrainerModalProps> = ({
  alg,
  onClose,
  solves,
  onSaveSolve,
  onDeleteSolve,
}) => {
  const [timerState, setTimerState] = useState<'idle' | 'holding' | 'ready' | 'running'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [isTrainerSolveMode, setIsTrainerSolveMode] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const timerStateRef = useRef<'idle' | 'holding' | 'ready' | 'running'>('idle');

  const playerRef = useRef<any>(null);

  // Programmatic algorithm inverter to calculate the mathematically correct setup scramble (100% error-proof)
  const invertAlgorithm = useCallback((movesStr: string): string => {
    const cleanStr = movesStr.replace(/[()\[\]]/g, ' ');
    const moves = cleanStr.split(/\s+/).filter(Boolean);
    const inverted = moves.map(move => {
      // Rotation conversions
      if (move === 'x') return "x'";
      if (move === "x'") return 'x';
      if (move === 'y') return "y'";
      if (move === "y'") return 'y';
      if (move === 'z') return "z'";
      if (move === "z'") return 'z';
      if (move === 'x2' || move === 'y2' || move === 'z2') return move;

      // Normal moves
      if (move.endsWith("'")) {
        return move.slice(0, -1);
      }
      if (move.endsWith('2')) {
        return move;
      }
      return move + "'";
    });
    return inverted.reverse().join(' ');
  }, []);

  let safeSetup = '';
  if (alg) {
    safeSetup = invertAlgorithm(alg.moves);
  }

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  // Synchronize properties directly to the DOM element to bypass React 19 / kebab-case property mapping issues
  useEffect(() => {
    if (playerRef.current && alg) {
      playerRef.current.alg = alg.moves;
      playerRef.current.experimentalSetupAlg = 'z2 ' + safeSetup;
      playerRef.current.controlPanel = 'none';
      playerRef.current.background = 'none';
      
      // Gray out irrelevant pieces for F2L cases in 3D
      if (alg.category === 'F2L') {
        playerRef.current.experimentalStickering = 'full';
        playerRef.current.experimentalStickeringMaskOrbits = "CORNERS:----IIII,EDGES:----IIII----";
      } else {
        playerRef.current.experimentalStickering = 'full';
        playerRef.current.experimentalStickeringMaskOrbits = null;
      }
    }
  }, [alg, safeSetup]);

  const updateTimer = useCallback(() => {
    if (startTimeRef.current !== null) {
      const now = performance.now();
      const current = Math.round(now - startTimeRef.current);
      setElapsedTime(current);
      animFrameRef.current = requestAnimationFrame(updateTimer);
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    setTimerState('running');
    animFrameRef.current = requestAnimationFrame(updateTimer);
  }, [updateTimer]);

  const stopTimer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (startTimeRef.current !== null && alg) {
      const finalMs = Math.round(performance.now() - startTimeRef.current);
      setElapsedTime(finalMs);
      setLastTime(finalMs);
      startTimeRef.current = null;
      setTimerState('idle');

      onSaveSolve(alg.id, finalMs);

      const pb = solves.length > 0 ? Math.min(...solves) : null;
      if (pb === null || finalMs < pb) {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    }
  }, [alg, solves, onSaveSolve]);

  // Keyboard Handlers
  useEffect(() => {
    if (!alg) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const state = timerStateRef.current;

      if (state === 'running') {
        stopTimer();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;

        if (state === 'idle') {
          setTimerState('holding');
          if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = window.setTimeout(() => {
            setTimerState('ready');
          }, 300);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const state = timerStateRef.current;

        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }

        if (state === 'ready') {
          startTimer();
        } else if (state === 'holding') {
          setTimerState('idle');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [alg, startTimer, stopTimer]);

  // Touch Handlers for Mobile Timer
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Prevent default to avoid selection/scrolling, but ONLY if it's a touch event to avoid breaking clicks
    if (e.type === 'touchstart' && e.cancelable) e.preventDefault(); 
    
    const state = timerStateRef.current;
    if (state === 'running') {
      stopTimer();
      return;
    }
    if (state === 'idle') {
      setTimerState('holding');
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = window.setTimeout(() => {
        setTimerState('ready');
      }, 300);
    }
  }, [stopTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'touchend' && e.cancelable) e.preventDefault();
    
    const state = timerStateRef.current;
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (state === 'ready') {
      startTimer();
    } else if (state === 'holding') {
      setTimerState('idle');
    }
  }, [startTimer]);

  // Long-press deletion logic
  const longPressTimeoutRef = useRef<number | null>(null);
  const startLongPress = (idx: number) => {
    longPressTimeoutRef.current = window.setTimeout(() => {
      if (alg) {
        onDeleteSolve(alg.id, idx);
      }
    }, 600); // 600ms hold
  };
  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  if (!alg) return null;

  // Calculate TPS (Turns Per Second)
  const currentTps = lastTime && lastTime > 0
    ? (alg.moveCount / (lastTime / 1000)).toFixed(1)
    : null;

  // Compute stats
  const pb = solves.length > 0 ? Math.min(...solves) : null;
  const dummySolves: Solve[] = solves.map((time, idx) => ({
    id: String(idx),
    time,
    rawTime: time,
    penalty: 'none',
    timestamp: 0,
    sessionId: '',
    scramble: ''
  }));

  const md3 = calculateMoN(dummySolves, 3);
  const md5 = calculateAoN(dummySolves, 5);
  const md12 = calculateAoN(dummySolves, 12);
  const md100 = calculateAoN(dummySolves, 100);

  let timerClass = 'alg-timer-display';
  let instruction = '';

  if (timerState === 'holding') {
    timerClass += ' holding';
    instruction = 'MANTENHA PRESSIONADO...';
  } else if (timerState === 'ready') {
    timerClass += ' ready';
    instruction = 'PRONTO! SOLTE PARA INICIAR A EXECUÇÃO';
  } else if (timerState === 'running') {
    timerClass += ' running';
    instruction = 'PRESSIONE QUALQUER TECLA PARA PARAR';
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-content alg-trainer-modal ${isTrainerSolveMode ? 'solve-mode-active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-group" style={{ flex: 1 }}>
            <Zap size={20} className="text-accent" />
            <h3 style={{ fontSize: '1rem' }}>Treinador: {alg.name}</h3>
          </div>

          <div className="solve-mode-lever-container mobile-only" style={{ marginRight: '12px' }}>
            <button
              onClick={() => setIsTrainerSolveMode(!isTrainerSolveMode)}
              className={`solve-mode-pill ${isTrainerSolveMode ? 'mode-solve' : 'mode-manage'}`}
              title="Alternar Modo Foco"
              style={{ padding: '4px 10px' }}
            >
              <span className="lever-indicator" />
              <span className="lever-text">Foco</span>
            </button>
          </div>

          <button onClick={onClose} className="icon-button">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="trainer-main-layout">
            {/* Column 1: 3D Cube Player & Controls */}
            <div className="trainer-cube-column">
              <div className="trainer-cube-box">
                {React.createElement('twisty-player', {
                  ref: playerRef,
                  style: { width: '100%', height: '100%' }
                })}
              </div>
              
              {/* Custom twisty player control bar */}
              <div className="trainer-cube-controls">
                <button 
                  onClick={() => { 
                    if (playerRef.current) {
                      if (playerRef.current.controller) {
                        playerRef.current.controller.jumpToStart({ flash: true });
                      } else {
                        playerRef.current.timestamp = 0;
                      }
                    }
                  }} 
                  title="Início" 
                  className="trainer-cube-ctrl-btn"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  onClick={() => { 
                    if (playerRef.current && playerRef.current.controller && playerRef.current.controller.animationController) {
                      playerRef.current.controller.animationController.play({ direction: -1, untilBoundary: 'move' });
                    }
                  }} 
                  title="Voltar" 
                  className="trainer-cube-ctrl-btn"
                >
                  <SkipBack size={16} />
                </button>
                <button 
                  onClick={() => { if (playerRef.current) playerRef.current.pause(); }} 
                  title="Pausar" 
                  className="trainer-cube-ctrl-btn"
                >
                  <Pause size={16} />
                </button>
                <button 
                  onClick={() => { if (playerRef.current) playerRef.current.play(); }} 
                  title="Play" 
                  className="trainer-cube-play-btn"
                >
                  <Play size={16} fill="currentColor" />
                </button>
                <button 
                  onClick={() => { 
                    if (playerRef.current && playerRef.current.controller && playerRef.current.controller.animationController) {
                      playerRef.current.controller.animationController.play({ direction: 1, untilBoundary: 'move' });
                    }
                  }} 
                  title="Avançar" 
                  className="trainer-cube-ctrl-btn"
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </div>

            {/* Column 2: Algorithm Moves and Scramble info */}
            <div className="trainer-info-column">
              {/* Target Algorithm Moves */}
              <div className="alg-target-box">
                <span className="box-label">Algoritmo ({alg.moveCount} movimentos):</span>
                <div className="alg-moves-text">{alg.moves}</div>
              </div>

              {/* Setup Scramble Box */}
              <div className="alg-setup-box">
                <div className="setup-header">
                  <span className="box-label">Setup Scramble</span>
                </div>
                <div className="setup-text">{alg.setup}</div>
              </div>
            </div>

            {/* Column 3: Dedicated Algorithm Timer */}
            <div
              className="alg-timer-area"
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div className={timerClass}>{formatTime(elapsedTime)}</div>
              <div className="alg-timer-instruction">{instruction}</div>
            </div>
          </div>

          {/* Performance Stats & History (Hidden in Solve Mode) */}
          {!isTrainerSolveMode && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="trainer-stats-5col">
                <div className="alg-stat-card highlight">
                  <span className="label">PB</span>
                  <span className="value text-green">{formatTime(pb)}</span>
                </div>
                <div className="alg-stat-card">
                  <span className="label">md3</span>
                  <span className="value">{formatTime(md3)}</span>
                </div>
                <div className="alg-stat-card">
                  <span className="label">md5</span>
                  <span className="value">{formatTime(md5)}</span>
                </div>
                <div className="alg-stat-card">
                  <span className="label">md12</span>
                  <span className="value">{formatTime(md12)}</span>
                </div>
                <div className="alg-stat-card">
                  <span className="label">md100</span>
                  <span className="value">{formatTime(md100)}</span>
                </div>
              </div>

              <div className="trainer-stats-2col">
                 <div className="alg-stat-card">
                   <span className="label">Último Tempo</span>
                   <span className="value">{formatTime(lastTime)}</span>
                 </div>
                 <div className="alg-stat-card text-right">
                   <span className="label">Velocidade (TPS)</span>
                   <span className="value text-accent">{currentTps ? `${currentTps} TPS` : '-'}</span>
                 </div>
              </div>

              {/* History */}
              <div className="trainer-history">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Histórico ({solves.length} soluções)</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Segure no tempo para excluir</span>
                </div>
                <div className="trainer-history-list">
                  {solves.map((time, idx) => {
                    const solveTps = (alg.moveCount / (time / 1000)).toFixed(1);
                    return (
                      <div 
                        key={idx} 
                        className="trainer-history-item"
                        style={{ cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
                        onTouchStart={() => startLongPress(idx)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onMouseDown={() => startLongPress(idx)}
                        onMouseUp={cancelLongPress}
                        onMouseLeave={cancelLongPress}
                      >
                        <span>{solves.length - idx}.</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{formatTime(time)}</span>
                        <span className="tps">{solveTps} TPS</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
