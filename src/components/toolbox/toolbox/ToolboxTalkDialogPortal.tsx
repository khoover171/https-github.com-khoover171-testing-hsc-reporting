import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SafetyTopicSelector from "./SafetyTopicSelector";
import { ToolboxTalkEditDialog } from "./ToolboxTalkEditDialog";
import { Clock, MessageSquare, Edit3, CheckCircle, AlertCircle } from "lucide-react";

interface ToolboxTalkDialogPortalProps {
  // Generate Dialog Props
  showGenerateDialog: boolean;
  onGenerateDialogChange: (open: boolean) => void;
  generationData: any;
  onGenerationDataChange: (data: any) => void;
  showSafetyTopics: boolean;
  showTrendTopics: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onTopicChange: (topic: string, subcategory?: string, customTopic?: string) => void;
  analyzeTrends: () => any;
  
  // Review Dialog Props
  showReviewDialog: boolean;
  onReviewDialogChange: (open: boolean) => void;
  generatedTalk: any;
  isPublishing: boolean;
  loading: boolean;
  onEditTalk: () => void;
  onPublishTalk: (talk: any) => void;
  lastSavedTalkRef: React.MutableRefObject<any>;
  
  // Edit Dialog Props
  showEditDialog: boolean;
  onEditDialogChange: (open: boolean) => void;
  onSaveEdits: (editedTalk: any) => void;
  onRegenerateWithEdits: (editedTalk: any) => void;
}

