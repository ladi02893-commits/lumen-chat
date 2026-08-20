'use client';
import { createClient } from '@insforge/sdk';
const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
// The SDK attaches the user JWT to database, storage and realtime requests.
export const isInsForgeConfigured = Boolean(baseUrl);
export const insforge = createClient({ baseUrl: baseUrl || 'https://not-configured.invalid', anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY });
