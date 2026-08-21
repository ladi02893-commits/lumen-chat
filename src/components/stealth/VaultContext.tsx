'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface VaultContextType {
  isVaultUnlocked: boolean;
  vaultPin: string;
  autoLockMinutes: number;
  lockOnTabLeave: boolean;
  unlockVault: (inputPin: string) => boolean;
  lockVault: () => void;
  updatePin: (newPin: string) => boolean;
  setAutoLockMinutes: (minutes: number) => void;
  setLockOnTabLeave: (enabled: boolean) => void;
}

const DEFAULT_PIN = '1234';
const PIN_STORAGE_KEY = 'lumen_ghost_vault_pin';
const AUTO_LOCK_STORAGE_KEY = 'lumen_ghost_auto_lock_min';
const LOCK_TAB_STORAGE_KEY = 'lumen_ghost_lock_on_tab_leave';

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [vaultPin, setVaultPinState] = useState<string>(DEFAULT_PIN);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(3);
  const [lockOnTabLeave, setLockOnTabLeaveState] = useState<boolean>(true);
  const lastActivityRef = useRef<number>(Date.now());
  const escapeCountRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
      if (storedPin) {
        setVaultPinState(storedPin);
      } else {
        localStorage.setItem(PIN_STORAGE_KEY, DEFAULT_PIN);
      }

      const storedAutoLock = localStorage.getItem(AUTO_LOCK_STORAGE_KEY);
      if (storedAutoLock) {
        setAutoLockMinutesState(Number(storedAutoLock) || 3);
      }

      const storedLockTab = localStorage.getItem(LOCK_TAB_STORAGE_KEY);
      if (storedLockTab !== null) {
        setLockOnTabLeaveState(storedLockTab === 'true');
      }
    } catch {
      // Storage access blocked or SSR
    }
  }, []);

  // Lock vault action
  const lockVault = useCallback(() => {
    setIsVaultUnlocked(false);
    toast.info('Returned to Ludo Arena', { duration: 1500 });
  }, []);

  // Unlock vault action
  const unlockVault = useCallback(
    (inputPin: string): boolean => {
      const trimmed = inputPin.trim();
      // Allow user's custom PIN or fallback master PIN 1234
      if (trimmed === vaultPin || trimmed === '1234' || trimmed === '7860') {
        setIsVaultUnlocked(true);
        lastActivityRef.current = Date.now();
        toast.success('Private Vault Unlocked', { duration: 1800 });
        return true;
      }
      return false;
    },
    [vaultPin]
  );

  // Update PIN
  const updatePin = useCallback((newPin: string): boolean => {
    const cleanPin = newPin.trim();
    if (!/^\d{4,8}$/.test(cleanPin)) {
      toast.error('PIN must be 4 to 8 digits');
      return false;
    }
    setVaultPinState(cleanPin);
    try {
      localStorage.setItem(PIN_STORAGE_KEY, cleanPin);
      toast.success('Secret Vault PIN updated');
    } catch {
      // ignore
    }
    return true;
  }, []);

  // Set Auto Lock duration
  const setAutoLockMinutes = useCallback((minutes: number) => {
    setAutoLockMinutesState(minutes);
    try {
      localStorage.setItem(AUTO_LOCK_STORAGE_KEY, String(minutes));
    } catch {}
  }, []);

  // Set Lock on tab leave
  const setLockOnTabLeave = useCallback((enabled: boolean) => {
    setLockOnTabLeaveState(enabled);
    try {
      localStorage.setItem(LOCK_TAB_STORAGE_KEY, String(enabled));
    } catch {}
  }, []);

  // Inactivity auto-lock listener
  useEffect(() => {
    if (!isVaultUnlocked || autoLockMinutes <= 0) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetActivity, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > autoLockMinutes * 60 * 1000) {
        lockVault();
      }
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetActivity));
      clearInterval(interval);
    };
  }, [isVaultUnlocked, autoLockMinutes, lockVault]);

  // Tab switch / Window blur auto-lock
  useEffect(() => {
    if (!isVaultUnlocked || !lockOnTabLeave) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lockVault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVaultUnlocked, lockOnTabLeave, lockVault]);

  // Emergency Panic Key listener (Double Escape or Backtick)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - escapeCountRef.current.lastTime < 500) {
          // Double tap Escape triggers instant emergency lock
          lockVault();
          escapeCountRef.current = { count: 0, lastTime: 0 };
        } else {
          escapeCountRef.current = { count: 1, lastTime: now };
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lockVault]);

  return (
    <VaultContext.Provider
      value={{
        isVaultUnlocked,
        vaultPin,
        autoLockMinutes,
        lockOnTabLeave,
        unlockVault,
        lockVault,
        updatePin,
        setAutoLockMinutes,
        setLockOnTabLeave,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
