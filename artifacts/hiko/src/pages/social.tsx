import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommentsStore } from '@/store/useCommentsStore';
import { useMessagesStore } from '@/store/useMessagesStore';
import { Heart, MessageCircle, Plus, Users, MessageSquare, Search, Loader2, MoreHorizontal, Trash2, Lock } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { CommentsSheet } from '@/components/CommentsSheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CommunityCard } from '@/components/community/CommunityCard';
import type { Community } from '@/types/index';

type Tab = 'feed' | 'community';

interface PostRow {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string;
  created_at: string;
  profiles: { nome: string | null; avatar_url: string | null } | null;
  post_likes: { user_id: string }[];
}

export default function Social() {
  const requireAuth = useAuthStore(s => s.requireAuth);
  const user = useAuthStore(s => s.user);
  const [, setLocation] = useLocation();
  const { getByPost } = useCommentsStore();
  const totalUnread = useMessagesStore(s => s.totalUnread());
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('feed');
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [activePostMenu, setActivePostMenu] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: posts = [], isLoading: loadingFeed } = useQuery<PostRow[]>({
    queryKey: ['feed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(nome, avatar_url), post_likes(user_id)')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data ?? []) as PostRow[];
    },
    staleTime: 0,
    enabled: tab === 'feed' && !!user,
  });

  const { data: communities = [], isLoading: loadingCommunities } = useQuery<Community[]>({
    queryKey: ['communities', search],
    queryFn: async () => {
      let q = supabase.from('communities').select('*').order('membri_count', { ascending: false });
      if (search) q = q.ilike('nome', `%${search}%`);
      const { data } = await q.limit(30);
      return (data ?? []) as Community[];
    },
    enabled: tab === 'community' && !!user,
    staleTime: 30_000,
  });

  const handleLike = async (postId: string) => {
    if (!user) { requireAuth('Accedi per mettere like.', () => {}); return; }
    const post = posts.find(p => p.id === postId);
    const isLiked = post?.post_likes.some(l => l.user_id === user.id) ?? false;
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    setActivePostMenu(null);
  };

  const handleJoin = (c: Community) => {
    requireAuth('Accedi per unirti a una community.', () => setLocation(`/community/${c.id}`));
  };

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 border-b border-white/10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <h1 className="text-2xl font-bold">Social</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={tab === 'feed'
                ? () => requireAuth('Accedi per condividere una corsa.', () => setLocation('/social/new'))
                : () => requireAuth('Accedi per creare una community.', () => setLocation('/community/create'))
              }
              className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => requireAuth('Sign in to message runners.', () => setLocation('/messages'))}
              className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors relative"
            >
              <MessageSquare size={20} />
              {user && totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-hiko-primary rounded-full text-[9px] font-bold text-hiko-deep flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </button>
            <Link href="/social/friends" className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors">
              <Users size={20} />
            </Link>
          </div>
        </div>

        <div className="flex bg-white/5 rounded-xl p-1">
          <button onClick={() => setTab('feed')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${tab === 'feed' ? 'bg-hiko-primary text-hiko-deep' : 'text-white/50 hover:text-white'}`}>Feed</button>
          <button onClick={() => setTab('community')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${tab === 'community' ? 'bg-hiko-primary text-hiko-deep' : 'text-white/50 hover:text-white'}`}>Community</button>
        </div>

        {tab === 'community' && (
          <div className="relative mt-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca community..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-hiko-primary/50" />
          </div>
        )}
      </div>

      {/* ── FEED ── */}
      {tab === 'feed' && (
        <div className="space-y-6 pt-4">
          {!user ? (
            <div className="text-center py-16 text-white/40">
              <Lock size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Accedi per vedere il feed</p>
              <p className="text-sm">Le corse condivise sono visibili solo ai membri.</p>
            </div>
          ) : loadingFeed ? (
            <div className="flex justify-center py-16"><Loader2 size={32} className="text-hiko-primary animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <p className="text-lg mb-1">Nessun post ancora</p>
              <p className="text-sm">Condividi la tua prima corsa!</p>
            </div>
          ) : posts.map((post) => {
            const isLiked = user ? post.post_likes.some(l => l.user_id === user.id) : false;
            const likesCount = post.post_likes.length;
            const comments = getByPost(post.id);
            const displayName = post.profiles?.nome ?? 'Runner';
            const avatar = post.profiles?.avatar_url ?? '';
            const timeAgo = new Date(post.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

            return (
              <div key={post.id} className="bg-white/5 border-y border-white/5 pb-4" onClick={() => activePostMenu === post.id && setActivePostMenu(null)}>
                <div className="flex items-center gap-3 p-4">
                  {avatar
                    ? <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    : <div className="w-10 h-10 rounded-full bg-hiko-primary/20 border border-white/10 flex items-center justify-center text-hiko-primary font-bold">{displayName[0]?.toUpperCase()}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{displayName}</p>
                    <p className="text-xs text-white/50">{timeAgo}</p>
                  </div>
                  {user && post.user_id === user.id && (
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setActivePostMenu(activePostMenu === post.id ? null : post.id); }}
                        className="p-1.5 text-white/40 hover:text-white/80 transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {activePostMenu === post.id && (
                        <div className="absolute right-0 top-8 bg-hiko-deep border border-white/10 rounded-xl shadow-xl z-20 min-w-[140px]">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 rounded-xl w-full"
                          >
                            <Trash2 size={14} /> Elimina post
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {post.image_url && (
                  <div className="w-full aspect-[4/3] bg-black/50 overflow-hidden">
                    <img src={post.image_url} alt="Run post" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-4 pb-2">
                  <div className="flex items-center gap-4 mb-3">
                    <button onClick={() => handleLike(post.id)} className="flex items-center gap-1.5 transition-transform active:scale-90">
                      <motion.div animate={isLiked ? { scale: [1, 1.2, 1] } : {}}>
                        <Heart size={24} className={isLiked ? 'text-hiko-primary fill-hiko-primary' : 'text-white hover:text-white/80'} />
                      </motion.div>
                      <span className="font-medium">{likesCount}</span>
                    </button>
                    <button onClick={() => setCommentPostId(post.id)} className="flex items-center gap-1.5 text-white hover:text-hiko-primary transition-colors">
                      <MessageCircle size={24} />
                      <span className="font-medium">{comments.length}</span>
                    </button>
                  </div>
                  <p className="text-sm">
                    <span className="font-bold mr-2">{displayName}</span>
                    <span className="text-white/90">{post.caption}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COMMUNITY ── */}
      {tab === 'community' && (
        <div className="px-4 pt-4">
          {!user ? (
            <div className="text-center py-16 text-white/40">
              <Lock size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Accedi per vedere le community</p>
              <p className="text-sm">Le community sono visibili solo ai membri.</p>
            </div>
          ) : loadingCommunities ? (
            <div className="flex justify-center py-16"><Loader2 size={32} className="text-hiko-primary animate-spin" /></div>
          ) : communities.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <p className="text-lg mb-1">Nessuna community trovata</p>
              <p className="text-sm">Creane una con il + in alto!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {communities.map(c => <CommunityCard key={c.id} community={c} onJoin={() => handleJoin(c)} />)}
            </div>
          )}
        </div>
      )}

      <CommentsSheet postId={commentPostId ?? ''} isOpen={!!commentPostId} onClose={() => setCommentPostId(null)} />
    </div>
  );
}