export const ToolboxTalkDialogPortal: React.FC<ToolboxTalkDialogPortalProps> = ({
  showGenerateDialog,
  onGenerateDialogChange,
  generationData,
  onGenerationDataChange,
  showSafetyTopics,
  showTrendTopics,
  isGenerating,
  onGenerate,
  onTopicChange,
  analyzeTrends,
  showReviewDialog,
  onReviewDialogChange,
  generatedTalk,
  isPublishing,
  loading,
  onEditTalk,
  onPublishTalk,
  lastSavedTalkRef,
  showEditDialog,
  onEditDialogChange,
  onSaveEdits,
  onRegenerateWithEdits
}) => {
  const handleCancel = () => {
    onGenerateDialogChange(false);
    onGenerationDataChange({
      talkType: '',
      customPrompt: '',
      safetyTopic: '',
      safetySubcategory: '',
      customTopic: '',
      focus_area: '',
      timePeriod: 'monthly',
      selectedTrendTopic: ''
    });
  };

  return (
    <>
      {/* Generation Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={onGenerateDialogChange}>
        <DialogContent className="max-w-2xl max-h-[calc(100vh-120px)] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {generationData.talkType === 'safety-topic' && 'Safety Topic Toolbox Talk'}
              {generationData.talkType === 'incident-trends' && 'Incident Trends Toolbox Talk'}
              {generationData.talkType === 'custom' && 'Custom Toolbox Talk'}
            </DialogTitle>
            <DialogDescription>
              {generationData.talkType === 'safety-topic' && 'Generate a toolbox talk from predefined safety topics like PPE, hazard recognition, and workplace safety.'}
              {generationData.talkType === 'incident-trends' && 'Create a data-driven toolbox talk based on recent near-miss and incident patterns in your workplace.'}
              {generationData.talkType === 'custom' && 'Create a custom toolbox talk by describing your specific safety concerns or training needs.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Safety Topic Selection */}
            {generationData.talkType === 'safety-topic' && showSafetyTopics && (
              <div>
                <Label className="text-lg font-semibold mb-4 block">Select Safety Topic</Label>
                <SafetyTopicSelector
                  onTopicChange={onTopicChange}
                  selectedTopic={generationData.safetyTopic}
                  selectedSubcategory={generationData.safetySubcategory}
                  customTopic={generationData.customTopic}
                />
              </div>
            )}

            {/* Incident Trends Selection */}
            {generationData.talkType === 'incident-trends' && showTrendTopics && (
              <div>
                <Label className="text-lg font-semibold mb-4 block">Available Trend Topics</Label>
                {(() => {
                  const trends = analyzeTrends();
                  if (trends.availableTopics.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>No trending topics available. More incident data is needed to generate trend-based toolbox talks.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="grid gap-4">
                      {trends.availableTopics.map((topic: any) => (
                        <Card 
                          key={topic.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            generationData.selectedTrendTopic === topic.id 
                              ? 'ring-2 ring-primary bg-primary/5' 
                              : 'hover:border-primary'
                          }`}
                          onClick={() => {
                            onGenerationDataChange({ 
                              ...generationData, 
                              selectedTrendTopic: topic.id,
                              focus_area: topic.title 
                            });
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{topic.title}</h4>
                              <Badge 
                                variant={topic.priority === 'high' ? 'destructive' : 'secondary'}
                              >
                                {topic.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{topic.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Custom Topic Input */}
            {generationData.talkType === 'custom' && (
              <div>
                <Label className="text-lg font-semibold mb-4 block">Describe Your Topic</Label>
                <Textarea
                  value={generationData.customPrompt}
                  onChange={(e) => onGenerationDataChange({ ...generationData, customPrompt: e.target.value })}
                  placeholder="Describe the specific safety topic you want to cover..."
                  rows={4}
                  className="w-full"
                />
              </div>
            )}

            {/* Generate Button */}
            {((generationData.talkType === 'safety-topic' && generationData.safetyTopic) ||
              (generationData.talkType === 'incident-trends' && generationData.selectedTrendTopic) ||
              (generationData.talkType === 'custom' && generationData.customPrompt)) && (
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={onGenerate}
                  disabled={isGenerating}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Generate with SI
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      {showReviewDialog && generatedTalk && (
        <Dialog open={showReviewDialog} onOpenChange={onReviewDialogChange}>
          <DialogContent className="max-w-4xl max-h-[calc(100vh-120px)] overflow-auto">
            <DialogHeader>
              <DialogTitle>Review Generated Toolbox Talk</DialogTitle>
              <DialogDescription>
                Review the generated content and make any necessary edits before publishing the toolbox talk.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{generatedTalk.title}</h3>
                <Badge className="bg-si-secondary text-si-secondary-foreground mt-2">{generatedTalk.focus_area}</Badge>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Content</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{generatedTalk.content}</pre>
                </div>
              </div>

              {generatedTalk.prevention_strategies?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Prevention Strategies</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {generatedTalk.prevention_strategies.map((strategy: string, index: number) => (
                      <li key={index} className="text-sm">{strategy}</li>
                    ))}
                  </ul>
                </div>
              )}

              {generatedTalk.discussion_questions?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Discussion Questions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {generatedTalk.discussion_questions.map((question: string, index: number) => (
                      <li key={index} className="text-sm">{question}</li>
                    ))}
                  </ul>
                </div>
              )}

              {generatedTalk.action_items?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Action Items</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {generatedTalk.action_items.map((item: string, index: number) => (
                      <li key={index} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onReviewDialogChange(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={onEditTalk} className="gap-2">
                  <Edit3 className="w-4 h-4" />
                  Edit
                </Button>
                <Button 
                  onClick={() => {
                    const talkToPublish = lastSavedTalkRef.current || generatedTalk;
                    onPublishTalk(talkToPublish);
                  }}
                  disabled={isPublishing || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isPublishing ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Publish Toolbox Talk
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      <ToolboxTalkEditDialog
        open={showEditDialog}
        onOpenChange={onEditDialogChange}
        talkData={generatedTalk || {
          title: '',
          content: '',
          focus_area: '',
          prevention_strategies: [],
          discussion_questions: [],
          action_items: []
        }}
        onSave={onSaveEdits}
        onRegenerate={onRegenerateWithEdits}
        isRegenerating={isGenerating}
        generationData={generationData}
      />
    </>
  );
};