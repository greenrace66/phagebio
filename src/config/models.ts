
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  tag: string;
  apiEndpoint: string;
  disclaimer: string;
  exampleSequence: string;
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
    apiEndpoint: "/api/esmfold",
    disclaimer: "COST : 1 credit",
    exampleSequence: "FVNQHLCGSHLVEALYLVCGERGFFYTPKA",
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
    apiEndpoint: "/api/alphafold2",
    disclaimer: "COST : 2 credits",
    exampleSequence: "MKQHKAMIVALIVICITAVVAALVTRKDLCEVHIRTGQTEVAVF",
    responseParser: (response: any) => ({
      pdbString: response.pdbs?.[0] || response.pdb_string || response.structure,
    }),
    disabled: false
  }
};
