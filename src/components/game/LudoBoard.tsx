'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
import { Star } from 'lucide-react';

interface LudoBoardProps {
  players: Record<PlayerColor, PlayerState>;
  activePlayer: PlayerColor;
  diceValue: number | null;
  canMoveToken: (token: Token) => boolean;
  onTokenClick: (token: Token) => void;
  onSecretCenterTap?: () => void;
}

export function LudoBoard({
  players,
  activePlayer,
  diceValue,
  canMoveToken,
  onTokenClick,
  onSecretCenterTap,
}: LudoBoardProps) {
  // Helper to calculate pixel/percentage coordinates on a 15x15 board
  const getCellPosition = (row: number, col: number) => {
    return {
      top: `${(row / 15) * 100}%`,
      left: `${(col / 15) * 100}%`,
      width: `${(1 / 15) * 100}%`,
      height: `${(1 / 15) * 100}%`,
    };
  };

  // Convert token position to board (row, col)
  const getTokenCoordinate = (token: Token): CellCoord => {
    if (token.status === 'base') {
      return BASE_SLOT_COORDS[token.color][token.id];
    }
    if (token.status === 'home') {
      // In center home
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
      // Home runway (step 51 - 55)
      const runwayIdx = token.step - 51;
      return HOME_RUNWAYS[token.color][Math.min(runwayIdx, 5)];
    }
  };

  // Color tokens styling
  const tokenStyles = {
    red: 'bg-gradient-to-tr from-red-600 to-rose-400 border-red-200 ring-red-500 shadow-red-500/50',
    green: 'bg-gradient-to-tr from-emerald-600 to-teal-400 border-emerald-200 ring-emerald-500 shadow-emerald-500/50',
    yellow: 'bg-gradient-to-tr from-amber-500 to-yellow-300 border-amber-100 ring-amber-400 shadow-amber-500/50',
    blue: 'bg-gradient-to-tr from-blue-600 to-indigo-400 border-blue-200 ring-blue-500 shadow-blue-500/50',
  };

  // Check if a tile coordinate is a safe star
  const isSafeTile = (r: number, c: number) => {
    return SAFE_INDICES.some((idx) => {
      const coord = MAIN_PATH_COORDS[idx];
      return coord.r === r && coord.c === c;
    });
  };

  // Check if tile is a player's starting cell
  const getStartTileColor = (r: number, c: number): PlayerColor | null => {
    if (r === 6 && c === 1) return 'red';
    if (r === 1 && c === 8) return 'green';
    if (r === 8 && c === 13) return 'yellow';
    if (r === 13 && c === 6) return 'blue';
    return null;
  };

  // Check if tile is on home runway
  const getHomeRunwayColor = (r: number, c: number): PlayerColor | null => {
    if (r === 7 && c >= 1 && c <= 5) return 'red';
    if (c === 7 && r >= 1 && r <= 5) return 'green';
    if (r === 7 && c >= 9 && c <= 13) return 'yellow';
    if (c === 7 && r >= 9 && r <= 13) return 'blue';
    return null;
  };

  return (
    <div className="relative w-full aspect-square max-w-[500px] md:max-w-[540px] mx-auto bg-slate-900 border-4 border-slate-700/80 rounded-3xl shadow-2xl p-2.5 select-none overflow-hidden">
      <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
        
        {/* 1. GREEN BASE (Top Left) */}
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-emerald-600 p-2.5">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-3 flex flex-wrap justify-around items-center">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 md:size-9 rounded-full bg-emerald-500/25 border-2 border-emerald-500/60 shadow-inner flex items-center justify-center"
              />
            ))}
          </div>
        </div>

        {/* 2. YELLOW BASE (Top Right) */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-amber-400 p-2.5">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-3 flex flex-wrap justify-around items-center">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 md:size-9 rounded-full bg-amber-400/25 border-2 border-amber-500/60 shadow-inner flex items-center justify-center"
              />
            ))}
          </div>
        </div>

        {/* 3. RED BASE (Bottom Left) */}
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-red-600 p-2.5">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-3 flex flex-wrap justify-around items-center">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 md:size-9 rounded-full bg-red-500/25 border-2 border-red-500/60 shadow-inner flex items-center justify-center"
              />
            ))}
          </div>
        </div>

        {/* 4. BLUE BASE (Bottom Right) */}
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-600 p-2.5">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-3 flex flex-wrap justify-around items-center">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="size-8 md:size-9 rounded-full bg-blue-500/25 border-2 border-blue-500/60 shadow-inner flex items-center justify-center"
              />
            ))}
          </div>
        </div>

        {/* 5. CENTER TRIANGULAR FINISH ZONE (6x6 to 8x8) */}
        <div
          onClick={onSecretCenterTap}
          title="Ludo Home"
          className="absolute top-[40%] left-[40%] w-[20%] h-[20%] cursor-pointer z-10"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Top Green Triangle */}
            <polygon points="0,0 100,0 50,50" fill="#059669" />
            {/* Right Yellow Triangle */}
            <polygon points="100,0 100,100 50,50" fill="#f59e0b" />
            {/* Bottom Blue Triangle */}
            <polygon points="100,100 0,100 50,50" fill="#2563eb" />
            {/* Left Red Triangle */}
            <polygon points="0,100 0,0 50,50" fill="#dc2626" />
            {/* Center Crown / Star */}
            <circle cx="50" cy="50" r="14" fill="#1e293b" />
            <polygon
              points="50,40 53,47 60,47 55,51 57,58 50,54 43,58 45,51 40,47 47,47"
              fill="#fbbf24"
            />
          </svg>
        </div>

        {/* 6. TRACK CELLS GRID (15x15) */}
        <div className="absolute inset-0 grid grid-cols-15 grid-rows-15 pointer-events-none">
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              // Only render cells that are on the cross paths (not in corner 6x6 bases or 3x3 center)
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

              let cellBg = 'bg-white border-slate-300';
              let starColor = 'text-amber-500';

              if (startColor === 'red' || runwayColor === 'red') {
                cellBg = 'bg-red-500/90 text-white border-red-600';
                starColor = 'text-white';
              } else if (startColor === 'green' || runwayColor === 'green') {
                cellBg = 'bg-emerald-500/90 text-white border-emerald-600';
                starColor = 'text-white';
              } else if (startColor === 'yellow' || runwayColor === 'yellow') {
                cellBg = 'bg-amber-400 text-slate-900 border-amber-500';
                starColor = 'text-slate-900';
              } else if (startColor === 'blue' || runwayColor === 'blue') {
                cellBg = 'bg-blue-500/90 text-white border-blue-600';
                starColor = 'text-white';
              }

              return (
                <div
                  key={`${r}-${c}`}
                  className={`border-[0.5px] ${cellBg} flex items-center justify-center relative shadow-inner`}
                >
                  {isSafe && (
                    <Star
                      size={14}
                      className={`${starColor} fill-current drop-shadow-sm`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 7. TOKENS LAYER */}
        <div className="absolute inset-0 pointer-events-none">
          {Object.values(players).map((player) =>
            player.tokens.map((token) => {
              const coord = getTokenCoordinate(token);
              const pos = getCellPosition(coord.r, coord.c);
              const isEligible = canMoveToken(token);
              const isTurn = activePlayer === token.color;

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
                    scale: isEligible && isTurn ? [1, 1.25, 1] : 1,
                  }}
                  transition={
                    isEligible && isTurn
                      ? { repeat: Infinity, duration: 1.1, ease: 'easeInOut' }
                      : { duration: 0.2 }
                  }
                  className="flex items-center justify-center z-20"
                >
                  <button
                    type="button"
                    disabled={!isEligible}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTokenClick(token);
                    }}
                    className={`size-6 sm:size-7 md:size-8 rounded-full border-2 ${
                      tokenStyles[token.color]
                    } shadow-md flex items-center justify-center pointer-events-auto transition-transform ${
                      isEligible
                        ? 'cursor-pointer ring-3 ring-white hover:scale-115 active:scale-95'
                        : 'opacity-90'
                    }`}
                  >
                    <div className="size-2.5 rounded-full bg-white/90 shadow-sm" />
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
