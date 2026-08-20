# Lumen — InsForge private chat

A Next.js + TypeScript private-messaging foundation, designed for InsForge Auth, PostgreSQL/RLS, Realtime and private Storage. It deliberately includes **no mock users or demo messages**.

## Local setup

1. Copy `.env.local.example` to `.env.local` and supply the InsForge project URL and **public anon key**.
2. In InsForge, enable Email/Password, email verification, password-reset email, and Google OAuth. Add your development and production URLs to allowed redirects.
3. Apply `supabase/migrations/001_lumen_schema.sql` through the InsForge SQL/admin console.
4. Create private buckets named `chat-files` and `avatars`; configure their object policies to permit only an authenticated owner/conversation member. Configure the platform scheduler to invoke `public.expire_messages()` every minute, and an authorized cleanup function to remove attachment objects for returned IDs.
5. Enable realtime for `messages`, `message_reads`, `friend_requests`, `notifications`, `typing_status`, and `profiles` / presence updates.
6. Run `npm run dev`.

## Security model

- Authentication comes only from InsForge Auth; passwords never enter app tables.
- PostgreSQL RLS protects conversation, message, attachment, notification, and settings reads.
- Sensitive friendship and message mutations run through SQL RPCs that derive the acting profile from `auth.uid()` and enforce membership, friendship and rate limits.
- Files are validated client-side as an early UX guard. Production storage rules/edge functions must repeat validation and authorization before accepting uploads or generating downloads.
- The provided client shows how to use the InsForge SDK; never put an admin/service key in `NEXT_PUBLIC_*` variables.

## Current implementation notes

The app has live SDK-backed authentication forms, Google auth handoff, profile edits, discovery, friend requests, protected RPC messaging, attachment upload validation, location sharing, read writes, and a scoped realtime subscription. The database migration provides the normalized schema, indexes, RLS, rate-limited mutation RPCs, conversation auto-delete metadata, and expiration query.

Full browser validation against a real project (OAuth provider settings, private storage policies, scheduler deployment and two-user realtime testing) cannot be performed until project credentials are supplied.
