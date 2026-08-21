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
  Trophy,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

const INITIAL_PLAYERS: Record<PlayerColor, PlayerState> = {
  red: {
    color: 'red',
    name: 'You (Red)',
    isAI: false,
    tokens: [
      { id: 0, color: 'red', status: 'base', step: -1 },
      { id: 1, color: 'red', status: 'base', step: -1 },
      { id: 2, color: 'red', status: 'base', step: -1 },
      { id: 3, color: 'red', status: 'base', step: -1 },
    ],
    score: 0,
    sixStreak: 0,
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
    sixStreak: 0,
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
    sixStreak: 0,
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
    sixStreak: 0,
  },
};

export function LudoGameView() {
  const [players, setPlayers] = useState<Record<PlayerColor, PlayerState>>(INITIAL_PLAYERS);
  const [activePlayer, setActivePlayer] = useState<PlayerColor>('red');
  const [diceValue, setDiceValue] = useState<number>(6);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);
  const [movingTokenId, setMovingTokenId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [gameMode, setGameMode] = useState<'ai' | 'pass' | 'online'>('ai');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [centerTapCount, setCenterTapCount] = useState(0);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [gameLog, setGameLog] = useState<string>('Welcome to Ludo Arena! Roll dice to start.');
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(15);

  // Online Multiplayer State
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(true);
  const [myOnlineColor, setMyOnlineColor] = useState<PlayerColor>('red');
  const [reactionBubble, setReactionBubble] = useState<{ emoji: string; sender: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const centerTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerOrder: PlayerColor[] =
    gameMode === 'online' ? ['red', 'green'] : ['red', 'green', 'yellow', 'blue'];

  // Toggle sound
  const handleToggleSound = () => {
    const newState = ludoAudio.toggleSound();
    setSoundOn(newState);
  };

  // Log action message
  const logMessage = (msg: string) => {
    setGameLog(msg);
  };

  // Reset Game
  const resetGame = (broadcast = true) => {
    const freshPlayers = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    if (gameMode === 'online') {
      freshPlayers.red.name = isHost ? 'You (Red)' : 'Friend (Red)';
      freshPlayers.green.name = isHost ? 'Friend (Green)' : 'You (Green)';
      freshPlayers.green.isAI = false;
    } else if (gameMode === 'pass') {
      freshPlayers.green.name = 'Player 2 (Green)';
      freshPlayers.green.isAI = false;
    }
    setPlayers(freshPlayers);
    setActivePlayer('red');
    setDiceValue(6);
    setHasRolled(false);
    setIsRolling(false);
    setIsAnimatingMove(false);
    setMovingTokenId(null);
    setWinner(null);
    setTurnTimeLeft(15);
    logMessage('Match restarted. Red starts the game!');

    if (broadcast && gameMode === 'online' && onlineRoomCode) {
      ludoOnline.sendAction({
        type: 'RESET',
        roomCode: onlineRoomCode,
        senderColor: myOnlineColor,
        senderName: isHost ? 'Host' : 'Friend',
        timestamp: Date.now(),
      });
    }

    toast.success('Ludo Arena match reset!');
  };

  // Turn timer countdown (15 seconds)
  useEffect(() => {
    if (winner || isRolling || isAnimatingMove) return;

    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired -> auto roll or pass
          if (!hasRolled) {
            rollDice();
          } else {
            nextTurn();
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePlayer, hasRolled, isRolling, isAnimatingMove, winner]);

  // Switch turn
  const nextTurn = useCallback(() => {
    setHasRolled(false);
    setTurnTimeLeft(15);
    const currentIdx = playerOrder.indexOf(activePlayer);
    const nextPlayer = playerOrder[(currentIdx + 1) % playerOrder.length];
    setActivePlayer(nextPlayer);
  }, [activePlayer, playerOrder]);

  // Check if a token can move
  const canMoveToken = useCallback(
    (token: Token): boolean => {
      if (token.color !== activePlayer) return false;
      if (!hasRolled || isRolling || isAnimatingMove) return false;

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
    [activePlayer, hasRolled, isRolling, isAnimatingMove, diceValue, gameMode, myOnlineColor]
  );

  // Step-by-Step Token Hop Animation
  const animateTokenMovement = useCallback(
    async (token: Token, targetStep: number, isSpawning: boolean): Promise<void> => {
      setIsAnimatingMove(true);
      setMovingTokenId(`${token.color}-${token.id}`);

      if (isSpawning) {
        // Spawn animation from base to start tile (step = 0)
        ludoAudio.playSafeStar();
        await new Promise((r) => setTimeout(r, 180));
        setPlayers((prev) => {
          const next = { ...prev };
          const p = { ...next[token.color] };
          const tokens = [...p.tokens];
          tokens[token.id] = { ...tokens[token.id], status: 'track', step: 0 };
          p.tokens = tokens;
          next[token.color] = p;
          return next;
        });
      } else {
        // Hop tile by tile
        const startStep = token.step;
        const totalSteps = targetStep - startStep;

        for (let s = 1; s <= totalSteps; s++) {
          const curStep = startStep + s;
          ludoAudio.playTokenStep();
          await new Promise((r) => setTimeout(r, 90));

          setPlayers((prev) => {
            const next = { ...prev };
            const p = { ...next[token.color] };
            const tokens = [...p.tokens];
            tokens[token.id] = {
              ...tokens[token.id],
              step: curStep,
              status: curStep === 56 ? 'home' : 'track',
            };
            p.tokens = tokens;
            next[token.color] = p;
            return next;
          });
        }
      }

      setIsAnimatingMove(false);
      setMovingTokenId(null);
    },
    []
  );

  // Execute token move
  const handleMoveToken = useCallback(
    async (token: Token, broadcast = true) => {
      if (!canMoveToken(token) && broadcast) return;

      const isSpawning = token.status === 'base' && diceValue === 6;
      const targetStep = isSpawning ? 0 : token.step + diceValue;

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

      // Run smooth stepping animation
      await animateTokenMovement(token, targetStep, isSpawning);

      // Check capture and home triumph
      let didCapture = false;
      let didReachHome = targetStep === 56;

      setPlayers((prev) => {
        const nextState = { ...prev };
        const player = { ...nextState[token.color] };

        if (didReachHome) {
          player.score += 150;
          ludoAudio.playVictoryFanfare();
          logMessage(`🏆 ${player.name} got a token HOME! Extra roll awarded!`);
        }

        // Check capture on main track
        if (!isSpawning && targetStep < 51) {
          const myGlobalIdx = (COLOR_START_INDICES[token.color] + targetStep) % 52;
          const isSafe = SAFE_INDICES.includes(myGlobalIdx);

          if (!isSafe) {
            playerOrder.forEach((otherColor) => {
              if (otherColor !== token.color) {
                const otherPlayer = { ...nextState[otherColor] };
                const otherTokens = [...otherPlayer.tokens];

                otherTokens.forEach((ot, idx) => {
                  if (ot.status === 'track' && ot.step < 51) {
                    const otGlobalIdx = (COLOR_START_INDICES[otherColor] + ot.step) % 52;
                    if (otGlobalIdx === myGlobalIdx) {
                      otherTokens[idx] = { ...ot, status: 'base', step: -1 };
                      didCapture = true;
                      player.score += 100;
                      ludoAudio.playTokenCapture();
                      logMessage(`⚔️ ${player.name} captured ${otherPlayer.name}'s token! Extra turn!`);
                    }
                  }
                });

                if (didCapture) {
                  otherPlayer.tokens = otherTokens;
                  nextState[otherColor] = otherPlayer;
                }
              }
            });
          }
        }

        // Check victory (all 4 tokens home)
        const allHome = player.tokens.every((t) => t.status === 'home');
        if (allHome) {
          setWinner(player.color);
          ludoAudio.playVictoryFanfare();
          logMessage(`🎉 VICTORY! ${player.name} has won the Ludo Championship!`);
        }

        return nextState;
      });

      // Bonus roll on 6, capture, or home finish
      if (diceValue === 6 || didCapture || didReachHome) {
        setHasRolled(false);
        setTurnTimeLeft(15);
        if (diceValue === 6) {
          logMessage(`🎲 Rolled a 6! ${players[token.color].name} rolls again.`);
        }
      } else {
        nextTurn();
      }
    },
    [
      canMoveToken,
      diceValue,
      nextTurn,
      animateTokenMovement,
      gameMode,
      onlineRoomCode,
      isHost,
      playerOrder,
      players,
    ]
  );

  // Roll Dice Action
  const rollDice = useCallback(
    (forcedValue?: number, broadcast = true) => {
      if (isRolling || hasRolled || isAnimatingMove) return;

      setIsRolling(true);
      ludoAudio.playDiceRoll();

      setTimeout(() => {
        const rolled = forcedValue || Math.floor(Math.random() * 6) + 1;
        setDiceValue(rolled);
        setIsRolling(false);
        setHasRolled(true);

        const currentPlayerState = players[activePlayer];
        logMessage(`🎲 ${currentPlayerState.name} rolled a ${rolled}!`);

        // Check 3 consecutive sixes rule
        let streak = rolled === 6 ? currentPlayerState.sixStreak + 1 : 0;
        currentPlayerState.sixStreak = streak;

        if (streak >= 3) {
          toast.error('3 consecutive 6s! Turn forfeited.');
          logMessage(`⚠️ ${currentPlayerState.name} rolled 3 sixes in a row. Turn passed!`);
          setTimeout(nextTurn, 800);
          return;
        }

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

        const validTokens = currentPlayerState.tokens.filter((t) => {
          if (t.status === 'base') return rolled === 6;
          if (t.status === 'track') return t.step + rolled <= 56;
          return false;
        });

        if (validTokens.length === 0) {
          logMessage(`No moves available for ${currentPlayerState.name}. Next turn...`);
          setTimeout(nextTurn, 900);
        } else if (validTokens.length === 1 && currentPlayerState.isAI) {
          // Auto move single eligible token for AI
          setTimeout(() => handleMoveToken(validTokens[0]), 650);
        }
      }, 650);
    },
    [
      isRolling,
      hasRolled,
      isAnimatingMove,
      gameMode,
      onlineRoomCode,
      activePlayer,
      isHost,
      players,
      nextTurn,
      handleMoveToken,
    ]
  );

  // Smart AI Decision Making
  useEffect(() => {
    const currentPlayerState = players[activePlayer];
    if (gameMode === 'ai' && currentPlayerState.isAI && !winner && !isAnimatingMove) {
      if (!hasRolled && !isRolling) {
        const timer = setTimeout(() => rollDice(), 750);
        return () => clearTimeout(timer);
      }

      if (hasRolled && !isRolling) {
        const validTokens = currentPlayerState.tokens.filter((t) => {
          if (t.status === 'base') return diceValue === 6;
          if (t.status === 'track') return t.step + diceValue <= 56;
          return false;
        });

        if (validTokens.length > 0) {
          const timer = setTimeout(() => {
            // 1. Prioritize capturing opponent
            let chosen = validTokens.find((t) => {
              if (t.status !== 'track' || t.step + diceValue >= 51) return false;
              const targetIdx = (COLOR_START_INDICES[t.color] + t.step + diceValue) % 52;
              if (SAFE_INDICES.includes(targetIdx)) return false;

              return Object.values(players).some((other) => {
                if (other.color === t.color) return false;
                return other.tokens.some((ot) => {
                  if (ot.status !== 'track' || ot.step >= 51) return false;
                  return (COLOR_START_INDICES[other.color] + ot.step) % 52 === targetIdx;
                });
              });
            });

            // 2. Prioritize entering home (finish)
            if (!chosen) {
              chosen = validTokens.find((t) => t.status === 'track' && t.step + diceValue === 56);
            }

            // 3. Prioritize releasing base token on 6
            if (!chosen && diceValue === 6) {
              chosen = validTokens.find((t) => t.status === 'base');
            }

            // 4. Default: advance closest-to-home token
            if (!chosen) {
              chosen = validTokens.sort((a, b) => b.step - a.step)[0];
            }

            handleMoveToken(chosen);
          }, 700);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [
    activePlayer,
    players,
    gameMode,
    hasRolled,
    isRolling,
    isAnimatingMove,
    diceValue,
    winner,
    rollDice,
    handleMoveToken,
  ]);

  // Online Multiplayer Event Listener
  useEffect(() => {
    if (gameMode !== 'online' || !onlineRoomCode) return;

    const unsubscribe = ludoOnline.subscribe((action: GameAction) => {
      if (action.roomCode !== onlineRoomCode) return;
      if (action.senderColor === myOnlineColor && action.type !== 'RESET') return;

      if (action.type === 'ROLL') {
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

    toast.success(`Joined Table #${code}! ${host ? 'You play RED' : 'You play GREEN'}`);
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
    centerTapTimeoutRef.current = setTimeout(() => setCenterTapCount(0), 1500);
  };

  const copyActiveRoomCode = () => {
    if (!onlineRoomCode) return;
    navigator.clipboard.writeText(onlineRoomCode);
    setCopiedCode(true);
    toast.success(`Room Code #${onlineRoomCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#070b14] to-black text-slate-100 flex flex-col justify-between p-2 sm:p-3 md:p-5 select-none font-sans">
      {/* Top Navbar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 px-3 sm:px-4 rounded-2xl bg-slate-900/85 border border-slate-800 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-500/20 text-lg">
            🎲
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              Ludo Arena 3D
              {gameMode === 'online' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
                  <Globe size={11} /> 2P Table #{onlineRoomCode}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Classic Pro
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">
              {gameMode === 'online'
                ? `Match with Friend (${isHost ? 'Red' : 'Green'})`
                : '100% Authentic Board Physics'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {gameMode === 'online' && onlineRoomCode && (
            <button
              onClick={copyActiveRoomCode}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-mono font-bold border border-slate-700 transition"
              title="Copy Table Code"
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              <span>#{onlineRoomCode}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition active:scale-95 shadow-sm"
            title="Create or Join 2-Player Table"
          >
            <KeyRound size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Private Table</span>
            <span className="sm:hidden">Table</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSound}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={soundOn ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

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

      {/* Live Commentary Ticker */}
      <div className="max-w-4xl w-full mx-auto my-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 truncate">
          <Zap size={13} className="text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-medium">{gameLog}</span>
        </div>
        <div className="text-[11px] font-mono text-amber-400 font-bold shrink-0 ml-2">
          ⏳ {turnTimeLeft}s
        </div>
      </div>

      {/* Main Game Arena */}
      <main className="max-w-4xl w-full mx-auto my-auto py-2 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Side: Scoreboard */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-2">
          {playerOrder.map((color) => {
            const p = players[color];
            const isActive = activePlayer === color;
            const borderColors = {
              red: 'border-red-500 bg-red-500/15 ring-2 ring-red-500/40',
              green: 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40',
              yellow: 'border-amber-400 bg-amber-400/15 ring-2 ring-amber-400/40',
              blue: 'border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/40',
            };

            return (
              <div
                key={color}
                className={`p-2.5 rounded-2xl border transition-all ${
                  isActive
                    ? `${borderColors[color]} shadow-lg`
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
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Home: <b className="text-white">{p.tokens.filter((t) => t.status === 'home').length}/4</b></span>
                  <span>Score: <b className="text-amber-400">{p.score}</b></span>
                </div>
              </div>
            );
          })}

          {/* Quick Reaction Emojis */}
          <div className="p-2 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-around">
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
          <AnimatePresence>
            {reactionBubble && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1.2, y: -20 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-4 z-30 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 shadow-2xl flex items-center gap-2 backdrop-blur-md"
              >
                <span className="text-2xl">{reactionBubble.emoji}</span>
                <span className="text-xs font-bold text-amber-400">
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
            isMovingTokenId={movingTokenId}
          />
        </div>

        {/* Right Side: Dice & Turn Controller */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center gap-4 bg-slate-900/70 border border-slate-800 p-4 sm:p-5 rounded-3xl backdrop-blur-sm shadow-2xl">
          <div className="text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Current Move
            </p>
            <h3 className="text-sm font-extrabold text-white mt-0.5">
              {players[activePlayer].name}
            </h3>
          </div>

          {/* 3D Rolling Dice */}
          <LudoDice
            value={diceValue}
            isRolling={isRolling}
            disabled={
              isRolling ||
              hasRolled ||
              isAnimatingMove ||
              (gameMode === 'ai' && players[activePlayer].isAI) ||
              (gameMode === 'online' && activePlayer !== myOnlineColor)
            }
            playerColor={activePlayer}
            onRoll={() => rollDice()}
            onSecretTrigger={() => setIsPinModalOpen(true)}
          />

          {/* Mode Switcher */}
          <div className="w-full grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-semibold">
            <button
              onClick={() => {
                setGameMode('ai');
                setOnlineRoomCode(null);
                resetGame(false);
              }}
              className={`py-1.5 rounded-lg transition text-center ${
                gameMode === 'ai'
                  ? 'bg-slate-800 text-white shadow-md font-bold'
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
                  ? 'bg-slate-800 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2P Local
            </button>
            <button
              onClick={() => setIsPinModalOpen(true)}
              className={`py-1.5 rounded-lg transition text-center ${
                gameMode === 'online'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2P Online
            </button>
          </div>
        </div>
      </main>

      {/* VICTORY CHAMPION MODAL */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-500/60 p-6 text-center space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.3)]"
            >
              <div className="mx-auto size-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Trophy size={36} className="text-slate-950" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  Ludo Champion
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  {players[winner].name} Won!
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  All 4 tokens successfully reached the Home Triumph!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex justify-around">
                <div>
                  <span className="text-slate-400 block text-[10px]">Score</span>
                  <b className="text-amber-400 text-base">{players[winner].score}</b>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tokens Home</span>
                  <b className="text-emerald-400 text-base">4/4</b>
                </div>
              </div>

              <button
                type="button"
                onClick={() => resetGame(true)}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 transition active:scale-98"
              >
                Play New Match
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Secret PIN & Online Room Modal */}
      <SecretPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onJoinOnlineRoom={handleJoinOnlineRoom}
      />
    </div>
  );
}
