'use client';

import { insforge } from '@/lib/insforge/client';
import { PlayerColor, Token } from './ludoTypes';

export interface GameAction {
  type: 'ROLL' | 'MOVE' | 'REACTION' | 'JOIN' | 'RESET';
  roomCode: string;
  senderColor: PlayerColor;
  senderName: string;
  payload?: any;
  timestamp: number;
}

export interface OnlineRoomState {
  roomCode: string;
  myColor: PlayerColor;
  myName: string;
  opponentColor: PlayerColor;
  opponentName: string;
  isHost: boolean;
  isConnected: boolean;
}

class LudoOnlineManager {
  private broadcastChannel: BroadcastChannel | null = null;
  private roomCode: string | null = null;
  private listeners: ((action: GameAction) => void)[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private lastActionTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('ludo_online_arena');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.roomCode === this.roomCode) {
          this.notifyListeners(event.data);
        }
      };
    }
  }

  public subscribe(cb: (action: GameAction) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(action: GameAction) {
    if (action.timestamp <= this.lastActionTime) return;
    this.lastActionTime = action.timestamp;
    this.listeners.forEach((cb) => cb(action));
  }

  public async createRoom(
    hostName: string = 'Host'
  ): Promise<{ roomCode: string; error?: string }> {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    this.roomCode = code;
    this.lastActionTime = Date.now();

    try {
      // Create room record in InsForge database
      await insforge.database.from('ludo_rooms').insert([
        {
          room_code: code,
          host_id: crypto.randomUUID(),
          host_name: hostName,
          status: 'waiting',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // Fallback works with local broadcast channel
    }

    this.startPolling(code);
    return { roomCode: code };
  }

  public async joinRoom(
    code: string,
    guestName: string = 'Friend'
  ): Promise<{ success: boolean; room?: any; error?: string }> {
    const cleanCode = code.trim();
    this.roomCode = cleanCode;
    this.lastActionTime = Date.now();

    try {
      const { data, error } = await insforge.database
        .from('ludo_rooms')
        .select('*')
        .eq('room_code', cleanCode)
        .maybeSingle();

      if (data) {
        // Update room with guest
        await insforge.database
          .from('ludo_rooms')
          .update({
            guest_id: crypto.randomUUID(),
            guest_name: guestName,
            status: 'playing',
            updated_at: new Date().toISOString(),
          })
          .eq('room_code', cleanCode);

        // Broadcast join event
        this.sendAction({
          type: 'JOIN',
          roomCode: cleanCode,
          senderColor: 'green',
          senderName: guestName,
          payload: { hostName: data.host_name },
          timestamp: Date.now(),
        });

        this.startPolling(cleanCode);
        return { success: true, room: data };
      }
    } catch {
      // Fallback
    }

    // Also notify via local channel in case they are playing on same browser/network
    this.sendAction({
      type: 'JOIN',
      roomCode: cleanCode,
      senderColor: 'green',
      senderName: guestName,
      timestamp: Date.now(),
    });

    this.startPolling(cleanCode);
    return { success: true };
  }

  public sendAction(action: GameAction) {
    if (!this.roomCode) return;
    this.lastActionTime = action.timestamp;

    // 1. Broadcast locally
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(action);
      } catch {}
    }

    // 2. Persist to DB for remote players
    try {
      insforge.database
        .from('ludo_rooms')
        .update({
          last_action: action,
          updated_at: new Date().toISOString(),
        })
        .eq('room_code', this.roomCode)
        .then(() => {});
    } catch {}
  }

  private startPolling(code: string) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      if (!this.roomCode) return;
      try {
        const { data } = await insforge.database
          .from('ludo_rooms')
          .select('last_action, status, guest_name')
          .eq('room_code', code)
          .maybeSingle();

        if (data?.last_action) {
          const action = data.last_action as GameAction;
          this.notifyListeners(action);
        }
      } catch {}
    }, 1200);
  }

  public leaveRoom() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.roomCode = null;
  }
}

export const ludoOnline = new LudoOnlineManager();
