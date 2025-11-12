import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Result from "./pages/Result";
import HowToUse from "./pages/HowToUse";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Consultation from "./pages/Consultation";
import AgeProgression from "./pages/AgeProgression";
import SkinAnalysis from "./pages/SkinAnalysis";
import Forum from "./pages/Forum";
import ForumCreate from "./pages/ForumCreate";
import ForumPost from "./pages/ForumPost";
import SkinCareJournal from "./pages/SkinCareJournal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/result" element={<Result />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/age-progression" element={<AgeProgression />} />
          <Route path="/skin-analysis" element={<SkinAnalysis />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/forum/create" element={<ForumCreate />} />
          <Route path="/forum/post/:id" element={<ForumPost />} />
          <Route path="/journal" element={<SkinCareJournal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
