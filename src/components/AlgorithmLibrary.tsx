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
import { Search, Star, Zap, BookOpen } from 'lucide-react';
import { CubeVisualizer } from './CubeVisualizer';

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


  // Trainer Modal State
  const [trainingAlg, setTrainingAlg] = useState<AlgorithmCase | null>(null);

  // Filter algorithms
  const filteredAlgorithms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // If searching, search across all algorithms unless specified
    let list: AlgorithmCase[] = [];

    if (q) {
      // Global search across ALL algorithms
      list = ALL_ALGORITHMS.filter((a) => {
        const nameNorm = a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const groupNorm = a.group.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const idNorm = a.id.toLowerCase();
        const movesNorm = a.moves.toLowerCase();
        const catNorm = a.category.toLowerCase();

        return (
          nameNorm.includes(q) ||
          groupNorm.includes(q) ||
          idNorm.includes(q) ||
          movesNorm.includes(q) ||
          catNorm.includes(q)
        );
      });
      return list;
    }

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

    return list;
  }, [activeCategory, selectedGroup, searchQuery, favorites]);

  if (trainingAlg) {
    return (
      <AlgorithmTrainerModal
        alg={trainingAlg}
        onClose={() => setTrainingAlg(null)}
        solves={algSolves[trainingAlg.id] || []}
        onSaveSolve={onSaveAlgSolve}
      />
    );
  }

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
              <div 
                key={alg.id} 
                className="alg-card cursor-pointer"
                onClick={() => setTrainingAlg(alg)}
              >
                <div className="alg-card-header">
                  <div>
                    <h3 className="alg-name">{alg.name}</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(alg.id);
                    }}
                    className={`fav-star-btn ${isFav ? 'active' : ''}`}
                    title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star size={18} fill={isFav ? '#f59e0b' : 'none'} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', minHeight: '150px' }}>
                  <CubeVisualizer moves={alg.moves} category={alg.category} />
                </div>

                <div className="alg-moves-box">
                  <code>{alg.moves}</code>
                </div>

                <div className="alg-card-footer" style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)' }}>
                  {pb ? (
                    <span className="pb-tag text-green" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', fontWeight: 600 }}>
                      PB: {formatTime(pb)}
                    </span>
                  ) : (
                    <span className="moves-count text-muted" style={{ fontSize: '0.8rem' }}>{alg.moveCount} giros</span>
                  )}
                  <span className="text-accent" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={14} /> Treinar
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
