
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ASCDialogContent } from "@/components/ui/asc-dialog-content";
import { MessageSquare, CheckCircle2, Users, Calendar, AlertCircle, Eye, Clock, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ActiveTalk {
  id: string;
  title: string;
  content: string;
  focus_area: string;
  prevention_strategies: string[];
  discussion_questions: string[];
  action_items: string[];
  published_at: string;
  expires_at: string;
  based_on_data: string;
  company_logo_url?: string;
  selected_photos?: string[];
}

const ActiveToolboxTalks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTalk, setSelectedTalk] = useState<ActiveTalk | null>(null);
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  // Fetch active toolbox talks - refresh every 30 seconds to show new talks
  const { data: activeTalks, isLoading, error, refetch } = useQuery({
    queryKey: ['active-toolbox-talks'],
    queryFn: async () => {
      console.log('Fetching active toolbox talks...');
      const now = new Date().toISOString();
      console.log('Current time for comparison:', now);
      
      const { data, error } = await supabase
        .from('published_toolbox_talks')
        .select('*')
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('published_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching toolbox talks:', error);
        throw error;
      }
      
      console.log('Found active toolbox talks:', data?.length || 0);
      console.log('Raw data from query:', data);
      
      // Transform the data to ensure proper typing
      const transformedData: ActiveTalk[] = (data || []).map(talk => ({
        id: talk.id,
        title: talk.title,
        content: talk.content,
        focus_area: talk.focus_area,
        prevention_strategies: Array.isArray(talk.prevention_strategies) 
          ? talk.prevention_strategies as string[]
          : [],
        discussion_questions: Array.isArray(talk.discussion_questions) 
          ? talk.discussion_questions as string[]
          : [],
        action_items: Array.isArray(talk.action_items) 
          ? talk.action_items as string[]
          : [],
        published_at: talk.published_at,
        expires_at: talk.expires_at || '',
        based_on_data: talk.based_on_data || '',
        company_logo_url: talk.company_logo_url || undefined,
        selected_photos: Array.isArray(talk.selected_photos) 
          ? talk.selected_photos as string[]
          : []
      }));
      
      console.log('Transformed toolbox talks:', transformedData);
      return transformedData;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Set up real-time subscription for new toolbox talks
  useEffect(() => {
    console.log('Setting up real-time subscription for toolbox talks...');
    
    const channel = supabase
      .channel('toolbox-talks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'published_toolbox_talks'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['active-toolbox-talks'] });
          refetch();
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Toolbox Talk Available! 📢",
              description: `A new safety talk "${payload.new.title}" is now available for acknowledgment.`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast, refetch]);

  // Check if user has already acknowledged a talk - only if authenticated
  const { data: userAcknowledgments } = useQuery({
    queryKey: ['user-acknowledgments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found for acknowledgments');
        return [];
      }

      // Get employee_id from employee_details table
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee_details')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (employeeError || !employeeData) {
        console.log('No employee details found for user');
        return [];
      }

      const { data, error } = await supabase
        .from('toolbox_talk_acknowledgments')
        .select('toolbox_talk_id')
        .eq('employee_id', employeeData.id);
      
      if (error) {
        console.error('Error fetching user acknowledgments:', error);
        throw error;
      }
      
      console.log('User acknowledgments:', data);
      return data?.map(ack => ack.toolbox_talk_id) || [];
    },
  });

  const acknowledgeTalkMutation = useMutation({
    mutationFn: async ({ talkId, notes }: { talkId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get employee_id from employee_details table
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee_details')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (employeeError || !employeeData) {
        throw new Error('Employee details not found. Please use Employee SSO to sign in.');
      }

      const { error } = await supabase
        .from('toolbox_talk_acknowledgments')
        .insert({
          toolbox_talk_id: talkId,
          employee_id: employeeData.id,
          notes: notes.trim() || null,
          acknowledged_at: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-acknowledgments'] });
      toast({
        title: "Toolbox Talk Acknowledged ✅",
        description: "Thank you for completing this safety training.",
      });
      setShowDialog(false);
      setSelectedTalk(null);
      setAcknowledgmentNotes('');
    },
    onError: (error) => {
      console.error('Error acknowledging toolbox talk:', error);
      toast({
        title: "Authentication Required",
        description: "Please use Employee SSO to sign in and acknowledge this toolbox talk.",
        variant: "destructive",
      });
    },
  });

  const handleAcknowledge = () => {
    if (!selectedTalk) return;
    acknowledgeTalkMutation.mutate({
      talkId: selectedTalk.id,
      notes: acknowledgmentNotes
    });
  };

  const isAcknowledged = (talkId: string) => {
    return userAcknowledgments?.includes(talkId) || false;
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleViewAndAcknowledge = (talk: ActiveTalk) => {
    // Capture current scroll position for dialog positioning
    document.documentElement.style.setProperty('--dialog-scroll-y', `${window.scrollY + 100}px`);
    setSelectedTalk(talk);
    setShowDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading toolbox talks...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('Component error state:', error);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Error loading toolbox talks</p>
            <Button onClick={() => refetch()} className="mt-2" variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeTalks || activeTalks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <span>Active Safety Communications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No active toolbox talks</p>
            <p className="text-sm">New safety communications will appear here when published.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Active Safety Communications</span>
                <p className="text-sm text-gray-600 font-normal">Important safety communications requiring your acknowledgment</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 font-semibold">
              {activeTalks.length} Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeTalks.map((talk) => {
            const acknowledged = isAcknowledged(talk.id);
            const daysLeft = getDaysUntilExpiry(talk.expires_at);
            
            return (
              <div key={talk.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{talk.title}</h3>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-red-100 text-red-800 font-medium px-3 py-1">
                        {talk.focus_area}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Published: {new Date(talk.published_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {acknowledged ? (
                      <Badge className="bg-green-100 text-green-800 font-medium px-3 py-1">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 font-medium px-3 py-1">
                        <Calendar className="w-4 h-4 mr-2" />
                        {daysLeft !== null ? (
                          daysLeft > 0 ? `${daysLeft} days remaining` : 'Expires today'
                        ) : 'No expiration'}
                      </Badge>
                    )}
                  </div>
                </div>

                {talk.based_on_data && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                    <p className="text-sm text-blue-800 font-medium">
                      📊 Data-Driven Topic: {talk.based_on_data}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    {acknowledged ? 
                      "✅ You have acknowledged this safety communication" : 
                      "⚠️ Employee SSO required for acknowledgment"}
                  </p>
                  <Button 
                    onClick={() => handleViewAndAcknowledge(talk)}
                    variant={acknowledged ? "outline" : "default"}
                    className={acknowledged ? 
                      "border-green-500 text-green-700 hover:bg-green-50" : 
                      "bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    }
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {acknowledged ? "Review Content" : "View & Acknowledge"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Custom scroll-aware dialog for viewing and acknowledging toolbox talks */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <ASCDialogContent className="p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-900 flex items-center justify-between">
              {selectedTalk?.title || "Toolbox Talk"}
              <button
                onClick={() => setShowDialog(false)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogTitle>
          </DialogHeader>
          
          {!selectedTalk ? (
            <div className="text-center text-red-600 font-bold">⚠️ No Toolbox Talk Loaded</div>
          ) : (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 bg-orange-100 px-3 py-1 rounded-full text-orange-700">
                  <Calendar className="w-4 h-4" />
                  Published: {new Date(selectedTalk.published_at).toLocaleDateString()}
                </span>
                {selectedTalk.expires_at && (
                  <span className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full text-blue-700">
                    <Clock className="w-4 h-4" />
                    Expires: {getDaysUntilExpiry(selectedTalk.expires_at)} days
                  </span>
                )}
                <span className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full text-green-700">
                  <MessageSquare className="w-4 h-4" />
                  Focus: {selectedTalk.focus_area}
                </span>
              </div>
              
              {/* Safety Content Section */}
              <div>
                <h4 className="text-xl text-orange-900 mb-4 flex items-center font-bold">
                  <div className="w-1 h-6 bg-orange-500 mr-3"></div>
                  Safety Content
                </h4>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6 shadow-lg">
                  <div className="text-orange-900 leading-relaxed whitespace-pre-wrap text-base">
                    {selectedTalk.content}
                  </div>
                </div>
              </div>

              {/* Selected Photos */}
              {selectedTalk.selected_photos && selectedTalk.selected_photos.length > 0 && (
                <div>
                  <h4 className="text-xl text-purple-900 mb-4 flex items-center font-bold">
                    <div className="w-1 h-6 bg-purple-500 mr-3"></div>
                    Safety Photos
                  </h4>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedTalk.selected_photos.map((photoUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photoUrl}
                            alt={`Safety photo ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Prevention Strategies */}
              {selectedTalk.prevention_strategies && selectedTalk.prevention_strategies.length > 0 && (
                <div>
                  <h4 className="text-xl text-green-900 mb-4 flex items-center font-bold">
                    <div className="w-1 h-6 bg-green-500 mr-3"></div>
                    Prevention Strategies
                  </h4>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                    <ul className="space-y-3">
                      {selectedTalk.prevention_strategies.map((strategy, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-green-900 text-base">{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Discussion Questions */}
              {selectedTalk.discussion_questions && selectedTalk.discussion_questions.length > 0 && (
                <div>
                  <h4 className="text-xl text-blue-900 mb-4 flex items-center font-bold">
                    <div className="w-1 h-6 bg-blue-500 mr-3"></div>
                    Discussion Questions
                  </h4>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
                    <ul className="space-y-4">
                      {selectedTalk.discussion_questions.map((question, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3 flex-shrink-0 text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="text-blue-900 text-base">{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Action Items */}
              {selectedTalk.action_items && selectedTalk.action_items.length > 0 && (
                <div>
                  <h4 className="text-xl text-red-900 mb-4 flex items-center font-bold">
                    <div className="w-1 h-6 bg-red-500 mr-3"></div>
                    Required Actions
                  </h4>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6 shadow-lg">
                    <ul className="space-y-3">
                      {selectedTalk.action_items.map((action, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle2 className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                          <span className="text-red-900 text-base">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Acknowledgment Section */}
              {!isAcknowledged(selectedTalk.id) && (
                <div>
                  <h4 className="text-xl text-gray-900 mb-4 flex items-center font-bold">
                    <div className="w-1 h-6 bg-gray-500 mr-3"></div>
                    Acknowledgment
                  </h4>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="acknowledgmentNotes" className="block text-sm font-medium text-gray-700 mb-2">
                          Optional Notes or Comments
                        </label>
                        <Textarea
                          id="acknowledgmentNotes"
                          value={acknowledgmentNotes}
                          onChange={(e) => setAcknowledgmentNotes(e.target.value)}
                          placeholder="Add any questions, comments, or observations about this safety topic..."
                          className="w-full h-24 resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          By clicking acknowledge, you confirm that you have read and understood this safety communication.
                        </p>
                        <Button
                          onClick={handleAcknowledge}
                          disabled={acknowledgeTalkMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2"
                        >
                          {acknowledgeTalkMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Acknowledging...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Acknowledge
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Already Acknowledged Message */}
              {isAcknowledged(selectedTalk.id) && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-6 shadow-lg text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h4 className="text-xl text-green-900 mb-2 font-bold">Already Acknowledged</h4>
                  <p className="text-green-800">You have successfully acknowledged this safety communication.</p>
                </div>
              )}
            </div>
          )}
        </ASCDialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveToolboxTalks;
