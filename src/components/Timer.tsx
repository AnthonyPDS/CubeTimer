import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatTime } from '../utils/statsCalculator';
import type { SolveSplits } from '../types';

export type TimerState = 'idle' | 'inspection' | 'holding' | 'ready' | 'running';
export type Penalty = 'none' | '+2' | 'dnf';
export type CfopPhase = 'cross' | 'f2l' | 'oll' | 'pll' | 'done';

interface TimerProps {
  onSolveComplete: (timeMs: number, penalty?: Penalty, splits?: SolveSplits) => void;
  inspectionEnabled: boolean;
  cfopModeEnabled: boolean;
  disabled?: boolean;
}

export const Timer: React.FC<TimerProps> = ({
  onSolveComplete,
  inspectionEnabled,
  cfopModeEnabled,
  disabled = false,
}) => {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [inspectionDisplay, setInspectionDisplay] = useState<string>('15');

  // CFOP Splits State
  const [cfopPhase, setCfopPhase] = useState<CfopPhase>('cross');
  const [liveSplits, setLiveSplits] = useState<{
    cross: number | null;
    f2l: number | null;
    oll: number | null;
    pll: number | null;
  }>({ cross: null, f2l: null, oll: null, pll: null });

  const startTimeRef = useRef<number | null>(null);
  const phaseStartTimeRef = useRef<number | null>(null);
  const lastCfopPressTimeRef = useRef<number>(0);
  const inspectionStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const inspectionAnimFrameRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);

  const timerStateRef = useRef<TimerState>('idle');
  const isInspectingRef = useRef<boolean>(false);
  const inspectionEnabledRef = useRef<boolean>(inspectionEnabled);
  const cfopModeEnabledRef = useRef<boolean>(cfopModeEnabled);
  const cfopPhaseRef = useRef<CfopPhase>('cross');
  const currentPenaltyRef = useRef<Penalty>('none');
  const recordedSplitsRef = useRef<{
    cross: number;
    f2l: number;
    oll: number;
    pll: number;
  }>({ cross: 0, f2l: 0, oll: 0, pll: 0 });

  // Sync refs
  useEffect(() => { timerStateRef.current = timerState; }, [timerState]);
  useEffect(() => { isInspectingRef.current = isInspecting; }, [isInspecting]);
  useEffect(() => { cfopPhaseRef.current = cfopPhase; }, [cfopPhase]);
  useEffect(() => {
    inspectionEnabledRef.current = inspectionEnabled;
    if (!inspectionEnabled && isInspectingRef.current) {
      stopInspection();
      setTimerState('idle');
    }
  }, [inspectionEnabled]);
  useEffect(() => { cfopModeEnabledRef.current = cfopModeEnabled; }, [cfopModeEnabled]);

  // Update solve timer display while running
  const updateSolveTimer = useCallback(() => {
    if (startTimeRef.current !== null) {
      const now = performance.now();
      const currentElapsed = Math.round(now - startTimeRef.current);
      setElapsedTime(currentElapsed);
      animFrameRef.current = requestAnimationFrame(updateSolveTimer);
    }
  }, []);

  // Update inspection timer countdown continuously
  const updateInspectionTimer = useCallback(() => {
    if (inspectionStartTimeRef.current !== null && isInspectingRef.current) {
      const now = performance.now();
      const elapsedMs = now - inspectionStartTimeRef.current;
      const remainingSec = Math.ceil((15000 - elapsedMs) / 1000);

      if (remainingSec > 0) {
        setInspectionDisplay(`${remainingSec}`);
        currentPenaltyRef.current = 'none';
      } else if (elapsedMs <= 17000) {
        setInspectionDisplay('+2');
        currentPenaltyRef.current = '+2';
      } else {
        setInspectionDisplay('DNF');
        currentPenaltyRef.current = 'dnf';
      }

      inspectionAnimFrameRef.current = requestAnimationFrame(updateInspectionTimer);
    }
  }, []);

  const stopInspection = useCallback(() => {
    if (inspectionAnimFrameRef.current !== null) {
      cancelAnimationFrame(inspectionAnimFrameRef.current);
      inspectionAnimFrameRef.current = null;
    }
    inspectionStartTimeRef.current = null;
    setIsInspecting(false);
    isInspectingRef.current = false;
  }, []);

  const startInspection = useCallback(() => {
    stopInspection();
    setIsInspecting(true);
    isInspectingRef.current = true;
    inspectionStartTimeRef.current = performance.now();
    currentPenaltyRef.current = 'none';
    setInspectionDisplay('15');
    setTimerState('inspection');
    inspectionAnimFrameRef.current = requestAnimationFrame(updateInspectionTimer);
  }, [stopInspection, updateInspectionTimer]);

  // Start timing solve
  const startSolveTimer = useCallback(() => {
    stopInspection();
    const now = performance.now();
    startTimeRef.current = now;
    phaseStartTimeRef.current = now;

    if (cfopModeEnabledRef.current) {
      setCfopPhase('cross');
      cfopPhaseRef.current = 'cross';
      setLiveSplits({ cross: null, f2l: null, oll: null, pll: null });
      recordedSplitsRef.current = { cross: 0, f2l: 0, oll: 0, pll: 0 };
    }

    setTimerState('running');
    animFrameRef.current = requestAnimationFrame(updateSolveTimer);
  }, [stopInspection, updateSolveTimer]);

  // Finish solve
  const finishSolve = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (startTimeRef.current !== null) {
      const finalTime = Math.round(performance.now() - startTimeRef.current);
      setElapsedTime(finalTime);
      startTimeRef.current = null;

      const penalty = currentPenaltyRef.current;
      const isCfop = cfopModeEnabledRef.current;
      const splitsToSend = isCfop ? { ...recordedSplitsRef.current } : undefined;

      setTimerState('idle');
      currentPenaltyRef.current = 'none';

      onSolveComplete(finalTime, penalty, splitsToSend);
    }
  }, [onSolveComplete]);

  // Handle Spacebar / Input press while running
  const handleRunningKeyPress = useCallback(() => {
    if (!cfopModeEnabledRef.current) {
      // Standard solve: stop timer immediately
      finishSolve();
      return;
    }

    // CFOP Mode: Step transitions
    const now = performance.now();
    
    // Debounce of 500ms to prevent accidental double clicks triggering two phases
    if (now - lastCfopPressTimeRef.current < 500) {
      return;
    }
    lastCfopPressTimeRef.current = now;

    const phaseStart = phaseStartTimeRef.current || now;
    const stepDuration = Math.round(now - phaseStart);
    phaseStartTimeRef.current = now;

    const currentPhase = cfopPhaseRef.current;

    if (currentPhase === 'cross') {
      recordedSplitsRef.current.cross = stepDuration;
      setLiveSplits((prev) => ({ ...prev, cross: stepDuration }));
      setCfopPhase('f2l');
      cfopPhaseRef.current = 'f2l';
    } else if (currentPhase === 'f2l') {
      recordedSplitsRef.current.f2l = stepDuration;
      setLiveSplits((prev) => ({ ...prev, f2l: stepDuration }));
      setCfopPhase('oll');
      cfopPhaseRef.current = 'oll';
    } else if (currentPhase === 'oll') {
      recordedSplitsRef.current.oll = stepDuration;
      setLiveSplits((prev) => ({ ...prev, oll: stepDuration }));
      setCfopPhase('pll');
      cfopPhaseRef.current = 'pll';
    } else if (currentPhase === 'pll') {
      recordedSplitsRef.current.pll = stepDuration;
      setLiveSplits((prev) => ({ ...prev, pll: stepDuration }));
      setCfopPhase('done');
      cfopPhaseRef.current = 'done';
      // 4th step completed: Finish solve!
      finishSolve();
    }
  }, [finishSolve]);

  // Keyboard Handlers
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const state = timerStateRef.current;

      // If timer is running, spacebar or any key transitions step or stops timer
      if (state === 'running') {
        if (e.repeat) return;
        handleRunningKeyPress();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;

        if (state === 'idle') {
          if (inspectionEnabledRef.current) {
            startInspection();
          } else {
            setTimerState('holding');
            if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = window.setTimeout(() => {
              setTimerState('ready');
            }, 300);
          }
        } else if (state === 'inspection') {
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
          startSolveTimer();
        } else if (state === 'holding') {
          if (isInspectingRef.current) {
            setTimerState('inspection');
          } else {
            setTimerState('idle');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, handleRunningKeyPress, startInspection, startSolveTimer]);

  // Touch Handlers for Mobile Support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();

    const state = timerStateRef.current;

    if (state === 'running') {
      handleRunningKeyPress();
      return;
    }

    if (state === 'idle') {
      if (inspectionEnabledRef.current) {
        startInspection();
      } else {
        setTimerState('holding');
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = window.setTimeout(() => {
          setTimerState('ready');
        }, 300);
      }
    } else if (state === 'inspection') {
      setTimerState('holding');
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = window.setTimeout(() => {
        setTimerState('ready');
      }, 300);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();

    const state = timerStateRef.current;

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (state === 'ready') {
      startSolveTimer();
    } else if (state === 'holding') {
      if (isInspectingRef.current) {
        setTimerState('inspection');
      } else {
        setTimerState('idle');
      }
    }
  };

  // Determine display styling and instruction text
  let timerClass = 'timer-display';
  let displayContent = formatTime(elapsedTime);
  let instructionText = 'Pressione a BARRA DE ESPAÇO ou toque na tela para iniciar';

  if (inspectionEnabled && timerState === 'idle') {
    instructionText = 'PRESSIONE A BARRA DE ESPAÇO PARA INICIAR A INSPEÇÃO (15s)';
  }

  if (isInspecting) {
    displayContent = inspectionDisplay;

    if (timerState === 'holding') {
      timerClass += ' holding';
      instructionText = 'MANTENHA PRESSIONADO... (Inspeção continua)';
    } else if (timerState === 'ready') {
      timerClass += ' ready';
      instructionText = 'PRONTO! SOLTE A BARRA DE ESPAÇO PARA INICIAR A RESOLUÇÃO';
    } else {
      timerClass += ' inspection';
      instructionText = 'INSPEÇÃO EM ANDAMENTO... Segure a barra de espaço para preparar';
    }
  } else {
    if (timerState === 'holding') {
      timerClass += ' holding';
      instructionText = 'MANTENHA PRESSIONADO...';
    } else if (timerState === 'ready') {
      timerClass += ' ready';
      instructionText = 'PRONTO! SOLTE PARA INICIAR';
    } else if (timerState === 'running') {
      timerClass += ' running';
      if (cfopModeEnabled) {
        if (cfopPhase === 'cross') instructionText = 'Etapa 1/4: CRUZ - Pressione ESPAÇO para finalizar a Cruz e ir para F2L';
        else if (cfopPhase === 'f2l') instructionText = 'Etapa 2/4: F2L - Pressione ESPAÇO para finalizar o F2L e ir para OLL';
        else if (cfopPhase === 'oll') instructionText = 'Etapa 3/4: OLL - Pressione ESPAÇO para finalizar o OLL e ir para PLL';
        else if (cfopPhase === 'pll') instructionText = 'Etapa 4/4: PLL - Pressione ESPAÇO para FINALIZAR a resolução';
      } else {
        instructionText = 'PRESSIONE QUALQUER TECLA PARA PARAR';
      }
    }
  }

  return (
    <div
      className="timer-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (timerStateRef.current === 'running') {
          handleRunningKeyPress();
        }
      }}
    >
      {/* Live CFOP Phase Badges Bar during solve or idle in CFOP mode */}
      {cfopModeEnabled && (
        <div className="cfop-splits-bar">
          <div className={`cfop-step-badge ${cfopPhase === 'cross' && timerState === 'running' ? 'active' : ''} ${liveSplits.cross !== null ? 'done' : ''}`}>
            <span className="step-name">Cruz</span>
            <span className="step-time">{liveSplits.cross ? formatTime(liveSplits.cross) : '...'}</span>
          </div>
          <div className={`cfop-step-badge ${cfopPhase === 'f2l' && timerState === 'running' ? 'active' : ''} ${liveSplits.f2l !== null ? 'done' : ''}`}>
            <span className="step-name">F2L</span>
            <span className="step-time">{liveSplits.f2l ? formatTime(liveSplits.f2l) : '...'}</span>
          </div>
          <div className={`cfop-step-badge ${cfopPhase === 'oll' && timerState === 'running' ? 'active' : ''} ${liveSplits.oll !== null ? 'done' : ''}`}>
            <span className="step-name">OLL</span>
            <span className="step-time">{liveSplits.oll ? formatTime(liveSplits.oll) : '...'}</span>
          </div>
          <div className={`cfop-step-badge ${cfopPhase === 'pll' && timerState === 'running' ? 'active' : ''} ${liveSplits.pll !== null ? 'done' : ''}`}>
            <span className="step-name">PLL</span>
            <span className="step-time">{liveSplits.pll ? formatTime(liveSplits.pll) : '...'}</span>
          </div>
        </div>
      )}

      <div className={timerClass}>{displayContent}</div>
      <div className="timer-instruction">{instructionText}</div>
    </div>
  );
};
