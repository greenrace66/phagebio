
export interface ApiConfig {
  headers: Record<string, string>;
  getBody: (sequence: string) => object;
}

export const apiConfigs: Record<string, ApiConfig> = {
  esmfold: {
    headers: {
      "content-type": "application/json",
    },
    getBody: (sequence: string) => ({
      sequence: sequence
    })
  },
  alphafold2: {
    headers: {
      "content-type": "application/json",
    },
    getBody: (sequence: string) => ({
      sequence: sequence,
      algorithm: "mmseqs2",
      databases: ["uniref90"],
      skip_template_search: true
    })
  }
};
