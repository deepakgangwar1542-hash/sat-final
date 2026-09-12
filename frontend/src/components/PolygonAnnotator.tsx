import React, { useRef, useState, useCallback, useEffect } from 'react';

export type Point = [number, number]; // [x, y] normalized 0.0 to 1.0

interface PolygonAnnotatorProps {
  imageSrc: string;
  polygon: Point[];
  onPolygonChange: (poly: Point[]) => void;
  sceneLabel: string;
  isDrawing: boolean;
  onToggleDrawing: () => void;
  accentColor?: string;
}

export default function PolygonAnnotator({
  imageSrc,
  polygon,
  onPolygonChange,
  sceneLabel,
  isDrawing,
  onToggleDrawing,
  accentColor = '#38bdf8',
}: PolygonAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>(polygon);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  // Sync external polygon changes
  useEffect(() => {
    setCurrentPoints(polygon);
  }, [polygon]);

  // Convert mouse event to normalized coordinates [0.0 - 1.0]
  const getNormalizedCoords = useCallback((e: React.MouseEvent<HTMLDivElement>): Point | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  }, []);

  // Handle canvas click when drawing
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const pt = getNormalizedCoords(e);
    if (!pt) return;

    // Check if clicked near first vertex to close polygon
    if (currentPoints.length >= 3) {
      const [firstX, firstY] = currentPoints[0];
      const dist = Math.hypot(pt[0] - firstX, pt[1] - firstY);
      if (dist < 0.05) {
        // Close polygon
        onPolygonChange(currentPoints);
        onToggleDrawing();
        return;
      }
    }

    const nextPoints = [...currentPoints, pt];
    setCurrentPoints(nextPoints);
    onPolygonChange(nextPoints);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const pt = getNormalizedCoords(e);
    setMousePos(pt);
  };

  // Complete polygon
  const handleFinish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPoints.length >= 3) {
      onPolygonChange(currentPoints);
      onToggleDrawing();
    }
  };

  // Clear polygon
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPoints([]);
    onPolygonChange([]);
    setMousePos(null);
  };

  // Quick preset (center rectangular polygon)
  const handleCenterPreset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const preset: Point[] = [
      [0.25, 0.25],
      [0.75, 0.25],
      [0.75, 0.75],
      [0.25, 0.75],
    ];
    setCurrentPoints(preset);
    onPolygonChange(preset);
  };

  // Compute SVG points string
  const toSvgPoints = (pts: Point[]): string => {
    return pts.map(([x, y]) => `${x * 100}%,${y * 100}%`).join(' ');
  };

  const hasPolygon = currentPoints.length >= 3;

  return (
    <div
      ref={containerRef}
      className={`polygon-annotator-container ${isDrawing ? 'drawing-active' : ''}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
      title={isDrawing ? 'Click to add polygon vertex. Click 1st vertex to close.' : ''}
    >
      {/* Background satellite image */}
      <img src={imageSrc} alt={sceneLabel} className="annotator-bg-image" />

      {/* SVG overlay for drawing and displaying polygon */}
      <svg className="polygon-svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Closed completed polygon */}
        {hasPolygon && (
          <polygon
            points={currentPoints.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
            fill={accentColor}
            fillOpacity="0.22"
            stroke={accentColor}
            strokeWidth="1.8"
            strokeDasharray={isDrawing ? '3,2' : undefined}
            className="polygon-filled-shape"
          />
        )}

        {/* In-progress polyline connecting vertices */}
        {isDrawing && currentPoints.length > 0 && !hasPolygon && (
          <polyline
            points={currentPoints.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.8"
            strokeDasharray="3,2"
          />
        )}

        {/* Dynamic preview line to current mouse position */}
        {isDrawing && currentPoints.length > 0 && mousePos && (
          <line
            x1={`${currentPoints[currentPoints.length - 1][0] * 100}`}
            y1={`${currentPoints[currentPoints.length - 1][1] * 100}`}
            x2={`${mousePos[0] * 100}`}
            y2={`${mousePos[1] * 100}`}
            stroke={accentColor}
            strokeWidth="1.2"
            strokeDasharray="2,2"
            opacity="0.8"
          />
        )}

        {/* Vertex nodes */}
        {currentPoints.map(([x, y], idx) => (
          <g key={idx}>
            <circle
              cx={`${x * 100}`}
              cy={`${y * 100}`}
              r={idx === 0 && isDrawing && currentPoints.length >= 3 ? 3.5 : 2.2}
              fill={idx === 0 && isDrawing && currentPoints.length >= 3 ? '#10b981' : accentColor}
              stroke="#fff"
              strokeWidth="0.8"
              className={idx === 0 && isDrawing && currentPoints.length >= 3 ? 'closing-node' : ''}
            />
            {isDrawing && (
              <text
                x={`${x * 100 + 3}`}
                y={`${y * 100 - 3}`}
                fontSize="4"
                fill="#fff"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                P{idx + 1}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Floating Toolbar at top of image */}
      <div className="annotator-toolbar">
        <button
          type="button"
          className={`annotator-btn ${isDrawing ? 'btn-active' : ''}`}
          onClick={e => {
            e.stopPropagation();
            onToggleDrawing();
          }}
          title={isDrawing ? 'Stop drawing' : 'Draw custom polygon on this scene'}
        >
          <span>{isDrawing ? '✏️ Drawing…' : '✏️ Draw Polygon'}</span>
        </button>

        {isDrawing && currentPoints.length >= 3 && (
          <button
            type="button"
            className="annotator-btn btn-finish"
            onClick={handleFinish}
            title="Complete polygon"
          >
            <span>✔ Finish</span>
          </button>
        )}

        {hasPolygon && (
          <button
            type="button"
            className="annotator-btn btn-clear"
            onClick={handleClear}
            title="Clear polygon"
          >
            <span>✕ Clear</span>
          </button>
        )}

        {!hasPolygon && !isDrawing && (
          <button
            type="button"
            className="annotator-btn btn-preset"
            onClick={handleCenterPreset}
            title="Place center Region of Interest polygon"
          >
            <span>🎯 Center ROI</span>
          </button>
        )}

        {hasPolygon && (
          <div className="annotator-stat-badge">
            <span>📐 ROI: {currentPoints.length} pts</span>
          </div>
        )}
      </div>

      {/* Helper tooltip when drawing */}
      {isDrawing && (
        <div className="drawing-helper-toast">
          <span>Click to place vertices ({currentPoints.length} pts). Click starting point or 'Finish' to complete.</span>
        </div>
      )}

      <style>{`
        .polygon-annotator-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 160px;
          border-radius: inherit;
          overflow: hidden;
          user-select: none;
        }
        .polygon-annotator-container.drawing-active {
          cursor: crosshair;
        }
        .annotator-bg-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: inherit;
        }
        .polygon-svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }
        .polygon-filled-shape {
          transition: fill-opacity 0.2s;
        }
        .polygon-filled-shape:hover {
          fill-opacity: 0.35;
        }
        .closing-node {
          animation: pulseNode 1s infinite alternate;
        }
        @keyframes pulseNode {
          from { transform: scale(1); }
          to { transform: scale(1.35); }
        }
        .annotator-toolbar {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 10;
          background: rgba(13, 20, 36, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          padding: 3px 6px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }
        .annotator-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.7rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          transition: all 0.15s ease;
          font-family: var(--font-sans);
        }
        .annotator-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }
        .annotator-btn.btn-active {
          background: rgba(59, 130, 246, 0.35);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.6);
        }
        .annotator-btn.btn-finish {
          background: rgba(16, 185, 129, 0.25);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.5);
        }
        .annotator-btn.btn-clear {
          color: #fca5a5;
        }
        .annotator-btn.btn-clear:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        .annotator-btn.btn-preset {
          color: #fde047;
        }
        .annotator-stat-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: #38bdf8;
          padding: 2px 6px;
          background: rgba(56, 189, 248, 0.12);
          border-radius: 4px;
        }
        .drawing-helper-toast {
          position: absolute;
          bottom: 8px;
          left: 8px;
          right: 8px;
          background: rgba(13, 20, 36, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.68rem;
          color: #93c5fd;
          text-align: center;
          z-index: 10;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
