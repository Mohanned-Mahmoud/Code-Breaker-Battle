import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import GameRoom from "@/pages/GameRoom";
import HowToPlay from "@/pages/HowToPlay";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      
      {/* 👇 هذا هو السطر الناقص الذي يسبب المشكلة 👇 */}
      <Route path="/how-to-play" component={HowToPlay} />
      
      <Route path="/game/:id" component={GameRoom} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;