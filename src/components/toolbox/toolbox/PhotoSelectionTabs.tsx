import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Image, Search, Check, Copy } from "lucide-react";
import { useFileStorage } from "@/hooks/useFileStorage";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { copyPhotoToPermanentStorage, processPhotosForPermanentStorage } from "@/utils/photoManagement";

interface PhotoSelectionTabsProps {
  focusArea: string;
  selectedPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
}

interface AuditPhoto {
  id: string;
  photo_path: string;
  audit_id: string;
  created_at: string;
  signedUrl?: string;
  permanentUrl?: string;
  findings: Array<{
    id: string;
    finding_type: string;
    description: string;
    severity_level: number;
  }>;
}

interface PhotoMapping {
  signedUrl: string;
  permanentUrl?: string;
  isProcessing: boolean;
}

export function PhotoSelectionTabs({ focusArea, selectedPhotos, onPhotosChange }: PhotoSelectionTabsProps) {
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [photoMappings, setPhotoMappings] = useState<Map<string, PhotoMapping>>(new Map());
  const { uploadFile } = useFileStorage();
  const { toast } = useToast();

  // Debug logging
  console.log('🖼️ PhotoSelectionTabs received:', { focusArea, selectedPhotos });
  console.log('📊 PhotoSelectionTabs - selectedPhotos count:', selectedPhotos.length);
  console.log('📷 PhotoSelectionTabs - actual selectedPhotos:', selectedPhotos);

  // Fetch audit photos for previously selected photos (always load these)
  const { data: previouslySelectedPhotos = [] } = useQuery({
    queryKey: ['previously-selected-photos', selectedPhotos],
    queryFn: async () => {
      if (!selectedPhotos.length) return [];
      
      console.log('🔍 Loading previously selected photos:', selectedPhotos);
      
      // Extract audit photo IDs from selectedPhotos URLs if they exist
      const auditPhotoIds = selectedPhotos
        .filter(url => url.includes('/audit-photos/'))
        .map(url => {
          // Extract ID from URL pattern if possible
          const matches = url.match(/audit-photos\/(.+)/);
          return matches ? matches[1] : null;
        })
        .filter(Boolean);

      if (auditPhotoIds.length === 0) return [];

      try {
        const { data: photosData, error } = await supabase
          .from('si_audit_photos')
          .select(`
            id,
            photo_path,
            audit_id,
            created_at
          `)
          .in('photo_path', auditPhotoIds.map(id => `audit-photos/${id}`));

        if (error) throw error;
        if (!photosData) return [];

        // Get findings for these photos
        const photoIds = photosData.map(p => p.id);
        const { data: findingsData } = await supabase
          .from('si_audit_findings')
          .select('*')
          .in('photo_id', photoIds);

        // Create findings map
        const findingsMap = new Map();
        if (findingsData) {
          findingsData.forEach(finding => {
            if (!findingsMap.has(finding.photo_id)) {
              findingsMap.set(finding.photo_id, []);
            }
            findingsMap.get(finding.photo_id).push(finding);
          });
        }

        // Get signed URLs for previously selected photos
        const photosWithUrls = await Promise.all(
          photosData.map(async (photo: any) => {
            try {
              let cleanPath = photo.photo_path;
              if (cleanPath.startsWith('audit-photos/')) {
                cleanPath = cleanPath.replace('audit-photos/', '');
              }
              
              const { data, error: urlError } = await supabase.storage
                .from('audit-photos')
                .createSignedUrl(cleanPath, 3600);
              
              if (urlError || !data?.signedUrl) {
                console.error(`❌ Failed to get URL for previously selected photo:`, urlError);
                return null;
              }
              
              return {
                ...photo,
                findings: findingsMap.get(photo.id) || [],
                signedUrl: data.signedUrl,
                isPreviouslySelected: true
              };
            } catch (error) {
              console.error(`❌ Error processing previously selected photo:`, error);
              return null;
            }
          })
        );

        return photosWithUrls.filter(photo => photo && photo.signedUrl);
      } catch (error) {
        console.error('❌ Error loading previously selected photos:', error);
        return [];
      }
    },
    enabled: selectedPhotos.length > 0
  });

  // Fetch audit photos based on focus area with enhanced matching
  const { data: auditPhotos = [], isLoading } = useQuery({
    queryKey: ['audit-photos-for-tbt', focusArea],
    queryFn: async () => {
      console.log('🎯 PhotoSelectionTabs - Focus area check:', focusArea);
      console.log('🔍 Focus area type:', typeof focusArea, 'Length:', focusArea?.length);
      
      // Skip photo fetch only for truly generic or missing topics
      if (!focusArea || !focusArea.trim()) {
        console.log('⚠️ PhotoSelectionTabs - Skipping photo fetch for missing topic');
        return [];
      }

      // Allow specific safety topics including Machine Guarding
      const validTopics = [
        'Machine Guarding', 'Heat Stress', 'Electrical Safety', 'Fall Protection',
        'Chemical Safety', 'Fire Safety', 'PPE Requirements', 'Lockout/Tagout',
        'Confined Space', 'Welding Safety', 'Forklift Operation', 'Crane Safety',
        'Scaffolding Safety', 'Excavation Safety', 'Housekeeping', 'Ergonomics',
        'Arc Welding Safety', 'Gas Welding Safety', 'Harness and Lanyard Inspection',
        'Ladder Safety', 'Scaffolding Safety', 'Roof Work Safety', 'Energy Sources Identification',
        'Lock Application Procedures', 'Pre-Operation Inspection', 'Load Handling',
        'Permit Procedures', 'Fire Watch Requirements', 'Workplace Organization'
      ];
      
      const isValidTopic = validTopics.some(topic => 
        focusArea.toLowerCase().includes(topic.toLowerCase()) || 
        topic.toLowerCase().includes(focusArea.toLowerCase())
      );
      
      console.log('🎯 Is valid topic?', isValidTopic, 'for focus area:', focusArea);
      
      if (focusArea === 'general safety' || (!isValidTopic && focusArea.length < 5)) {
        console.log('⚠️ PhotoSelectionTabs - Skipping photo fetch for generic topic:', focusArea);
        return [];
      }

      console.log('🔍 Searching for audit photos for focus area:', focusArea);

      try {
        // Get photos with their findings
        const { data: photosData, error } = await supabase
          .from('si_audit_photos')
          .select(`
            id,
            photo_path,
            audit_id,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('❌ Error fetching photos:', error);
          throw error;
        }

        if (!photosData || photosData.length === 0) {
          console.log('⚠️ No photos found in database');
          return [];
        }

        // Get findings for these photos
        const photoIds = photosData.map(p => p.id);
        const { data: findingsData } = await supabase
          .from('si_audit_findings')
          .select('*')
          .in('photo_id', photoIds);

        console.log('📷 Raw photos data count:', photosData?.length || 0);
        console.log('🔍 Findings data count:', findingsData?.length || 0);

        // Create a mapping of photo ID to findings
        const findingsMap = new Map();
        if (findingsData) {
          findingsData.forEach(finding => {
            if (!findingsMap.has(finding.photo_id)) {
              findingsMap.set(finding.photo_id, []);
            }
            findingsMap.get(finding.photo_id).push(finding);
          });
        }

        // AI-powered photo relevance analysis
        const relevantPhotos = await Promise.all(
          photosData.map(async (photo: any) => {
            const photoFindings = findingsMap.get(photo.id) || [];
            
            // Must have findings to be relevant
            if (photoFindings.length === 0) {
              console.log(`❌ Photo ${photo.id} has no findings`);
              return null;
            }
            
            const allText = photoFindings
              .map((f: any) => `${f.finding_type || ''} ${f.description || ''} ${f.location_type || ''}`)
              .join(' ');

            // Use AI to determine relevance to focus area
            try {
              const relevanceResult = await supabase.functions.invoke('ai-safety-assistant', {
                body: {
                  message: `Analyze if this safety finding is relevant to "${focusArea}". 

Finding: "${allText}"

Instructions:
- Return ONLY a relevance score from 0-10 where:
  - 10 = Directly related to ${focusArea} (e.g., heat stress finding for heat stress topic)
  - 8-9 = Highly related 
  - 5-7 = Somewhat related
  - 1-4 = Loosely related
  - 0 = Not related at all
  
- For heat stress: Look for heat-related conditions, temperature issues, cooling/ventilation problems, hydration issues
- For electrical: Look for electrical hazards, wiring issues, electrical equipment problems
- For machine guarding: Look for unguarded machinery, moving parts, mechanical hazards
- Be strict: Only score high if DIRECTLY related to the specific topic

Return format: Just the number (0-10)`,
                  type: 'chat'
                }
              });

              if (relevanceResult.data?.response) {
                const score = parseInt(relevanceResult.data.response.trim());
                if (!isNaN(score) && score >= 0 && score <= 10) {
                  console.log(`🎯 Photo ${photo.id} AI relevance score: ${score}/10 for "${focusArea}"`);
                  
                  // STRICT: Only include photos with relevance score >= 8 (increased threshold)
                  if (score >= 8) {
                    return {
                      ...photo,
                      findings: photoFindings,
                      relevanceScore: score
                    };
                  }
                }
              }
              
              console.log(`❌ Photo ${photo.id} not relevant to "${focusArea}"`);
              return null;
            } catch (error) {
              console.error(`❌ Error analyzing photo relevance:`, error);
              // Fallback to basic text matching for errors
              const focusAreaLower = focusArea.toLowerCase();
              const hasBasicMatch = allText.toLowerCase().includes(focusAreaLower);
              
              if (hasBasicMatch) {
                return {
                  ...photo,
                  findings: photoFindings,
                  relevanceScore: 5
                };
              }
              return null;
            }
          })
        );

        // Filter out null results from the Promise.all
        const validPhotos = relevantPhotos.filter(photo => photo !== null);

        console.log('✅ AI-filtered relevant photos found:', validPhotos.length);

        if (validPhotos.length === 0) {
          console.log('⚠️ No photos matched the focus area criteria using AI analysis');
          return [];
        }

        // Sort by relevance score (highest first)
        validPhotos.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        // Get signed URLs for photos with better error handling
        const photosWithUrls = await Promise.all(
          validPhotos.slice(0, 15).map(async (photo: any) => {
            try {
              console.log(`🔗 Getting signed URL for: ${photo.photo_path}`);
              
              // Clean photo path if it has bucket prefix
              let cleanPath = photo.photo_path;
              if (cleanPath.startsWith('audit-photos/')) {
                cleanPath = cleanPath.replace('audit-photos/', '');
              }
              
              const { data, error: urlError } = await supabase.storage
                .from('audit-photos')
                .createSignedUrl(cleanPath, 3600);
              
              if (urlError) {
                console.error(`❌ URL error for ${cleanPath}:`, urlError);
                return null;
              }
              
              if (!data?.signedUrl) {
                console.error(`❌ No signed URL returned for ${cleanPath}`);
                return null;
              }
              
              console.log(`✅ Got signed URL for ${cleanPath}`);
              return {
                ...photo,
                signedUrl: data.signedUrl
              };
            } catch (error) {
              console.error(`❌ Exception getting URL for ${photo.photo_path}:`, error);
              return null;
            }
          })
        );

        const finalPhotos = photosWithUrls.filter(photo => photo && photo.signedUrl);
        console.log('🖼️ Final photos with URLs:', finalPhotos.length);
        
        if (finalPhotos.length === 0) {
          console.log('⚠️ No photos had valid signed URLs');
        }
        
        return finalPhotos;
        
      } catch (error) {
        console.error('❌ Critical error in photo fetch:', error);
        throw error;
      }
    },
    enabled: !!focusArea,
    retry: 2,
    retryDelay: 1000
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image file`,
            variant: "destructive"
          });
          return null;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is over 10MB`,
            variant: "destructive"
          });
          return null;
        }

        const uploadedFile = await uploadFile(file, 'toolbox-talk-photos');
        return uploadedFile?.url;
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(url => url !== null) as string[];
      
      if (successfulUploads.length > 0) {
        setUploadedPhotos(prev => [...prev, ...successfulUploads]);
        toast({
          title: "Photos uploaded",
          description: `${successfulUploads.length} photos uploaded successfully`
        });
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload some photos",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isPhotoSelected = (photoUrl: string): boolean => {
    // Normalize URLs for comparison (remove query parameters, protocol differences)
    const normalizeUrl = (url: string) => {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname;
      } catch {
        return url;
      }
    };
    
    const normalizedPhotoUrl = normalizeUrl(photoUrl);
    const isSelected = selectedPhotos.some(selectedUrl => {
      const normalizedSelectedUrl = normalizeUrl(selectedUrl);
      return normalizedSelectedUrl === normalizedPhotoUrl;
    });
    
    // Also check mapping for permanent URL
    const mapping = photoMappings.get(photoUrl);
    if (mapping?.permanentUrl) {
      const normalizedPermanentUrl = normalizeUrl(mapping.permanentUrl);
      const isSelectedViaPermanent = selectedPhotos.some(selectedUrl => {
        const normalizedSelectedUrl = normalizeUrl(selectedUrl);
        return normalizedSelectedUrl === normalizedPermanentUrl;
      });
      return isSelected || isSelectedViaPermanent;
    }
    
    console.log(`🔍 Photo selection check for ${photoUrl.substring(0, 50)}...: ${isSelected}`);
    return isSelected;
  };

  const isPhotoProcessing = (photoUrl: string): boolean => {
    return photoMappings.get(photoUrl)?.isProcessing || false;
  };

  const togglePhotoSelection = async (photoUrl: string) => {
    const mapping = photoMappings.get(photoUrl);
    
    // If photo is selected, remove it
    if (isPhotoSelected(photoUrl)) {
      const urlToRemove = mapping?.permanentUrl || photoUrl;
      onPhotosChange(selectedPhotos.filter(url => url !== urlToRemove));
      return;
    }

    // If it's from audit-photos, copy to permanent storage first
    if (photoUrl.includes('/audit-photos/')) {
      // Set processing state
      setPhotoMappings(prev => new Map(prev.set(photoUrl, {
        signedUrl: photoUrl,
        isProcessing: true
      })));
      
      try {
        console.log('Copying audit photo to permanent storage:', photoUrl);
        const permanentUrl = await copyPhotoToPermanentStorage(photoUrl);
        
        if (permanentUrl) {
          // Update mapping with permanent URL
          setPhotoMappings(prev => new Map(prev.set(photoUrl, {
            signedUrl: photoUrl,
            permanentUrl,
            isProcessing: false
          })));
          
          // Add permanent URL to selection
          onPhotosChange([...selectedPhotos, permanentUrl]);
          
          toast({
            title: "Photo added",
            description: "Photo saved to toolbox talk permanently"
          });
        } else {
          throw new Error('Failed to copy photo');
        }
      } catch (error) {
        console.error('Error copying photo:', error);
        
        // Clear processing state
        setPhotoMappings(prev => {
          const newMap = new Map(prev);
          newMap.delete(photoUrl);
          return newMap;
        });
        
        toast({
          title: "Failed to add photo",
          description: "Could not save photo permanently. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Already a permanent URL, add directly
      onPhotosChange([...selectedPhotos, photoUrl]);
    }
  };

  const getRelevanceScore = (photo: AuditPhoto & { relevanceScore?: number }) => {
    return photo.relevanceScore || 0;
  };

  const getRelevanceDisplay = (score: number) => {
    if (score >= 10) return { text: "🎯 Perfect Match", color: "bg-gradient-to-r from-emerald-500 to-green-500" };
    if (score >= 6) return { text: "🔥 High Match", color: "bg-gradient-to-r from-blue-500 to-cyan-500" };
    if (score >= 3) return { text: "⚡ Medium Match", color: "bg-gradient-to-r from-yellow-500 to-orange-500" };
    return { text: "💡 Low Match", color: "bg-gradient-to-r from-gray-500 to-gray-600" };
  };

  const getSeverityBadge = (severity: number) => {
    if (severity >= 8) return <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold shadow-md">🚨 Critical</Badge>;
    if (severity >= 6) return <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md">⚠️ High</Badge>;
    if (severity >= 4) return <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold shadow-md">⚡ Medium</Badge>;
    return <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold shadow-md">ℹ️ Low</Badge>;
  };

  return (
    <div className="space-y-6">
      <Label className="text-lg font-bold text-cyan-800">Add Photos to Toolbox Talk (Optional)</Label>
      
      <Tabs defaultValue="audit-photos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-cyan-100 to-blue-100 border-2 border-cyan-200">
          <TabsTrigger 
            value="audit-photos" 
            className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-700 data-[state=active]:text-white font-bold"
          >
            <Search className="w-4 h-4" />
            🔍 Smart Match Photos ({auditPhotos.length})
          </TabsTrigger>
          <TabsTrigger 
            value="upload-new" 
            className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white font-bold"
          >
            <Upload className="w-4 h-4" />
            📤 Upload New Photos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit-photos" className="space-y-6">
          {focusArea && focusArea !== 'general safety' && focusArea.trim() ? (
            <>
              <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl">
                <p className="text-base font-bold text-cyan-800 mb-2">
                  🎯 Smart Photo Matching for "{focusArea}"
                </p>
                <p className="text-sm text-cyan-700">
                  Our AI found <span className="font-bold text-cyan-900 text-lg">{auditPhotos.length}</span> relevant photo{auditPhotos.length !== 1 ? 's' : ''} from your audit findings. 
                  Each photo is scored for relevance. Click to select photos for your toolbox talk.
                </p>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading relevant photos...</span>
                </div>
              ) : auditPhotos.length > 0 || previouslySelectedPhotos.length > 0 ? (
                <div className="space-y-6">
                  {/* Previously Selected Photos Section */}
                  {previouslySelectedPhotos.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <span className="font-bold text-emerald-800">Previously Selected Photos ({previouslySelectedPhotos.length})</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {previouslySelectedPhotos.map((photo) => {
                          const relevanceScore = getRelevanceScore(photo);
                          const relevanceDisplay = getRelevanceDisplay(relevanceScore);
                          
                          return (
                            <Card 
                              key={`prev-${photo.id}`}
                              className="cursor-pointer transition-all duration-300 transform hover:scale-105 ring-2 ring-emerald-400 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50"
                              onClick={() => togglePhotoSelection(photo.signedUrl)}
                            >
                              <CardContent className="p-3">
                                <div className="relative">
                                  <img
                                    src={photo.signedUrl}
                                    alt="Previously selected photo"
                                    className="w-full h-28 object-cover rounded-lg"
                                  />
                                  <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full p-2 shadow-lg">
                                    <Check className="w-4 h-4" />
                                  </div>
                                  {photo.findings && photo.findings.length > 0 && (
                                    <div className="absolute bottom-2 left-2">
                                      {getSeverityBadge(Math.max(...photo.findings.map(f => f.severity_level)))}
                                    </div>
                                  )}
                                  <div className="absolute top-2 left-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-600 text-white font-bold shadow-md">
                                      ✓ Selected
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <div className="text-sm font-bold text-gray-900 truncate">
                                    {photo.findings?.[0]?.finding_type || "Previously Selected"}
                                  </div>
                                  {photo.findings?.[0]?.description && (
                                    <div className="text-xs text-gray-600 line-clamp-2">
                                      {photo.findings[0].description}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Current Focus Area Photos Section */}
                  {auditPhotos.length > 0 && (
                    <div className="space-y-4">
                      {previouslySelectedPhotos.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
                          <Search className="w-5 h-5 text-cyan-600" />
                          <span className="font-bold text-cyan-800">Available Photos for "{focusArea}" ({auditPhotos.length})</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-h-96 overflow-y-auto p-2">
                        {auditPhotos.map((photo) => {
                          const relevanceScore = getRelevanceScore(photo);
                          const relevanceDisplay = getRelevanceDisplay(relevanceScore);
                          
                          return (
                            <Card 
                              key={photo.id}
                              className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                                isPhotoSelected(photo.signedUrl) 
                                  ? 'ring-4 ring-emerald-500 shadow-2xl bg-gradient-to-br from-emerald-50 to-green-50' 
                                  : 'hover:ring-2 ring-cyan-400 hover:shadow-xl border-2 border-gray-200 hover:border-cyan-300'
                              }`}
                              onClick={() => togglePhotoSelection(photo.signedUrl)}
                            >
                              <CardContent className="p-3">
                                <div className="relative">
                                  <img
                                    src={photo.signedUrl}
                                    alt="Audit finding"
                                    className="w-full h-28 object-cover rounded-lg"
                                  />
                                  {isPhotoSelected(photo.signedUrl) && (
                                    <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full p-2 shadow-lg">
                                      <Check className="w-4 h-4" />
                                    </div>
                                  )}
                                  {isPhotoProcessing(photo.signedUrl) && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                      <div className="flex items-center gap-2 text-white text-sm font-medium">
                                        <Copy className="w-4 h-4 animate-pulse" />
                                        Saving...
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute bottom-2 left-2">
                                    {getSeverityBadge(Math.max(...photo.findings.map(f => f.severity_level)))}
                                  </div>
                                  <div className="absolute top-2 left-2">
                                    <span className={`text-xs px-3 py-1 rounded-full text-white font-bold shadow-md ${relevanceDisplay.color}`}>
                                      {relevanceDisplay.text}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <div className="text-sm font-bold text-gray-900 truncate">
                                    {photo.findings[0]?.finding_type}
                                  </div>
                                  <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                    {photo.findings[0]?.description}
                                  </div>
                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold text-cyan-700">Match Score:</span>
                                      <span className="text-xs font-bold text-cyan-900">{relevanceScore}</span>
                                    </div>
                                    {isPhotoSelected(photo.signedUrl) && (
                                      <span className="text-xs font-bold text-emerald-600">✅ Selected</span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
                  <Image className="w-12 h-12 mx-auto mb-3 text-amber-600" />
                  <p className="font-bold text-amber-800 mb-2">No relevant photos found for "{focusArea}"</p>
                  <p className="text-sm text-amber-700 mb-4">
                    Our AI couldn't find audit photos that closely match this topic.<br/>
                    Try uploading custom photos or use a more specific topic.
                  </p>
                  <div className="text-xs text-amber-600 bg-amber-100 p-2 rounded border">
                    💡 <strong>Tip:</strong> Photos need a relevance score of 8+ to appear here
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="font-bold text-gray-700 mb-2">Smart Photo Matching Disabled</p>
              <div className="max-w-md mx-auto space-y-3">
                <p className="text-sm text-gray-600">
                  Smart photo matching requires a specific safety topic to find relevant audit photos.
                </p>
                <div className="text-xs text-gray-500 bg-gray-100 p-3 rounded border">
                  <strong>📝 Enter a specific topic like:</strong><br/>
                  "Heat stress", "Electrical safety", "Fall protection", "Machine guarding"
                </div>
                <p className="text-sm text-gray-600">
                  Once you add a specific topic in the Focus Area field, relevant photos from your audits will appear here automatically.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload-new" className="space-y-4">
          <div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <Label
              htmlFor="photo-upload"
              className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent w-fit"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? "Uploading..." : "Select Photos"}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Upload custom photos for this toolbox talk. Max 10MB per photo.
            </p>
          </div>

          {uploadedPhotos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploaded Photos</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {uploadedPhotos.map((photoUrl, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all ${
                      isPhotoSelected(photoUrl) 
                        ? 'ring-2 ring-primary' 
                        : 'hover:ring-1 ring-muted-foreground'
                    }`}
                    onClick={() => togglePhotoSelection(photoUrl)}
                  >
                    <CardContent className="p-2">
                      <div className="relative">
                        <img
                          src={photoUrl}
                          alt="Uploaded photo"
                          className="w-full h-24 object-cover rounded"
                        />
                        {isPhotoSelected(photoUrl) && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Custom photo</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedPhotos.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedPhotos.length} photo{selectedPhotos.length > 1 ? 's' : ''} selected for toolbox talk
        </div>
      )}
    </div>
  );
}