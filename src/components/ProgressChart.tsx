import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Solve } from '../types';
import { calculateAoN } from '../utils/statsCalculator';
import { TrendingUp, Layers } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProgressChartProps {
  solves: Solve[];
}

export type ChartTab = 'geral' | 'cfop-all' | 'cross' | 'f2l' | 'oll' | 'pll';

export const ProgressChart: React.FC<ProgressChartProps> = ({ solves }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('geral');

  if (solves.length < 2) {
    return (
      <div className="chart-placeholder">
        <TrendingUp size={28} className="text-muted" />
        <p>Faça pelo menos 2 resoluções para visualizar o gráfico de evolução.</p>
      </div>
    );
  }

  const hasCfopSolves = solves.some((s) => s.splits);

  const labels = solves.map((_, index) => `#${index + 1}`);

  // Base Data
  const singleData = solves.map((s) => (s.penalty === 'dnf' ? null : s.time / 1000));

  const ao5Data = solves.map((_, index) => {
    const window = solves.slice(0, index + 1);
    const ao5 = calculateAoN(window, 5);
    return ao5 !== null && ao5 !== Infinity ? ao5 / 1000 : null;
  });

  const ao12Data = solves.map((_, index) => {
    const window = solves.slice(0, index + 1);
    const ao12 = calculateAoN(window, 12);
    return ao12 !== null && ao12 !== Infinity ? ao12 / 1000 : null;
  });

  // CFOP Splits Data
  const getStepData = (step: 'cross' | 'f2l' | 'oll' | 'pll') => {
    return solves.map((s) => (s.splits && s.penalty !== 'dnf' ? s.splits[step] / 1000 : null));
  };

  const crossData = getStepData('cross');
  const f2lData = getStepData('f2l');
  const ollData = getStepData('oll');
  const pllData = getStepData('pll');

  // Build dataset based on active tab
  let datasets: any[] = [];

  if (activeTab === 'geral') {
    datasets = [
      {
        label: 'Single (s)',
        data: singleData,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.04)',
        borderWidth: 1.2,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        order: 3, // Camada do fundo (geral)
      },
      {
        label: 'ao5 (s)',
        data: ao5Data,
        borderColor: '#f43f5e', // Rosa / Coral Vibrante
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 2, // Por cima do geral, abaixo do ao12
      },
      {
        label: 'ao12 (s)',
        data: ao12Data,
        borderColor: '#eab308', // Amarelo Dourado
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 1, // Na frente de todos (topo)
      },
    ];
  } else if (activeTab === 'cfop-all') {
    datasets = [
      {
        label: 'Cruz (s)',
        data: crossData,
        borderColor: '#3b82f6',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'F2L (s)',
        data: f2lData,
        borderColor: '#10b981',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'OLL (s)',
        data: ollData,
        borderColor: '#f59e0b',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'PLL (s)',
        data: pllData,
        borderColor: '#ef4444',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ];
  } else if (activeTab === 'cross') {
    datasets = [
      {
        label: 'Tempo da Cruz (s)',
        data: crossData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
      },
    ];
  } else if (activeTab === 'f2l') {
    datasets = [
      {
        label: 'Tempo do F2L (s)',
        data: f2lData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
      },
    ];
  } else if (activeTab === 'oll') {
    datasets = [
      {
        label: 'Tempo do OLL (s)',
        data: ollData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
      },
    ];
  } else if (activeTab === 'pll') {
    datasets = [
      {
        label: 'Tempo do PLL (s)',
        data: pllData,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
      },
    ];
  }

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const val = context.parsed.y;
            if (val === null) return `${context.dataset.label}: -`;
            return `${context.dataset.label}: ${val.toFixed(2)}s`;
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 5,
        hitRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        title: {
          display: true,
          text: 'Segundos',
          color: '#64748b',
          font: { family: 'Inter', size: 11 },
        },
      },
    },
  };

  return (
    <div className="progress-chart-container">
      <div className="chart-header-row">
        <div className="chart-header">
          <TrendingUp size={18} />
          <h2>Evolução dos Tempos</h2>
        </div>

        {/* Tab Buttons for Chart Filtering */}
        <div className="chart-tabs">
          <button
            onClick={() => setActiveTab('geral')}
            className={`tab-btn ${activeTab === 'geral' ? 'active' : ''}`}
          >
            Geral
          </button>
          {hasCfopSolves && (
            <>
              <button
                onClick={() => setActiveTab('cfop-all')}
                className={`tab-btn ${activeTab === 'cfop-all' ? 'active' : ''}`}
                title="Comparativo de todas as etapas CFOP"
              >
                <Layers size={12} /> CFOP Todas
              </button>
              <button
                onClick={() => setActiveTab('cross')}
                className={`tab-btn ${activeTab === 'cross' ? 'active' : ''}`}
              >
                Cruz
              </button>
              <button
                onClick={() => setActiveTab('f2l')}
                className={`tab-btn ${activeTab === 'f2l' ? 'active' : ''}`}
              >
                F2L
              </button>
              <button
                onClick={() => setActiveTab('oll')}
                className={`tab-btn ${activeTab === 'oll' ? 'active' : ''}`}
              >
                OLL
              </button>
              <button
                onClick={() => setActiveTab('pll')}
                className={`tab-btn ${activeTab === 'pll' ? 'active' : ''}`}
              >
                PLL
              </button>
            </>
          )}
        </div>
      </div>

      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
