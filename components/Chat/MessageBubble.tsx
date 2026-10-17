import { Message } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

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

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { data: session } = useSession();
  const [showReactions, setShowReactions] = useState(false);
  const isSystemMessage = message.messageType === 'SYSTEM';
  const isCurrentUser = message.sender.id === session?.user?.id;

  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-gray-700 text-gray-300 text-sm px-4 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const messageTime = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex gap-3 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <img
          src={message.sender.image || '/default-avatar.png'}
          alt={message.sender.name || 'User'}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-600"
        />

        {/* Message Content */}
        <div className={isCurrentUser ? 'text-right' : ''}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-300">{message.sender.name}</span>
            <span className="text-xs text-gray-500">{messageTime}</span>
            {message.editedAt && <span className="text-xs text-gray-500">(edited)</span>}
          </div>
          
          <div
            className={`px-4 py-2 rounded-2xl ${
              isCurrentUser
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-700 text-gray-100 rounded-bl-md'
            } ${message.messageType === 'IMAGE' ? 'p-2' : ''}`}
          >
            {message.messageType === 'IMAGE' && message.fileUrl ? (
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Shared image'}
                className="max-w-full rounded-lg max-h-96 object-contain"
                loading="lazy"
              />
            ) : message.messageType === 'FILE' && message.fileUrl ? (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-300 hover:underline"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>{message.fileName || 'Download file'}</span>
                {message.fileSize && <span className="text-xs text-gray-400">({(message.fileSize / 1024 / 1024).toFixed(2)} MB)</span>}
              </a>
            ) : (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {Object.entries(
                message.reactions.reduce((acc: Record<string, number>, reaction) => {
                  acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="bg-gray-800 px-2 py-0.5 rounded-full text-sm border border-gray-600"
                >
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}