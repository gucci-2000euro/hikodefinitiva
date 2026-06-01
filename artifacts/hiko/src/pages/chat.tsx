import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useDMReactions } from '@/hooks/useDMReactions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { checkBlacklist, checkCompletedWords } from '@/lib/moderation';
import { ArrowLeft, Send, Trash2, Reply, MoreHorizontal, ImagePlus, X, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';

const QUICK_EMOJIS = ['😂', '👍', '👎', '🏃', '🔥', '💪'];
const PICKER_EMOJIS = [
  '😂','😍','😅','😢','😮','🤔','😊','😎',
  '👍','👎','👏','🙌','🤝','💪','🏃','🚀',
  '❤️','🔥','⭐','💯','🎉','🏅','🎯','⚡',
  '✅','❌','💥','🌟','🏆','💨','🗺️','📅',
];

const WORD_SEPARATORS = /[\s.,!?;:]/;

function getCompletedPortion(text: string): string {
  let last = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (WORD_SEPARATORS.test(text[i])) { last = i; break; }
  }
  return last >= 0 ? text.slice(0, last + 1) : '';
}

interface DM {
  id: string;
  from_id: string;
  to_id: string;
  testo: string;
  tipo: 'testo' | 'immagine';
  image_url: string | null;
  reply_to_id: string | null;
  letto: boolean;
  created_at: string;
}

interface Profile { id: string; nome: string | null; avatar_url: string | null; }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
}

