
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: string; // Changed to string to reference icon names
  tag: string;
  apiEndpoint: string;
  headers: Record<string, string>;
  disclaimer: string;
  exampleSequence: string;
  requestBody: (sequence: string) => object;
  responseParser: (response: any) => { pdbString?: string; error?: string };
  disabled: boolean;
}

export const models: Record<string, ModelConfig> = {
  esmfold: {
    id: "esmfold",
    name: "ESMFold",
    description: "Fastest protein structure prediction model",
    icon: "FileCode",
    tag: "Structure Prediction",
    apiEndpoint: "/api/esmfold", // Use proxy endpoint
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
    icon: "Dna",
    tag: "Structure Prediction",
    apiEndpoint: "/api/alphafold2", // Use proxy endpoint
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
