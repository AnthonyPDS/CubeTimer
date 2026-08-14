import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AlgorithmCase } from '../data/cfopAlgorithms';
import { formatTime, calculateMoN, calculateAoN } from '../utils/statsCalculator';
import type { Solve } from '../types';
import confetti from 'canvas-confetti';
import { X, Zap } from 'lucide-react';

interface AlgorithmTrainerModalProps {
  alg: AlgorithmCase | null;
  onClose: () => void;
  solves: number[];
  onSaveSolve: (algId: string, timeMs: number) => void;
}

export const AlgorithmTrainerModal: React.FC<AlgorithmTrainerModalProps> = ({
  alg,
  onClose,
  solves,
  onSaveSolve,
}) => {
  const [timerState, setTimerState] = useState<'idle' | 'holding' | 'ready' | 'running'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [lastTime, setLastTime] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const timerStateRef = useRef<'idle' | 'holding' | 'ready' | 'running'>('idle');

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

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
      <div className="modal-content alg-trainer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-group">
            <Zap size={20} className="text-accent" />
            <h3>Treinador de Velocidade: {alg.name}</h3>
          </div>
          <button onClick={onClose} className="icon-button">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Target Algorithm Moves */}
              <div className="alg-target-box" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="box-label">Algoritmo ({alg.moveCount} movimentos):</span>
                <div className="alg-moves-text" style={{ fontSize: '1.2rem', margin: '8px 0' }}>{alg.moves}</div>
              </div>

              {/* Setup Scramble Box */}
              <div className="alg-setup-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="setup-header">
                  <span className="box-label">Setup Scramble</span>
                </div>
                <div className="setup-text">{alg.setup}</div>
              </div>
            </div>

            {/* Dedicated Algorithm Timer */}
            <div
              className="alg-timer-area"
              style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
              onClick={() => {
                if (timerStateRef.current === 'running') {
                  stopTimer();
                }
              }}
            >
              <div className={timerClass}>{formatTime(elapsedTime)}</div>
              <div className="alg-timer-instruction">{instruction}</div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="alg-stats-row" style={{ marginTop: '0', paddingTop: '0', border: 'none', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
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
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '4px' }}>Histórico ({solves.length} soluções)</h4>
            <div className="trainer-history-list">
              {solves.map((time, idx) => {
                const solveTps = (alg.moveCount / (time / 1000)).toFixed(1);
                return (
                  <div key={idx} className="trainer-history-item">
                    <span>{solves.length - idx}.</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{formatTime(time)}</span>
                    <span className="tps">{solveTps} TPS</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
