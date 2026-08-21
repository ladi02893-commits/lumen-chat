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
  Play,
  LogOut,
  Zap,
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
  const [gameState, setGameState] = useState<'lobby' | 'playing'>('lobby');
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
  const [gameLog, setGameLog] = useState<string>('Match started! Red player rolls first.');
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

  const logMessage = (msg: string) => {
    setGameLog(msg);
  };

  // Exit match and return to lobby
  const exitToLobby = () => {
    if (gameMode === 'online') {
      ludoOnline.leaveRoom();
    }
    setGameState('lobby');
    setOnlineRoomCode(null);
    setIsRolling(false);
    setIsAnimatingMove(false);
    setMovingTokenId(null);
    toast.info('Returned to Game Lobby');
  };

  // Start match from Lobby
  const startMatch = (mode: 'ai' | 'pass') => {
    setGameMode(mode);
    setOnlineRoomCode(null);
    const freshPlayers = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    if (mode === 'pass') {
      freshPlayers.red.name = 'Player 1 (Red)';
      freshPlayers.green.name = 'Player 2 (Green)';
      freshPlayers.green.isAI = false;
    } else {
      freshPlayers.red.name = 'You (Red)';
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
    setGameState('playing');
    logMessage('Match started! Red rolls the dice.');
  };

  // Reset Game
  const resetGame = (broadcast = true) => {
    const freshPlayers = JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    if (gameMode === 'online') {
      freshPlayers.red.name = isHost ? 'You (Red)' : 'Friend (Red)';
      freshPlayers.green.name = isHost ? 'Friend (Green)' : 'You (Green)';
      freshPlayers.green.isAI = false;
    } else if (gameMode === 'pass') {
      freshPlayers.red.name = 'Player 1 (Red)';
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

  // Switch turn
  const nextTurn = useCallback(() => {
    setHasRolled(false);
    setTurnTimeLeft(15);
    const currentIdx = playerOrder.indexOf(activePlayer);
    const nextPlayer = playerOrder[(currentIdx + 1) % playerOrder.length];
    setActivePlayer(nextPlayer);
  }, [activePlayer, playerOrder]);

  // Turn timer countdown (only active for current player's own turn)
  useEffect(() => {
    if (gameState !== 'playing' || winner || isRolling || isAnimatingMove) return;

    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          // If it's my turn, auto roll or pass
          const isMyTurn = gameMode !== 'online' || activePlayer === myOnlineColor;
          if (isMyTurn) {
            if (!hasRolled) {
              rollDice();
            } else {
              nextTurn();
            }
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, activePlayer, hasRolled, isRolling, isAnimatingMove, winner, gameMode, myOnlineColor, nextTurn]);

  // Check if token can move
  const canMoveToken = useCallback(
    (token: Token): boolean => {
      if (gameState !== 'playing') return false;
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
    [gameState, activePlayer, hasRolled, isRolling, isAnimatingMove, diceValue, gameMode, myOnlineColor]
  );

  // Step-by-Step Token Hop Animation
  const animateTokenMovement = useCallback(
    async (tokenColor: PlayerColor, tokenId: number, fromStep: number, targetStep: number, isSpawning: boolean): Promise<void> => {
      setIsAnimatingMove(true);
      setMovingTokenId(`${tokenColor}-${tokenId}`);

      if (isSpawning) {
        ludoAudio.playSafeStar();
        await new Promise((r) => setTimeout(r, 180));
        setPlayers((prev) => {
          const next = { ...prev };
          const p = { ...next[tokenColor] };
          const tokens = [...p.tokens];
          tokens[tokenId] = { ...tokens[tokenId], status: 'track', step: 0 };
          p.tokens = tokens;
          next[tokenColor] = p;
          return next;
        });
      } else {
        const startStep = fromStep;
        const totalSteps = targetStep - startStep;

        for (let s = 1; s <= totalSteps; s++) {
          const curStep = startStep + s;
          ludoAudio.playTokenStep();
          await new Promise((r) => setTimeout(r, 85));

          setPlayers((prev) => {
            const next = { ...prev };
            const p = { ...next[tokenColor] };
            const tokens = [...p.tokens];
            tokens[tokenId] = {
              ...tokens[tokenId],
              step: curStep,
              status: curStep === 56 ? 'home' : 'track',
            };
            p.tokens = tokens;
            next[tokenColor] = p;
            return next;
          });
        }
      }

      setIsAnimatingMove(false);
      setMovingTokenId(null);
    },
    []
  );

  // Execute token move (Local action)
  const handleMoveToken = useCallback(
    async (token: Token) => {
      if (!canMoveToken(token)) return;

      const isSpawning = token.status === 'base' && diceValue === 6;
      const targetStep = isSpawning ? 0 : token.step + diceValue;

      // Broadcast move to remote friend in Online mode
      if (gameMode === 'online' && onlineRoomCode) {
        ludoOnline.sendAction({
          type: 'MOVE',
          roomCode: onlineRoomCode,
          senderColor: token.color,
          senderName: isHost ? 'Host' : 'Friend',
          payload: {
            tokenId: token.id,
            fromStep: token.step,
            targetStep,
            isSpawning,
            diceValue,
            playerColor: token.color,
          },
          timestamp: Date.now(),
        });
      }

      await animateTokenMovement(token.color, token.id, token.step, targetStep, isSpawning);

      let didCapture = false;
      let didReachHome = targetStep === 56;

      setPlayers((prev) => {
        const nextState = { ...prev };
        const player = { ...nextState[token.color] };

        if (didReachHome) {
          player.score += 150;
          ludoAudio.playVictoryFanfare();
          logMessage(`🏆 ${player.name} finished a token in Home!`);
        }

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
                      logMessage(`⚔️ ${player.name} captured ${otherPlayer.name}'s token! Extra roll!`);
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

        const allHome = player.tokens.every((t: Token) => t.status === 'home');
        if (allHome) {
          setWinner(player.color);
          ludoAudio.playVictoryFanfare();
          logMessage(`🎉 VICTORY! ${player.name} has won the match!`);
        }

        return nextState;
      });

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

  // Roll Dice Action (Local action)
  const rollDice = useCallback(() => {
    if (gameState !== 'playing' || isRolling || hasRolled || isAnimatingMove) return;

    // In online mode, you can only roll on your turn
    if (gameMode === 'online' && activePlayer !== myOnlineColor) {
      toast.info("Wait for your opponent's turn");
      return;
    }

    setIsRolling(true);
    ludoAudio.playDiceRoll();

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      setHasRolled(true);

      const currentPlayerState = players[activePlayer];
      logMessage(`🎲 ${currentPlayerState.name} rolled a ${rolled}!`);

      let streak = rolled === 6 ? currentPlayerState.sixStreak + 1 : 0;
      currentPlayerState.sixStreak = streak;

      if (streak >= 3) {
        toast.error('3 consecutive 6s! Turn forfeited.');
        logMessage(`⚠️ ${currentPlayerState.name} rolled 3 sixes in a row. Turn passed!`);
        setTimeout(nextTurn, 800);
        return;
      }

      if (gameMode === 'online' && onlineRoomCode) {
        ludoOnline.sendAction({
          type: 'ROLL',
          roomCode: onlineRoomCode,
          senderColor: activePlayer,
          senderName: isHost ? 'Host' : 'Friend',
          payload: { value: rolled, playerColor: activePlayer },
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
        setTimeout(() => handleMoveToken(validTokens[0]), 650);
      }
    }, 600);
  }, [
    gameState,
    isRolling,
    hasRolled,
    isAnimatingMove,
    gameMode,
    onlineRoomCode,
    activePlayer,
    myOnlineColor,
    isHost,
    players,
    nextTurn,
    handleMoveToken,
  ]);

  // Online Multiplayer Remote Event Handler
  useEffect(() => {
    if (gameMode !== 'online' || !onlineRoomCode) return;

    const unsubscribe = ludoOnline.subscribe(async (action: GameAction) => {
      if (action.roomCode !== onlineRoomCode) return;

      // When Guest Joins
      if (action.type === 'JOIN') {
        const guestName = action.senderName || 'Friend (Green)';
        setPlayers((prev) => {
          const next = { ...prev };
          if (isHost) {
            next.green = { ...next.green, name: guestName, isAI: false };
          } else {
            next.red = { ...next.red, name: action.payload?.hostName || 'Host (Red)', isAI: false };
          }
          return next;
        });
        toast.success(`🎮 Connected with ${action.senderName || 'your friend'}!`);
        logMessage(`${action.senderName || 'Friend'} joined the table.`);
        return;
      }

      // Ignore actions sent by myself
      if (action.senderColor === myOnlineColor) return;

      // Remote Player Rolled Dice
      if (action.type === 'ROLL') {
        const rolled = action.payload.value;
        const rollSender: PlayerColor = (action.payload.playerColor as PlayerColor) || action.senderColor;
        setActivePlayer(rollSender);
        setDiceValue(rolled);
        setIsRolling(true);
        ludoAudio.playDiceRoll();

        setTimeout(() => {
          setIsRolling(false);
          setHasRolled(true);
          setTurnTimeLeft(15);
          const pName = players[rollSender]?.name || action.senderName;
          logMessage(`🎲 ${pName} rolled a ${rolled}!`);

          const targetPlayer = players[rollSender];
          const validTokens = targetPlayer ? targetPlayer.tokens.filter((t: Token) => {
            if (t.status === 'base') return rolled === 6;
            if (t.status === 'track') return t.step + rolled <= 56;
            return false;
          }) : [];

          if (validTokens.length === 0) {
            logMessage(`No moves for ${pName}. Switching turn...`);
            setTimeout(nextTurn, 900);
          }
        }, 550);
      }

      // Remote Player Moved Token
      else if (action.type === 'MOVE') {
        const { tokenId, fromStep, targetStep, isSpawning, diceValue: moveDice } = action.payload;
        const targetColor: PlayerColor = (action.payload.playerColor as PlayerColor) || action.senderColor;
        setDiceValue(moveDice);

        await animateTokenMovement(targetColor, tokenId, fromStep, targetStep, isSpawning);

        let didCapture = false;
        let didReachHome = targetStep === 56;

        setPlayers((prev) => {
          const nextState = { ...prev };
          const player = { ...nextState[targetColor] };

          if (didReachHome) {
            player.score += 150;
            ludoAudio.playVictoryFanfare();
            logMessage(`🏆 ${player.name} finished a token in Home!`);
          }

          if (!isSpawning && targetStep < 51) {
            const myGlobalIdx = (COLOR_START_INDICES[targetColor] + targetStep) % 52;
            const isSafe = SAFE_INDICES.includes(myGlobalIdx);

            if (!isSafe) {
              playerOrder.forEach((otherColor) => {
                if (otherColor !== targetColor) {
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
                        logMessage(`⚔️ ${player.name} captured ${otherPlayer.name}'s token!`);
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

          const allHome = player.tokens.every((t: Token) => t.status === 'home');
          if (allHome) {
            setWinner(targetColor);
            ludoAudio.playVictoryFanfare();
            logMessage(`🎉 VICTORY! ${player.name} has won the match!`);
          }

          return nextState;
        });

        if (moveDice === 6 || didCapture || didReachHome) {
          setHasRolled(false);
          setTurnTimeLeft(15);
          logMessage(`🎲 ${players[targetColor]?.name || 'Player'} rolls again.`);
        } else {
          nextTurn();
        }
      }

      // Remote Reaction
      else if (action.type === 'REACTION') {
        setReactionBubble({ emoji: action.payload.emoji, sender: action.senderName });
        setTimeout(() => setReactionBubble(null), 3000);
      }

      // Remote Reset
      else if (action.type === 'RESET') {
        resetGame(false);
      }
    });

    return () => unsubscribe();
  }, [gameMode, onlineRoomCode, myOnlineColor, isHost, players, playerOrder, animateTokenMovement, nextTurn]);

  // Connect to Online Room
  const handleJoinOnlineRoom = (code: string, host: boolean) => {
    setOnlineRoomCode(code);
    setIsHost(host);
    setGameMode('online');
    setMyOnlineColor(host ? 'red' : 'green');
    setGameState('playing');

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

  // Check if current device is allowed to roll right now
  const isMyTurnToRoll =
    gameMode === 'online' ? activePlayer === myOnlineColor : !players[activePlayer].isAI;

  // ==========================================
  // VIEW 1: LUDO ARENA LOBBY (GAME START SCREEN)
  // ==========================================
  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#070b14] to-black text-slate-100 flex flex-col justify-between p-4 md:p-8 select-none font-sans">
        <header className="max-w-xl w-full mx-auto flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-amber-400">🎲 LUDO ARENA</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title={soundOn ? 'Mute Sound' : 'Unmute Sound'}
            >
              {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-400 hover:bg-slate-800 transition"
              title="Private Table Code or Secret Vault PIN"
            >
              <KeyRound size={15} />
              <span>Private Room</span>
            </button>
          </div>
        </header>

        <main className="max-w-md w-full mx-auto my-auto text-center space-y-6">
          <div className="relative mx-auto size-24 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-1 shadow-[0_0_50px_rgba(244,63,94,0.35)] flex items-center justify-center animate-bounce">
            <div className="size-full rounded-2xl bg-slate-950 flex items-center justify-center text-4xl">
              🎲
            </div>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Ludo Arena <span className="text-amber-400">3D</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
              Classic casual board gameplay with authentic stepping physics and multiplayer tables.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => startMatch('ai')}
              className="w-full p-4 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-between group active:scale-[0.98] shadow-lg"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="size-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400 group-hover:scale-110 transition">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition">
                    Play vs Computer (Bots)
                  </h3>
                  <p className="text-xs text-slate-400">Single player match vs 3 smart AI bots</p>
                </div>
              </div>
              <Play size={18} className="text-slate-500 group-hover:text-amber-400 transition" />
            </button>

            <button
              type="button"
              onClick={() => startMatch('pass')}
              className="w-full p-4 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-between group active:scale-[0.98] shadow-lg"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="size-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 grid place-items-center text-blue-400 group-hover:scale-110 transition">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition">
                    2-Player Pass &amp; Play
                  </h3>
                  <p className="text-xs text-slate-400">Play locally with a friend on this device</p>
                </div>
              </div>
              <Play size={18} className="text-slate-500 group-hover:text-blue-400 transition" />
            </button>

            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="w-full p-4 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-between group active:scale-[0.98] shadow-lg"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="size-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 grid place-items-center text-rose-400 group-hover:scale-110 transition">
                  <Globe size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white group-hover:text-rose-400 transition">
                    Online Private Room (2P)
                  </h3>
                  <p className="text-xs text-slate-400">Create table &amp; share code with friend</p>
                </div>
              </div>
              <KeyRound size={18} className="text-slate-500 group-hover:text-rose-400 transition" />
            </button>
          </div>
        </main>

        <footer className="max-w-xl w-full mx-auto text-center py-2 text-[11px] text-slate-500">
          Ludo Arena 3D v2.4 • Casual Online Gaming
        </footer>

        <SecretPinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onJoinOnlineRoom={handleJoinOnlineRoom}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE MATCH BOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#070b14] to-black text-slate-100 flex flex-col justify-between p-2 sm:p-3 md:p-5 select-none font-sans">
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 px-3 sm:px-4 rounded-2xl bg-slate-900/85 border border-slate-800 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2">
          {/* 🚪 Prominent EXIT MATCH Button */}
          <button
            type="button"
            onClick={exitToLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition active:scale-95 shadow-sm"
            title="Exit this Match and return to Lobby"
          >
            <LogOut size={14} />
            <span>Exit Game</span>
          </button>

          <div>
            <h1 className="font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1.5">
              Ludo Arena
              {gameMode === 'online' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
                  <Globe size={11} /> 2P Table #{onlineRoomCode}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  {gameMode === 'ai' ? 'vs AI' : '2P Local'}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {gameMode === 'online' && onlineRoomCode && (
            <button
              onClick={copyActiveRoomCode}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-mono font-bold border border-slate-700 transition"
              title="Copy Table Code"
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              <span>#{onlineRoomCode}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 transition active:scale-95 shadow-sm"
            title="Private Room / PIN"
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
              Active Player
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
            isMyTurn={isMyTurnToRoll}
            hasRolled={hasRolled}
            onRoll={() => rollDice()}
            onSecretTrigger={() => setIsPinModalOpen(true)}
          />

          {/* Exit / Return to Lobby Button */}
          <button
            type="button"
            onClick={exitToLobby}
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-xs text-rose-300 hover:text-white border border-slate-700/80 hover:border-rose-500/40 transition font-semibold flex items-center justify-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Exit Game (Return to Lobby)</span>
          </button>
        </div>
      </main>

      {/* VICTORY MODAL */}
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
                  All 4 tokens reached Home!
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => resetGame(true)}
                  className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs shadow-md"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={exitToLobby}
                  className="px-4 h-11 rounded-2xl bg-slate-800 text-white font-semibold text-xs"
                >
                  Exit to Lobby
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Secret PIN Modal */}
      <SecretPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onJoinOnlineRoom={handleJoinOnlineRoom}
      />
    </div>
  );
}
