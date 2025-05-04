export const convertJsonToPdb = (jsonResponse: { pdbs: string[] }): string => {
  // Assuming the first PDB string in the array is the one we want to use
  return jsonResponse.pdbs[0];
}; 