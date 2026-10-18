import { Conversation } from '@/types/chat';
import { MoreVertical, Phone, Users, Video } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface TypingUser {
  userId: string;
  userName: string;
  isTyping: boolean;
}

interface ChatHeaderProps {
  conversation: Conversation;
}

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const { data: session } = useSession();

  // Same-origin event streams carry the session cookie for authorization.
  useEffect(() => {
    if (!session?.user?.id) return;

    const events = new EventSource(`/api/ws?conversationId=${encodeURIComponent(conversation.id)}`);
    events.onmessage = (event) => {
      let data: TypingUser & { conversationId?: string; typingUsers?: unknown[] };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (Array.isArray(data.typingUsers)) {
        setTypingUsers(new Map());
        return;
      }
      // Don't show typing indicator for current user
      if (data.userId === session.user.id) return;

      setTypingUsers(prev => {
        const newMap = new Map(prev);
        if (data.isTyping) {
          newMap.set(data.userId, data.userName);
        } else {
          newMap.delete(data.userId);
        }
        return newMap;
      });
    };

    events.onerror = () => {
      setTypingUsers(new Map());
    };

    return () => {
      events.close();
    };
  }, [conversation.id, session?.user?.id]);

  const getConversationName = () => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'DIRECT') {
      const otherUser = conversation.participants?.find(p => p.user.email !== 'current-user-email');
      return otherUser?.user.name || 'Unknown User';
    }
    return 'Conversation';
  };

  const getParticipantCount = () => {
    return conversation.participants?.length || 0;
  };

  const isDirectChat = conversation.type === 'DIRECT';
  const getStatusText = () => {
    const typingNames = Array.from(typingUsers.values());
    if (typingNames.length > 0) {
      if (typingNames.length === 1) return `${typingNames[0]} is typing...`;
      if (typingNames.length === 2) return `${typingNames[0]} and ${typingNames[1]} are typing...`;
      return 'Several people are typing...';
    }
    return isDirectChat ? 'Online' : `${getParticipantCount()} members`;
  };

  return (
    <div className="h-16 border-b border-gray-700 px-4 flex items-center justify-between bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isDirectChat ? 'bg-green-600' : 'bg-gradient-to-br from-purple-500 to-blue-500'
        }`}>
          {isDirectChat ? (
            <img
              src={conversation.participants?.find(p => p.user.image)?.user.image || '/default-avatar.png'}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <Users size={20} />
          )}
        </div>
        <div>
          <h3 className="font-semibold">{getConversationName()}</h3>
          <p className={`text-xs ${typingUsers.size > 0 ? 'text-green-400 animate-pulse' : 'text-gray-400'}`}>
            {getStatusText()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isDirectChat && (
          <>
            <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
              <Phone size={20} className="text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
              <Video size={20} className="text-gray-400" />
            </button>
          </>
        )}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <MoreVertical size={20} className="text-gray-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-10">
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm">
                View Details
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm">
                Search Messages
              </button>
              {!isDirectChat && (
                <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm">
                  Manage Members
                </button>
              )}
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-red-400">
                Leave Conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
