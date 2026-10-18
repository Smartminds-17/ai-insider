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

  // Handle auth errors - redirect to login if unauthorized
  useEffect(() => {
    if (conversationsError || (conversations && 'error' in conversations && conversations.error === 'Unauthorized')) {
      console.log('Unauthorized, redirecting to login');
      window.location.href = '/api/auth/signin';
    }
  }, [conversationsError, conversations]);

  if (conversationsError) {
    return (
      <div className="surface-card flex h-full items-center justify-center text-[var(--text)]">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load conversations</p>
          <button 
            onClick={() => mutateConversations()}
            className="btn btn--route"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!conversations) {
    return (
      <div className="surface-card flex h-full items-center justify-center text-[var(--text)]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-[var(--route)]"></div>
      </div>
    );
  }

  return (
    <div className="surface-card flex h-full min-h-0 overflow-hidden text-[var(--text)]">
      {/* Sidebar - Conversation List (Discord style servers/channels) */}
      <div className="chat-conversation-sidebar flex w-72 shrink-0 flex-col border-r border-white/10 bg-[var(--ink-2)] sm:w-80">
        <div className="border-b border-white/10 p-4">
          <p className="legend-label legend-label--route mb-1">Your conversations</p>
          <h2 className="text-lg font-medium">Messages</h2>
        </div>
        <ConversationList
          conversations={safeConversations}
          selectedId={selectedConversation?.id || null}
          onSelect={handleSelectConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <ChatHeader conversation={selectedConversation} />
            
            {/* Messages Container */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput 
              onSend={sendMessage} 
              onUploadComplete={(uploadedMessage) => {
                setMessages((previous) => previous.some((message) => message.id === uploadedMessage.id)
                  ? previous
                  : [...previous, uploadedMessage]);
                mutateConversations();
              }}
              disabled={isLoading} 
              conversationId={selectedConversation.id} 
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[var(--text-dim)]">
            <div className="text-center">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--route)]/20 bg-[var(--route)]/10 text-xl text-[var(--route)]" aria-hidden="true">↗</span>
              <h3 className="mb-2 text-xl font-medium text-[var(--text)]">Choose a conversation</h3>
              <p className="text-sm">Your messages and learning groups appear here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
