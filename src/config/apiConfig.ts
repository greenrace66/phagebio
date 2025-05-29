
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
      e_value: 0.0001,
      iterations: 1,
      databases: ["small_bfd"],
      relax_prediction: False,
      skip_template_search: True
    })
  }
};
