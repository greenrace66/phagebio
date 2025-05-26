import { toast } from "@/hooks/use-toast";

import { ModelConfig } from "@/config/models";

// Function to validate protein sequence (only allow valid amino acids)
export const validateSequence = (sequence: string): boolean => {
  // Remove whitespace and common formatting characters
  const cleanedSeq = sequence.replace(/[\s>]/g, '').toUpperCase();
  // Valid amino acids (standard 20 + some ambiguous)
  const validAminoAcids = "ACDEFGHIKLMNPQRSTVWYXB-";
  
  // Check if all characters are valid amino acids
  return cleanedSeq.split('').every(char => validAminoAcids.includes(char));
};

// Function to clean a sequence (remove headers, numbers, whitespace)
export const cleanSequence = (sequence: string): string => {
  // Remove FASTA header lines and whitespace
  return sequence
    .split('\n')
    .filter(line => !line.startsWith('>'))
    .join('')
    .replace(/\s/g, '')
    .toUpperCase();
};

// Function to predict protein structure using any configured model
export const predictStructure = async (
  sequence: string,
  apiKey: string,
  modelConfig: ModelConfig
): Promise<{ success: boolean; data?: string; error?: string; json?: any }> => {
  try {
    if (!validateSequence(sequence)) {
      return { 
        success: false, 
        error: "Invalid protein sequence. Please check your input." 
      };
    }
    
    const cleanedSeq = cleanSequence(sequence);
    
    if (cleanedSeq.length < 10) {
      return { 
        success: false, 
        error: "Sequence too short. Minimum length is 10 amino acids." 
      };
    }
    
    if (cleanedSeq.length > 1000) {
      return { 
        success: false, 
        error: "Sequence too long. Maximum length is 1000 amino acids" 
      };
    }

    // Prepare request body based on model configuration
    let requestBody: any = {
      sequence: cleanedSeq
    };
    
    // Add model-specific request body parameters
    if (modelConfig.requestBody) {
      requestBody = { ...requestBody, ...modelConfig.requestBody };
    }

    // Prepare headers with authorization
    const headers = {
      ...modelConfig.headers,
      'authorization': `Bearer ${apiKey}`
    };

    const options = {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    };

    const response = await fetch(modelConfig.apiEndpoint, options);

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.message || "Failed to predict structure" 
      };
    }

    const data = await response.json();
    
    // Handle different response formats
    let pdbString = data.pdb_string || data.pdbs?.[0] || data.data;
    
    return { 
      success: true, 
      data: pdbString,
      json: data // Include the raw response
    };
  } catch (error) {
    console.error("Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch. Please check your network connection" 
    };
  }
};
