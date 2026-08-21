'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayerColor,
  Token,
  PlayerState,
  SAFE_INDICES,
  COLOR_START_INDICES,
} from './ludoTypes';
import { LudoBoard } from './LudoBoard';
import { LudoDice } from './LudoDice';
import { SecretPinModal } from './SecretPinModal';
import { ludoAudio } from './LudoSoundEffects';
import { ludoOnline, GameAction } from './ludoOnline';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Bot,
  KeyRound,
  Globe,
  Copy,
  Check,
  Smile,
  Flame,
  Crown,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';

const INITIAL_PLAYERS: Record<PlayerColor, PlayerState> = {
  red: {
    color: 'red',
    name: 'Player 1 (Red)',
    isAI: false,
    tokens: [
      { id: 0, color: 'red', status: 'base', step: -1 },
      { id: 1, color: 'red', status: 'base', step: -1 },
      { id: 2, color: 'red', status: 'base', step: -1 },
      { id: 3, color: 'red', status: 'base', step: -1 },
    ],
    score: 0,
  },
  green: {
    color: 'green',
    name: 'Bot Charlie',
    isAI: true,
    tokens: [
      { id: 0, color: 'green', status: 'base', step: -1 },
      { id: 1, color: 'green', status: 'base', step: -1 },
      { id: 2, color: 'green', status: 'base', step: -1 },
      { id: 3, color: 'green', status: 'base', step: -1 },
    ],
    score: 0,
  },
  yellow: {
    color: 'yellow',
    name: 'Bot Alex',
    isAI: true,
    tokens: [
      { id: 0, color: 'yellow', status: 'base', step: -1 },
      { id: 1, color: 'yellow', status: 'base', step: -1 },
      { id: 2, color: 'yellow', status: 'base', step: -1 },
      { id: 3, color: 'yellow', status: 'base', step: -1 },
    ],
    score: 0,
  },
  blue: {
    color: 'blue',
    name: 'Bot Maya',
    isAI: true,
    tokens: [
      { id: 0, color: 'blue', status: 'base', step: -1 },
      { id: 1, color: 'blue', status: 'base', step: -1 },
      { id: 2, color: 'blue', status: 'base', step: -1 },
      { id: 3, color: 'blue', status: 'base', step: -1 },
    ],
    score: 0,
  },
};

