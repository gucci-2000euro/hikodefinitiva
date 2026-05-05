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
  markRead: (conversationId: string) => void;
  startConversation: (participant: { id: string; name: string; avatar: string }) => string;
  totalUnread: () => number;
}

const now = Date.now();
const mockConversations: Conversation[] = [
  {
    id: 'conv-u2',
    participantId: 'u2',
    participantName: 'Alex Rivers',
    participantAvatar: 'https://i.pravatar.cc/150?u=u2',
    lastMessage: 'Great run today! See you tomorrow?',
    lastMessageTime: new Date(now - 3600000).toISOString(),
    unreadCount: 2
  },
  {
    id: 'conv-u3',
    participantId: 'u3',
    participantName: 'Elena Trail',
    participantAvatar: 'https://i.pravatar.cc/150?u=u3',
    lastMessage: 'The northern ridge is insane right now 🔥',
    lastMessageTime: new Date(now - 86400000).toISOString(),
    unreadCount: 0
  }
];

const mockMessages: Message[] = [
  { id: 'm1', conversationId: 'conv-u2', senderId: 'u2', senderName: 'Alex Rivers', senderAvatar: 'https://i.pravatar.cc/150?u=u2', text: 'Hey! Are you running this weekend?', timestamp: new Date(now - 7200000).toISOString(), read: true },
  { id: 'm2', conversationId: 'conv-u2', senderId: 'u1', senderName: 'Me', senderAvatar: 'https://i.pravatar.cc/150?u=u1', text: 'Yes! Planning to hit the coastal route Saturday morning.', timestamp: new Date(now - 7000000).toISOString(), read: true },
  { id: 'm3', conversationId: 'conv-u2', senderId: 'u2', senderName: 'Alex Rivers', senderAvatar: 'https://i.pravatar.cc/150?u=u2', text: 'Perfect. I might join. What time?', timestamp: new Date(now - 5400000).toISOString(), read: true },
  { id: 'm4', conversationId: 'conv-u2', senderId: 'u2', senderName: 'Alex Rivers', senderAvatar: 'https://i.pravatar.cc/150?u=u2', text: 'Great run today! See you tomorrow?', timestamp: new Date(now - 3600000).toISOString(), read: false },
  { id: 'm5', conversationId: 'conv-u3', senderId: 'u3', senderName: 'Elena Trail', senderAvatar: 'https://i.pravatar.cc/150?u=u3', text: 'Just got back from the northern ridge. It was incredible!', timestamp: new Date(now - 90000000).toISOString(), read: true },
  { id: 'm6', conversationId: 'conv-u3', senderId: 'u1', senderName: 'Me', senderAvatar: 'https://i.pravatar.cc/150?u=u1', text: 'I saw your post! Looked amazing. Trail conditions good?', timestamp: new Date(now - 88000000).toISOString(), read: true },
  { id: 'm7', conversationId: 'conv-u3', senderId: 'u3', senderName: 'Elena Trail', senderAvatar: 'https://i.pravatar.cc/150?u=u3', text: 'The northern ridge is insane right now 🔥', timestamp: new Date(now - 86400000).toISOString(), read: true },
];

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

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      conversations: mockConversations,
      messages: mockMessages,
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
          read: true
        };
        set(s => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map(c =>
            c.id === conversationId
              ? { ...c, lastMessage: text, lastMessageTime: msg.timestamp, unreadCount: 0 }
              : c
          )
        }));

        // Simulate a reply after 2-4 seconds
        const conv = get().conversations.find(c => c.id === conversationId);
        if (conv) {
          const replies = [
            'Nice one!',
            'Sounds good, I\'ll be there!',
            'Let\'s go!',
            'Can\'t wait!',
            'That route is amazing.',
            'See you out there!'
          ];
          setTimeout(() => {
            const reply: Message = {
              id: `m${Date.now()}`,
              conversationId,
              senderId: conv.participantId,
              senderName: conv.participantName,
              senderAvatar: conv.participantAvatar,
              text: replies[Math.floor(Math.random() * replies.length)],
              timestamp: new Date().toISOString(),
              read: false
            };
            set(s => ({
              messages: [...s.messages, reply],
              conversations: s.conversations.map(c =>
                c.id === conversationId
                  ? { ...c, lastMessage: reply.text, lastMessageTime: reply.timestamp, unreadCount: c.unreadCount + 1 }
                  : c
              )
            }));
          }, 2000 + Math.random() * 2000);
        }
      },
      markRead: (conversationId) => set(s => ({
        messages: s.messages.map(m => m.conversationId === conversationId ? { ...m, read: true } : m),
        conversations: s.conversations.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
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
          unreadCount: 0
        };
        set(s => ({ conversations: [conv, ...s.conversations] }));
        return id;
      },
      totalUnread: () => get().conversations.reduce((acc, c) => acc + c.unreadCount, 0)
    }),
    { name: 'hiko-messages' }
  )
);
