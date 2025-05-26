import { FileCode, Dna } from "lucide-react";

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  tag: string;
  apiEndpoint: string;
  headers: Record<string, string>;
  requestBody?: Record<string, any>;
  disclaimer: string;
  exampleSequence: string;
  disabled: boolean;
}

export const models: Record<string, ModelConfig> = {
  esmfold: {
    id: "esmfold",
    name: "ESMFold",
    description: "Fastest protein structure prediction model",
    icon: <FileCode className="h-6 w-6 text-biostruct-500" />,
    tag: "Structure Prediction",
    apiEndpoint: "/api/esmfold",
    headers: {
      "accept": "application/json",
      "content-type": "application/json"
    },
    disclaimer: "COST : 1 credit",
    exampleSequence: "FVNQHLCGSHLVEALYLVCGERGFFYTPKA",
    disabled: false
  },
  alphafold2: {
    id: "alphafold2",
    name: "AlphaFold2",
    description: "DeepMind's revolutionary protein structure prediction system",
    icon: <Dna className="h-6 w-6 text-molecular-500" />,
    tag: "Structure Prediction",
    apiEndpoint: "/api/alphafold2",
    headers: {
      "accept": "application/json",
      "content-type": "application/json"
    },
    requestBody: {
      algorithm: "mmseqs2"
    },
    disclaimer: "COST : 1 credit",
    exampleSequence: "FVNQHLCGSHLVEALYLVCGERGFFYTPKA",
    disabled: false
  }
};

export const getModelConfig = (modelId: string): ModelConfig | null => {
  return models[modelId] || null;
};

export const getAllModels = (): ModelConfig[] => {
  return Object.values(models);
};