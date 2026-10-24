'use client';

import dynamic from 'next/dynamic';

const ChatInterface = dynamic(() => import('@/components/Chat/ChatInterface'), {
  loading: () => (
    <div className="surface-card flex h-full items-center justify-center text-[var(--text)]">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-[var(--route)]"></div>
    </div>
  ),
  ssr: false, // The ChatInterface uses client-side hooks like `useSession` that don't run on the server
});

export default function ChatPage() {
  return (
    <main className="h-[calc(100dvh-6.5rem)] min-h-[28rem] px-3 pb-3 sm:h-[calc(100dvh-4rem)] sm:px-5 sm:pb-5">
      <ChatInterface />
    </main>
  );
}