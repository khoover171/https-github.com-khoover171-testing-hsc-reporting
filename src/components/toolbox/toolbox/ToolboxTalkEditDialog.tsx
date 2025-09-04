import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Sparkles, Upload, Image } from "lucide-react";
import { useFileStorage } from "@/hooks/useFileStorage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PhotoSelectionTabs } from "./PhotoSelectionTabs";
import { useQuery } from "@tanstack/react-query";

interface ToolboxTalkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  talkData: {
    title: string;
    content: string;
    focus_area: string;
    prevention_strategies: string[];
    discussion_questions: string[];
    action_items: string[];
    company_logo_url?: string;
    selected_photos?: string[];
    regeneration_context?: string;
  };
  onSave: (editedData: any) => void;
  onRegenerate: (editedData: any) => void;
  isRegenerating: boolean;
  generationData?: any;
}

export function ToolboxTalkEditDialog({
  open,
  onOpenChange,
  talkData,
  onSave,
  onRegenerate,
  isRegenerating,
  generationData
}: ToolboxTalkEditDialogProps) {
  const [editedTalk, setEditedTalk] = useState(talkData);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(talkData.selected_photos || []);
  const [useDefaultLogo, setUseDefaultLogo] = useState(!talkData.company_logo_url);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const { uploadFile } = useFileStorage();
  const { toast } = useToast();

  // Fetch default company logo
  const { data: defaultLogo } = useQuery({
    queryKey: ['company-logo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'default_company_logo')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.setting_value;
    }
  });

  // Topic-specific defaults (identical to EditTalkForm.tsx for consistency)
  const TOPIC_SPECIFIC_DEFAULTS = {
    'heat stress': {
      prevention_strategies: [
        "Monitor heat index and adjust work schedules accordingly",
        "Ensure adequate hydration breaks every 15-20 minutes in high heat",
        "Provide cooling stations and shade in work areas",
        "Use cooling towels and vests for workers in extreme heat",
        "Recognize early signs of heat exhaustion in yourself and coworkers"
      ],
      discussion_questions: [
        "What are the warning signs of heat exhaustion and heat stroke?",
        "How often should you take water breaks in hot weather?",
        "What should you do if a coworker shows signs of heat illness?",
        "How can we improve our heat stress prevention program?"
      ],
      action_items: [
        "Install additional cooling stations in high-heat work areas",
        "Review heat illness emergency response procedures with team",
        "Schedule more frequent hydration breaks during heat advisories",
        "Provide heat stress awareness training to all outdoor workers"
      ]
    },
    'electrical safety': {
      prevention_strategies: [
        "Test GFCI devices before each use",
        "Inspect all electrical cords and equipment for damage",
        "Use proper lockout/tagout procedures on electrical systems",
        "Maintain safe working distances from overhead power lines",
        "Wear appropriate electrical PPE for voltage levels"
      ],
      discussion_questions: [
        "What are the main electrical hazards in our workplace?",
        "How do you properly test a GFCI device?",
        "What should you do if you see damaged electrical equipment?",
        "When is electrical lockout/tagout required?"
      ],
      action_items: [
        "Conduct electrical equipment inspections weekly",
        "Review electrical safety procedures with maintenance team",
        "Replace any damaged electrical cords immediately",
        "Schedule electrical safety refresher training"
      ]
    },
    'fall protection': {
      prevention_strategies: [
        "Inspect fall protection equipment before each use",
        "Verify anchor points meet load requirements",
        "Use proper three-point contact on ladders",
        "Secure tools and materials to prevent dropped objects",
        "Maintain fall protection equipment according to manufacturer guidelines"
      ],
      discussion_questions: [
        "What height requires fall protection in our work area?",
        "How do you properly inspect a safety harness?",
        "What makes a good anchor point for fall protection?",
        "When should fall protection equipment be retired?"
      ],
      action_items: [
        "Inspect all fall protection equipment weekly",
        "Review fall protection procedures for elevated work",
        "Verify all anchor points are properly rated and marked",
        "Schedule fall protection competent person training"
      ]
    },
    'machine guarding': {
      prevention_strategies: [
        "Ensure all machine guards are in place before operation",
        "Never bypass or remove safety interlocks",
        "Keep hands and loose clothing away from moving parts",
        "Follow proper lockout/tagout procedures during maintenance",
        "Report missing or damaged guards immediately"
      ],
      discussion_questions: [
        "What are the different types of machine guards in our facility?",
        "Why should you never remove a machine guard?",
        "What should you do if you find a missing guard?",
        "How does proper lockout/tagout protect against machine hazards?"
      ],
      action_items: [
        "Conduct weekly machine guard inspections",
        "Review machine-specific safety procedures",
        "Report and repair any damaged guards immediately",
        "Provide machine safety training for all operators"
      ]
    },
    'confined space': {
      prevention_strategies: [
        "Test atmospheric conditions before entry and continuously during work",
        "Verify emergency rescue procedures are in place",
        "Use proper ventilation to maintain safe atmosphere",
        "Maintain continuous communication with attendant",
        "Use appropriate fall protection and retrieval systems"
      ],
      discussion_questions: [
        "What makes a space 'confined' according to OSHA?",
        "What atmospheric hazards might be present in confined spaces?",
        "Why is an attendant required for confined space entry?",
        "What emergency procedures are in place for confined space rescue?"
      ],
      action_items: [
        "Review confined space entry permits and procedures",
        "Test atmospheric monitoring equipment calibration",
        "Practice emergency rescue procedures monthly",
        "Update confined space inventory and hazard assessments"
      ]
    }
  };

  const getDefaultsForTopic = (focusArea: string) => {
    console.log('🎯 ToolboxTalkEditDialog - Getting defaults for topic:', focusArea);
    
    if (!focusArea || focusArea === 'general safety') {
      console.log('⚠️ No specific topic provided, returning empty defaults');
      return {
        prevention_strategies: [],
        discussion_questions: [],
        action_items: []
      };
    }

    const focusLower = focusArea.toLowerCase();
    
    // Find matching topic in our specific defaults
    for (const [topic, defaults] of Object.entries(TOPIC_SPECIFIC_DEFAULTS)) {
      if (focusLower.includes(topic)) {
        console.log(`✅ Found topic-specific defaults for: ${topic}`);
        return defaults;
      }
    }
    
    console.log('📝 No specific defaults found for topic, returning empty');
    return {
      prevention_strategies: [],
      discussion_questions: [],
      action_items: []
    };
  };

  // Update edited talk when talkData changes
  useEffect(() => {
    console.log('🔄 ToolboxTalkEditDialog useEffect triggered with talkData:', talkData);
    
    const safeFocusArea = talkData.focus_area?.trim() || 'general safety';
    console.log('🎯 ToolboxTalkEditDialog focus area:', safeFocusArea);
    
    // Get topic-specific defaults
    const topicDefaults = getDefaultsForTopic(safeFocusArea);
    
    const updatedTalk = {
      ...talkData,
      prevention_strategies: talkData.prevention_strategies?.length > 0 
        ? talkData.prevention_strategies 
        : topicDefaults.prevention_strategies,
      discussion_questions: talkData.discussion_questions?.length > 0 
        ? talkData.discussion_questions 
        : topicDefaults.discussion_questions,
      action_items: talkData.action_items?.length > 0 
        ? talkData.action_items 
        : topicDefaults.action_items
    };
    
    console.log('📝 ToolboxTalkEditDialog - Setting talk with topic-specific content:', {
      focus_area: updatedTalk.focus_area,
      prevention_count: updatedTalk.prevention_strategies?.length || 0,
      questions_count: updatedTalk.discussion_questions?.length || 0,
      actions_count: updatedTalk.action_items?.length || 0
    });
    
    setEditedTalk(updatedTalk);
    setSelectedPhotos(talkData.selected_photos || []);
    setUseDefaultLogo(!talkData.company_logo_url);
    setOriginalContent(updatedTalk.content);
    setEnhancedContent(null);
  }, [talkData]);

  const addListItem = (field: 'prevention_strategies' | 'discussion_questions' | 'action_items') => {
    setEditedTalk(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeListItem = (field: 'prevention_strategies' | 'discussion_questions' | 'action_items', index: number) => {
    setEditedTalk(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateListItem = (field: 'prevention_strategies' | 'discussion_questions' | 'action_items', index: number, value: string) => {
    setEditedTalk(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    setLogoFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    setIsUploadingLogo(true);
    try {
      const uploadedFile = await uploadFile(logoFile, 'company-logos');
      if (uploadedFile) {
        toast({
          title: "Logo uploaded successfully",
          description: "Your logo has been saved"
        });
        return uploadedFile.url;
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setIsUploadingLogo(false);
    }
    return null;
  };

  const handleSave = async () => {
    if (!editedTalk.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the toolbox talk",
        variant: "destructive"
      });
      return;
    }

    if (!editedTalk.focus_area.trim()) {
      toast({
        title: "Focus area required", 
        description: "Please enter a focus area for the toolbox talk",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    try {
      let logoUrl = null;
      
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          setIsSaving(false);
          return; // Upload failed, error already shown by uploadLogo
        }
      } else if (useDefaultLogo && defaultLogo) {
        logoUrl = defaultLogo;
      } else if (!useDefaultLogo && editedTalk.company_logo_url) {
        logoUrl = editedTalk.company_logo_url;
      }

      console.log('Saving toolbox talk with photos:', selectedPhotos);

      const saveData = {
        ...editedTalk,
        company_logo_url: logoUrl,
        selected_photos: selectedPhotos
      };

      onSave(saveData);
    } catch (error) {
      console.error('Error saving toolbox talk:', error);
      toast({
        title: "Save failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    let logoUrl = null;
    
    if (logoFile) {
      logoUrl = await uploadLogo();
    } else if (useDefaultLogo && defaultLogo) {
      logoUrl = defaultLogo;
    } else if (!useDefaultLogo && editedTalk.company_logo_url) {
      logoUrl = editedTalk.company_logo_url;
    }

    const regenerateData = {
      ...editedTalk,
      company_logo_url: logoUrl,
      selected_photos: selectedPhotos,
      regeneration_context: editedTalk.regeneration_context,
      generationData
    };

    onRegenerate(regenerateData);
  };

  const handlePreviewEnhancement = async () => {
    if (!editedTalk.regeneration_context?.trim()) {
      toast({
        title: "Enhancement instructions required",
        description: "Please enter AI enhancement instructions",
        variant: "destructive"
      });
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-safety-assistant', {
        body: {
          message: editedTalk.regeneration_context,
          talkType: 'regeneration',
          preset_data: {
            existingContent: editedTalk.content,
            focusArea: editedTalk.focus_area,
            title: editedTalk.title,
            customPrompt: `Enhance the following toolbox talk content based on these instructions: "${editedTalk.regeneration_context}"\n\nCurrent content:\n${editedTalk.content}\n\nPlease provide the enhanced version that incorporates the requested changes while maintaining the professional structure.`
          }
        }
      });

      if (error) throw error;

      if (data?.response) {
        setEnhancedContent(data.response);
        toast({
          title: "Enhancement preview ready",
          description: "Review the enhanced content below"
        });
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement failed",
        description: "Failed to generate enhanced content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApplyEnhancement = () => {
    if (enhancedContent) {
      setEditedTalk(prev => ({ ...prev, content: enhancedContent }));
      setEnhancedContent(null);
      toast({
        title: "Enhancement applied",
        description: "The enhanced content has been applied to your toolbox talk"
      });
    }
  };

  const handleBackToOriginal = () => {
    setEditedTalk(prev => ({ ...prev, content: originalContent }));
    setEnhancedContent(null);
    toast({
      title: "Reverted to original",
      description: "Content has been restored to the original version"
    });
  };

  const renderListSection = (
    title: string,
    field: 'prevention_strategies' | 'discussion_questions' | 'action_items',
    placeholder: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold text-gray-900">{title}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addListItem(field)}
          className="h-8 px-2"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-2">
        {editedTalk[field].map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => updateListItem(field, index, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeListItem(field, index)}
              className="h-10 px-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {editedTalk[field].length === 0 && (
          <p className="text-sm text-gray-600 font-medium">No {title.toLowerCase()} added yet</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-6xl -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-xl p-6 overflow-auto max-h-[calc(100vh-120px)] bg-white">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-inter font-bold text-blue-800">Edit Professional Toolbox Talk</DialogTitle>
          <DialogDescription className="text-gray-700 font-medium font-inter">
            Customize your toolbox talk content with professional styling and smart defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Basic Information */}
          <div className="grid gap-6 p-8 border border-emerald-200 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg">
            <h3 className="text-xl font-inter font-bold text-emerald-800 mb-2 flex items-center">
              <div className="w-2 h-8 bg-gradient-to-b from-emerald-600 to-emerald-700 mr-4 rounded-full shadow-md"></div>
              📋 Basic Information
            </h3>
            <div className="grid gap-3">
              <Label htmlFor="title" className="font-inter font-bold text-gray-900">Title</Label>
              <Input
                id="title"
                value={editedTalk.title}
                onChange={(e) => setEditedTalk(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Professional toolbox talk title"
                className="font-inter border-primary/30 focus:border-primary/50 bg-background/80"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="focus_area" className="font-inter font-bold text-gray-900">Focus Area</Label>
              <Input
                id="focus_area"
                value={editedTalk.focus_area}
                onChange={(e) => setEditedTalk(prev => ({ ...prev, focus_area: e.target.value }))}
                placeholder="Main safety focus area"
                className="font-inter border-primary/30 focus:border-primary/50 bg-background/80"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="content" className="font-inter font-bold text-gray-900">Content</Label>
              <Textarea
                id="content"
                value={editedTalk.content}
                onChange={(e) => setEditedTalk(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Professional toolbox talk content"
                className="min-h-40 font-inter border-primary/30 focus:border-primary/50 bg-background/80"
              />
            </div>
          </div>

          {/* AI Enhancement Instructions */}
          <div className="grid gap-6 p-8 border border-purple-200 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg">
            <h3 className="text-xl font-inter font-bold text-purple-800 mb-2 flex items-center">
              <div className="w-2 h-8 bg-gradient-to-b from-purple-600 to-purple-700 mr-4 rounded-full shadow-md"></div>
              ✨ AI Enhancement Instructions
            </h3>
            <div className="grid gap-3">
              <Label htmlFor="regeneration_context" className="font-inter font-bold text-gray-900">
                Special Instructions for AI
              </Label>
              <Textarea
                id="regeneration_context"
                value={editedTalk.regeneration_context || ''}
                onChange={(e) => setEditedTalk(prev => ({ ...prev, regeneration_context: e.target.value }))}
                placeholder="e.g. add a comment about notifying someone when you're using a ladder..."
                className="min-h-32 font-inter border-secondary/30 focus:border-secondary/50 bg-background/80"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-900 font-medium">
                  Preview changes before applying them to your content.
                </p>
                <Button
                  type="button"
                  onClick={handlePreviewEnhancement}
                  disabled={isEnhancing || !editedTalk.regeneration_context?.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isEnhancing ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Generating Preview...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Preview Enhancement
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Enhancement Preview */}
            {enhancedContent && (
              <div className="space-y-3 p-4 border border-purple-300 rounded-lg bg-purple-50">
                <div className="flex items-center justify-between">
                  <Label className="font-inter font-bold text-purple-800">Enhanced Content Preview</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleBackToOriginal}
                      variant="outline"
                      size="sm"
                      className="text-gray-600 border-gray-300"
                    >
                      Back to Original
                    </Button>
                    <Button
                      type="button"
                      onClick={handleApplyEnhancement}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Apply Enhancement
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={enhancedContent}
                  readOnly
                  className="min-h-40 font-inter bg-white border-purple-200"
                />
                <p className="text-sm text-purple-700 font-medium">
                  Review the enhanced content above. Click "Apply Enhancement" to use it or "Back to Original" to revert.
                </p>
              </div>
            )}
          </div>

          {/* Company Branding */}
          <div className="grid gap-6 p-8 border border-orange-200 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg">
            <h3 className="text-xl font-inter font-bold text-orange-800 mb-2 flex items-center">
              <div className="w-2 h-8 bg-gradient-to-b from-orange-600 to-orange-700 mr-4 rounded-full shadow-md"></div>
              🏢 Company Branding
            </h3>
            
            {/* Logo Source Selection */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="use-default-logo"
                  checked={useDefaultLogo}
                  onChange={(e) => setUseDefaultLogo(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="use-default-logo" className="font-bold text-gray-900">
                  Use company default logo
                  {!defaultLogo && <span className="text-gray-800 ml-1">(none set)</span>}
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="use-custom-logo"
                  checked={!useDefaultLogo}
                  onChange={(e) => setUseDefaultLogo(!e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="use-custom-logo" className="font-bold text-gray-900">
                  Use custom logo for this talk
                </Label>
              </div>
            </div>

            {/* Default Logo Preview */}
            {useDefaultLogo && defaultLogo && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 font-medium">Default logo:</span>
                <div className="w-16 h-16 border rounded-md overflow-hidden bg-muted">
                  <img
                    src={defaultLogo}
                    alt="Default company logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Custom Logo Upload */}
            {!useDefaultLogo && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent"
                  >
                    <Upload className="w-4 h-4" />
                    Select Custom Logo
                  </Label>
                  {logoFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {logoFile.name}
                    </p>
                  )}
                </div>
                {logoPreview && (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 border rounded-md overflow-hidden bg-muted">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        if (logoPreview?.startsWith('blob:')) {
                          URL.revokeObjectURL(logoPreview);
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visual Content & Photos */}
          <div className="grid gap-6 p-8 border border-cyan-200 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 shadow-lg">
            <h3 className="text-xl font-inter font-bold text-cyan-800 mb-2 flex items-center">
              <div className="w-2 h-8 bg-gradient-to-b from-cyan-600 to-cyan-700 mr-4 rounded-full shadow-md"></div>
              📷 Visual Content & Photos
            </h3>
            <PhotoSelectionTabs
              focusArea={editedTalk.focus_area}
              selectedPhotos={selectedPhotos}
              onPhotosChange={setSelectedPhotos}
            />
          </div>

          {/* Interactive Content Sections */}
          <div className="grid gap-6 p-8 border border-indigo-200 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-lg">
            <h3 className="text-xl font-inter font-bold text-indigo-800 mb-4 flex items-center">
              <div className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-indigo-700 mr-4 rounded-full shadow-md"></div>
              📋 Interactive Content Sections
            </h3>
            <div className="space-y-8">
              {renderListSection("Prevention Strategies", "prevention_strategies", "Enter a prevention strategy")}
              {renderListSection("Discussion Questions", "discussion_questions", "Enter a discussion question")}
              {renderListSection("Action Items", "action_items", "Enter an action item")}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={isRegenerating || isUploadingLogo}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isRegenerating ? "Regenerating..." : "Regenerate with SI"}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isUploadingLogo || isSaving}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-green-600 hover:border-green-700 shadow-md"
          >
            {isSaving ? "Saving..." : isUploadingLogo ? "Uploading..." : "💾 Save Changes"}
          </Button>
        </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}