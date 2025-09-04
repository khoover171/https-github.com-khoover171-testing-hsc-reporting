
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Users, CheckCircle, Clock, Archive, Eye, AlertCircle, CheckCircle2, Loader2, Download, BookOpen, XCircle, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import { createDocumentTemplate, formatContentWithSections } from "@/utils/documentTemplates";

interface PublishedTalk {
  id: string;
  title: string;
  content: string;
  focus_area: string;
  prevention_strategies: string[];
  discussion_questions: string[];
  action_items: string[];
  published_at: string;
  expires_at: string;
  status: string;
  based_on_data: string;
  selected_photos?: string[];
  company_logo_url?: string;
}

interface AcknowledgmentWithEmployee {
  id: string;
  toolbox_talk_id: string;
  employee_id: string;
  acknowledged_at: string;
  notes?: string;
  employee_name: string;
  employee_email: string;
}

interface TalkStats {
  totalEmployees: number;
  acknowledgedCount: number;
  pendingCount: number;
  acknowledgments: AcknowledgmentWithEmployee[];
  pendingEmployees: { id: string; name: string; email: string }[];
}

interface TalkCompletionStats {
  totalEmployees: number;
  acknowledgedCount: number;
  completionRate: number;
}

const ToolboxTalkManagement: React.FC = () => {
  const { toast } = useToast();
  const [talks, setTalks] = useState<PublishedTalk[]>([]);
  const [selectedTalk, setSelectedTalk] = useState<PublishedTalk | null>(null);
  const [selectedTalkId, setSelectedTalkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingTalk, setReadingTalk] = useState<PublishedTalk | null>(null);
  const [talkStats, setTalkStats] = useState<Record<string, TalkCompletionStats>>({});

  // Debug selectedTalk changes
  useEffect(() => {
    console.log('🔍 selectedTalk changed to:', selectedTalk ? selectedTalk.title : 'null');
    console.log('🔍 selectedTalkId changed to:', selectedTalkId);
  }, [selectedTalk, selectedTalkId]);

  useEffect(() => {
    fetchToolboxTalks();
    
    // Set up real-time subscription for data refresh
    console.log('Setting up real-time subscription for toolbox management...');
    const channel = supabase
      .channel('toolbox-management-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'published_toolbox_talks'
        },
        (payload) => {
          console.log('Real-time update in management:', payload);
          fetchToolboxTalks(); // Refresh data when changes occur
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up toolbox management subscription...');
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchToolboxTalks = async () => {
    try {
      console.log('🔄 Fetching toolbox talks for management...');
      const { data: talksData, error } = await supabase
        .from('published_toolbox_talks')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching toolbox talks:', error);
        throw error;
      }
      
      console.log('✅ Fetched talks data:', talksData?.length || 0, 'talks');
      
      // Transform the data to match our interface
      const transformedTalks = talksData?.map(talk => ({
        ...talk,
        prevention_strategies: Array.isArray(talk.prevention_strategies) 
          ? talk.prevention_strategies as string[] 
          : [],
        discussion_questions: Array.isArray(talk.discussion_questions) 
          ? talk.discussion_questions as string[] 
          : [],
        action_items: Array.isArray(talk.action_items) 
          ? talk.action_items as string[] 
          : [],
        selected_photos: Array.isArray(talk.selected_photos) 
          ? talk.selected_photos as string[] 
          : [],
      })) || [];

      console.log('✅ Active talks:', transformedTalks.filter(t => t.status === 'active').length);
      console.log('✅ Archived talks:', transformedTalks.filter(t => t.status === 'archived').length);
      
      setTalks(transformedTalks);
      
      // Fetch completion stats for all talks
      await fetchAllTalkStats(transformedTalks);
    } catch (error) {
      console.error('❌ Error fetching toolbox talks:', error);
      setTalks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTalkStats = async (talks: PublishedTalk[]) => {
    try {
      // Get total employee count once
      const { count: totalEmployees } = await supabase
        .from('employee_details')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const statsPromises = talks.map(async (talk) => {
        const { count: acknowledgedCount } = await supabase
          .from('toolbox_talk_acknowledgments')
          .select('*', { count: 'exact', head: true })
          .eq('toolbox_talk_id', talk.id);

        return {
          talkId: talk.id,
          stats: {
            totalEmployees: totalEmployees || 0,
            acknowledgedCount: acknowledgedCount || 0,
            completionRate: totalEmployees ? Math.round(((acknowledgedCount || 0) / totalEmployees) * 100) : 0,
          }
        };
      });

      const allStats = await Promise.all(statsPromises);
      const statsMap = allStats.reduce((acc, { talkId, stats }) => {
        acc[talkId] = stats;
        return acc;
      }, {} as Record<string, TalkCompletionStats>);

      setTalkStats(statsMap);
    } catch (error) {
      console.error('❌ Error fetching talk stats:', error);
    }
  };


  const archiveTalk = async (talkId: string) => {
    try {
      console.log('🔄 Archiving talk:', talkId);
      
      const { error } = await supabase
        .from('published_toolbox_talks')
        .update({ status: 'archived' })
        .eq('id', talkId);

      if (error) {
        console.error('❌ Archive error:', error);
        throw error;
      }

      console.log('✅ Talk archived successfully');
      
      toast({
        title: "Talk Archived",
        description: "The toolbox talk has been archived and is no longer visible to employees.",
      });

      await fetchToolboxTalks();
      setSelectedTalk(null);
    } catch (error) {
      console.error('❌ Error archiving talk:', error);
      toast({
        title: "Archive Failed",
        description: "Failed to archive toolbox talk. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reactivateTalk = async (talkId: string) => {
    try {
      console.log('🔄 Reactivating talk:', talkId);
      
      const { error } = await supabase
        .from('published_toolbox_talks')
        .update({ status: 'active' })
        .eq('id', talkId);

      if (error) {
        console.error('❌ Reactivate error:', error);
        throw error;
      }

      console.log('✅ Talk reactivated successfully');
      
      toast({
        title: "Talk Reactivated",
        description: "The toolbox talk is now active and visible to employees again.",
      });

      await fetchToolboxTalks();
      setSelectedTalk(null);
    } catch (error) {
      console.error('❌ Error reactivating talk:', error);
      toast({
        title: "Reactivation Failed",
        description: "Failed to reactivate toolbox talk. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTalkSelect = (talk: PublishedTalk) => {
    console.log('🔍 Selecting talk for details:', talk.title);
    console.log('🔍 Setting selectedTalk to:', talk);
    
    // Simply set the selected talk - TalkDetailView will handle its own stats
    setSelectedTalk(talk);
    setSelectedTalkId(talk.id);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading toolbox talks...</div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to reset detail view state
  const handleResetDetailView = () => {
    setSelectedTalk(null);
    setSelectedTalkId(null);
  };

  const activeTalks = talks.filter(talk => talk.status === 'active');
  const archivedTalks = talks.filter(talk => talk.status === 'archived');

  // Download function
  const downloadToolboxTalk = (talk: PublishedTalk) => {
    const formattedContent = formatToolboxTalkContent(talk);
    const htmlContent = createDocumentTemplate(formattedContent, talk.title, 'toolbox');
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${talk.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_toolbox_talk.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Open print dialog for PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <span>Toolbox Talk Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active Talks ({activeTalks.length})
                {activeTalks.length > 0 && <CheckCircle2 className="w-4 h-4 ml-1 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger value="archived">Archived Talks ({archivedTalks.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {activeTalks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No active toolbox talks</p>
                  <p className="text-sm">Generate and publish a talk to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                    <p className="text-sm font-medium text-green-800">
                      ✅ These talks are live and visible to employees on the main page
                    </p>
                  </div>
                  {activeTalks.map((talk) => (
                    <TalkCard 
                      key={talk.id} 
                      talk={talk} 
                      onSelect={handleTalkSelect}
                      onArchive={archiveTalk}
                      onDownload={downloadToolboxTalk}
                      onRead={(talk) => setReadingTalk(talk)}
                      completionStats={talkStats[talk.id]}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="archived" className="space-y-4">
              {archivedTalks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Archive className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No archived toolbox talks</p>
                </div>
              ) : (
                archivedTalks.map((talk) => (
                  <TalkCard 
                    key={talk.id} 
                    talk={talk} 
                    onSelect={handleTalkSelect}
                    onReactivate={reactivateTalk}
                    onDownload={downloadToolboxTalk}
                    onRead={(talk) => setReadingTalk(talk)}
                    showArchiveButton={false}
                    completionStats={talkStats[talk.id]}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail View - Force re-render with key */}
      {selectedTalkId && (
        <TalkDetailView 
          key={selectedTalkId}
          talk={selectedTalk || talks.find(t => t.id === selectedTalkId)!} 
          onClose={handleResetDetailView}
          onArchive={archiveTalk}
          onReactivate={reactivateTalk}
          onDownload={downloadToolboxTalk}
        />
      )}

      {/* Reading Dialog */}
      {readingTalk && (
        <TalkContentView 
          talk={readingTalk}
          onClose={() => setReadingTalk(null)}
        />
      )}
    </div>
  );
};

// Helper function to format toolbox talk content for PDF
const formatToolboxTalkContent = (talk: PublishedTalk): string => {
  let content = `
    <div class="content-section">
      <div class="section-header">
        <div class="section-number">1</div>
        <h2 class="section-title">Overview</h2>
      </div>
      <div class="content-text">${formatContentWithSections(talk.content)}</div>
    </div>
  `;

  if (talk.prevention_strategies?.length > 0) {
    content += `
      <div class="content-section">
        <div class="section-header">
          <div class="section-number">2</div>
          <h2 class="section-title">Prevention Strategies</h2>
        </div>
        <ul>
          ${talk.prevention_strategies.map(strategy => `<li>${strategy}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (talk.discussion_questions?.length > 0) {
    content += `
      <div class="content-section">
        <div class="section-header">
          <div class="section-number">3</div>
          <h2 class="section-title">Discussion Questions</h2>
        </div>
        <ul>
          ${talk.discussion_questions.map(question => `<li>${question}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (talk.action_items?.length > 0) {
    content += `
      <div class="content-section">
        <div class="section-header">
          <div class="section-number">4</div>
          <h2 class="section-title">Action Items</h2>
        </div>
        <ul>
          ${talk.action_items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  content += `
    <div class="content-section">
      <div class="section-header">
        <div class="section-number">5</div>
        <h2 class="section-title">Acknowledgment</h2>
      </div>
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p><strong>Employee Signature</strong></p>
          <p>Date: _______________</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p><strong>Supervisor Signature</strong></p>
          <p>Date: _______________</p>
        </div>
      </div>
    </div>
  `;

  return content;
};

const TalkCard: React.FC<{
  talk: PublishedTalk;
  onSelect: (talk: PublishedTalk) => void;
  onArchive?: (talkId: string) => void;
  onReactivate?: (talkId: string) => void;
  onDownload?: (talk: PublishedTalk) => void;
  onRead?: (talk: PublishedTalk) => void;
  showArchiveButton?: boolean;
  completionStats?: TalkCompletionStats;
}> = ({ talk, onSelect, onArchive, onReactivate, onDownload, onRead, showArchiveButton = true, completionStats }) => {
  const isExpired = new Date(talk.expires_at) < new Date();
  const daysLeft = Math.ceil((new Date(talk.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold">{talk.title}</h3>
        <div className="flex items-center space-x-2">
          <Badge className="bg-red-100 text-red-800">
            {talk.focus_area}
          </Badge>
          {completionStats && (
            <Badge variant={completionStats.completionRate >= 80 ? "default" : completionStats.completionRate >= 50 ? "secondary" : "destructive"}>
              {completionStats.completionRate}% Complete
            </Badge>
          )}
          {talk.status === 'active' && (
            <Badge variant={isExpired ? "destructive" : "outline"}>
              <Clock className="w-3 h-3 mr-1" />
              {isExpired ? 'Expired' : `${daysLeft} days left`}
            </Badge>
          )}
          {talk.status === 'archived' && (
            <Badge variant="secondary">
              <Archive className="w-3 h-3 mr-1" />
              Archived
            </Badge>
          )}
        </div>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          Published: {new Date(talk.published_at).toLocaleDateString()}
        </p>
        {completionStats && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{completionStats.acknowledgedCount} of {completionStats.totalEmployees} acknowledged</span>
              <span>{completionStats.completionRate}%</span>
            </div>
            <Progress value={completionStats.completionRate} className="h-2" />
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📖 Read Talk clicked for:', talk.title);
            onRead?.(talk);
          }}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <BookOpen className="w-4 h-4" />
          <span>Read</span>
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 View Details clicked for:', talk.title);
            console.log('🔍 About to call onSelect with talk:', talk);
            onSelect(talk);
          }}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
          disabled={false}
        >
          <Eye className="w-4 h-4" />
          <span>Details</span>
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📥 Download clicked for:', talk.title);
            onDownload?.(talk);
          }}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </Button>
        {showArchiveButton && talk.status === 'active' && onArchive && (
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('📦 Archive clicked for:', talk.title);
              onArchive(talk.id);
            }}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <Archive className="w-4 h-4" />
            <span>Archive</span>
          </Button>
        )}
        {talk.status === 'archived' && onReactivate && (
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔄 Reactivate clicked for:', talk.title);
              onReactivate(talk.id);
            }}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1 text-green-600 border-green-300 hover:bg-green-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Reactivate</span>
          </Button>
        )}
      </div>
    </div>
  );
};

const TalkDetailView: React.FC<{
  talk: PublishedTalk;
  onClose: () => void;
  onArchive: (talkId: string) => void;
  onReactivate?: (talkId: string) => void;
  onDownload?: (talk: PublishedTalk) => void;
}> = ({ talk, onClose, onArchive, onReactivate, onDownload }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<TalkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeoutExpired, setTimeoutExpired] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimeoutExpired(true);
    }, 5000); // fallback in case Supabase hangs

    const fetchStats = async () => {
      try {
        console.log('📊 Fetching stats for:', talk.title);

        const { count: totalEmployees } = await supabase
          .from('employee_details')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const { data: acknowledgments = [] } = await supabase
          .from('toolbox_talk_acknowledgments')
          .select(`
            *,
            employee_details!inner(first_name, last_name, email)
          `)
          .eq('toolbox_talk_id', talk.id);

        const enriched = acknowledgments.map(ack => ({
          ...ack,
          employee_name: `${ack.employee_details.first_name} ${ack.employee_details.last_name}`,
          employee_email: ack.employee_details.email,
        }));

        // Get all employees to find pending ones
        const { data: allEmployees = [] } = await supabase
          .from('employee_details')
          .select('id, first_name, last_name, email')
          .eq('status', 'active');

        const acknowledgedEmployeeIds = new Set(enriched.map(ack => ack.employee_id));
        const pendingEmployees = allEmployees
          .filter(emp => !acknowledgedEmployeeIds.has(emp.id))
          .map(emp => ({
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email
          }));

        setStats({
          totalEmployees: totalEmployees || 0,
          acknowledgedCount: enriched.length,
          pendingCount: (totalEmployees || 0) - enriched.length,
          acknowledgments: enriched,
          pendingEmployees,
        });
      } catch (err) {
        toast({
          title: "Stats Error",
          description: "Unable to load acknowledgment stats.",
          variant: "destructive",
        });
        setStats(null);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    };

    fetchStats();
  }, [talk.id]);

  const completionRate = stats && stats.totalEmployees > 0
    ? Math.round((stats.acknowledgedCount / stats.totalEmployees) * 100)
    : 0;

  const StatCard = ({ count, label }: { count: number; label: string }) => (
    <div className="text-center p-4 bg-blue-50 rounded-lg">
      <div className="text-2xl font-bold text-blue-600">{count}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );

  return (
    <Card className="detail-view-card bg-white min-h-[400px]">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{talk.title}</span>
          <Button variant="outline" onClick={onClose}>Back</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`p-4 rounded-lg border-l-4 ${talk.status === 'archived' ? 'bg-gray-50 border-gray-500' : 'bg-green-50 border-green-500'}`}>
          <p className="font-medium">
            {talk.status === 'archived' ? '📦 This talk is archived' : '✅ This talk is live and visible'}
          </p>
          <p className="text-sm">
            {talk.status === 'archived'
              ? 'No longer visible to employees.'
              : 'Employees can view and acknowledge this talk.'}
          </p>
        </div>

        {/* Inline Stats Loader */}
        {loading && !timeoutExpired && (
          <div className="flex items-center justify-center text-primary space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading stats...</span>
          </div>
        )}

        {/* Stats View */}
        {!loading && stats && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <StatCard count={stats.totalEmployees} label="Employees" />
              <StatCard count={stats.acknowledgedCount} label="Acknowledged" />
              <StatCard count={stats.pendingCount} label="Pending" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{completionRate}%</div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
          </>
        )}

        {!loading && !stats && (
          <div className="text-center text-amber-600">
            <AlertCircle className="w-6 h-6 mx-auto" />
            <p>Could not load stats</p>
          </div>
        )}

        {/* Employee Status Lists */}
        {stats && (
          <div className="space-y-4">
            {/* Completed Employees */}
            {stats.acknowledgments.length > 0 && (
              <div>
                <h3 className="font-medium text-green-600 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completed ({stats.acknowledgments.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-green-50 p-3 rounded-lg">
                  {stats.acknowledgments.map((ack) => (
                    <div key={ack.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{ack.employee_name}</div>
                        <div className="text-xs text-gray-500">{ack.employee_email}</div>
                      </div>
                      <div className="text-right">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <div className="text-xs text-gray-500">{new Date(ack.acknowledged_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Employees */}
            {stats.pendingEmployees.length > 0 && (
              <div>
                <h3 className="font-medium text-amber-600 mb-2 flex items-center">
                  <XCircle className="w-4 h-4 mr-1" />
                  Pending ({stats.pendingEmployees.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-amber-50 p-3 rounded-lg">
                  {stats.pendingEmployees.map((emp) => (
                    <div key={emp.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{emp.name}</div>
                        <div className="text-xs text-gray-500">{emp.email}</div>
                      </div>
                      <XCircle className="w-4 h-4 text-amber-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No employees message */}
            {stats.totalEmployees === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No employees found in the system</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onDownload?.(talk)}
            className="flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </Button>
          {talk.status === 'active' && (
            <Button variant="outline" onClick={() => onArchive(talk.id)}>Archive</Button>
          )}
          {talk.status === 'archived' && onReactivate && (
            <Button variant="outline" onClick={() => onReactivate(talk.id)}>Reactivate</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Component to display toolbox talk content for reading
const TalkContentView: React.FC<{
  talk: PublishedTalk;
  onClose: () => void;
}> = ({ talk, onClose }) => {
  const [dialogTop, setDialogTop] = React.useState('50%');

  React.useEffect(() => {
    const calculatePosition = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const dialogHeight = Math.min(viewportHeight * 0.8, 600); // 80vh or 600px max
      
      // Position dialog higher in viewport with bottom padding to ensure visibility
      const topPadding = 60; // Space from top
      const bottomPadding = 40; // Space from bottom 
      const availableHeight = viewportHeight - topPadding - bottomPadding;
      
      // Ensure dialog fits within viewport
      const finalDialogHeight = Math.min(dialogHeight, availableHeight);
      const topPosition = scrollY + topPadding;
      
      setDialogTop(`${topPosition}px`);
    };

    calculatePosition();
    
    // Recalculate if user scrolls while dialog is open
    const handleScroll = () => calculatePosition();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[99998] bg-black/20 backdrop-blur-sm" />
        <div
          className="max-w-4xl w-[90vw] max-h-[80vh] flex flex-col fixed left-1/2 transform -translate-x-1/2 z-[99999] bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden"
          style={{ top: dialogTop }}
          aria-describedby="toolbox-talk-content"
        >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-white">
          <DialogTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-gray-900">{talk.title}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" id="toolbox-talk-content">
          {/* Focus Area */}
          <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
            <h3 className="font-semibold text-red-800 mb-2">Focus Area</h3>
            <p className="text-red-700 text-base">{talk.focus_area}</p>
          </div>

          {/* Photos */}
          {talk.selected_photos && talk.selected_photos.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Safety Photos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {talk.selected_photos.map((photo, index) => (
                  <img 
                    key={index} 
                    src={photo} 
                    alt={`Safety example ${index + 1}`}
                    className="rounded-lg border max-h-48 object-cover w-full shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Overview</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="prose prose-base max-w-none text-gray-800 leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: formatContentWithSections(talk.content) }} />
              </div>
            </div>
          </div>

          {/* Prevention Strategies */}
          {talk.prevention_strategies && talk.prevention_strategies.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Prevention Strategies</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-2 text-base">
                  {talk.prevention_strategies.map((strategy, index) => (
                    <li key={index} className="text-green-800">{strategy}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Discussion Questions */}
          {talk.discussion_questions && talk.discussion_questions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Discussion Questions</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <ol className="list-decimal list-inside space-y-2 text-base">
                  {talk.discussion_questions.map((question, index) => (
                    <li key={index} className="text-blue-800">{question}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Action Items */}
          {talk.action_items && talk.action_items.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Action Items</h3>
              <div className="bg-amber-50 p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-2 text-base">
                  {talk.action_items.map((item, index) => (
                    <li key={index} className="text-amber-800">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-100 p-4 rounded-lg border-t-2 border-gray-300">
            <h4 className="font-semibold text-gray-800 mb-2">Document Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Published:</strong> {new Date(talk.published_at).toLocaleString()}</p>
              {talk.expires_at && (
                <p><strong>Expires:</strong> {new Date(talk.expires_at).toLocaleString()}</p>
              )}
              {talk.based_on_data && (
                <p><strong>Based on:</strong> {talk.based_on_data}</p>
              )}
            </div>
          </div>
        </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
};

export default ToolboxTalkManagement;
