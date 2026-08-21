'use client';

import React from 'react';
import { useVault } from '@/components/stealth/VaultContext';
import { ChatDashboard } from '@/components/chat/ChatDashboard';
import { LudoGameView } from '@/components/game/LudoGameView';

export default function ChatsPage() {
  const { isVaultUnlocked } = useVault();

  // If someone directly opens /chats without unlocking, disguise with Ludo Game
  if (!isVaultUnlocked) {
    return <LudoGameView />;
  }

  return <ChatDashboard />;
}
