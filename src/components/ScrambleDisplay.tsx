import React, { useState } from 'react';
import { RefreshCw, Copy, Eye, Check } from 'lucide-react';
import type { CubeState, FaceColor } from '../types';
import { COLOR_MAP } from '../utils/scrambleGenerator';

interface ScrambleDisplayProps {
  scramble: string;
  cubeState: CubeState;
  onNewScramble: () => void;
  disabled?: boolean;
}

export const ScrambleDisplay: React.FC<ScrambleDisplayProps> = ({
  scramble,
  cubeState,
  onNewScramble,
  disabled = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(scramble);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`scramble-container ${disabled ? 'dimmed' : ''}`}>
      <div className="scramble-card">
        <div className="scramble-text">{scramble || 'Carregando scramble...'}</div>
        <div className="scramble-actions">
          <button
            onClick={handleCopy}
            title="Copiar embaralhamento"
            className="icon-button"
            disabled={disabled}
          >
            {copied ? <Check size={18} className="text-green" /> : <Copy size={18} />}
          </button>
          <button
            onClick={onNewScramble}
            title="Novo embaralhamento"
            className="icon-button"
            disabled={disabled}
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Ocultar pré-visualização 2D' : 'Mostrar pré-visualização 2D'}
            className={`icon-button ${showPreview ? 'active' : ''}`}
            disabled={disabled}
          >
            <Eye size={18} />
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="scramble-preview-wrapper fade-in">
          <Cube2DPreview cubeState={cubeState} />
        </div>
      )}
    </div>
  );
};

// 2D Net SVG Preview Component
const Cube2DPreview: React.FC<{ cubeState: CubeState }> = ({ cubeState }) => {
  // Tile size in pixels
  const tileSize = 14;
  const gap = 2;
  const faceGap = 6;
  const faceSize = 3 * tileSize + 2 * gap; // Width/height of one 3x3 face

  // Helper to render a 3x3 face at SVG coordinates (x, y)
  const renderFace = (faceColors: FaceColor[], startX: number, startY: number, label: string) => {
    return (
      <g key={label} transform={`translate(${startX}, ${startY})`}>
        {faceColors.map((colorLetter, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const px = col * (tileSize + gap);
          const py = row * (tileSize + gap);

          return (
            <rect
              key={idx}
              x={px}
              y={py}
              width={tileSize}
              height={tileSize}
              rx={2}
              ry={2}
              fill={COLOR_MAP[colorLetter] || '#333'}
              stroke="#121316"
              strokeWidth={1}
            />
          );
        })}
      </g>
    );
  };

  // Layout positions:
  // Row 0: [   ][ U ][   ][   ]
  // Row 1: [ L ][ F ][ R ][ B ]
  // Row 2: [   ][ D ][   ][   ]

  const col0 = 0;
  const col1 = faceSize + faceGap;
  const col2 = (faceSize + faceGap) * 2;
  const col3 = (faceSize + faceGap) * 3;

  const row0 = 0;
  const row1 = faceSize + faceGap;
  const row2 = (faceSize + faceGap) * 2;

  const totalWidth = col3 + faceSize;
  const totalHeight = row2 + faceSize;

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="cube-2d-svg"
    >
      {renderFace(cubeState.U, col1, row0, 'U')}
      {renderFace(cubeState.L, col0, row1, 'L')}
      {renderFace(cubeState.F, col1, row1, 'F')}
      {renderFace(cubeState.R, col2, row1, 'R')}
      {renderFace(cubeState.B, col3, row1, 'B')}
      {renderFace(cubeState.D, col1, row2, 'D')}
    </svg>
  );
};
