import React, { useState, useMemo } from 'react';
import {
  ALL_ALGORITHMS,
  PLL_ALGORITHMS,
  OLL_ALGORITHMS,
  F2L_ALGORITHMS,
} from '../data/cfopAlgorithms';
import type { AlgorithmCase, CfopCategory } from '../data/cfopAlgorithms';
import { AlgorithmTrainerModal } from './AlgorithmTrainerModal';
import { formatTime } from '../utils/statsCalculator';
import { Search, Star, Copy, Check, Zap, BookOpen } from 'lucide-react';

interface AlgorithmLibraryProps {
  favorites: string[];
  onToggleFavorite: (algId: string) => void;
  algSolves: Record<string, number[]>;
  onSaveAlgSolve: (algId: string, timeMs: number) => void;
}

export const AlgorithmLibrary: React.FC<AlgorithmLibraryProps> = ({
  favorites,
  onToggleFavorite,
  algSolves,
  onSaveAlgSolve,
}) => {
  const [activeCategory, setActiveCategory] = useState<CfopCategory | 'FAVORITES'>('PLL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Trainer Modal State
  const [trainingAlg, setTrainingAlg] = useState<AlgorithmCase | null>(null);

  // Filter algorithms
  const filteredAlgorithms = useMemo(() => {
    let list: AlgorithmCase[] = [];

    if (activeCategory === 'PLL') list = PLL_ALGORITHMS;
    else if (activeCategory === 'OLL') list = OLL_ALGORITHMS;
    else if (activeCategory === 'F2L') list = F2L_ALGORITHMS;
    else if (activeCategory === 'FAVORITES') {
      list = ALL_ALGORITHMS.filter((a) => favorites.includes(a.id));
    }

    // Filter by group
    if (selectedGroup !== 'ALL') {
      list = list.filter((a) => a.group === selectedGroup);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.moves.toLowerCase().includes(q) ||
          a.group.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCategory, selectedGroup, searchQuery, favorites]);

  const handleCopyMoves = (id: string, moves: string) => {
    navigator.clipboard.writeText(moves);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="algorithm-library-container fade-in">
      {/* Top Header & Search */}
      <div className="library-header">
        <div className="title-section">
          <BookOpen size={24} className="text-accent" />
          <div>
            <h2>Biblioteca de Algoritmos CFOP</h2>
            <span className="subtitle">Guia completo de F2L, OLL e PLL com cronômetro de velocidade</span>
          </div>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nome ou movimento (ex: T Perm, Sune)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Main Category Tabs */}
      <div className="category-tabs-bar">
        <button
          onClick={() => { setActiveCategory('PLL'); setSelectedGroup('ALL'); }}
          className={`category-tab ${activeCategory === 'PLL' ? 'active' : ''}`}
        >
          PLL (21 Casos)
        </button>
        <button
          onClick={() => { setActiveCategory('OLL'); setSelectedGroup('ALL'); }}
          className={`category-tab ${activeCategory === 'OLL' ? 'active' : ''}`}
        >
          OLL (57 Casos)
        </button>
        <button
          onClick={() => { setActiveCategory('F2L'); setSelectedGroup('ALL'); }}
          className={`category-tab ${activeCategory === 'F2L' ? 'active' : ''}`}
        >
          F2L (41 Casos)
        </button>
        <button
          onClick={() => { setActiveCategory('FAVORITES'); setSelectedGroup('ALL'); }}
          className={`category-tab fav ${activeCategory === 'FAVORITES' ? 'active' : ''}`}
        >
          <Star size={14} className="inline-icon" /> Favoritos ({favorites.length})
        </button>
      </div>


      {/* Algorithms Grid */}
      {filteredAlgorithms.length === 0 ? (
        <div className="empty-library">
          <BookOpen size={36} className="text-muted" />
          <p>Nenhum algoritmo encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="algorithms-grid">
          {filteredAlgorithms.map((alg) => {
            const isFav = favorites.includes(alg.id);
            const solves = algSolves[alg.id] || [];
            const pb = solves.length > 0 ? Math.min(...solves) : null;

            return (
              <div key={alg.id} className="alg-card">
                <div className="alg-card-header">
                  <div>
                    <h3 className="alg-title">{alg.name}</h3>
                    <span className="alg-group-tag">{alg.group}</span>
                  </div>
                  <button
                    onClick={() => onToggleFavorite(alg.id)}
                    className={`fav-star-btn ${isFav ? 'active' : ''}`}
                    title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star size={18} fill={isFav ? '#f59e0b' : 'none'} />
                  </button>
                </div>

                <div className="alg-moves-box">
                  <code>{alg.moves}</code>
                </div>

                <div className="alg-card-footer">
                  {pb ? (
                    <span className="pb-tag text-green" title="Seu melhor tempo cronometrado neste algoritmo">
                      PB: {formatTime(pb)}
                    </span>
                  ) : (
                    <span className="moves-count">{alg.moveCount} giros</span>
                  )}

                  <div className="card-actions">
                    <button
                      onClick={() => handleCopyMoves(alg.id, alg.moves)}
                      className="btn-secondary-sm"
                      title="Copiar sequência de movimentos"
                    >
                      {copiedId === alg.id ? <Check size={14} className="text-green" /> : <Copy size={14} />} Copiar
                    </button>
                    <button
                      onClick={() => setTrainingAlg(alg)}
                      className="btn-primary-sm"
                      title="Abrir o cronômetro para praticar este algoritmo"
                    >
                      <Zap size={14} /> Treinar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dedicated Algorithm Speed Trainer Modal */}
      {trainingAlg && (
        <AlgorithmTrainerModal
          alg={trainingAlg}
          onClose={() => setTrainingAlg(null)}
          solves={algSolves[trainingAlg.id] || []}
          onSaveSolve={onSaveAlgSolve}
        />
      )}
    </div>
  );
};
