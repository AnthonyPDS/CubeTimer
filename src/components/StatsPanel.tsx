import React from 'react';
import type { StatsSummary, Solve } from '../types';
import { formatTime } from '../utils/statsCalculator';
import { Trophy, Hash, Zap, Layers } from 'lucide-react';

interface StatsPanelProps {
  stats: StatsSummary;
  solves: Solve[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, solves }) => {
  // Compute CFOP step averages if solves with splits exist
  const cfopSolves = solves.filter((s) => s.splits && s.penalty !== 'dnf');

  const getStepStats = (stepName: 'cross' | 'f2l' | 'oll' | 'pll') => {
    if (cfopSolves.length === 0) return { mean: null, best: null };
    const times = cfopSolves.map((s) => s.splits![stepName]).filter((t) => t > 0);
    if (times.length === 0) return { mean: null, best: null };

    const sum = times.reduce((a, b) => a + b, 0);
    const mean = Math.round(sum / times.length);
    const best = Math.min(...times);
    return { mean, best };
  };

  const crossStats = getStepStats('cross');
  const f2lStats = getStepStats('f2l');
  const ollStats = getStepStats('oll');
  const pllStats = getStepStats('pll');

  return (
    <div className="stats-panel">
      <div className="panel-header">
        <Trophy size={18} className="text-accent" />
        <h2>Estatísticas WCA</h2>
      </div>

      <div className="stats-grid-cards">
        <div className="stat-card highlight">
          <div className="stat-label">Melhor Single (PB)</div>
          <div className="stat-value pb">{formatTime(stats.bestSingle)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Média da Sessão</div>
          <div className="stat-value">{formatTime(stats.mean)}</div>
        </div>
      </div>

      <table className="stats-table">
        <thead>
          <tr>
            <th>Média</th>
            <th>Atual</th>
            <th>Melhor (PB)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="stat-name">
              <Zap size={14} className="inline-icon" /> Single
            </td>
            <td>{formatTime(stats.worstSingle ? stats.worstSingle : null)}</td>
            <td className="text-green font-bold">{formatTime(stats.bestSingle)}</td>
          </tr>
          <tr>
            <td className="stat-name">mo3</td>
            <td>{stats.currentMo3 === Infinity ? 'DNF' : formatTime(stats.currentMo3)}</td>
            <td>{formatTime(stats.bestMo3)}</td>
          </tr>
          <tr>
            <td className="stat-name">ao5</td>
            <td>{stats.currentAo5 === Infinity ? 'DNF' : formatTime(stats.currentAo5)}</td>
            <td className="text-green font-bold">{formatTime(stats.bestAo5)}</td>
          </tr>
          <tr>
            <td className="stat-name">ao12</td>
            <td>{stats.currentAo12 === Infinity ? 'DNF' : formatTime(stats.currentAo12)}</td>
            <td className="text-green font-bold">{formatTime(stats.bestAo12)}</td>
          </tr>
          <tr>
            <td className="stat-name">ao100</td>
            <td>{stats.currentAo100 === Infinity ? 'DNF' : formatTime(stats.currentAo100)}</td>
            <td className="text-green font-bold">{formatTime(stats.bestAo100)}</td>
          </tr>
        </tbody>
      </table>

      {/* CFOP Step Averages Table */}
      {cfopSolves.length > 0 && (
        <div className="cfop-stats-section mt-4">
          <div className="panel-sub-header">
            <Layers size={16} className="text-accent" />
            <h3>Médias das Etapas (CFOP)</h3>
          </div>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Média</th>
                <th>Melhor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="stat-name">Cruz</td>
                <td>{formatTime(crossStats.mean)}</td>
                <td className="text-green font-bold">{formatTime(crossStats.best)}</td>
              </tr>
              <tr>
                <td className="stat-name">F2L</td>
                <td>{formatTime(f2lStats.mean)}</td>
                <td className="text-green font-bold">{formatTime(f2lStats.best)}</td>
              </tr>
              <tr>
                <td className="stat-name">OLL</td>
                <td>{formatTime(ollStats.mean)}</td>
                <td className="text-green font-bold">{formatTime(ollStats.best)}</td>
              </tr>
              <tr>
                <td className="stat-name">PLL</td>
                <td>{formatTime(pllStats.mean)}</td>
                <td className="text-green font-bold">{formatTime(pllStats.best)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="stats-footer">
        <Hash size={14} /> Total de Solução(ões): <strong>{stats.count}</strong>
      </div>
    </div>
  );
};
