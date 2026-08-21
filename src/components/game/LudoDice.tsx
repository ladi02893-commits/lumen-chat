'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ludoAudio } from './LudoSoundEffects';

interface LudoDiceProps {
  value: number;
  isRolling: boolean;
  disabled?: boolean;
  playerColor: 'red' | 'green' | 'yellow' | 'blue';
  isMyTurn?: boolean;
  hasRolled?: boolean;
  onRoll: () => void;
  onSecretTrigger?: () => void;
}

export function LudoDice({
  value,
  isRolling,
  disabled = false,
  playerColor,
  isMyTurn = true,
  hasRolled = false,
  onRoll,
  onSecretTrigger,
}: LudoDiceProps) {
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const colorStyles = {
    red: {
      border: 'border-red-500',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.6)]',
      bg: 'from-red-600 to-rose-700',
      badge: 'bg-red-500 text-white',
      accent: '#ef4444',
    },
    green: {
      border: 'border-emerald-500',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.6)]',
      bg: 'from-emerald-600 to-teal-700',
      badge: 'bg-emerald-500 text-white',
      accent: '#10b981',
    },
    yellow: {
      border: 'border-amber-400',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.6)]',
      bg: 'from-amber-500 to-yellow-600',
      badge: 'bg-amber-400 text-slate-900',
      accent: '#f59e0b',
    },
    blue: {
      border: 'border-blue-500',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.6)]',
      bg: 'from-blue-600 to-indigo-700',
      badge: 'bg-blue-500 text-white',
      accent: '#3b82f6',
    },
  };

  const currentTheme = colorStyles[playerColor] || colorStyles.red;

  const handleTap = () => {
    if (disabled || isRolling) return;
    onRoll();

    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        if (onSecretTrigger) onSecretTrigger();
        return 0;
      }
      return next;
    });

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => setTapCount(0), 1200);
  };

  const startLongPress = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (onSecretTrigger) onSecretTrigger();
    }, 2000);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const renderDots = (num: number) => {
    const dotBase = 'rounded-full bg-slate-900 shadow-inner';
    const centerDot = 'rounded-full bg-red-600 shadow-inner';

    switch (num) {
      case 1:
        return <div className={`size-5.5 ${centerDot} m-auto`} />;
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2.5">
            <div className={`size-3.5 ${dotBase} self-start`} />
            <div className={`size-3.5 ${dotBase} self-end`} />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2.5">
            <div className={`size-3.5 ${dotBase} self-start`} />
            <div className={`size-3.5 ${centerDot} self-center`} />
            <div className={`size-3.5 ${dotBase} self-end`} />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-3 p-2.5 place-items-center w-full h-full">
            <div className={`size-3.5 ${dotBase}`} />
            <div className={`size-3.5 ${dotBase}`} />
            <div className={`size-3.5 ${dotBase}`} />
            <div className={`size-3.5 ${dotBase}`} />
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 grid-rows-3 p-2 place-items-center w-full h-full">
            <div className={`size-3 ${dotBase} row-start-1 col-start-1`} />
            <div className={`size-3 ${dotBase} row-start-1 col-start-3`} />
            <div className={`size-3.5 ${centerDot} row-start-2 col-start-2`} />
            <div className={`size-3 ${dotBase} row-start-3 col-start-1`} />
            <div className={`size-3 ${dotBase} row-start-3 col-start-3`} />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 gap-x-3.5 gap-y-1.5 p-2 place-items-center w-full h-full">
            <div className={`size-3 ${dotBase}`} />
            <div className={`size-3 ${dotBase}`} />
            <div className={`size-3 ${dotBase}`} />
            <div className={`size-3 ${dotBase}`} />
            <div className={`size-3 ${dotBase}`} />
            <div className={`size-3 ${dotBase}`} />
          </div>
        );
      default:
        return <div className={`size-5.5 ${centerDot} m-auto`} />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative">
        <motion.button
          type="button"
          disabled={disabled || isRolling}
          onClick={handleTap}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          whileHover={{ scale: disabled ? 1 : 1.06 }}
          whileTap={{ scale: disabled ? 1 : 0.92 }}
          animate={
            isRolling
              ? {
                  rotateX: [0, 180, 360, 540, 720],
                  rotateY: [0, 90, 270, 450, 720],
                  rotateZ: [0, 45, 135, 225, 360],
                  scale: [1, 1.25, 0.95, 1.15, 1],
                  y: [0, -22, 8, -12, 0],
                }
              : !disabled
              ? { scale: [1, 1.04, 1], y: [0, -3, 0] }
              : { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, y: 0 }
          }
          transition={
            isRolling
              ? { duration: 0.65, ease: 'easeInOut' }
              : !disabled
              ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 450, damping: 25 }
          }
          className={`relative size-20 sm:size-22 md:size-24 rounded-3xl bg-gradient-to-b from-white via-slate-50 to-slate-200 border-4 ${
            currentTheme.border
          } ${
            !disabled ? currentTheme.glow : 'opacity-50 grayscale-[60%]'
          } shadow-2xl flex items-center justify-center cursor-pointer overflow-hidden transition-all`}
          style={{
            boxShadow:
              'inset 0 3px 6px rgba(255,255,255,1), inset 0 -4px 8px rgba(0,0,0,0.2), 0 12px 30px rgba(0,0,0,0.6)',
          }}
          title={disabled ? 'Wait for your turn' : 'Tap to Roll Dice!'}
        >
          {/* Specular glare */}
          <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-b from-white/90 to-transparent pointer-events-none" />

          {/* Dots */}
          <div className="w-full h-full flex items-center justify-center p-1.5">
            {renderDots(value || 6)}
          </div>

          {/* Rolling blur overlay */}
          {isRolling && (
            <div className="absolute inset-0 bg-white/35 backdrop-blur-[1px] animate-pulse pointer-events-none" />
          )}
        </motion.button>

        {/* Dynamic bottom shadow */}
        <motion.div
          animate={isRolling ? { scale: [1, 0.6, 1.2, 0.8, 1], opacity: [0.6, 0.2, 0.7, 0.3, 0.6] } : { scale: 1, opacity: 0.5 }}
          transition={{ duration: 0.65 }}
          className="absolute -bottom-3 inset-x-3 h-3 bg-black/60 rounded-full filter blur-sm pointer-events-none"
        />
      </div>

      {/* Turn state prompt */}
      <div className="text-center">
        {hasRolled ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
            👆 Move a Token
          </span>
        ) : isMyTurn ? (
          <span
            className={`inline-block px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              currentTheme.badge
            } shadow-md animate-bounce`}
          >
            🎲 Your Turn (Tap!)
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/80 shadow-sm">
            ⏳ Opponent&apos;s Turn...
          </span>
        )}
      </div>
    </div>
  );
}
