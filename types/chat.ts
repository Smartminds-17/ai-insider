export interface User {
  id: string;
  name?: string;
  image?: string;
  email?: string;
  isOnline?: boolean;
  lastActiveAt?: string;
  isMentor?: boolean;
  mentorAvailability?: boolean;
  mentorRating?: number;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
  lastReadAt?: string;
  user: User;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
  user: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  deletedAt?: string;
  sender: User;
  parentMessageId?: string;
  parentMessage?: Message;
  replies: Message[];
  reactions: MessageReaction[];
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  description?: string;
  imageUrl?: string;
  learningPathId?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  learningPath?: { id: string; title: string };
  participants: ConversationParticipant[];
  messages: Message[];
}