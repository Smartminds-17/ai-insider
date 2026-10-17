'use client';

import { Conversation, Message } from '@/types/chat';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import ChatHeader from './ChatHeader';
import ConversationList from './ConversationList';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ChatInterface() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all conversations for current user
  const { data: conversations, error: conversationsError, mutate: mutateConversations } = useSWR<Conversation[]>(
    '/api/conversations',
    fetcher
  );

  // Ensure conversations is always an array even if API returns error
  const safeConversations = Array.isArray(conversations) ? conversations : [];

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (content: string, options?: { fileUrl?: string; fileName?: string; fileSize?: number; messageType?: 'TEXT' | 'IMAGE' | 'FILE' }) => {
    if (!selectedConversation || !content.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: content.trim(),
          ...options
        })
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages(prev => [...prev, newMessage]);
        mutateConversations(); // Refresh conversation list to update last message
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  // Handle joining a suggested group
  const handleJoinGroup = async (groupId: string) => {
    try {
      const res = await fetch('/api/conversations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: groupId })
      });

      if (res.ok) {
        mutateConversations(); // Refresh conversation list to include the new group
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  // Handle auth errors - redirect to login if unauthorized
  useEffect(() => {
    if (conversationsError || (conversations && 'error' in conversations && conversations.error === 'Unauthorized')) {
      console.log('Unauthorized, redirecting to login');
      window.location.href = '/api/auth/signin';
    }
  }, [conversationsError, conversations]);

  if (conversationsError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load conversations</p>
          <button 
            onClick={() => mutateConversations()}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!conversations) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar - Conversation List (Discord style servers/channels) */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <ConversationList
          conversations={safeConversations}
          selectedId={selectedConversation?.id || null}
          onSelect={handleSelectConversation}
          onJoinGroup={handleJoinGroup}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <ChatHeader conversation={selectedConversation} />
            
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput 
              onSend={sendMessage} 
              disabled={isLoading} 
              conversationId={selectedConversation.id} 
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-2">Welcome to Chat</h3>
              <p>Select a conversation to start messaging</p>
              <p className="text-sm mt-4">Group chats are automatically created for your learning paths</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}