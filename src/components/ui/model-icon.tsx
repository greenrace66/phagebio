
import { FileCode, Dna } from "lucide-react";
import React from "react";

interface ModelIconProps {
  iconName: string;
  className?: string;
}

export const ModelIcon: React.FC<ModelIconProps> = ({ iconName, className = "h-6 w-6" }) => {
  const iconMap = {
    FileCode: FileCode,
    Dna: Dna,
  };

  const IconComponent = iconMap[iconName as keyof typeof iconMap] || FileCode;
  
  return <IconComponent className={className} />;
};
