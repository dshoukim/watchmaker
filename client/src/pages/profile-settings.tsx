import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Film, History, ArrowLeft } from 'lucide-react'; // Importing icons
import { useLocation } from 'wouter'; // Import useLocation from wouter

// Placeholder data types (replace with actual data types later or import from shared)
type StreamingService = { id: number; name: string; logoUrl: string | null };
type RatedContent = { id: number; title: string; type: 'movie' | 'tv'; posterUrl: string | null };

// Define types for API responses based on usage in the code
type UserProfilePreferencesResponse = { preferences?: { streamingServices: number[] } };
type UserRatedContentResponse = { ratedItems?: RatedContent[] };

export default function ProfileSettings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState('streaming');
  const [allStreamingServices, setAllStreamingServices] = useState<StreamingService[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [isStreamingLoading, setIsStreamingLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ratedContent, setRatedContent] = useState<RatedContent[]>([]);

  useEffect(() => {
    console.log('[ProfileSettings] User from useAuth:', user);
    console.log('[ProfileSettings] Auth loading state:', authLoading);
    if (authLoading || !user) {
      console.log('[ProfileSettings] User not available or auth still loading, returning from main useEffect.');
      return;
    }

    if (activeSection === 'streaming') {
      loadStreamingServices();
      loadUserStreamingPreferences();
    } else if (activeSection === 'history') {
      loadWatchHistory();
    }
  }, [user, authLoading, activeSection]);

  const loadStreamingServices = async () => {
    console.log('[ProfileSettings] loadStreamingServices called');
    setIsStreamingLoading(true);
    try {
      const res = await fetch('/api/streaming-services');
      if (!res.ok) throw new Error('Failed to fetch streaming services');
      const data = await res.json();
      console.log('[ProfileSettings] Streaming services data:', data);
      setAllStreamingServices(data);
    } catch (error) {
      console.error('[ProfileSettings] Error loading streaming services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load streaming services. Please try again.',
        variant: 'destructive',
      });
      setSelectedServices([]);
    }
  };

  const loadUserStreamingPreferences = async () => {
    if (!user || !user.id) return;
    try {
      // Assuming user object on client has preferences or an endpoint exists to get them
      // In a real app, you might need a dedicated endpoint to fetch user preferences
      // For now, attempt to read from user.preferences if available
      if (user.preferences && typeof user.preferences === 'object' && 'streamingServices' in user.preferences && Array.isArray(user.preferences.streamingServices)) {
        setSelectedServices(user.preferences.streamingServices as number[]);
      } else {
        // Fallback or initial load: Fetch from API if available
        const response = await apiRequest('GET', `/api/auth/user/${user.id}/preferences`);
        // Explicitly type the response and access the nested property
        const data = response as UserProfilePreferencesResponse;
        if (data && data.preferences && data.preferences.streamingServices) {
           setSelectedServices(data.preferences.streamingServices);
        }
      }
    } catch (error) {
      console.error('Error loading user streaming preferences:', error);
      // Handle error gracefully, maybe set selectedServices to empty array
      setSelectedServices([]);
    }
  };

  const loadWatchHistory = async () => {
      if (!user || !user.id || !user.supabaseId) {
        console.log('[ProfileSettings] loadWatchHistory: User, user.id, or user.supabaseId not available.');
        setIsHistoryLoading(false);
        return;
      }
      console.log('[ProfileSettings] loadWatchHistory called for user (supabaseId):', user.supabaseId);
      setIsHistoryLoading(true);
      try {
          const response = await apiRequest('GET', `/api/auth/user/${user.supabaseId}/rated-content`);
          console.log('[ProfileSettings] Watch history response:', response);
          const data = response as UserRatedContentResponse;
          setRatedContent(data.ratedItems || []);
      } catch (error) {
          console.error('[ProfileSettings] Error loading watch history:', error);
          toast({
              title: 'Error',
              description: 'Failed to load watch history. Please try again.',
              variant: 'destructive',
          });
          setRatedContent([]);
      } finally {
          setIsHistoryLoading(false);
      }
  };

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSaveChanges = async () => {
    if (!user || !user.id) return;
    setIsSaving(true);
    try {
      const payload = { preferences: { streamingServices: selectedServices } };
      console.log("[ProfileSettings] Saving preferences with payload:", payload);

      const response = await apiRequest('PUT', `/api/auth/user/${user.id}/preferences`, payload);
      console.log("[ProfileSettings] Preferences save response:", response);
      toast({
        title: "Preferences Saved!",
        description: "Your streaming service preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6">
        <h2 className="text-xl font-semibold mb-6">Settings</h2>
        <nav>
          <ul>
            <li className="mb-4">
              <Button
                variant="ghost"
                className={`w-full justify-start text-lg ${activeSection === 'streaming' ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveSection('streaming')}
              >
                <Film className="mr-3 h-6 w-6" />
                Streaming Platforms
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                className={`w-full justify-start text-lg ${activeSection === 'history' ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveSection('history')}
              >
                <History className="mr-3 h-6 w-6" />
                Watch History
              </Button>
            </li>
            <li className="mt-auto pt-6 border-t border-gray-700">
              <Button
                variant="ghost"
                className="w-full justify-start text-lg text-gray-400 hover:text-gray-300"
                onClick={() => window.history.back()} // Use window.history.back() for wouter
              >
                <ArrowLeft className="mr-3 h-6 w-6" />
                Back to App
              </Button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {
          activeSection === 'streaming' ? (
            <div className="max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold mb-6">Streaming Platforms</h1>
              <p className="text-gray-400 mb-6">Select the streaming services you subscribe to.</p>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Available Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allStreamingServices.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                          className="border-gray-700 data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                          disabled={isStreamingLoading || isSaving}
                        />
                        <Label htmlFor={`service-${service.id}`} className="text-gray-300 cursor-pointer flex items-center gap-2">
                           {service.logoUrl && (
                             <img src={service.logoUrl} alt={service.name} className="h-5" />
                           )}
                          {service.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {isStreamingLoading && <div className="text-center text-gray-400 mt-4">Loading services...</div>}
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving || isStreamingLoading}
                    className="mt-6 bg-red-600 hover:bg-red-700 font-semibold"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : activeSection === 'history' ? (
            <div className="max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold mb-6">Watch History</h1>
              <p className="text-gray-400 mb-6">Content you have rated.</p>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Rated Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {isHistoryLoading ? (
                    <div className="text-center text-gray-400">Loading history...</div>
                  ) : ratedContent.length === 0 ? (
                    <div className="text-center text-gray-400">No rated content found yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* TODO: Display rated content items here */}
                      {/* Example structure: */}
                      {/* {ratedContent.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                              <img src={item.posterUrl} alt={item.title} className="w-16 h-20 object-cover rounded" />
                              <div>
                                  <h3 className="font-semibold">{item.title}</h3>
                                  <p className="text-sm text-gray-400">{item.type === 'movie' ? 'Movie' : 'TV Show'}</p>
                              </div>
                          </div>
                      ))}*/}
                       <div className="text-center text-gray-400">Watch history display coming soon.</div> {/* Placeholder */}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null
        }
      </main>
    </div>
  );
} 