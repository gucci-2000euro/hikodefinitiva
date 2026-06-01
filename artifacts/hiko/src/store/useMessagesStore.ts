import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Mirrors Supabase schema:
// conversations(id, participant_ids[], last_message, last_message_time, unread_count)
// messages(id, conversation_id, sender_id, sender_name, sender_avatar, text, timestamp, read)

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface MessagesState {
  conversations: Conversation[];
  messages: Message[];
  getConversation: (participantId: string) => Conversation | undefined;
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, participantId: string, senderId: string, senderName: string, senderAvatar: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
  markRead: (conversationId: string) => void;
  startConversation: (participant: { id: string; name: string; avatar: string }) => string;
  totalUnread: () => number;
}

function formatConversationTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
export { formatConversationTime };

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
export { formatMessageTime };

// TODO [BE]: caricare conversazioni dall'API — GET /api/conversations?userId=...
// TODO [BE]: caricare messaggi per conversazione — GET /api/messages?conversationId=...
// TODO [BE]: implementare invio messaggio reale — POST /api/messages
// TODO [BE]: usare Supabase Realtime per ricevere nuovi messaggi in tempo reale
export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: [],
      getConversation: (participantId) =>
        get().conversations.find(c => c.participantId === participantId),
      getMessages: (conversationId) =>
        get().messages.filter(m => m.conversationId === conversationId),
      sendMessage: (conversationId, _participantId, senderId, senderName, senderAvatar, text) => {
        const msg: Message = {
          id: `m${Date.now()}`,
          conversationId,
          senderId,
          senderName,
          senderAvatar,
          text,
          timestamp: new Date().toISOString(),
          read: true,
        };
        set(s => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map(c =>
            c.id === conversationId
              ? { ...c, lastMessage: text, lastMessageTime: msg.timestamp, unreadCount: 0 }
              : c
          ),
        }));
        // TODO [BE]: qui va la chiamata API per persistere il messaggio e notificare il destinatario
      },
      deleteMessage: (messageId) => set(s => ({
        messages: s.messages.filter(m => m.id !== messageId),
      })),
      markRead: (conversationId) => set(s => ({
        messages: s.messages.map(m => m.conversationId === conversationId ? { ...m, read: true } : m),
        conversations: s.conversations.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c),
      })),
      startConversation: (participant) => {
        const existing = get().conversations.find(c => c.participantId === participant.id);
        if (existing) return existing.id;
        const id = `conv-${participant.id}`;
        const conv: Conversation = {
          id,
          participantId: participant.id,
          participantName: participant.name,
          participantAvatar: participant.avatar,
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        };
        set(s => ({ conversations: [conv, ...s.conversations] }));
        return id;
      },
      totalUnread: () => get().conversations.reduce((acc, c) => acc + c.unreadCount, 0),
    }),
    { name: 'hiko-messages' }
  )
);
