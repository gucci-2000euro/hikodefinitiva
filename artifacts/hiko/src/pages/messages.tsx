import { useLocation } from 'wouter';
import { useMessagesStore, formatConversationTime } from '@/store/useMessagesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';

export default function Messages() {
  const [, setLocation] = useLocation();
  const user = useAuthStore(s => s.user);
  const openAuthModal = useAuthStore(s => s.openAuthModal);
  const { conversations } = useMessagesStore();

  if (!user) {
    return (
      <div className="min-h-screen bg-hiko-deep text-white flex flex-col items-center justify-center px-6">
        <MessageSquare size={48} className="text-hiko-primary mb-4 opacity-60" />
        <h2 className="text-xl font-bold mb-2">Your Messages</h2>
        <p className="text-white/50 text-center text-sm mb-6">Sign in to chat with other runners.</p>
        <button
          onClick={() => openAuthModal('Sign in to message other runners.')}
          className="bg-hiko-primary text-hiko-deep font-bold py-3 px-8 rounded-2xl hover:bg-hiko-primary/90 transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/10">
        <button
          onClick={() => setLocation('/social')}
          className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <Logo size={26} />
          <h1 className="text-xl font-bold">Messages</h1>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {sorted.length === 0 && (
          <p className="text-center text-white/40 text-sm py-16">No conversations yet.</p>
        )}
        {sorted.map((conv, i) => (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setLocation(`/messages/${conv.participantId}`)}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors text-left"
            data-testid={`conv-${conv.participantId}`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={conv.participantAvatar}
                alt={conv.participantName}
                className="w-12 h-12 rounded-full object-cover border border-white/10"
              />
              {conv.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-hiko-primary rounded-full flex items-center justify-center text-[10px] font-bold text-hiko-deep">
                  {conv.unreadCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-sm font-bold ${conv.unreadCount > 0 ? 'text-white' : 'text-white/80'}`}>
                  {conv.participantName}
                </span>
                <span className="text-[11px] text-white/40 flex-shrink-0">
                  {formatConversationTime(conv.lastMessageTime)}
                </span>
              </div>
              <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-white/80' : 'text-white/40'}`}>
                {conv.lastMessage || 'Start a conversation'}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
