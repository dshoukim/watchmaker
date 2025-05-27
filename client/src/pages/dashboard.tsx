import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRoom } from '@/hooks/use-room';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, QrCode, LogOut, Film, Tv, Users, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCode } from '@/components/qr-code';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { createRoom, joinRoom } = useRoom();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadRecentSessions();
    }
  }, [user]);

  const loadRecentSessions = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/sessions`);
      if (response.ok) {
        const sessions = await response.json();
        setRecentSessions(sessions.slice(0, 5)); // Show last 5 sessions
      }
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const roomCode = await createRoom();
      toast({
        title: "Room Created!",
        description: `Room code: ${roomCode}. Share this code with your partner.`,
      });
      // Navigate to room page
      window.location.href = `/room/${roomCode}`;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid room code.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(joinCode.toUpperCase());
      toast({
        title: "Joined Room!",
        description: "Successfully joined the watch room.",
      });
      setShowJoinDialog(false);
      setJoinCode('');
      // Navigate to room page
      window.location.href = `/room/${joinCode.toUpperCase()}`;
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please check the code and try again.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const userInitials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Film className="w-8 h-8 text-red-500" />
          WatchTogether
        </h1>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-black font-semibold text-sm">{userInitials}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Welcome Message */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome back, {user.name.split(' ')[0]}!
            </h2>
            <p className="text-gray-400">Ready to find your next watch?</p>
          </div>

          {/* Quick Actions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Start Watching</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full bg-red-600 hover:bg-red-700 py-4 font-semibold"
              >
                <Plus className="w-5 h-5 mr-2" />
                {isCreating ? 'Creating...' : 'Create Watch Room'}
              </Button>
              
              <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full py-4 font-semibold bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    Join Room
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Join Watch Room</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="roomCode" className="text-gray-300">Room Code</Label>
                      <Input
                        id="roomCode"
                        placeholder="Enter 8-digit code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        className="bg-gray-800 border-gray-700 text-white text-center font-mono tracking-wider"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowJoinDialog(false)}
                        className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleJoinRoom}
                        disabled={isJoining || !joinCode.trim()}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {isJoining ? 'Joining...' : 'Join Room'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {recentSessions.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentSessions.map((session, index) => (
                    <div
                      key={session.id || index}
                      className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-12 bg-gray-700 rounded flex items-center justify-center">
                        <Film className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {session.selectedMovieTitle || 'Watch Session'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {new Date(session.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Stats */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Your Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {user.preferences?.favoriteMovies?.length || 0}
                  </div>
                  <div className="text-sm text-gray-400">Movies Liked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {recentSessions.length}
                  </div>
                  <div className="text-sm text-gray-400">Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
