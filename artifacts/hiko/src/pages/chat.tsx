import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMessagesStore, formatMessageTime } from '@/store/useMessagesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Send, Phone, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chat() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const user = useAuthStore(s => s.user);

  // Subscribe reactively so new messages re-render the component
  const conversations = useMessagesStore(s => s.conversations);
  const allMessages = useMessagesStore(s => s.messages);
  const sendMessage = useMessagesStore(s => s.sendMessage);
  const deleteMessage = useMessagesStore(s => s.deleteMessage);
  const markRead = useMessagesStore(s => s.markRead);

  const conv = conversations.find(c => c.participantId === (userId ?? ''));
  const messages = allMessages.filter(m => m.conversationId === (conv?.id ?? ''));

  const [text, setText] = useState('');
  const [activeMsg, setActiveMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auth guard — only depends on user
  useEffect(() => {
    if (!user) setLocation('/messages');
  }, [user, setLocation]);

  // Mark conversation read when its ID is first seen — conv.id is a stable string
  // so this effect only fires when navigating to a different conversation, not on every update
  const convId = conv?.id;
  useEffect(() => {
    if (convId) markRead(convId);
  }, [convId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim() || !user || !conv) return;
    sendMessage(conv.id, conv.participantId, user.id, user.name, user.avatar, text.trim());
    setText('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  if (!user || !conv) return null;

  // Group messages by date
  type GroupedMessages = { date: string; msgs: typeof messages }[];
  const grouped = messages.reduce<GroupedMessages>((acc, msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString([], {
      weekday: 'long', month: 'short', day: 'numeric'
    });
    const last = acc[acc.length - 1];
    if (last && last.date === date) { last.msgs.push(msg); }
    else { acc.push({ date, msgs: [msg] }); }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-hiko-deep text-white">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 bg-hiko-deep/90 backdrop-blur-md border-b border-white/10 pt-12">
        <button
          onClick={() => setLocation('/messages')}
          className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <img
          src={conv.participantAvatar}
          alt={conv.participantName}
          className="w-9 h-9 rounded-full object-cover border border-white/10"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{conv.participantName}</p>
          <p className="text-[11px] text-hiko-primary">Active recently</p>
        </div>
        <button className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors text-white/60">
          <Phone size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0" onClick={() => setActiveMsg(null)}>
        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center justify-center my-4">
              <span className="text-[11px] text-white/30 bg-white/5 px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>
            <div className="space-y-1">
              {group.msgs.map((msg, idx) => {
                const isMine = msg.senderId === user.id;
                const isFirst = idx === 0 || group.msgs[idx - 1].senderId !== msg.senderId;
                const isLast = idx === group.msgs.length - 1 || group.msgs[idx + 1].senderId !== msg.senderId;

                const isActive = activeMsg === msg.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isMine && isLast ? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-6 h-6 rounded-full object-cover border border-white/10 flex-shrink-0 mb-1"
                      />
                    ) : !isMine ? (
                      <div className="w-6 flex-shrink-0" />
                    ) : null}

                    <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {isFirst && !isMine && (
                        <span className="text-[10px] text-white/40 ml-3 mb-1">{msg.senderName}</span>
                      )}
                      <div
                        onClick={() => isMine && setActiveMsg(isActive ? null : msg.id)}
                        className={`px-3.5 py-2.5 text-sm leading-relaxed ${isMine ? 'cursor-pointer' : ''} ${
                          isMine
                            ? 'bg-hiko-primary text-hiko-deep font-medium rounded-2xl rounded-br-sm'
                            : 'bg-white/10 text-white rounded-2xl rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      {isLast && (
                        <span className="text-[10px] text-white/30 mx-1 mt-0.5">
                          {formatMessageTime(msg.timestamp)}
                          {isMine && !msg.read && ' · Sent'}
                        </span>
                      )}
                      <AnimatePresence>
                        {isMine && isActive && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => { deleteMessage(msg.id); setActiveMsg(null); }}
                            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 mt-1 mr-1"
                          >
                            <Trash2 size={11} /> Elimina
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/10 flex items-center gap-3 bg-hiko-deep">
        <div className="flex-1 flex items-center bg-white/5 rounded-2xl border border-white/10 px-4 py-2.5 gap-2 focus-within:border-hiko-primary/40 transition-colors">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Message..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <AnimatePresence>
          {text.trim() && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={handleSend}
              className="w-10 h-10 bg-hiko-primary rounded-full flex items-center justify-center text-hiko-deep shadow-lg flex-shrink-0"
            >
              <Send size={17} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
