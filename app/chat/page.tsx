import ChatInterface from '@/components/Chat/ChatInterface';

export default function ChatPage() {
  return (
    <main className="h-[calc(100dvh-6.5rem)] min-h-[28rem] px-3 pb-3 sm:h-[calc(100dvh-4rem)] sm:px-5 sm:pb-5">
      <ChatInterface />
    </main>
  );
}
