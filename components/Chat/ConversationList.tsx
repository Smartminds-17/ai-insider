'use client';

import { Conversation } from '@/types/chat';
import { X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

// Define User interface for the /api/users response
interface User {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
  isOnline: boolean;
  lastActiveAt: string | null;
  isMentor: boolean;
  mentorAvailability?: string | null;
  mentorRating?: number | null;
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

interface SuggestedGroup {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  memberCount: number;
  topicTags: string[];
  lastActivityAt: string;
  matchReason: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onJoinGroup: (groupId: string) => void;
}

export default function ConversationList({ conversations, selectedId, onSelect, onJoinGroup }: ConversationListProps) {
  // Separate group chats (communities) and direct chats
  const groupConversations = conversations.filter(c => c.type === 'GROUP');
  const directConversations = conversations.filter(c => c.type === 'DIRECT');
  const [suggestedGroups, setSuggestedGroups] = useState<SuggestedGroup[]>([]);
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(new Set());

  // Fetch suggested groups on component mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/groups/suggestions');
        if (res.ok) {
          const groups = await res.json() as SuggestedGroup[];
          setSuggestedGroups(groups.filter((g: SuggestedGroup) => !dismissedGroups.has(g.id)));
        }
      } catch (err) {
        console.error('Failed to fetch group suggestions:', err);
      }
    };
    fetchSuggestions();
  }, [conversations]);

  const handleDismiss = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedGroups(prev => new Set([...prev, groupId]));
    setSuggestedGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleJoinGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onJoinGroup(groupId);
    setSuggestedGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const { data: session } = useSession();
  
  // SWR fetcher for API calls
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  
  // Fetch all users from the new API endpoint
  const { data: allUsers, error: usersError } = useSWR<User[]>('/api/users', fetcher);
  
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

  // Use the allUsers data from our API, which is already sorted with online users first
  const users = allUsers || [];

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
      {/* Suggested Groups Section (ML/Rule-based recommendations) */}
      {suggestedGroups.length > 0 && (
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider px-2 py-1">
            Suggested for you
          </h3>
          {suggestedGroups.map((group) => (
            <div
              key={group.id}
              className="w-full px-3 py-2 rounded-md mb-1 bg-blue-900/20 border border-blue-800/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                  {group.name?.charAt(0) || '#'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-200 truncate">{group.name}</p>
                  <p className="text-xs text-gray-400">{group.matchReason}</p>
                  <p className="text-xs text-gray-500 mt-1">{group.memberCount} members</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => handleJoinGroup(group.id, e)}
                      className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                    >
                      Join
                    </button>
                    <button
                      onClick={(e) => handleDismiss(group.id, e)}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors flex items-center gap-1"
                    >
                      <X size={12} /> Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Communities / Group Chats Section (Discord style) */}
      {groupConversations.length > 0 && (
        <div className="p-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
            Your Communities
          </h3>
          {groupConversations.map((conversation) => (
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold">
                  {conversation.name?.charAt(0) || '#'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{conversation.name || 'Unnamed Group'}</p>
                  <p className="text-xs text-gray-400 truncate">{getLastMessage(conversation)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

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
        <div className="p-4 text-center text-gray-400">
          <p>No conversations yet</p>
          <p className="text-sm mt-2">Join a learning path to get access to community chats!</p>
        </div>
      )}
    </div>
  );
}