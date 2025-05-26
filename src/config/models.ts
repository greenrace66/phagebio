
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
  apiEndpoint: string;
  headers: Record<string, string>;
  disclaimer: string;
  exampleSequence: string;
  requestBody: (sequence: string) => object;
  responseParser: (response: any) => { pdbString?: string; error?: string };
  disabled: boolean;
}

import { FileCode, Dna } from "lucide-react";

export const models: Record<string, ModelConfig> = {
  esmfold: {
    id: "esmfold",
    name: "ESMFold",
    description: "Fastest protein structure prediction model",
    icon: <FileCode className="h-6 w-6 text-biostruct-500" />,
    tag: "Structure Prediction",
    apiEndpoint: "https://health.api.nvidia.com/v1/biology/nvidia/esmfold",
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    disclaimer: "COST : 1 credit",
    exampleSequence: "FVNQHLCGSHLVEALYLVCGERGFFYTPKA",
    requestBody: (sequence: string) => ({ sequence }),
    responseParser: (response: any) => ({
      pdbString: response.pdbs?.[0] || response.pdb_string,
    }),
    disabled: false
  },
  alphafold2: {
    id: "alphafold2",
    name: "AlphaFold2",
    description: "DeepMind's revolutionary protein structure prediction system",
    icon: <Dna className="h-6 w-6 text-molecular-500" />,
    tag: "Structure Prediction",
    apiEndpoint: "https://health.api.nvidia.com/v1/biology/deepmind/alphafold2",
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    disclaimer: "COST : 2 credits",
    exampleSequence: "MKQHKAMIVALIVICITAVVAALVTRKDLCEVHIRTGQTEVAVF",
    requestBody: (sequence: string) => ({ 
      sequence,
      algorithm: 'mmseqs2' 
    }),
    responseParser: (response: any) => ({
      pdbString: response.pdbs?.[0] || response.pdb_string || response.structure,
    }),
    disabled: false
  }
};
