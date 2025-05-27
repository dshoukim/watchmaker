import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Film, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-red-600 to-black">
      {/* Hero Section */}
      <div className="text-center mb-8 animate-fade-in">
        <Film className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          WatchTogether
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          Find your next favorite show or movie together
        </p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardContent className="p-8">
          <div className="space-y-6">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white text-gray-900 hover:bg-gray-100 py-4 px-6 font-semibold text-lg flex items-center justify-center gap-3 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <p className="text-sm text-gray-400 text-center">
              Sign in to sync your preferences and create watch rooms
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
