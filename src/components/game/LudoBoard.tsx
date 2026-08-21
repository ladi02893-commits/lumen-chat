'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayerColor,
  Token,
  PlayerState,
  MAIN_PATH_COORDS,
  HOME_RUNWAYS,
  COLOR_START_INDICES,
  SAFE_INDICES,
  BASE_SLOT_COORDS,
  CellCoord,
} from './ludoTypes';
import { Star, Trophy, ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';

interface LudoBoardProps {
  players: Record<PlayerColor, PlayerState>;
  activePlayer: PlayerColor;
  diceValue: number | null;
  canMoveToken: (token: Token) => boolean;
  onTokenClick: (token: Token) => void;
  onSecretCenterTap?: () => void;
  isMovingTokenId?: string | null;
}

export function LudoBoard({
  players,
  activePlayer,
  diceValue,
  canMoveToken,
  onTokenClick,
  onSecretCenterTap,
  isMovingTokenId,
}: LudoBoardProps) {
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null);

  // Helper to calculate pixel percentage for 15x15 board
  const getCellPosition = (row: number, col: number) => {
    return {
      top: `${(row / 15) * 100}%`,
      left: `${(col / 15) * 100}%`,
      width: `${(1 / 15) * 100}%`,
      height: `${(1 / 15) * 100}%`,
    };
  };

  // Convert token position to board coordinate
  const getTokenCoordinate = (token: Token): CellCoord => {
    if (token.status === 'base') {
      return BASE_SLOT_COORDS[token.color][token.id];
    }
    if (token.status === 'home') {
      // In center triumph triangle
      const centerCoords: Record<PlayerColor, CellCoord> = {
        red: { r: 7.2, c: 6.8 },
        green: { r: 6.8, c: 7.2 },
        yellow: { r: 7.2, c: 7.6 },
        blue: { r: 7.6, c: 7.2 },
      };
      return centerCoords[token.color];
    }

    // On track or home runway
    if (token.step < 51) {
      const startIndex = COLOR_START_INDICES[token.color];
      const mainPathIdx = (startIndex + token.step) % 52;
      return MAIN_PATH_COORDS[mainPathIdx];
    } else {
      const runwayIdx = token.step - 51;
      return HOME_RUNWAYS[token.color][Math.min(runwayIdx, 5)];
    }
  };

  // Calculate target coordinate if token moves with current diceValue (for hover preview)
  const getTargetCoordinate = (token: Token): CellCoord | null => {
    if (!diceValue) return null;
    if (token.status === 'base') {
      if (diceValue === 6) {
        const startIdx = COLOR_START_INDICES[token.color];
        return MAIN_PATH_COORDS[startIdx];
      }
      return null;
    }
    if (token.status === 'track') {
      const newStep = token.step + diceValue;
      if (newStep <= 50) {
        const startIdx = COLOR_START_INDICES[token.color];
        return MAIN_PATH_COORDS[(startIdx + newStep) % 52];
      } else if (newStep <= 55) {
        return HOME_RUNWAYS[token.color][newStep - 51];
      } else if (newStep === 56) {
        return { r: 7, c: 7 };
      }
    }
    return null;
  };

  // Group tokens occupying the same coordinate for stacking offsets
  const allTokens = Object.values(players).flatMap((p) => p.tokens);
  const tokenClusters: Record<string, Token[]> = {};

  allTokens.forEach((t) => {
    const coord = getTokenCoordinate(t);
    const key = `${Math.round(coord.r * 10) / 10}_${Math.round(coord.c * 10) / 10}`;
    if (!tokenClusters[key]) tokenClusters[key] = [];
    tokenClusters[key].push(t);
  });

  const getClusterOffset = (token: Token) => {
    const coord = getTokenCoordinate(token);
    const key = `${Math.round(coord.r * 10) / 10}_${Math.round(coord.c * 10) / 10}`;
    const cluster = tokenClusters[key] || [];

    if (cluster.length <= 1 || token.status === 'base') {
      return { x: 0, y: 0, scale: 1 };
    }

    const idx = cluster.findIndex((t) => t.color === token.color && t.id === token.id);
    if (cluster.length === 2) {
      return idx === 0
        ? { x: -4, y: -4, scale: 0.88 }
        : { x: 4, y: 4, scale: 0.88 };
    }
    if (cluster.length === 3) {
      const offsets = [
        { x: -5, y: -5 },
        { x: 5, y: -5 },
        { x: 0, y: 5 },
      ];
      return { ...offsets[idx % 3], scale: 0.78 };
    }
    // 4 tokens
    const offsets = [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: -5, y: 5 },
      { x: 5, y: 5 },
    ];
    return { ...offsets[idx % 4], scale: 0.75 };
  };

  // Token styles with glossy 3D sphere gradient and drop shadows
  const tokenGradients = {
    red: 'from-rose-500 via-red-600 to-rose-950 border-rose-300 ring-rose-500 shadow-rose-600/60',
    green: 'from-emerald-400 via-emerald-600 to-teal-950 border-emerald-200 ring-emerald-500 shadow-emerald-600/60',
    yellow: 'from-amber-300 via-yellow-500 to-amber-900 border-amber-100 ring-amber-400 shadow-amber-600/60',
    blue: 'from-sky-400 via-blue-600 to-indigo-950 border-blue-200 ring-blue-500 shadow-blue-600/60',
  };

  const isSafeTile = (r: number, c: number) => {
    return SAFE_INDICES.some((idx) => {
      const coord = MAIN_PATH_COORDS[idx];
      return coord.r === r && coord.c === c;
    });
  };

  const getStartTileColor = (r: number, c: number): PlayerColor | null => {
    if (r === 6 && c === 1) return 'red';
    if (r === 1 && c === 8) return 'green';
    if (r === 8 && c === 13) return 'yellow';
    if (r === 13 && c === 6) return 'blue';
    return null;
  };

  const getHomeRunwayColor = (r: number, c: number): PlayerColor | null => {
    if (r === 7 && c >= 1 && c <= 5) return 'red';
    if (c === 7 && r >= 1 && r <= 5) return 'green';
    if (r === 7 && c >= 9 && c <= 13) return 'yellow';
    if (c === 7 && r >= 9 && r <= 13) return 'blue';
    return null;
  };

  const previewCoord = hoveredToken ? getTargetCoordinate(hoveredToken) : null;
  const previewPos = previewCoord ? getCellPosition(previewCoord.r, previewCoord.c) : null;

  return (
    <div className="relative w-full aspect-square max-w-[480px] sm:max-w-[530px] md:max-w-[560px] mx-auto bg-gradient-to-b from-slate-900 via-slate-950 to-black border-4 border-amber-600/40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.15)] p-2.5 sm:p-3 select-none overflow-hidden">
      <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
        
        {/* 1. GREEN BASE (Top Left) */}
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-gradient-to-br from-emerald-500 to-emerald-700 p-2 sm:p-3 shadow-md">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2.5 flex flex-wrap justify-around items-center border border-white/60">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 sm:size-9 rounded-full bg-emerald-500/20 border-2 border-emerald-500/70 shadow-inner flex items-center justify-center"
              >
                <div className="size-2 rounded-full bg-emerald-600/40" />
              </div>
            ))}
          </div>
        </div>

        {/* 2. YELLOW BASE (Top Right) */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-br from-amber-400 to-yellow-600 p-2 sm:p-3 shadow-md">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2.5 flex flex-wrap justify-around items-center border border-white/60">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 sm:size-9 rounded-full bg-amber-400/20 border-2 border-amber-500/70 shadow-inner flex items-center justify-center"
              >
                <div className="size-2 rounded-full bg-amber-500/40" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. RED BASE (Bottom Left) */}
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-gradient-to-br from-red-500 to-rose-700 p-2 sm:p-3 shadow-md">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2.5 flex flex-wrap justify-around items-center border border-white/60">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 sm:size-9 rounded-full bg-red-500/20 border-2 border-red-500/70 shadow-inner flex items-center justify-center"
              >
                <div className="size-2 rounded-full bg-red-600/40" />
              </div>
            ))}
          </div>
        </div>

        {/* 4. BLUE BASE (Bottom Right) */}
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-gradient-to-br from-blue-500 to-indigo-700 p-2 sm:p-3 shadow-md">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2.5 flex flex-wrap justify-around items-center border border-white/60">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 sm:size-9 rounded-full bg-blue-500/20 border-2 border-blue-500/70 shadow-inner flex items-center justify-center"
              >
                <div className="size-2 rounded-full bg-blue-600/40" />
              </div>
            ))}
          </div>
        </div>

        {/* 5. CENTER TRIANGULAR FINISH ZONE */}
        <div
          onClick={onSecretCenterTap}
          title="Ludo Home Triumph (Secret Trigger)"
          className="absolute top-[40%] left-[40%] w-[20%] h-[20%] cursor-pointer z-10 hover:brightness-110 active:scale-95 transition"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
            {/* Top Green Triangle */}
            <polygon points="0,0 100,0 50,50" fill="#059669" stroke="#047857" strokeWidth="1" />
            {/* Right Yellow Triangle */}
            <polygon points="100,0 100,100 50,50" fill="#d97706" stroke="#b45309" strokeWidth="1" />
            {/* Bottom Blue Triangle */}
            <polygon points="100,100 0,100 50,50" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
            {/* Left Red Triangle */}
            <polygon points="0,100 0,0 50,50" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
            {/* Center Golden Trophy Emblem */}
            <circle cx="50" cy="50" r="16" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <polygon
              points="50,38 53,46 61,46 55,51 57,59 50,55 43,59 45,51 39,46 47,46"
              fill="#fbbf24"
            />
          </svg>
        </div>

        {/* 6. TRACK CELLS GRID (15x15) */}
        <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 pointer-events-none">
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              const inCorner =
                (r < 6 && c < 6) ||
                (r < 6 && c > 8) ||
                (r > 8 && c < 6) ||
                (r > 8 && c > 8);
              const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

              if (inCorner || inCenter) {
                return <div key={`${r}-${c}`} />;
              }

              const isSafe = isSafeTile(r, c);
              const startColor = getStartTileColor(r, c);
              const runwayColor = getHomeRunwayColor(r, c);

              let cellBg = 'bg-white text-slate-800 border-slate-300';
              let starColor = 'text-amber-500';

              if (startColor === 'red' || runwayColor === 'red') {
                cellBg = 'bg-red-500 text-white border-red-600';
                starColor = 'text-white';
              } else if (startColor === 'green' || runwayColor === 'green') {
                cellBg = 'bg-emerald-500 text-white border-emerald-600';
                starColor = 'text-white';
              } else if (startColor === 'yellow' || runwayColor === 'yellow') {
                cellBg = 'bg-amber-400 text-slate-900 border-amber-500';
                starColor = 'text-slate-900';
              } else if (startColor === 'blue' || runwayColor === 'blue') {
                cellBg = 'bg-blue-500 text-white border-blue-600';
                starColor = 'text-white';
              }

              return (
                <div
                  key={`${r}-${c}`}
                  className={`border-[0.5px] ${cellBg} flex items-center justify-center relative shadow-inner`}
                >
                  {isSafe && (
                    <Star
                      size={13}
                      className={`${starColor} fill-current drop-shadow-md`}
                    />
                  )}
                  {startColor === 'red' && <ArrowRight size={10} className="text-white/80 absolute" />}
                  {startColor === 'green' && <ArrowDown size={10} className="text-white/80 absolute" />}
                  {startColor === 'yellow' && <ArrowLeft size={10} className="text-slate-900/80 absolute" />}
                  {startColor === 'blue' && <ArrowUp size={10} className="text-white/80 absolute" />}
                </div>
              );
            })
          )}
        </div>

        {/* 7. HOVER PREVIEW DESTINATION TILE */}
        {previewPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: [0.9, 1.1, 0.9] }}
            transition={{ repeat: Infinity, duration: 1 }}
            style={{
              position: 'absolute',
              top: previewPos.top,
              left: previewPos.left,
              width: previewPos.width,
              height: previewPos.height,
            }}
            className="pointer-events-none z-15 bg-white/40 border-2 border-dashed border-white rounded-lg flex items-center justify-center"
          >
            <div className="size-2 rounded-full bg-white animate-ping" />
          </motion.div>
        )}

        {/* 8. TOKENS LAYER WITH DYNAMIC STACKING & WALKING */}
        <div className="absolute inset-0 pointer-events-none">
          {Object.values(players).map((player) =>
            player.tokens.map((token) => {
              const coord = getTokenCoordinate(token);
              const pos = getCellPosition(coord.r, coord.c);
              const clusterOffset = getClusterOffset(token);
              const isEligible = canMoveToken(token);
              const isTurn = activePlayer === token.color;
              const isThisMoving = isMovingTokenId === `${token.color}-${token.id}`;

              return (
                <motion.div
                  key={`${token.color}-${token.id}`}
                  style={{
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                    height: pos.height,
                  }}
                  animate={{
                    x: clusterOffset.x,
                    y: clusterOffset.y,
                    scale: isEligible && isTurn ? [clusterOffset.scale, clusterOffset.scale * 1.2, clusterOffset.scale] : clusterOffset.scale,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 28,
                    scale: isEligible && isTurn ? { repeat: Infinity, duration: 0.9, ease: 'easeInOut' } : { duration: 0.2 },
                  }}
                  className="flex items-center justify-center z-20"
                >
                  <button
                    type="button"
                    disabled={!isEligible}
                    onMouseEnter={() => isEligible && setHoveredToken(token)}
                    onMouseLeave={() => setHoveredToken(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoveredToken(null);
                      onTokenClick(token);
                    }}
                    className={`relative size-6 sm:size-7 md:size-8.5 rounded-full bg-gradient-to-b ${
                      tokenGradients[token.color]
                    } border-2 shadow-lg flex items-center justify-center pointer-events-auto transition-transform ${
                      isEligible
                        ? 'cursor-pointer ring-3 ring-white hover:scale-120 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.8)]'
                        : 'opacity-95'
                    }`}
                  >
                    {/* Glass dome specular highlight */}
                    <div className="absolute top-0.5 inset-x-1.5 h-2 rounded-t-full bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />
                    
                    {/* Inner gold crown ring */}
                    <div className="size-2.5 sm:size-3 rounded-full bg-white/90 shadow-inner flex items-center justify-center">
                      <div className="size-1 rounded-full bg-slate-900/60" />
                    </div>
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
