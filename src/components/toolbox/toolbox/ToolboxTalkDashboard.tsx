import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, TrendingUp, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalDialog } from "@/contexts/GlobalDialogContext";
import ToolboxTalkManagement from "./ToolboxTalkManagement";

const ToolboxTalkDashboard: React.FC = () => {
  const { userRole } = useAuth();
  const { openDialog } = useGlobalDialog();

  // Handle generation for safety topics
  const handleSafetyTopicGenerate = () => {
    openDialog('toolboxTalk', { mode: 'generate', talkType: 'safety-topic' });
  };

  // Handle generation for incident trends
  const handleIncidentTrendsGenerate = () => {
    openDialog('toolboxTalk', { mode: 'generate', talkType: 'incident-trends' });
  };

  // Handle generation for custom topics
  const handleCustomTopicGenerate = () => {
    openDialog('toolboxTalk', { mode: 'custom', talkType: 'custom' });
  };

  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-si-primary/10 via-purple-600/5 to-si-primary/10 rounded-2xl blur-xl" />
        <div className="relative bg-gradient-to-r from-si-primary/5 via-transparent to-purple-500/5 rounded-2xl p-8 border border-si-primary/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-si-primary rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-si-primary to-purple-600 bg-clip-text text-transparent">
                Safety Intelligence Toolbox Talks
              </h2>
              <p className="text-si-primary/70 mt-1 font-medium">AI-powered safety content generation</p>
            </div>
            <div className="ml-auto px-4 py-2 bg-si-primary/10 text-si-primary text-sm font-medium rounded-full border border-si-primary/20">
              Powered by AI
            </div>
          </div>
          <p className="text-muted-foreground">
            Choose how you'd like to generate your next toolbox talk using our advanced Safety Intelligence platform
          </p>
        </div>
      </div>

      {/* Enhanced Card-based Generation Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Safety Topic Card */}
        <Card className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-si-primary/50 group bg-gradient-to-br from-white to-si-primary/[0.02] border-si-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-si-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative text-center pb-2 pt-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500/10 to-si-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-bold text-si-primary">Safety Topic Library</CardTitle>
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-si-primary rounded-full mx-auto mt-2" />
          </CardHeader>
          <CardContent className="relative text-center space-y-6 p-6">
            <p className="text-muted-foreground leading-relaxed">
              AI-curated safety topics including PPE protocols, hazard recognition, and industry-specific workplace safety guidelines.
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-si-primary hover:from-blue-700 hover:to-si-primary/90 text-white font-semibold py-3 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              onClick={handleSafetyTopicGenerate}
            >
              <FileText className="w-4 h-4 mr-2" />
              Browse Topics
            </Button>
          </CardContent>
        </Card>

        {/* Incident Trends Card */}
        <Card className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-si-primary/50 group bg-gradient-to-br from-white to-si-primary/[0.02] border-si-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-si-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative text-center pb-2 pt-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500/10 to-si-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
              <TrendingUp className="w-10 h-10 text-orange-600" />
            </div>
            <CardTitle className="text-xl font-bold text-si-primary">Smart Analytics</CardTitle>
            <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-si-primary rounded-full mx-auto mt-2" />
          </CardHeader>
          <CardContent className="relative text-center space-y-6 p-6">
            <p className="text-muted-foreground leading-relaxed">
              AI-powered analysis of incident patterns, near-misses, and safety trends to create targeted, data-driven safety discussions.
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-orange-600 to-si-primary hover:from-orange-700 hover:to-si-primary/90 text-white font-semibold py-3 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              onClick={handleIncidentTrendsGenerate}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analyze Data
            </Button>
          </CardContent>
        </Card>

        {/* Custom Topic Card */}
        <Card className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-si-primary/50 group bg-gradient-to-br from-white to-si-primary/[0.02] border-si-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-si-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative text-center pb-2 pt-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500/10 to-si-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-purple-500/20">
              <MessageSquare className="w-10 h-10 text-purple-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-si-primary rounded-full border-2 border-white animate-pulse" />
            </div>
            <CardTitle className="text-xl font-bold text-si-primary">SI Custom Creator</CardTitle>
            <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-si-primary rounded-full mx-auto mt-2" />
          </CardHeader>
          <CardContent className="relative text-center space-y-6 p-6">
            <p className="text-muted-foreground leading-relaxed">
              Describe your unique safety challenges and let our SI create personalized toolbox talks tailored to your specific needs.
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-si-primary to-purple-600 hover:from-si-primary/90 hover:to-purple-600/90 text-white font-semibold py-3 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              onClick={handleCustomTopicGenerate}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Create with SI
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import and include the ToolboxTalkManagement component */}
      {userRole === 'admin' && (
        <div className="mt-8">
          <ToolboxTalkManagement />
        </div>
      )}
    </div>
  );
};

export default ToolboxTalkDashboard;