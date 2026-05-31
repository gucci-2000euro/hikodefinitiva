import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { BottomNav } from "@/components/BottomNav";
import { AuthModal } from "@/components/AuthModal";
import { useAuthStore } from "@/store/useAuthStore";

// Pages
import Auth from "@/pages/auth";
import Home from "@/pages/home";
import RunSession from "@/pages/run";
import RoutesList from "@/pages/routes";
import RouteDetail from "@/pages/route-detail";
import Challenges from "@/pages/challenges";
import Social from "@/pages/social";
import SocialNew from "@/pages/social-new";
import Friends from "@/pages/friends";
import Profile from "@/pages/profile";
import Messages from "@/pages/messages";
import Chat from "@/pages/chat";
import UIPreview from "@/components/UIPreview";
import CommunityList from "@/pages/community/index";
import CommunityHub from "@/pages/community/[id]";
import ChannelView from "@/pages/community/channel";
import CreateCommunity from "@/pages/community/create";
import CommunityAdmin from "@/pages/community/admin";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/" component={Home} />
      <Route path="/routes" component={RoutesList} />
      <Route path="/routes/:id" component={RouteDetail} />
      <Route path="/challenges" component={Challenges} />
      <Route path="/social" component={Social} />
      <Route path="/social/new" component={SocialNew} />
      <Route path="/social/friends" component={Friends} />
      <Route path="/messages" component={Messages} />
      <Route path="/messages/:userId" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/run/:routeId" component={RunSession} />
      <Route path="/community" component={CommunityList} />
      <Route path="/community/create" component={CreateCommunity} />
      <Route path="/community/:id/admin" component={CommunityAdmin} />
      <Route path="/community/:id/channel/:channelId" component={ChannelView} />
      <Route path="/community/:id" component={CommunityHub} />
      <Route path="/preview" component={UIPreview} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-hiko-deep relative overflow-hidden text-foreground">
            <Router />
            <BottomNav />
            <AuthModal />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
