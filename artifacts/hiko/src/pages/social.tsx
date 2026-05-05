import { useState } from 'react';
import { useFeedStore } from '@/store/useFeedStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommentsStore } from '@/store/useCommentsStore';
import { useMessagesStore } from '@/store/useMessagesStore';
import { Heart, MessageCircle, Plus, Users, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { CommentsSheet } from '@/components/CommentsSheet';

export default function Social() {
  const { posts, toggleLike } = useFeedStore();
  const requireAuth = useAuthStore(s => s.requireAuth);
  const user = useAuthStore(s => s.user);
  const [, setLocation] = useLocation();
  const { getByPost } = useCommentsStore();
  const totalUnread = useMessagesStore(s => s.totalUnread());

  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const handleLike = (postId: string) => {
    requireAuth('Sign in to like posts and join the community.', () => toggleLike(postId));
  };

  const handleComment = (postId: string) => {
    setCommentPostId(postId);
  };

  const handleNew = () => {
    requireAuth('Sign in to share your run.', () => setLocation('/social/new'));
  };

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <h1 className="text-2xl font-bold">Feed</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => requireAuth('Sign in to message runners.', () => setLocation('/messages'))}
            className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors relative"
            data-testid="header-messages"
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

      <div className="space-y-6 pt-4">
        {posts.map((post) => {
          const comments = getByPost(post.id);
          return (
            <div key={post.id} className="bg-white/5 border-y border-white/5 pb-4">
              <div className="flex items-center gap-3 p-4">
                <img src={post.userAvatar} alt={post.userName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                <div>
                  <p className="font-bold text-sm">{post.userName}</p>
                  <p className="text-xs text-white/50">{post.timeAgo}</p>
                </div>
              </div>

              <div className="w-full aspect-[4/3] bg-black/50 overflow-hidden">
                <img src={post.imageUrl} alt="Run post" className="w-full h-full object-cover" />
              </div>

              <div className="p-4 pb-2">
                <div className="flex items-center gap-4 mb-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1.5 transition-transform active:scale-90"
                    data-testid={`like-${post.id}`}
                  >
                    <motion.div animate={post.isLiked ? { scale: [1, 1.2, 1] } : {}}>
                      <Heart
                        size={24}
                        className={post.isLiked ? 'text-hiko-primary fill-hiko-primary' : 'text-white hover:text-white/80'}
                      />
                    </motion.div>
                    <span className="font-medium">{post.likes}</span>
                  </button>
                  <button
                    onClick={() => handleComment(post.id)}
                    className="flex items-center gap-1.5 text-white hover:text-hiko-primary transition-colors"
                    data-testid={`comment-${post.id}`}
                  >
                    <MessageCircle size={24} />
                    <span className="font-medium">{comments.length}</span>
                  </button>
                </div>

                <p className="text-sm">
                  <span className="font-bold mr-2">{post.userName}</span>
                  <span className="text-white/90">{post.caption}</span>
                </p>

                {comments.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {comments.slice(0, 2).map((c) => (
                      <p key={c.id} className="text-sm">
                        <span className="font-bold mr-2 text-white/80">{c.userName}</span>
                        <span className="text-white/70">{c.text}</span>
                      </p>
                    ))}
                    {comments.length > 2 && (
                      <button
                        onClick={() => handleComment(post.id)}
                        className="text-xs font-medium text-white/50 mt-1 hover:text-white/70 transition-colors"
                      >
                        View all {comments.length} comments
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <motion.button
        onClick={handleNew}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-28 right-6 w-14 h-14 bg-hiko-primary rounded-full flex items-center justify-center shadow-lg shadow-hiko-primary/20 z-30"
        data-testid="new-post"
      >
        <Plus size={28} className="text-hiko-deep" />
      </motion.button>

      <CommentsSheet
        postId={commentPostId ?? ''}
        isOpen={!!commentPostId}
        onClose={() => setCommentPostId(null)}
      />
    </div>
  );
}
