import { useState } from 'react';
import { useFriendsStore } from '@/store/useFriendsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessagesStore } from '@/store/useMessagesStore';
import { ArrowLeft, UserPlus, Check, X, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function Friends() {
  const { friends, acceptRequest, rejectRequest, sendRequest } = useFriendsStore();
  const requireAuth = useAuthStore(s => s.requireAuth);
  const [, setLocation] = useLocation();
  const { startConversation } = useMessagesStore();
  const [tab, setTab] = useState<'my' | 'requests' | 'suggested'>('my');

  const gateAccept = (id: string) => requireAuth('Sign in to accept friend requests.', () => acceptRequest(id));
  const gateReject = (id: string) => requireAuth('Sign in to manage friend requests.', () => rejectRequest(id));
  const gateAdd = (id: string) => requireAuth('Sign in to add friends.', () => sendRequest(id));

  const handleMessage = (friend: typeof friends[0]) => {
    requireAuth('Sign in to message other runners.', () => {
      startConversation({ id: friend.id, name: friend.name, avatar: friend.avatar });
      setLocation(`/messages/${friend.id}`);
    });
  };

  const getFiltered = () => {
    switch (tab) {
      case 'my': return friends.filter(f => f.status === 'friend');
      case 'requests': return friends.filter(f => f.status === 'request');
      case 'suggested': return friends.filter(f => f.status === 'suggested' || f.status === 'pending');
      default: return [];
    }
  };

  return (
    <div className="min-h-screen bg-hiko-deep text-white pb-24">
      <div className="sticky top-0 z-20 bg-hiko-deep/90 backdrop-blur-md px-6 py-4 flex items-center gap-4 border-b border-white/10">
        <Link href="/social" className="p-2 glass-panel rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold">Friends</h1>
      </div>

      <div className="px-6 py-4">
        <div className="glass-panel p-1 rounded-xl flex mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'my' ? 'bg-white/10 text-white' : 'text-white/50'}`}
            onClick={() => setTab('my')}
          >
            My Friends
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative ${tab === 'requests' ? 'bg-white/10 text-white' : 'text-white/50'}`}
            onClick={() => setTab('requests')}
          >
            Requests
            {friends.filter(f => f.status === 'request').length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-hiko-primary" />
            )}
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'suggested' ? 'bg-white/10 text-white' : 'text-white/50'}`}
            onClick={() => setTab('suggested')}
          >
            Suggested
          </button>
        </div>

        <div className="space-y-4">
          {getFiltered().map(friend => (
            <div key={friend.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                <div>
                  <p className="font-bold text-white">{friend.name}</p>
                  <p className="text-xs text-white/50">{friend.weeklyKm} km this week</p>
                  {friend.mutualFriends && (
                    <p className="text-[10px] text-white/40 mt-0.5">{friend.mutualFriends} mutual friends</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {friend.status === 'friend' && (
                  <button
                    onClick={() => handleMessage(friend)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-hiko-primary/10 hover:bg-hiko-primary/20 transition-colors text-sm font-medium text-hiko-primary"
                    data-testid={`msg-${friend.id}`}
                  >
                    <MessageSquare size={15} /> Message
                  </button>
                )}
                {friend.status === 'request' && (
                  <>
                    <button
                      onClick={() => gateAccept(friend.id)}
                      className="w-10 h-10 rounded-full bg-hiko-primary flex items-center justify-center text-hiko-deep hover:bg-hiko-primary/90 transition-colors"
                    >
                      <Check size={20} />
                    </button>
                    <button
                      onClick={() => gateReject(friend.id)}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </>
                )}
                {friend.status === 'suggested' && (
                  <button
                    onClick={() => gateAdd(friend.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                  >
                    <UserPlus size={16} /> Add
                  </button>
                )}
                {friend.status === 'pending' && (
                  <div className="px-3 py-1.5 rounded-lg bg-black/20 text-xs font-medium text-white/50 border border-white/5">
                    Pending
                  </div>
                )}
              </div>
            </div>
          ))}
          {getFiltered().length === 0 && (
            <div className="text-center py-12 text-white/50">
              <p>No friends here yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
