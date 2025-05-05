
interface PredictionResult {
  ok: boolean;
  data?: string;
  error?: string;
}

export async function predictProteinStructure(sequence: string): Promise<PredictionResult> {
  try {
    const url = 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold';
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: 'Bearer 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'
      },
      body: JSON.stringify({sequence: sequence})
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.pdb) {
      throw new Error('No PDB data in response');
    }
    
    return {
      ok: true,
      data: data.pdb
    };
    
  } catch (error) {
    console.error('Prediction API error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Function to validate if a sequence contains only valid amino acid characters
export function validateSequence(sequence: string): boolean {
  // Valid amino acid one-letter codes (includes both upper and lowercase)
  const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy]+$/;
  return validAminoAcids.test(sequence);
}

// Function to clean a protein sequence by removing non-amino acid characters
export function cleanSequence(sequence: string): string {
  return sequence.replace(/[^ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy]/g, '').toUpperCase();
}

// Function to predict protein structure compatible with DemoMoleculeViewer
export async function predictStructure(sequence: string, apiKey: string): Promise<{success: boolean, data?: string, error?: string}> {
  try {
    const url = 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold';
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({sequence: sequence})
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.pdb) {
      throw new Error('No PDB data in response');
    }
    
    return {
      success: true,
      data: data.pdb
    };
    
  } catch (error) {
    console.error('Prediction API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
