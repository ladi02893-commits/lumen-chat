'use client';

import React from 'react';
import { useVault } from '@/components/stealth/VaultContext';
import { LudoGameView } from '@/components/game/LudoGameView';
import { ChatDashboard } from '@/components/chat/ChatDashboard';

export default function RootPage() {
  const { isVaultUnlocked } = useVault();

  // If Vault is locked, render the full authentic Ludo Game disguise
  if (!isVaultUnlocked) {
    return <LudoGameView />;
  }

  // Once unlocked via Secret PIN or Gesture, show the real Lumen Secret Chat
  return <ChatDashboard />;
}
