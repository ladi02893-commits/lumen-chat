'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ludoAudio } from './LudoSoundEffects';

interface LudoDiceProps {
  value: number;
  isRolling: boolean;
  disabled?: boolean;
  playerColor: 'red' | 'green' | 'yellow' | 'blue';
  onRoll: () => void;
  onSecretTrigger?: () => void;
}

export function LudoDice({
  value,
  isRolling,
  disabled = false,
  playerColor,
  onRoll,
  onSecretTrigger,
}: LudoDiceProps) {
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const colorStyles = {
    red: {
      border: 'border-red-500',
      glow: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
      bg: 'from-red-600 to-rose-700',
      badge: 'bg-red-500 text-white',
      accent: '#ef4444',
    },
    green: {
      border: 'border-emerald-500',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.5)]',
      bg: 'from-emerald-600 to-teal-700',
      badge: 'bg-emerald-500 text-white',
      accent: '#10b981',
    },
    yellow: {
      border: 'border-amber-400',
      glow: 'shadow-[0_0_25px_rgba(245,158,11,0.5)]',
      bg: 'from-amber-500 to-yellow-600',
      badge: 'bg-amber-400 text-slate-900',
      accent: '#f59e0b',
    },
    blue: {
      border: 'border-blue-500',
      glow: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
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
        return <div className={`size-5 ${centerDot} m-auto`} />;
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
        return <div className={`size-5 ${centerDot} m-auto`} />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-2.5 select-none">
      <div className="relative">
        <motion.button
          type="button"
          disabled={disabled || isRolling}
          onClick={handleTap}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
          animate={
            isRolling
              ? {
                  rotateX: [0, 180, 360, 540, 720],
                  rotateY: [0, 90, 270, 450, 720],
                  rotateZ: [0, 45, 135, 225, 360],
                  scale: [1, 1.25, 0.95, 1.15, 1],
                  y: [0, -20, 8, -12, 0],
                }
              : { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, y: 0 }
          }
          transition={
            isRolling
              ? { duration: 0.65, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 450, damping: 25 }
          }
          className={`relative size-20 sm:size-22 md:size-24 rounded-3xl bg-gradient-to-b from-white via-slate-50 to-slate-200 border-4 ${
            currentTheme.border
          } ${
            !disabled ? currentTheme.glow : 'opacity-60 grayscale-[50%]'
          } shadow-2xl flex items-center justify-center cursor-pointer overflow-hidden`}
          style={{
            boxShadow:
              'inset 0 3px 6px rgba(255,255,255,1), inset 0 -4px 8px rgba(0,0,0,0.2), 0 12px 28px rgba(0,0,0,0.5)',
          }}
          title={disabled ? 'Wait for turn' : 'Tap to Roll Dice'}
        >
          {/* Specular glare */}
          <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-b from-white/90 to-transparent pointer-events-none" />

          {/* Dots */}
          <div className="w-full h-full flex items-center justify-center p-1.5">
            {renderDots(value || 6)}
          </div>

          {/* Rolling blur effect */}
          {isRolling && (
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] animate-pulse pointer-events-none" />
          )}
        </motion.button>

        {/* Dynamic bottom shadow */}
        <motion.div
          animate={isRolling ? { scale: [1, 0.6, 1.2, 0.8, 1], opacity: [0.6, 0.2, 0.7, 0.3, 0.6] } : { scale: 1, opacity: 0.5 }}
          transition={{ duration: 0.65 }}
          className="absolute -bottom-3 inset-x-3 h-3 bg-black/60 rounded-full filter blur-sm pointer-events-none"
        />
      </div>

      {/* Turn indicator badge */}
      <span
        className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          currentTheme.badge
        } shadow-md`}
      >
        {playerColor}&apos;s Turn {disabled ? '' : '(Tap Dice)'}
      </span>
    </div>
  );
}
