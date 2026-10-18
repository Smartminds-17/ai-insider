'use client';

import { Conversation } from '@/types/chat';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import useSWR from 'swr';

// Define User interface for the /api/users response
interface User {
  id: string;
  name: string | null;
  image: string | null;
  isOnline: boolean;
}

// Extend NextAuth session type to include user ID
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  // Separate group chats (communities) and direct chats
  const groupConversations = conversations.filter(c => c.type === 'GROUP');
  const directConversations = conversations.filter(c => c.type === 'DIRECT');
  const { data: session } = useSession();
  
  // SWR fetcher for API calls
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  
  // Fetch all users from the new API endpoint
  const { data: allUsers } = useSWR<User[]>('/api/users', fetcher);
  
  // Function to create a new direct conversation with a user
  const createDirectConversation = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/conversations/create-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      
      if (res.ok) {
        const newConversation = await res.json();
        onSelect(newConversation);
      }
    } catch (err) {
      console.error('Failed to create direct conversation:', err);
    }
  };

  const getConversationDisplayName = (conversation: Conversation) => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'DIRECT') {
      // For direct chats, show the other user's name
      const otherUser = conversation.participants?.find(p => p.user.email !== session?.user?.email);
      return otherUser?.user.name || 'Unknown User';
    }
    return 'Unnamed Chat';
  };

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[0];
      return `${lastMsg.sender.name}: ${lastMsg.content.substring(0, 30)}${lastMsg.content.length > 30 ? '...' : ''}`;
    }
    return 'No messages yet';
  };

  // Get current user ID from session (extract from the conversation participants)
  const getCurrentUserId = () => {
    // First conversation should have the current user's email to extract ID
    if (conversations.length > 0 && session?.user?.email) {
      const firstConv = conversations[0];
      const currentUserParticipant = firstConv.participants?.find(p => p.user.email === session.user.email);
      return currentUserParticipant?.user.id;
    }
    return null;
  };

  const currentUserId = getCurrentUserId();

  const isOtherUserOnline = (conversation: Conversation) => {
    if (conversation.type !== 'DIRECT' || !currentUserId) return false;
    const otherUser = conversation.participants?.find(p => p.user.id !== currentUserId);
    return otherUser?.user.isOnline || false;
  };

  // Filter out current user from the people list and sort online users to top
  const otherUsers = useMemo(() => {
    const filtered = (allUsers ?? []).filter(user => user.id !== session?.user?.id);
    // Sort online users first, then offline
    return filtered.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
  }, [allUsers, session?.user?.id]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Only communities the current user participates in are listed here. */}
      <div className="border-b border-white/5 p-2">
        <h3 className="legend-label legend-label--sage px-2 py-1">
          Your learning communities
        </h3>
        {groupConversations.length > 0 ? (
          groupConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                selectedId === conversation.id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--route)]/10 text-sm font-semibold text-[var(--route)]">
                  {conversation.name?.charAt(0) || '#'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{conversation.name || 'Unnamed Group'}</p>
                  <p className="text-xs text-gray-400 truncate">{getLastMessage(conversation)}</p>
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className="px-2 py-2 text-xs leading-relaxed text-[var(--text-dim)]">
            No learning community conversations yet.
          </p>
        )}
      </div>

      {/* Direct Messages Section */}
      {directConversations.length > 0 && (
        <div className="p-2 mt-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
            Direct Messages
          </h3>
          {directConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                selectedId === conversation.id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={conversation.participants?.find(p => p.user.id !== currentUserId)?.user.image || '/default-avatar.png'}
                    alt={getConversationDisplayName(conversation)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {/* Online indicator */}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${isOtherUserOnline(conversation) ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getConversationDisplayName(conversation)}</p>
                  <p className="text-xs text-gray-400 truncate">{getLastMessage(conversation)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* People / User Directory Section */}
      {otherUsers.length > 0 && (
        <div className="p-2 mt-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
            People ({otherUsers.length})
          </h3>
          {otherUsers.map((user) => {
            // Check if we already have an existing conversation with this user
            const existingConversation = conversations.find(c => {
              if (c.type !== 'DIRECT') return false;
              return c.participants?.some(p => p.user.id === user.id);
            });

            return (
              <button
                key={user.id}
                onClick={() => {
                  if (existingConversation) {
                    onSelect(existingConversation);
                  } else {
                    createDirectConversation(user.id);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors hover:bg-gray-700 text-gray-300`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.image || '/default-avatar.png'}
                      alt={user.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {/* Online indicator */}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${user.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-400 truncate">{user.isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {conversations.length === 0 && (
        <div className="m-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-[var(--text-dim)]">
          <p className="text-sm font-medium text-[var(--text)]">No conversations yet</p>
          <p className="mt-2 text-xs leading-relaxed">Your learning communities and direct messages will appear here.</p>
        </div>
      )}
    </div>
  );
}
