import React, { useEffect, useRef } from 'react';
import { cubeSVG } from 'sr-visualizer';

interface CubeVisualizerProps {
  moves: string;
  category: string;
}

export const CubeVisualizer: React.FC<CubeVisualizerProps> = ({ moves, category }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Clear previous SVG
      containerRef.current.innerHTML = '';
      
      let view = undefined;
      let mask = undefined;

      if (category === 'OLL') {
        view = 'plan';
        mask = 'oll';
      } else if (category === 'PLL') {
        view = 'plan';
        mask = 'll';
      } else if (category === 'F2L') {
        view = 'trans';
        mask = 'f2l';
      }

      // For visual cube generation, usually we want to see the case, so we apply the case string.
      // Wait, visualcube case= applies the moves IN REVERSE to show the setup!
      // 'sr-visualizer' uses `case` or `algorithm`.
      // Let's pass `case` to generate the state that requires this algorithm to solve.
      cubeSVG(containerRef.current, {
        case: moves, // Note: case applies inverse moves to setup the state
        width: 150,
        height: 150,
        view: view as any,
        mask: mask as any
      });
    }
  }, [moves, category]);

  return <div ref={containerRef} className="cube-visualizer-container" />;
};
