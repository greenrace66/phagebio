import { toast } from "@/hooks/use-toast";

// ESMFold API endpoint
const ESMFOLD_API_URL = "https://health.api.nvidia.com/v1/biology/nvidia/esmfold";

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

// Function to predict protein structure using ESMFold API
export const predictStructure = async (
  sequence: string,
  apiKey: string,
): Promise<{ success: boolean; data?: string; error?: string }> => {
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
        error: "Sequence too long. Maximum length is 1000 amino acids for this demo." 
      };
    }

    // Call to ESMFold API
    // Note: In a production app, this should be done via a Supabase Edge Function
    // to keep the API key secure. For now, we're using a client-side approach
    const response = await fetch(ESMFOLD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        sequence: cleanedSeq
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.message || "Failed to predict structure" 
      };
    }

    const data = await response.json();
    return { 
      success: true, 
      data: data.pdb_string 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
};
