import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { RoomProvider } from "@/hooks/use-room";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import ProfileSetup from "@/pages/profile-setup";
import Dashboard from "@/pages/dashboard";
import Room from "@/pages/room";
import Voting from "@/pages/voting";
import Results from "@/pages/results";
import ProfileSettings from "@/pages/profile-settings";
import React from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  return (
    <>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      ) : !user ? (
        <Login />
      ) : !user.preferences || !(user.preferences as any)?.genres || (user.preferences as any).genres.length === 0 ? (
        <ProfileSetup />
      ) : (
        children
      )}
    </>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  return (
    <>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      ) : !user ? (
        <Login />
      ) : (
        <RoomProvider>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" component={() => <ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile-setup" component={ProfileSetup} />
            <Route path="/profile-settings" component={() => <ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/room/:code" component={() => <ProtectedRoute><Room /></ProtectedRoute>} />
            <Route path="/voting/:code" component={() => <ProtectedRoute><Voting /></ProtectedRoute>} />
            <Route path="/results/:code" component={() => <ProtectedRoute><Results /></ProtectedRoute>} />
            <Route component={NotFound} />
          </Switch>
        </RoomProvider>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppRouter />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
