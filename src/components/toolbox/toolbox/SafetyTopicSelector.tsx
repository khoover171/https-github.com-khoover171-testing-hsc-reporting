
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface SafetyTopicSelectorProps {
  onTopicChange: (topic: string, subcategory: string, customTopic?: string, industry?: string) => void;
  selectedTopic: string;
  selectedSubcategory: string;
  customTopic: string;
  selectedIndustry?: string;
}

const SafetyTopicSelector: React.FC<SafetyTopicSelectorProps> = ({
  onTopicChange,
  selectedTopic,
  selectedSubcategory,
  customTopic,
  selectedIndustry = ''
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);

  const industryTopics = {
    "General Industry": {
      "Lockout/Tagout": [
        "Energy Sources Identification",
        "Lock Application Procedures",
        "Verification Methods",
        "Group Lockout Procedures",
        "Shift Changes",
        "Testing Equipment",
        "Device Maintenance",
        "Training Requirements",
        "Documentation",
        "Electrical LOTO",
        "Mechanical LOTO",
        "Pneumatic LOTO",
        "Hydraulic LOTO",
        "Thermal LOTO",
        "Custom"
      ],
      "Powered Industrial Vehicles": [
        "Forklift Operation",
        "Pre-Operation Inspection",
        "Load Handling",
        "Battery Safety",
        "Pedestrian Safety",
        "Refueling Procedures",
        "Maintenance Requirements",
        "Operating Surfaces",
        "Visibility Issues",
        "Capacity Limits",
        "Training Certification",
        "Accident Prevention",
        "Storage Areas",
        "Traffic Control",
        "Custom"
      ],
      "Hot Work": [
        "Permit Procedures",
        "Fire Watch Requirements",
        "Welding Safety",
        "Cutting Operations",
        "Ventilation Requirements",
        "PPE Selection",
        "Fire Extinguisher Placement",
        "Area Preparation",
        "Combustible Materials",
        "Spark Control",
        "Post-Work Inspection",
        "Emergency Procedures",
        "Equipment Inspection",
        "Gas Cylinder Safety",
        "Custom"
      ],
      "Housekeeping": [
        "Workplace Organization",
        "Material Storage",
        "Aisle Maintenance",
        "Waste Disposal",
        "Spill Prevention",
        "Cleaning Procedures",
        "Tool Organization",
        "Emergency Access",
        "Slip Prevention",
        "Trip Hazard Control",
        "Lighting Requirements",
        "Inventory Management",
        "Chemical Storage",
        "Personal Items",
        "Custom"
      ],
      "Chemical Safety": [
        "SDS Understanding",
        "Chemical Storage",
        "Hazard Communication",
        "Spill Response",
        "Chemical Mixing",
        "Ventilation Requirements",
        "Chemical PPE",
        "Waste Disposal",
        "Emergency Procedures",
        "Labeling Systems",
        "Incompatible Materials",
        "Container Handling",
        "Transfer Procedures",
        "Exposure Monitoring",
        "Custom"
      ],
      "Machine Safety": [
        "Machine Guarding",
        "Conveyor Safety",
        "Hand Tools Safety",
        "Power Tools Safety",
        "Equipment Inspection",
        "Moving Parts Hazards",
        "Energy Isolation",
        "Maintenance Safety",
        "Emergency Stops",
        "Training Requirements",
        "Hazard Recognition",
        "Safe Operating Procedures",
        "Automation Safety",
        "Robotics Safety",
        "Custom"
      ],
      "Ergonomics": [
        "Lifting Techniques",
        "Repetitive Motion",
        "Workstation Setup",
        "Back Injury Prevention",
        "Hand and Wrist Safety",
        "Manual Material Handling",
        "Posture Awareness",
        "Tool Selection",
        "Job Rotation",
        "Computer Ergonomics",
        "Standing Workstations",
        "Mechanical Assists",
        "Stretching Programs",
        "Fatigue Management",
        "Custom"
      ],
      "Fire Safety": [
        "Fire Extinguisher Use",
        "Fire Prevention",
        "Emergency Evacuation",
        "Flammable Materials",
        "Fire Detection Systems",
        "Exit Routes",
        "Fire Hazard Recognition",
        "Electrical Fire Safety",
        "Emergency Response",
        "Alarm Systems",
        "Suppression Systems",
        "Inspection Procedures",
        "Training Requirements",
        "Emergency Planning",
        "Custom"
      ],
      "PPE Requirements": [
        "Eye Protection",
        "Hearing Protection",
        "Respiratory Protection",
        "Hand Protection",
        "Foot Protection",
        "Head Protection",
        "PPE Inspection",
        "PPE Maintenance",
        "PPE Selection",
        "Training Requirements",
        "Fit Testing",
        "Replacement Schedules",
        "Storage Requirements",
        "Cost Considerations",
        "Custom"
      ],
      "Electrical Safety": [
        "GFCI Protection",
        "Arc Flash Protection",
        "Electrical Hazard Recognition",
        "Grounding and Bonding",
        "Extension Cord Safety",
        "Electrical Panel Safety",
        "Wiring Inspection",
        "Voltage Testing",
        "PPE for Electrical Work",
        "Training Requirements",
        "Maintenance Procedures",
        "Emergency Procedures",
        "Warning Systems",
        "Isolation Procedures",
        "Custom"
      ],
      "Hazard Communication": [
        "GHS Classification",
        "SDS Management",
        "Labeling Systems",
        "Training Programs",
        "Chemical Inventory",
        "Hazard Assessment",
        "Emergency Information",
        "Communication Methods",
        "Program Updates",
        "Employee Rights",
        "Container Labeling",
        "Work Area Information",
        "Contractor Communication",
        "Multi-language Requirements",
        "Custom"
      ],
      "Emergency Response": [
        "Emergency Procedures",
        "Evacuation Plans",
        "Communication Systems",
        "First Aid Response",
        "Incident Command",
        "Emergency Equipment",
        "Training Requirements",
        "Drill Procedures",
        "Medical Emergencies",
        "Fire Response",
        "Chemical Spills",
        "Severe Weather",
        "Workplace Violence",
        "Recovery Planning",
        "Custom"
      ]
    },
    "Construction": {
      "Fall Protection": [
        "Harness and Lanyard Inspection",
        "Ladder Safety",
        "Scaffolding Safety",
        "Roof Work Safety",
        "Guardrail Systems",
        "Personal Fall Arrest Systems",
        "Fall Prevention Planning",
        "Anchor Point Selection",
        "Rescue Procedures",
        "Leading Edge Work",
        "Hole Covers",
        "Safety Nets",
        "Positioning Systems",
        "Travel Restraint",
        "Custom"
      ],
      "Excavation Safety": [
        "Soil Classification",
        "Slope Protection",
        "Shoring Systems",
        "Utilities Location",
        "Entry and Exit",
        "Atmospheric Hazards",
        "Water Accumulation",
        "Protective Systems",
        "Inspection Requirements",
        "Cave-in Prevention",
        "Equipment Operations",
        "Spoil Pile Management",
        "Traffic Control",
        "Emergency Procedures",
        "Custom"
      ],
      "Crane & Rigging": [
        "Crane Inspection",
        "Load Charts",
        "Rigging Hardware",
        "Sling Safety",
        "Signal Persons",
        "Ground Conditions",
        "Power Line Hazards",
        "Load Handling",
        "Weather Conditions",
        "Crane Setup",
        "Operator Certification",
        "Maintenance Requirements",
        "Safety Devices",
        "Lifting Plans",
        "Custom"
      ],
      "Scaffolding": [
        "Scaffold Inspection",
        "Erection Procedures",
        "Fall Protection",
        "Load Limits",
        "Platform Requirements",
        "Access Methods",
        "Guardrail Systems",
        "Base Requirements",
        "Tie-offs",
        "Weather Protection",
        "Electrical Hazards",
        "Material Handling",
        "Dismantling Procedures",
        "Training Requirements",
        "Custom"
      ],
      "Trenching": [
        "Soil Analysis",
        "Protective Systems",
        "Entry Procedures",
        "Utility Location",
        "Atmospheric Testing",
        "Water Control",
        "Emergency Rescue",
        "Equipment Safety",
        "Inspection Requirements",
        "Spoil Management",
        "Access and Egress",
        "Cave-in Protection",
        "Safety Systems",
        "Training Requirements",
        "Custom"
      ],
      "Welding Safety": [
        "Arc Welding Safety",
        "Gas Welding Safety",
        "Ventilation Requirements",
        "Fire Prevention",
        "PPE Selection",
        "Electrical Safety",
        "Confined Space Welding",
        "Fume Control",
        "Equipment Inspection",
        "Hot Work Permits",
        "Eye Protection",
        "Respiratory Protection",
        "Burn Prevention",
        "Gas Cylinder Safety",
        "Custom"
      ],
      "Heavy Equipment": [
        "Equipment Inspection",
        "Operator Training",
        "Blind Spots",
        "Ground Conditions",
        "Maintenance Safety",
        "Hydraulic Safety",
        "Rollover Protection",
        "Spotters and Signals",
        "Stability Factors",
        "Transportation Safety",
        "Lockout Procedures",
        "Emergency Procedures",
        "Weather Considerations",
        "Site Hazards",
        "Custom"
      ],
      "Electrical Safety": [
        "Overhead Power Lines",
        "Underground Utilities",
        "GFCI Protection",
        "Temporary Wiring",
        "Extension Cords",
        "Grounding Requirements",
        "Wet Conditions",
        "PPE Requirements",
        "Arc Flash Protection",
        "Lockout Procedures",
        "Equipment Inspection",
        "Training Requirements",
        "Emergency Procedures",
        "Voltage Testing",
        "Custom"
      ],
      "PPE Requirements": [
        "Hard Hat Safety",
        "Eye Protection",
        "Hearing Protection",
        "Respiratory Protection",
        "Hand Protection",
        "Foot Protection",
        "High-Visibility Clothing",
        "Fall Protection PPE",
        "PPE Inspection",
        "PPE Maintenance",
        "Selection Criteria",
        "Training Requirements",
        "Replacement Schedules",
        "Multi-hazard Protection",
        "Custom"
      ],
      "Fire Safety": [
        "Hot Work Permits",
        "Fire Extinguisher Use",
        "Fire Prevention",
        "Emergency Evacuation",
        "Flammable Materials",
        "Welding Fire Safety",
        "Fuel Storage",
        "Equipment Fire Safety",
        "Emergency Response",
        "Fire Watch Procedures",
        "Ignition Sources",
        "Suppression Systems",
        "Training Requirements",
        "Emergency Planning",
        "Custom"
      ],
      "Confined Space": [
        "Entry Procedures",
        "Atmospheric Testing",
        "Ventilation Requirements",
        "Rescue Planning",
        "Communication Systems",
        "Equipment Requirements",
        "Hazard Recognition",
        "Entry Permits",
        "Emergency Procedures",
        "Attendant Duties",
        "Entrant Duties",
        "Supervisor Responsibilities",
        "Training Requirements",
        "Contractor Safety",
        "Custom"
      ],
      "Housekeeping": [
        "Site Organization",
        "Material Storage",
        "Debris Removal",
        "Tool Management",
        "Access Routes",
        "Slip Prevention",
        "Trip Hazard Control",
        "Waste Management",
        "Equipment Storage",
        "Weather Protection",
        "Fire Prevention",
        "Pest Control",
        "Cleanup Procedures",
        "Site Security",
        "Custom"
      ]
    }
  };

  const handleIndustryChange = (industry: string) => {
    onTopicChange('', '', '', industry);
  };

  const handleTopicChange = (topic: string) => {
    setShowCustomInput(false);
    onTopicChange(topic, '', '', selectedIndustry);
  };

  const handleSubcategoryChange = (subcategory: string) => {
    if (subcategory === 'Custom') {
      setShowCustomInput(true);
      onTopicChange(selectedTopic, subcategory, customTopic, selectedIndustry);
    } else {
      setShowCustomInput(false);
      onTopicChange(selectedTopic, subcategory, '', selectedIndustry);
    }
  };

  const handleCustomTopicChange = (value: string) => {
    onTopicChange(selectedTopic, selectedSubcategory, value, selectedIndustry);
  };

  const currentTopics = selectedIndustry ? industryTopics[selectedIndustry as keyof typeof industryTopics] : null;

  return (
    <div className="space-y-6">
      {/* Industry Selection */}
      {!selectedIndustry && (
        <div>
          <Label className="text-base font-semibold mb-3 block">Select Industry Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(industryTopics).map((industry) => (
              <div
                key={industry}
                className="group relative overflow-hidden border border-si-primary/20 rounded-xl p-6 cursor-pointer hover:border-si-primary/60 hover:shadow-lg hover:shadow-si-primary/10 transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card/70 to-si-primary/5 backdrop-blur-sm"
                onClick={() => handleIndustryChange(industry)}
              >
                <div className="space-y-3">
                  <div className="font-semibold text-lg text-foreground group-hover:text-si-primary transition-colors break-words">
                    {industry}
                  </div>
                  <div className="text-sm text-muted-foreground break-words">
                    {Object.keys(industryTopics[industry as keyof typeof industryTopics]).length} safety topics available
                  </div>
                  <div className="text-xs text-muted-foreground/80 leading-tight break-words">
                    {industry === 'General Industry' 
                      ? 'Manufacturing, warehouses, offices, and industrial facilities'
                      : 'Construction sites, building, excavation, and heavy equipment'
                    }
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-si-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Safety Topic Selection */}
      {selectedIndustry && !selectedTopic && currentTopics && (
        <div>
          <div className="mb-3">
            <Label className="text-base font-semibold">
              Select Safety Topic - <Badge variant="outline" className="ml-2">{selectedIndustry}</Badge>
            </Label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.keys(currentTopics).map((topic) => (
              <div
                key={topic}
                className="border border-input rounded-md p-4 cursor-pointer hover:border-si-primary hover:bg-accent transition-colors overflow-hidden"
                onClick={() => handleTopicChange(topic)}
              >
                <div className="space-y-1">
                  <div className="font-medium text-sm break-words">{topic}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentTopics[topic as keyof typeof currentTopics].length - 1} options
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subcategory Selection */}
      {selectedTopic && !selectedSubcategory && currentTopics && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">
              Choose Focus Area - <Badge variant="outline" className="ml-2">{selectedTopic}</Badge>
            </Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                handleTopicChange('');
                handleSubcategoryChange('');
              }}
            >
              ← Back to Topics
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentTopics[selectedTopic as keyof typeof currentTopics]?.map((subcategory) => (
              <Button
                key={subcategory}
                variant="outline"
                className="h-auto p-4 justify-start text-left hover:border-si-primary"
                onClick={() => handleSubcategoryChange(subcategory)}
              >
                <div className="text-sm font-medium">{subcategory}</div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Topic Input */}
      {showCustomInput && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Custom Topic Description</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleSubcategoryChange('')}
            >
              ← Back to Focus Areas
            </Button>
          </div>
          <Textarea
            value={customTopic}
            onChange={(e) => handleCustomTopicChange(e.target.value)}
            placeholder="Describe your specific safety topic..."
            rows={4}
            className="w-full"
          />
        </div>
      )}

      {/* Selected Topic Summary */}
      {selectedTopic && selectedSubcategory && selectedSubcategory !== 'Custom' && (
        <div className="bg-si-secondary/20 p-4 rounded-lg border border-si-primary/20">
          <Label className="text-base font-semibold mb-2 block">Selected Topic</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div>
                <Badge className="bg-si-primary/10 text-si-primary border-si-primary/20 mr-2 text-xs">{selectedIndustry}</Badge>
                <Badge className="bg-si-primary text-si-primary-foreground mr-2">{selectedTopic}</Badge>
                <Badge variant="outline">{selectedSubcategory}</Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleSubcategoryChange('')}
            >
              ← Change
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyTopicSelector;
