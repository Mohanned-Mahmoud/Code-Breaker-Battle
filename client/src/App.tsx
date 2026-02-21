import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import GameRoom from "@/pages/GameRoom";
import PartyRoom from "@/pages/PartyRoom";
import HowToPlay from "@/pages/HowToPlay";
import TeamRoom from "@/pages/TeamRoom";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/how-to-play" component={HowToPlay} />
      <Route path="/game/:id" component={GameRoom} />
      <Route path="/party/:id" component={PartyRoom} />
      <Route path="/team/:id" component={TeamRoom} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* The ThemeProvider MUST wrap the Router so all pages can access the theme */}
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;