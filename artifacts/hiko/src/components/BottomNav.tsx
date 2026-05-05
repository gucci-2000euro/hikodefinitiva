import { Link, useLocation } from "wouter";
import { Home, Map as MapIcon, Trophy, Users, User as ProfileIcon } from "lucide-react";
import { useMessagesStore } from "@/store/useMessagesStore";
import { useAuthStore } from "@/store/useAuthStore";

export function BottomNav() {
  const [location] = useLocation();
  const user = useAuthStore(s => s.user);
  const totalUnread = useMessagesStore(s => s.totalUnread());

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/routes", icon: MapIcon, label: "Routes" },
    { href: "/challenges", icon: Trophy, label: "Challenges" },
    { href: "/social", icon: Users, label: "Social", badge: user && totalUnread > 0 ? totalUnread : 0 },
    { href: "/profile", icon: ProfileIcon, label: "Profile" },
  ];

  if (location === "/auth" || location.startsWith("/run/") || location.startsWith("/messages/")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
      <div className="glass-panel mx-auto max-w-md rounded-2xl flex justify-between items-center px-6 py-3 pointer-events-auto">
        {navItems.map(({ href, icon: Icon, label, badge }) => {
          const isActive = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 relative">
              <div className={`p-2 rounded-full transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'text-white/60 hover:text-white'}`}>
                <Icon size={24} className={isActive ? 'fill-primary/20' : ''} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {badge != null && badge > 0 && (
                <span className="absolute -top-0.5 right-0 w-4 h-4 bg-hiko-primary rounded-full text-[9px] font-bold text-hiko-deep flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