export function LudoGameView() {
  const [players, setPlayers] = useState<Record<PlayerColor, PlayerState>>(INITIAL_PLAYERS);
  const [activePlayer, setActivePlayer] = useState<PlayerColor>('red');
  const [diceValue, setDiceValue] = useState<number>(6);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [gameMode, setGameMode] = useState<'ai' | 'pass' | 'online'>('ai');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [centerTapCount, setCenterTapCount] = useState(0);
  const [winner, setWinner] = useState<PlayerColor | null>(null);

  // Online Multiplayer Room State
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(true);
  const [myOnlineColor, setMyOnlineColor] = useState<PlayerColor>('red');
  const [reactionBubble, setReactionBubble] = useState<{ emoji: string; sender: string } | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState(false);

  const centerTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerOrder: PlayerColor[] =
    gameMode === 'online' ? ['red', 'green'] : ['red', 'green', 'yellow', 'blue'];

  // Toggle sound
  const handleToggleSound = () => {
    const newState = ludoAudio.toggleSound();
    setSoundOn(newState);
  };

  // Reset Game
  const resetGame = (broadcast = true) => {
    const freshPlayers = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    if (gameMode === 'online') {
      freshPlayers.red.name = isHost ? 'You (Red)' : 'Friend (Red)';
      freshPlayers.green.name = isHost ? 'Friend (Green)' : 'You (Green)';
      freshPlayers.green.isAI = false;
    } else if (gameMode === 'pass') {
      freshPlayers.green.name = 'Player 2';
      freshPlayers.green.isAI = false;
    }
    setPlayers(freshPlayers);
    setActivePlayer('red');
    setDiceValue(6);
    setHasRolled(false);
    setIsRolling(false);
    setWinner(null);

    if (broadcast && gameMode === 'online' && onlineRoomCode) {
      ludoOnline.sendAction({
        type: 'RESET',
        roomCode: onlineRoomCode,
        senderColor: myOnlineColor,
        senderName: isHost ? 'Host' : 'Friend',
        timestamp: Date.now(),
      });
    }

    toast.success('Ludo match reset!');
  };

  // Switch turn
  const nextTurn = useCallback(() => {
    setHasRolled(false);
    const currentIdx = playerOrder.indexOf(activePlayer);
    const nextPlayer = playerOrder[(currentIdx + 1) % playerOrder.length];
    setActivePlayer(nextPlayer);
  }, [activePlayer, playerOrder]);

  // Check if token can move
  const canMoveToken = useCallback(
    (token: Token): boolean => {
      if (token.color !== activePlayer) return false;
      if (!hasRolled || isRolling) return false;

      // In Online mode, you can only move your own tokens
      if (gameMode === 'online' && token.color !== myOnlineColor) {
        return false;
      }

      if (token.status === 'base') {
        return diceValue === 6;
      }

      if (token.status === 'track') {
        return token.step + diceValue <= 56;
      }

      return false;
    },
    [activePlayer, hasRolled, isRolling, diceValue, gameMode, myOnlineColor]
  );

  // Execute token move
  const handleMoveToken = useCallback(
    (token: Token, broadcast = true) => {
      if (!canMoveToken(token) && broadcast) return;

      ludoAudio.playTokenMove();

      setPlayers((prev) => {
        const nextState = { ...prev };
        const player = { ...nextState[token.color] };
        const updatedTokens = [...player.tokens];
        const targetToken = { ...updatedTokens[token.id] };

        if (targetToken.status === 'base' && diceValue === 6) {
          targetToken.status = 'track';
          targetToken.step = 0;
        } else if (targetToken.status === 'track') {
          const newStep = targetToken.step + diceValue;
          if (newStep === 56) {
            targetToken.status = 'home';
            targetToken.step = 56;
            player.score += 100;
            ludoAudio.playSafeStar();
          } else {
            targetToken.step = newStep;
          }
        }

        updatedTokens[token.id] = targetToken;
        player.tokens = updatedTokens;
        nextState[token.color] = player;

        // Check capture
        if (targetToken.status === 'track' && targetToken.step < 51) {
          const myGlobalIdx =
            (COLOR_START_INDICES[token.color] + targetToken.step) % 52;
          const isSafe = SAFE_INDICES.includes(myGlobalIdx);

          if (!isSafe) {
            playerOrder.forEach((otherColor) => {
              if (otherColor !== token.color) {
                const otherPlayer = { ...nextState[otherColor] };
                const otherTokens = [...otherPlayer.tokens];
                let captured = false;

                otherTokens.forEach((ot, idx) => {
                  if (ot.status === 'track' && ot.step < 51) {
                    const otGlobalIdx =
                      (COLOR_START_INDICES[otherColor] + ot.step) % 52;
                    if (otGlobalIdx === myGlobalIdx) {
                      otherTokens[idx] = { ...ot, status: 'base', step: -1 };
                      captured = true;
                    }
                  }
                });

                if (captured) {
                  otherPlayer.tokens = otherTokens;
                  nextState[otherColor] = otherPlayer;
                  ludoAudio.playTokenCapture();
                  toast.info(
                    `⚔️ ${token.color.toUpperCase()} captured ${otherColor.toUpperCase()} token!`
                  );
                }
              }
            });
          }
        }

        // Check win condition
        const allHome = player.tokens.every((t) => t.status === 'home');
        if (allHome) {
          setWinner(player.color);
          ludoAudio.playSafeStar();
          toast.success(`🎉 ${player.name} Won the Ludo Match!`);
        }

        return nextState;
      });

      // Broadcast move to remote friend in Online mode
      if (broadcast && gameMode === 'online' && onlineRoomCode) {
        ludoOnline.sendAction({
          type: 'MOVE',
          roomCode: onlineRoomCode,
          senderColor: token.color,
          senderName: isHost ? 'Host' : 'Friend',
          payload: { tokenId: token.id, diceValue },
          timestamp: Date.now(),
        });
      }

      if (diceValue === 6) {
        setHasRolled(false);
        toast.info('Rolled a 6! Roll again.', { duration: 1200 });
      } else {
        nextTurn();
      }
    },
    [canMoveToken, diceValue, nextTurn, gameMode, onlineRoomCode, isHost, myOnlineColor, playerOrder]
  );

  // Roll Dice Action
  const rollDice = useCallback(
    (forcedValue?: number, broadcast = true) => {
      if (isRolling || hasRolled) return;

      setIsRolling(true);
      ludoAudio.playDiceRoll();

      setTimeout(() => {
        const rolled = forcedValue || Math.floor(Math.random() * 6) + 1;
        setDiceValue(rolled);
        setIsRolling(false);
        setHasRolled(true);

        // Broadcast to remote player
        if (broadcast && gameMode === 'online' && onlineRoomCode) {
          ludoOnline.sendAction({
            type: 'ROLL',
            roomCode: onlineRoomCode,
            senderColor: activePlayer,
            senderName: isHost ? 'Host' : 'Friend',
            payload: { value: rolled },
            timestamp: Date.now(),
          });
        }

        const currentPlayerState = players[activePlayer];
        const validTokens = currentPlayerState.tokens.filter((t) => {
          if (t.status === 'base') return rolled === 6;
          if (t.status === 'track') return t.step + rolled <= 56;
          return false;
        });

        if (validTokens.length === 0) {
          setTimeout(() => {
            nextTurn();
          }, 800);
        } else if (validTokens.length === 1 && currentPlayerState.isAI) {
          setTimeout(() => {
            handleMoveToken(validTokens[0]);
          }, 600);
        }
      }, 600);
    },
    [
      isRolling,
      hasRolled,
      gameMode,
      onlineRoomCode,
      activePlayer,
      isHost,
      players,
      nextTurn,
      handleMoveToken,
    ]
  );

  // Online Multiplayer Event Listener
  useEffect(() => {
    if (gameMode !== 'online' || !onlineRoomCode) return;

    const unsubscribe = ludoOnline.subscribe((action: GameAction) => {
      if (action.roomCode !== onlineRoomCode) return;

      // Ignore actions sent by myself
      if (action.senderColor === myOnlineColor && action.type !== 'RESET') return;

      if (action.type === 'ROLL') {
        setDiceValue(action.payload.value);
        rollDice(action.payload.value, false);
      } else if (action.type === 'MOVE') {
        const tokenColor = action.senderColor;
        const targetPlayer = players[tokenColor];
        if (targetPlayer) {
          const targetToken = targetPlayer.tokens[action.payload.tokenId];
          if (targetToken) {
            handleMoveToken(targetToken, false);
          }
        }
      } else if (action.type === 'REACTION') {
        setReactionBubble({ emoji: action.payload.emoji, sender: action.senderName });
        setTimeout(() => setReactionBubble(null), 3000);
      } else if (action.type === 'RESET') {
        resetGame(false);
      }
    });

    return () => unsubscribe();
  }, [gameMode, onlineRoomCode, myOnlineColor, players, rollDice, handleMoveToken]);

  // Connect to Online Room
  const handleJoinOnlineRoom = (code: string, host: boolean) => {
    setOnlineRoomCode(code);
    setIsHost(host);
    setGameMode('online');
    setMyOnlineColor(host ? 'red' : 'green');

    setPlayers((prev) => {
      const next = { ...prev };
      next.red = {
        ...next.red,
        name: host ? 'You (Red)' : 'Friend (Red)',
        isAI: false,
      };
      next.green = {
        ...next.green,
        name: host ? 'Friend (Green)' : 'You (Green)',
        isAI: false,
      };
      return next;
    });

    toast.success(
      `Joined Table #${code}! ${host ? 'You play RED' : 'You play GREEN'}`
    );
  };

  // Send In-Game Reaction
  const sendReaction = (emoji: string) => {
    setReactionBubble({ emoji, sender: 'You' });
    setTimeout(() => setReactionBubble(null), 3000);

    if (gameMode === 'online' && onlineRoomCode) {
      ludoOnline.sendAction({
        type: 'REACTION',
        roomCode: onlineRoomCode,
        senderColor: myOnlineColor,
        senderName: isHost ? 'Host' : 'Friend',
        payload: { emoji },
        timestamp: Date.now(),
      });
    }
  };

  // Secret Center Star Tap Trigger
  const handleSecretCenterTap = () => {
    setCenterTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsPinModalOpen(true);
        return 0;
      }
      return next;
    });

    if (centerTapTimeoutRef.current) clearTimeout(centerTapTimeoutRef.current);
    centerTapTimeoutRef.current = setTimeout(() => {
      setCenterTapCount(0);
    }, 1500);
  };

  // Copy active room code
  const copyActiveRoomCode = () => {
    if (!onlineRoomCode) return;
    navigator.clipboard.writeText(onlineRoomCode);
    setCopiedCode(true);
    toast.success(`Room Code #${onlineRoomCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-2 sm:p-3 md:p-6 select-none font-sans">
      {/* Top Navbar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 px-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            🎲
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base tracking-tight text-white flex items-center gap-1.5">
              Ludo Arena 3D
              {gameMode === 'online' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
                  <Globe size={10} /> 2P Table #{onlineRoomCode}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  Online
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">
              {gameMode === 'online'
                ? `Playing with Friend (${isHost ? 'Red' : 'Green'})`
                : 'Casual Board Match'}
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {/* Room Code Copy badge if online */}
          {gameMode === 'online' && onlineRoomCode && (
            <button
              onClick={copyActiveRoomCode}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-mono font-bold border border-slate-700 transition"
              title="Copy Table Code"
            >
              {copiedCode ? <Check size={13} /> : <Copy size={13} />}
              <span>#{onlineRoomCode}</span>
            </button>
          )}

          {/* Disguised Private Room Button */}
          <button
            type="button"
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-800/90 hover:from-slate-700 hover:to-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 shadow-sm"
            title="Create or Join 2-Player Private Room"
          >
            <KeyRound size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Private Table</span>
            <span className="sm:hidden">Table</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={soundOn ? 'Mute Game' : 'Unmute Game'}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => resetGame(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Restart Match"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* Main Arena */}
      <main className="max-w-4xl w-full mx-auto my-auto py-3 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Side: Scoreboard & Player Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-2.5">
          {playerOrder.map((color) => {
            const p = players[color];
            const isActive = activePlayer === color;
            const borderColors = {
              red: 'border-red-500/60 bg-red-500/10',
              green: 'border-emerald-500/60 bg-emerald-500/10',
              yellow: 'border-amber-400/60 bg-amber-400/10',
              blue: 'border-blue-500/60 bg-blue-500/10',
            };

            return (
              <div
                key={color}
                className={`p-2.5 rounded-2xl border transition-all ${
                  isActive
                    ? `${borderColors[color]} shadow-lg ring-1 ring-white/20`
                    : 'border-slate-800 bg-slate-900/50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold capitalize text-white flex items-center gap-1.5">
                    <span
                      className={`size-2.5 rounded-full ${
                        color === 'red'
                          ? 'bg-red-500'
                          : color === 'green'
                          ? 'bg-emerald-500'
                          : color === 'yellow'
                          ? 'bg-amber-400'
                          : 'bg-blue-500'
                      }`}
                    />
                    {p.name}
                  </span>
                  {p.isAI ? (
                    <Bot size={13} className="text-slate-400" />
                  ) : (
                    <Users size={13} className="text-rose-400" />
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Home: {p.tokens.filter((t) => t.status === 'home').length}/4</span>
                  <span>Score: {p.score}</span>
                </div>
              </div>
            );
          })}

          {/* Quick Reaction Tray for 2P match */}
          <div className="p-2 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-around">
            {['🔥', '👑', '😂', '🎲', '❤️'].map((em) => (
              <button
                key={em}
                onClick={() => sendReaction(em)}
                className="hover:scale-125 transition active:scale-95 text-lg"
                title={`Send ${em}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Ludo Board */}
        <div className="lg:col-span-6 flex justify-center relative">
          {/* Reaction Float Bubble */}
          <AnimatePresence>
            {reactionBubble && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1.2, y: -20 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-4 z-30 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-2xl flex items-center gap-2 backdrop-blur-md"
              >
                <span className="text-2xl">{reactionBubble.emoji}</span>
                <span className="text-xs font-semibold text-amber-400">
                  {reactionBubble.sender}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <LudoBoard
            players={players}
            activePlayer={activePlayer}
            diceValue={diceValue}
            canMoveToken={canMoveToken}
            onTokenClick={handleMoveToken}
            onSecretCenterTap={handleSecretCenterTap}
          />
        </div>

        {/* Right Side: Dice & Turn Controller */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center gap-4 bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 rounded-3xl backdrop-blur-sm shadow-xl">
          <div className="text-center">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              Current Turn
            </p>
            <h3 className="text-sm font-semibold text-white mt-0.5">
              {players[activePlayer].name}
            </h3>
          </div>

          {/* 3D Dice */}
          <LudoDice
            value={diceValue}
            isRolling={isRolling}
            disabled={
              isRolling ||
              hasRolled ||
              (gameMode === 'ai' && players[activePlayer].isAI) ||
              (gameMode === 'online' && activePlayer !== myOnlineColor)
            }
            playerColor={activePlayer}
            onRoll={() => rollDice()}
            onSecretTrigger={() => setIsPinModalOpen(true)}
          />

          {/* Mode Switcher */}
          <div className="w-full grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-medium">
            <button
              onClick={() => {
                setGameMode('ai');
                setOnlineRoomCode(null);
                resetGame(false);
              }}
              className={`py-1.5 rounded-lg transition text-center ${
                gameMode === 'ai'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              vs AI
            </button>
            <button
              onClick={() => {
                setGameMode('pass');
                setOnlineRoomCode(null);
                resetGame(false);
              }}
              className={`py-1.5 rounded-lg transition text-center ${
                gameMode === 'pass'
                  ? 'bg-slate-800 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2P Local
            </button>
            <button
              onClick={() => setIsPinModalOpen(true)}
              className={`py-1.5 rounded-lg transition text-center ${
                gameMode === 'online'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2P Online
            </button>
          </div>
        </div>
      </main>

      {/* Secret PIN & Online Room Modal */}
      <SecretPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onJoinOnlineRoom={handleJoinOnlineRoom}
      />
    </div>
  );
}
