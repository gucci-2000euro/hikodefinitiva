import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Pencil, Trash2, Check, AlertTriangle, Info } from 'lucide-react';
import { useCommentsStore, formatRelative } from '@/store/useCommentsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { checkBlacklist, checkCompletedWords } from '@/lib/moderation';

interface CommentsSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsSheet({ postId, isOpen, onClose }: CommentsSheetProps) {
  const { getByPost, addComment, editComment, deleteComment } = useCommentsStore();
  const user = useAuthStore(s => s.user);
  const requireAuth = useAuthStore(s => s.requireAuth);

  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const textViolation = text ? checkCompletedWords(text) : null;
  const textBlocked = textViolation?.decision === 'blocked';
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const comments = getByPost(postId);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 350);
    }
  }, [isOpen, comments.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    const violation = checkBlacklist(text);
    if (violation?.decision === 'blocked') return;
    requireAuth('Sign in to comment.', () => {
      if (!user) return;
      addComment(postId, user.id, user.name, user.avatar, text);
      setText('');
    });
  };

  const handleEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditText(current);
  };

  const commitEdit = () => {
    if (!editingId || !editText.trim()) return;
    editComment(editingId, editText);
    setEditingId(null);
    setEditText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="fixed bottom-0 left-0 right-0 z-[600] max-w-md mx-auto bg-hiko-deep border-t border-white/10 rounded-t-3xl flex flex-col"
            style={{ maxHeight: '80dvh' }}
          >
            {/* Handle + Header */}
            <div className="flex-shrink-0 px-6 pt-3 pb-4 border-b border-white/10">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">
                  Comments <span className="text-white/40 font-normal ml-1">{comments.length}</span>
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {comments.length === 0 && (
                <p className="text-center text-white/40 text-sm py-8">No comments yet. Be the first!</p>
              )}
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white">{comment.userName}</span>
                        {comment.editedAt && (
                          <span className="text-[10px] text-white/30">edited</span>
                        )}
                      </div>
                      {editingId === comment.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            autoFocus
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && commitEdit()}
                            className="flex-1 bg-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-hiko-primary/50"
                          />
                          <button onClick={commitEdit} className="p-1 rounded-full bg-hiko-primary/20 text-hiko-primary">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded-full hover:bg-white/10 text-white/50">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-white/90 leading-relaxed">{comment.text}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <span className="text-[11px] text-white/40">{formatRelative(comment.createdAt)}</span>
                      {user && user.id === comment.userId && editingId !== comment.id && (
                        <>
                          <button
                            onClick={() => handleEdit(comment.id, comment.text)}
                            className="text-[11px] text-white/40 hover:text-hiko-primary transition-colors flex items-center gap-0.5"
                          >
                            <Pencil size={10} /> Edit
                          </button>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="text-[11px] text-white/40 hover:text-red-400 transition-colors flex items-center gap-0.5"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="flex-shrink-0 border-t border-white/10 bg-hiko-deep">
              {textViolation?.decision === 'blocked' && (
                <div className="flex items-center gap-2 px-4 pt-2">
                  <AlertTriangle size={12} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{textViolation.reason}</p>
                </div>
              )}
              {textViolation?.decision === 'flagged' && (
                <div className="flex items-center gap-2 px-4 pt-2">
                  <Info size={12} className="text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-300">{textViolation.reason}</p>
                </div>
              )}
              <div className="px-4 py-3 flex items-center gap-3">
                {user && (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10" />
                )}
                <div className={`flex-1 flex items-center bg-white/5 rounded-2xl border px-4 py-2.5 gap-2 transition-colors ${
                  textViolation?.decision === 'blocked' ? 'border-red-500/50' :
                  textViolation?.decision === 'flagged' ? 'border-yellow-500/40 focus-within:border-yellow-500/60' :
                  'border-white/10 focus-within:border-hiko-primary/40'
                }`}>
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={user ? 'Add a comment...' : 'Sign in to comment...'}
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || textBlocked}
                    className="text-hiko-primary disabled:opacity-30 transition-opacity flex-shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
