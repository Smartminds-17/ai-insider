import { Image as ImageIcon, Loader2, Paperclip, Plus, Send, Smile } from 'lucide-react';
import { KeyboardEvent, useCallback, useRef, useState } from 'react';
import type { Message } from '@/types/chat';

interface MessageInputProps {
  onSend: (content: string, options?: { fileUrl?: string; fileName?: string; fileSize?: number; messageType?: 'TEXT' | 'IMAGE' | 'FILE' }) => void;
  onUploadComplete: (message: Message) => void;
  disabled: boolean;
  conversationId: string;
}

export default function MessageInput({ onSend, onUploadComplete, disabled, conversationId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Debounced typing status update
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (isTypingRef.current === isTyping) return;
    isTypingRef.current = isTyping;

    try {
      await fetch('/api/users/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, isTyping })
      });
    } catch (err) {
      console.error('Failed to update typing status:', err);
    }
  }, [conversationId]);

  // Reset typing timeout when user types
  const resetTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If we weren't already typing, send the isTyping: true event
    if (!isTypingRef.current) {
      updateTypingStatus(true);
    }

    // Set timeout to send isTyping: false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  }, [updateTypingStatus]);

  const handleSend = (content?: string, fileOptions?: { fileUrl?: string; fileName?: string; fileSize?: number; messageType?: 'TEXT' | 'IMAGE' }) => {
    const finalContent = content || message.trim();
    if (finalContent && !disabled) {
      onSend(finalContent, fileOptions);
      setMessage('');
      // Immediately stop typing indicator after sending
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      updateTypingStatus(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setShowAttachments(false);
    setUploadError('');

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'IMAGE');

      // Upload to our API
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const uploadedMessage = await res.json() as Message;
        onUploadComplete(uploadedMessage);
      } else {
        const result = await res.json().catch(() => null);
        setUploadError(result?.error || 'Image upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      setUploadError('Image upload failed. Check your connection and try again.');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Handle general file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setShowAttachments(false);
    setUploadError('');

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'FILE');

      // Upload to our API
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const uploadedMessage = await res.json() as Message;
        onUploadComplete(uploadedMessage);
      } else {
        const result = await res.json().catch(() => null);
        setUploadError(result?.error || 'File upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      setUploadError('File upload failed. Check your connection and try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border-t border-white/10 bg-[var(--ink-2)] p-3 sm:p-4">
      {uploadError && <p role="alert" className="mb-2 text-sm text-red-400">{uploadError}</p>}
      <div className="flex items-end gap-3">
        {/* Attachment button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className="rounded-full p-2 transition-colors hover:bg-white/5"
            disabled={disabled}
          >
            <Plus size={24} className="text-gray-400" />
          </button>
          
          {showAttachments && (
            <div className="absolute bottom-12 left-0 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-10 w-48">
              {/* Upload Image option */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-3 disabled:opacity-50"
              >
                <ImageIcon size={18} /> Upload Image
              </button>
              {/* Upload File option */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-3 disabled:opacity-50"
              >
                <Paperclip size={18} /> Attach File
              </button>
              {/* Emoji option */}
              <button className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-3">
                <Smile size={18} /> Add Emoji
              </button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              resetTypingTimeout();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isUploading ? "Uploading file..." : "Type a message..."}
            disabled={disabled || isUploading}
            rows={1}
            className="w-full resize-none rounded-2xl border border-white/10 bg-[var(--ink-3)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--route)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--route)]/50 disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
        </div>

        {/* Send button / Upload loader */}
        <button
          onClick={() => handleSend()}
          disabled={(!message.trim() && !isUploading) || disabled || isUploading}
          className="btn btn--route h-12 w-12 rounded-full p-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isUploading ? (
            <Loader2 size={20} className="text-white animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
