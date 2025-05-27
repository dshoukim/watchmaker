import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useRoom } from '@/hooks/use-room';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Copy, Share, Users, Film, Tv, Crown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCode } from '@/components/qr-code';

export default function Room() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { room, participants, joinRoom, startVoting, isConnected } = useRoom();
  const { toast } = useToast();
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (code && user && !room) {
      handleJoinRoom();
    }
  }, [code, user, room]);

  const handleJoinRoom = async () => {
    if (!code || !user) return;
    
    setIsJoining(true);
    try {
      await joinRoom(code);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. The room may not exist or may be full.",
        variant: "destructive"
      });
      setLocation('/dashboard');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartVoting = async (contentType: 'movie' | 'tv') => {
    setIsStarting(true);
    try {
      await startVoting(contentType);
      toast({
        title: "Voting Started!",
        description: `Loading ${contentType === 'movie' ? 'movie' : 'TV show'} recommendations...`,
      });
      setLocation(`/voting/${code}`);
    } catch (error) {
      console.error('Error starting voting:', error);
      toast({
        title: "Error",
        description: "Failed to start voting session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!room) return;
    
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying code:', error);
      toast({
        title: "Error",
        description: "Failed to copy room code.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!room) return;
    
    const shareData = {
      title: 'Join my WatchTogether room',
      text: `Join me in choosing what to watch! Room code: ${room.code}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast({
          title: "Copied!",
          description: "Room link copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGoBack = () => {
    setLocation('/dashboard');
  };

  if (isJoining || !room || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">
            {isJoining ? 'Joining room...' : 'Loading room...'}
          </p>
        </div>
      </div>
    );
  }

  const isHost = room.hostId === user.id;
  const canStartVoting = isHost && participants.length >= 1 && room.status === 'waiting';
  const roomUrl = `${window.location.origin}/room/${room.code}`;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 px-6 py-4 flex items-center border-b border-gray-800">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="mr-4 p-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-white">Watch Room</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      <div className="px-6 py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          {/* Room Code Display */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8">
              <div className="bg-black rounded-lg p-6 mb-4">
                <div className="text-4xl font-mono font-bold text-white tracking-wider mb-2">
                  {room.code}
                </div>
                <p className="text-sm text-gray-400">Room Code</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleShare}
                  className="w-full bg-green-600 hover:bg-green-700 font-semibold"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share Room
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyCode}
                    variant="outline"
                    className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => setShowQRDialog(true)}
                    variant="outline"
                    className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    QR Code
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {participants.map((participant, index) => {
                  const isCurrentUser = participant.userId === user.id;
                  const isRoomHost = participant.userId === room.hostId;
                  
                  return (
                    <div
                      key={participant.userId || index}
                      className="flex items-center gap-3 bg-gray-800 rounded-lg p-3"
                    >
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-black text-sm font-semibold">
                          {isCurrentUser ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                        </span>
                      </div>
                      <span className="font-medium text-white flex-1">
                        {isCurrentUser ? `${user.name} (You)` : 'User'}
                      </span>
                      {isRoomHost && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content Type Selection - Only show to host when ready */}
          {canStartVoting && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">What do you want to watch?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleStartVoting('movie')}
                  disabled={isStarting}
                  className="w-full bg-red-600 hover:bg-red-700 py-4 font-semibold"
                >
                  <Film className="w-5 h-5 mr-2" />
                  {isStarting ? 'Starting...' : 'Browse Movies'}
                </Button>
                
                <Button
                  onClick={() => handleStartVoting('tv')}
                  disabled={isStarting}
                  variant="outline"
                  className="w-full py-4 font-semibold bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Tv className="w-5 h-5 mr-2" />
                  {isStarting ? 'Starting...' : 'Browse TV Shows'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Waiting Message */}
          {!canStartVoting && room.status === 'waiting' && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400">
                  {isHost ? (
                    participants.length < 2 ? (
                      <>
                        <Users className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                        <p>Waiting for your partner to join...</p>
                        <p className="text-sm mt-2">Share the room code or QR code above</p>
                      </>
                    ) : (
                      <>
                        <Film className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                        <p>Ready to start! Choose what type of content to browse.</p>
                      </>
                    )
                  ) : (
                    <>
                      <Crown className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                      <p>Waiting for the host to start the voting session...</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voting in Progress */}
          {room.status === 'voting' && (
            <Card className="bg-green-900 border-green-800">
              <CardContent className="p-6 text-center">
                <div className="animate-pulse">
                  <Film className="w-8 h-8 mx-auto mb-3 text-green-400" />
                  <p className="text-green-300 font-medium">Voting session in progress...</p>
                  <Button
                    onClick={() => setLocation(`/voting/${room.code}`)}
                    className="mt-3 bg-green-600 hover:bg-green-700"
                  >
                    Join Voting
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voting Completed */}
          {room.status === 'completed' && (
            <Card className="bg-blue-900 border-blue-800">
              <CardContent className="p-6 text-center">
                <div className="text-blue-300">
                  <Check className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <p className="font-medium">Voting completed!</p>
                  <Button
                    onClick={() => setLocation(`/results/${room.code}`)}
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                  >
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to Join</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <QRCode value={roomUrl} size={200} className="mx-auto" />
            <p className="text-gray-400 text-sm">
              Or share the room code: <span className="font-mono font-bold text-white">{room.code}</span>
            </p>
            <Button
              onClick={() => setShowQRDialog(false)}
              variant="outline"
              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
