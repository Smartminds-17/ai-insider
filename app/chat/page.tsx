import ChatInterface from '@/components/Chat/ChatInterface';

export default function ChatPage() {
  return (
    <div className="h-screen pt-16"> {/* pt-16 accounts for header height */}
      <ChatInterface />
    </div>
  );
}