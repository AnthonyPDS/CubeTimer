import React, { useState } from 'react';
import type { Solve } from '../types';
import { formatTime } from '../utils/statsCalculator';
import { Trash2, Info, History, X, Layers } from 'lucide-react';

interface SolvesHistoryProps {
  solves: Solve[];
  onTogglePenalty: (solveId: string, penalty: 'none' | '+2' | 'dnf') => void;
  onDeleteSolve: (solveId: string) => void;
  onClearSolves: () => void;
  bestSingleTime: number | null;
}

export const SolvesHistory: React.FC<SolvesHistoryProps> = ({
  solves,
  onTogglePenalty,
  onDeleteSolve,
  onClearSolves,
  bestSingleTime,
}) => {
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null);

  if (solves.length === 0) {
    return (
      <div className="solves-history empty">
        <History size={32} className="text-muted" />
        <p>Nenhuma resolução registrada nesta sessão ainda.</p>
        <span>Pressione a barra de espaço para fazer o primeiro tempo!</span>
      </div>
    );
  }

  return (
    <div className="solves-history">
      <div className="history-header">
        <div className="header-title">
          <History size={18} />
          <h2>Histórico ({solves.length})</h2>
        </div>
        <button onClick={onClearSolves} className="danger-button-sm" title="Limpar todas as resoluções da sessão">
          <Trash2 size={14} /> Limpar
        </button>
      </div>

      <div className="table-responsive">
        <table className="solves-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tempo</th>
              <th>Scramble</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {[...solves].reverse().map((solve, index) => {
              const displayIndex = solves.length - index;
              const isPB = bestSingleTime !== null && solve.penalty !== 'dnf' && solve.time === bestSingleTime;

              return (
                <tr key={solve.id} className={isPB ? 'pb-row' : ''}>
                  <td className="index-col">#{displayIndex}</td>
                  <td className="time-col">
                    <span className={`time-badge ${isPB ? 'pb-badge' : ''}`}>
                      {formatTime(solve.time, solve.penalty)}
                    </span>
                    {solve.splits && (
                      <span className="badge-cfop-sm" title="Resolução com medição de etapas CFOP">
                        CFOP
                      </span>
                    )}
                  </td>
                  <td
                    className="scramble-col truncate"
                    onClick={() => setSelectedSolve(solve)}
                    title="Clique para ver detalhes"
                  >
                    {solve.scramble}
                  </td>
                  <td className="actions-col text-right">
                    <button
                      onClick={() =>
                        onTogglePenalty(solve.id, solve.penalty === '+2' ? 'none' : '+2')
                      }
                      className={`btn-tag ${solve.penalty === '+2' ? 'active-warning' : ''}`}
                      title="Adicionar/remover penalidade de +2s"
                    >
                      +2
                    </button>
                    <button
                      onClick={() =>
                        onTogglePenalty(solve.id, solve.penalty === 'dnf' ? 'none' : 'dnf')
                      }
                      className={`btn-tag ${solve.penalty === 'dnf' ? 'active-danger' : ''}`}
                      title="Marcar/desmarcar DNF (Did Not Finish)"
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => setSelectedSolve(solve)}
                      className="icon-button-sm"
                      title="Ver detalhes"
                    >
                      <Info size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteSolve(solve.id)}
                      className="icon-button-sm danger"
                      title="Excluir tempo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal for solve details */}
      {selectedSolve && (
        <div className="modal-backdrop" onClick={() => setSelectedSolve(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes da Resolução</h3>
              <button onClick={() => setSelectedSolve(null)} className="icon-button">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-item">
                <span className="label">Tempo Final:</span>
                <span className="value time">{formatTime(selectedSolve.time, selectedSolve.penalty)}</span>
              </div>

              {/* CFOP Splits Breakdown Card */}
              {selectedSolve.splits && (
                <div className="cfop-detail-card">
                  <div className="cfop-detail-title">
                    <Layers size={16} className="text-accent" />
                    <span>Divisão de Etapas (CFOP)</span>
                  </div>
                  <div className="cfop-splits-grid">
                    <div className="cfop-split-item">
                      <span className="split-label">Cruz</span>
                      <span className="split-val">{formatTime(selectedSolve.splits.cross)}</span>
                      <span className="split-pct">
                        {((selectedSolve.splits.cross / selectedSolve.rawTime) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="cfop-split-item">
                      <span className="split-label">F2L</span>
                      <span className="split-val">{formatTime(selectedSolve.splits.f2l)}</span>
                      <span className="split-pct">
                        {((selectedSolve.splits.f2l / selectedSolve.rawTime) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="cfop-split-item">
                      <span className="split-label">OLL</span>
                      <span className="split-val">{formatTime(selectedSolve.splits.oll)}</span>
                      <span className="split-pct">
                        {((selectedSolve.splits.oll / selectedSolve.rawTime) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="cfop-split-item">
                      <span className="split-label">PLL</span>
                      <span className="split-val">{formatTime(selectedSolve.splits.pll)}</span>
                      <span className="split-pct">
                        {((selectedSolve.splits.pll / selectedSolve.rawTime) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="detail-item">
                <span className="label">Data/Hora:</span>
                <span className="value">{new Date(selectedSolve.timestamp).toLocaleString('pt-BR')}</span>
              </div>
              <div className="detail-item">
                <span className="label">Embaralhamento (Scramble):</span>
                <div className="value scramble-box">{selectedSolve.scramble}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