// ─── Reazioni ────────────────────────────────────────────────────
function DMReactionBar({ messageId, isMine }: { messageId: string; isMine: boolean }) {
  const { reactions, toggleReaction } = useDMReactions(messageId);
  const user = useAuthStore(s => s.user);
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasAny = Object.keys(reactions).length > 0;

  const handle = async (emoji: string) => {
    if (!user) return;
    await toggleReaction(emoji);
    setPickerOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
      {hasAny && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(reactions).map(([emoji, { count, hasReacted }]) => (
            <button key={emoji} onClick={() => handle(emoji)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${hasReacted ? 'bg-hiko-primary text-hiko-deep border-hiko-primary font-semibold' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
              <span>{emoji}</span><span className="text-xs">{count}</span>
            </button>
          ))}
        </div>
      )}
      <Popover.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <Popover.Trigger asChild>
          <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white text-xs transition-all">
            😊
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="top" sideOffset={6} className="z-50 bg-hiko-deep border border-white/15 rounded-2xl p-3 shadow-2xl">
            <div className="flex gap-1 mb-2 pb-2 border-b border-white/10">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => handle(e)} className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg hover:bg-white/10 transition-all ${reactions[e]?.hasReacted ? 'bg-hiko-primary/30 ring-1 ring-hiko-primary' : ''}`}>{e}</button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {PICKER_EMOJIS.map(e => (
                <button key={e} onClick={() => handle(e)} className={`w-8 h-8 flex items-center justify-center rounded-xl text-base hover:bg-white/10 transition-all ${reactions[e]?.hasReacted ? 'bg-hiko-primary/30 ring-1 ring-hiko-primary' : ''}`}>{e}</button>
              ))}
            </div>
            <Popover.Arrow className="fill-hiko-deep" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

// ─── Bolla messaggio ─────────────────────────────────────────────
function DMBubble({ m, isMine, userId, partner, allMessages, onReply, onDelete }: {
  m: DM; isMine: boolean; userId: string; partner: Profile | null | undefined;
  allMessages: DM[]; onReply: (m: DM) => void; onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const replyTo = m.reply_to_id ? allMessages.find(x => x.id === m.reply_to_id) : null;

  return (
    <div className={`group flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar partner */}
      {!isMine && (
        partner?.avatar_url
          ? <img src={partner.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10 flex-shrink-0 self-end mb-1" />
          : <div className="w-6 h-6 rounded-full bg-hiko-primary/20 flex-shrink-0 self-end mb-1 flex items-center justify-center text-[10px] font-bold text-hiko-primary">{(partner?.nome ?? 'R')[0].toUpperCase()}</div>
      )}

      <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Citazione risposta */}
        {replyTo && (
          <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-2 border-hiko-primary bg-white/5 text-xs text-white/50 max-w-full truncate ${isMine ? 'self-end' : 'self-start'}`}>
            <span className="text-hiko-primary font-medium">{replyTo.from_id === userId ? 'Tu' : (partner?.nome ?? 'Runner')}: </span>
            {replyTo.tipo === 'immagine' ? '📷 Immagine' : replyTo.testo}
          </div>
        )}

        {/* Bolla */}
        <div className={`rounded-2xl overflow-hidden ${isMine ? 'bg-hiko-primary text-hiko-deep rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}`}>
          {m.tipo === 'immagine' && m.image_url && (
            <img src={m.image_url} alt="Immagine" className="max-w-[260px] w-full object-cover" />
          )}
          {m.testo && (
            <p className="px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{m.testo}</p>
          )}
        </div>

        {/* Ora + menu ··· */}
        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-white/30 mx-1">{formatTime(m.created_at)}{isMine && m.letto ? ' · Letto' : ''}</span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-white/70 transition-all rounded"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className={`absolute bottom-6 z-30 bg-hiko-deep border border-white/10 rounded-xl shadow-xl overflow-hidden ${isMine ? 'right-0' : 'left-0'}`} style={{ minWidth: 130 }}>
                  <button onClick={() => { onReply(m); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/10 w-full">
                    <Reply size={13} /> Rispondi
                  </button>
                  {isMine && (
                    <button onClick={() => { onDelete(m.id); setMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/10 w-full">
                      <Trash2 size={13} /> Elimina
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reazioni */}
        <DMReactionBar messageId={m.id} isMine={isMine} />
      </div>
    </div>
  );
}

// ─── Pagina principale ───────────────────────────────────────────
export default function Chat() {
  const { userId: partnerId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const imgUpload = useImageUpload('dm-images');

  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: partner } = useQuery<Profile | null>({
    queryKey: ['profile', partnerId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, nome, avatar_url').eq('id', partnerId!).maybeSingle();
      return data as Profile | null;
    },
    enabled: !!partnerId,
    staleTime: 60_000,
  });

  const { data: messages = [] } = useQuery<DM[]>({
    queryKey: ['chat', user?.id, partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(from_id.eq.${user!.id},to_id.eq.${partnerId}),and(from_id.eq.${partnerId},to_id.eq.${user!.id})`)
        .order('created_at', { ascending: true })
        .limit(100);
      return (data ?? []) as DM[];
    },
    enabled: !!user && !!partnerId,
    staleTime: 5_000,
  });

  // Marca come letti
  useEffect(() => {
    if (!user || !partnerId || !messages.length) return;
    const unread = messages.filter(m => m.from_id === partnerId && !m.letto).map(m => m.id);
    if (unread.length) supabase.from('direct_messages').update({ letto: true }).in('id', unread).then(() => qc.invalidateQueries({ queryKey: ['conversations'] }));
  }, [messages, user, partnerId, qc]);

  // Scroll all'ultimo
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'instant' }); }, [messages.length]);

  // Realtime
  useEffect(() => {
    if (!user || !partnerId) return;
    const ch = supabase.channel(`chat:${[user.id, partnerId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (p) => {
        const m = p.new as DM;
        if ((m.from_id === user.id && m.to_id === partnerId) || (m.from_id === partnerId && m.to_id === user.id)) {
          qc.invalidateQueries({ queryKey: ['chat', user.id, partnerId] });
          qc.invalidateQueries({ queryKey: ['conversations'] });
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' }, () => {
        qc.invalidateQueries({ queryKey: ['chat', user.id, partnerId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, partnerId, qc]);

  // Controllo blacklist live
  const runCheck = useCallback((val: string) => {
    const portion = getCompletedPortion(val);
    if (!portion) { setBlocked(null); setFlagged(null); return; }
    const res = checkCompletedWords(portion);
    if (!res) { setBlocked(null); setFlagged(null); }
    else if (res.decision === 'blocked') { setBlocked(res.reason); setFlagged(null); }
    else { setBlocked(null); setFlagged(res.reason); }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    runCheck(e.target.value);
  };

  const handleSend = async () => {
    if ((!text.trim() && !imgUpload.preview) || !user || !partnerId) return;
    const violation = text.trim() ? checkBlacklist(text.trim()) : null;
    if (violation?.decision === 'blocked') {
      setBlocked(violation.reason);
      return;
    }

    const payload: Record<string, unknown> = {
      from_id: user.id,
      to_id: partnerId,
      testo: text.trim() || '',
      tipo: imgUpload.preview ? 'immagine' : 'testo',
      ...(imgUpload.preview ? { image_url: imgUpload.preview } : {}),
      ...(replyTo ? { reply_to_id: replyTo.id } : {}),
    };

    setText('');
    setBlocked(null);
    setFlagged(null);
    setReplyTo(null);
    imgUpload.setPreview(null);

    await supabase.from('direct_messages').insert(payload);
    qc.invalidateQueries({ queryKey: ['chat', user.id, partnerId] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('direct_messages').delete().eq('id', id).eq('from_id', user!.id);
    qc.invalidateQueries({ queryKey: ['chat', user!.id, partnerId] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
  };

  if (!user) return null;

  type Group = { date: string; msgs: DM[] };
  const grouped = messages.reduce<Group[]>((acc, m) => {
    const date = formatDate(m.created_at);
    const last = acc[acc.length - 1];
    if (last?.date === date) last.msgs.push(m);
    else acc.push({ date, msgs: [m] });
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-hiko-deep text-white">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 bg-hiko-deep/90 backdrop-blur-md border-b border-white/10 pt-12">
        <button onClick={() => setLocation('/messages')} className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={18} />
        </button>
        {partner?.avatar_url
          ? <img src={partner.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
          : <div className="w-9 h-9 rounded-full bg-hiko-primary/20 border border-white/10 flex items-center justify-center text-hiko-primary font-bold">{(partner?.nome ?? 'R')[0].toUpperCase()}</div>
        }
        <p className="font-bold text-sm flex-1">{partner?.nome ?? 'Runner'}</p>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 space-y-1">
        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex justify-center my-4">
              <span className="text-[11px] text-white/30 bg-white/5 px-3 py-1 rounded-full">{group.date}</span>
            </div>
            <div className="space-y-2">
              {group.msgs.map(m => (
                <DMBubble
                  key={m.id}
                  m={m}
                  isMine={m.from_id === user.id}
                  userId={user.id}
                  partner={partner}
                  allMessages={messages}
                  onReply={setReplyTo}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-white/10 bg-hiko-deep">
        {/* Feedback blacklist */}
        {blocked && (
          <div className="flex items-center gap-2 px-4 pt-2">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{blocked}</p>
          </div>
        )}
        {!blocked && flagged && (
          <div className="flex items-center gap-2 px-4 pt-2">
            <Info size={13} className="text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">{flagged}</p>
          </div>
        )}

        {/* Preview immagine */}
        {imgUpload.preview && (
          <div className="px-4 pt-2 relative inline-block">
            <img src={imgUpload.preview} alt="" className="h-20 rounded-xl object-cover border border-white/10" />
            <button onClick={() => imgUpload.setPreview(null)} className="absolute top-3 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Banner risposta */}
        <AnimatePresence>
          {replyTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 px-4 pt-2 overflow-hidden">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-hiko-primary/30 rounded-xl px-3 py-1.5 text-xs text-white/60 min-w-0">
                <Reply size={12} className="text-hiko-primary shrink-0" />
                <span className="truncate">{replyTo.tipo === 'immagine' ? '📷 Immagine' : replyTo.testo}</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white/70"><X size={16} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-4 py-3 flex items-end gap-2">
          {/* Upload immagine */}
          <input ref={imgUpload.inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f && user) await imgUpload.handleFile(f, user.id); }} />
          <button onClick={imgUpload.open} disabled={imgUpload.uploading}
            className="flex-shrink-0 p-2 text-white/40 hover:text-hiko-primary transition-colors disabled:opacity-40">
            {imgUpload.uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          </button>

          <div className={`flex-1 flex items-end bg-white/5 rounded-2xl border px-4 py-2.5 gap-2 focus-within:border-hiko-primary/40 transition-colors ${blocked ? 'border-red-500/40' : flagged ? 'border-yellow-500/30' : 'border-white/10'}`}>
            <textarea
              ref={inputRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Messaggio..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none resize-none max-h-24 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
          </div>

          <AnimatePresence>
            {(text.trim() || imgUpload.preview) && (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                onClick={handleSend} disabled={!!blocked}
                className="w-10 h-10 bg-hiko-primary rounded-full flex items-center justify-center text-hiko-deep shadow-lg flex-shrink-0 disabled:opacity-40">
                <Send size={17} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
