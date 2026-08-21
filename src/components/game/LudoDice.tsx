'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const isLongPressActive = useRef(false);

  // Color mapping
  const colorStyles = {
    red: {
      border: 'border-red-500',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.45)]',
      bg: 'from-red-600 to-rose-700',
      badge: 'bg-red-500 text-white',
    },
    green: {
      border: 'border-emerald-500',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.45)]',
      bg: 'from-emerald-600 to-teal-700',
      badge: 'bg-emerald-500 text-white',
    },
    yellow: {
      border: 'border-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.45)]',
      bg: 'from-amber-500 to-yellow-600',
      badge: 'bg-amber-400 text-slate-900',
    },
    blue: {
      border: 'border-blue-500',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.45)]',
      bg: 'from-blue-600 to-indigo-700',
      badge: 'bg-blue-500 text-white',
    },
  };

  const currentTheme = colorStyles[playerColor] || colorStyles.red;

  // Multi-tap secret detection (5 quick taps)
  const handleTap = () => {
    if (disabled || isRolling) return;

    // Normal roll action
    onRoll();

    // Secret Tap counter
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        if (onSecretTrigger) onSecretTrigger();
        return 0;
      }
      return next;
    });

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      setTapCount(0);
    }, 1200);
  };

  // Long press secret trigger (Hold for 2 seconds)
  const startLongPress = () => {
    isLongPressActive.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      if (onSecretTrigger) {
        onSecretTrigger();
      }
    }, 2000);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // Render dice face dots
  const renderDots = (num: number) => {
    switch (num) {
      case 1:
        return <div className="size-4.5 rounded-full bg-red-600 shadow-inner m-auto" />;
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <div className="size-3.5 rounded-full bg-slate-800 self-start shadow-sm" />
            <div className="size-3.5 rounded-full bg-slate-800 self-end shadow-sm" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <div className="size-3.5 rounded-full bg-slate-800 self-start shadow-sm" />
            <div className="size-3.5 rounded-full bg-slate-800 self-center shadow-sm" />
            <div className="size-3.5 rounded-full bg-slate-800 self-end shadow-sm" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-2.5 p-2 place-items-center w-full h-full">
            <div className="size-3.5 rounded-full bg-slate-800 shadow-sm" />
            <div className="size-3.5 rounded-full bg-slate-800 shadow-sm" />
            <div className="size-3.5 rounded-full bg-slate-800 shadow-sm" />
            <div className="size-3.5 rounded-full bg-slate-800 shadow-sm" />
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-3 grid-rows-3 p-1.5 place-items-center w-full h-full">
            <div className="size-3 rounded-full bg-slate-800 row-start-1 col-start-1" />
            <div className="size-3 rounded-full bg-slate-800 row-start-1 col-start-3" />
            <div className="size-3.5 rounded-full bg-red-600 row-start-2 col-start-2 shadow-inner" />
            <div className="size-3 rounded-full bg-slate-800 row-start-3 col-start-1" />
            <div className="size-3 rounded-full bg-slate-800 row-start-3 col-start-3" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 gap-x-3 gap-y-1.5 p-1.5 place-items-center w-full h-full">
            <div className="size-3 rounded-full bg-slate-800" />
            <div className="size-3 rounded-full bg-slate-800" />
            <div className="size-3 rounded-full bg-slate-800" />
            <div className="size-3 rounded-full bg-slate-800" />
            <div className="size-3 rounded-full bg-slate-800" />
            <div className="size-3 rounded-full bg-slate-800" />
          </div>
        );
      default:
        return <div className="size-4.5 rounded-full bg-red-600 shadow-inner m-auto" />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <motion.button
        type="button"
        disabled={disabled || isRolling}
        onClick={handleTap}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        whileTap={{ scale: disabled ? 1 : 0.92 }}
        animate={
          isRolling
            ? {
                rotate: [0, 90, 180, 270, 360, 450, 540],
                scale: [1, 1.15, 0.95, 1.1, 1],
                y: [0, -12, 4, -8, 0],
              }
            : { rotate: 0, scale: 1, y: 0 }
        }
        transition={
          isRolling
            ? { duration: 0.6, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 400, damping: 25 }
        }
        className={`relative size-20 md:size-24 rounded-2xl bg-white text-slate-900 border-3 ${
          currentTheme.border
        } ${
          !disabled ? currentTheme.glow : 'opacity-60 grayscale-[40%]'
        } shadow-xl flex items-center justify-center cursor-pointer transition-all hover:brightness-105 active:shadow-md overflow-hidden`}
        style={{
          boxShadow:
            'inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -3px 6px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.35)',
        }}
        title={disabled ? 'Wait for move' : 'Click to Roll Dice'}
      >
        {/* Dice Face Content */}
        <div className="w-full h-full flex items-center justify-center p-1">
          {renderDots(value || 6)}
        </div>

        {/* Rolling sheen overlay */}
        {isRolling && (
          <div className="absolute inset-0 bg-white/40 animate-pulse pointer-events-none" />
        )}
      </motion.button>

      {/* Helper text / turn banner */}
      <div className="text-center">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            currentTheme.badge
          } shadow-sm`}
        >
          {playerColor}&apos;s Turn {disabled ? '(Moving...)' : '(Roll Dice)'}
        </span>
      </div>
    </div>
  );
}
