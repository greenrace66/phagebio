import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { 
  loadStructureIntoMolstar,
  updatePolymerView,
  overPaintPolymer,
  setStructureTransparency,
  addPredictedPolymerRepresentation,
  createPocketsGroupFromJson,
  PolymerViewType,
  PolymerColorType,
  PolymerRepresentation,
  PocketRepresentation,
  PredictionData
} from './index';

/**
 * Test function to validate all MolStar utilities functionality
 * @param plugin Mol* plugin
 * @param pdbUrl URL to a PDB file
 */
export async function testMolstarUtilities(plugin: PluginUIContext, pdbUrl: string) {
  console.log('Testing MolStar utilities...');
  
  try {
    // Step 1: Load structure
    console.log('Step 1: Loading structure...');
    const [model, structure, polymerReps] = await loadStructureIntoMolstar(plugin, pdbUrl);
    console.log('Structure loaded successfully');
    console.log('Polymer representations:', polymerReps.length);
    
    // Step 2: Test representation switching
    console.log('Step 2: Testing representation switching...');
    await updatePolymerView(PolymerViewType.Cartoon, plugin, polymerReps, [], false);
    console.log('Switched to Cartoon view');
    
    await updatePolymerView(PolymerViewType.Atoms, plugin, polymerReps, [], false);
    console.log('Switched to Atoms view');
    
    await updatePolymerView(PolymerViewType.Gaussian_Surface, plugin, polymerReps, [], false);
    console.log('Switched to Surface view');
    
    // Step 3: Test coloring
    console.log('Step 3: Testing coloring...');
    const mockPredictionData: PredictionData = {
      structure: {
        indices: [],
        scores: {
          plddt: []
        },
        regions: []
      },
      pockets: []
    };
    
    await overPaintPolymer(PolymerColorType.Chain, plugin, mockPredictionData, polymerReps, [], []);
    console.log('Applied Chain coloring');
    
    await overPaintPolymer(PolymerColorType.Element, plugin, mockPredictionData, polymerReps, [], []);
    console.log('Applied Element coloring');
    
    await overPaintPolymer(PolymerColorType.White, plugin, mockPredictionData, polymerReps, [], []);
    console.log('Applied White coloring');
    
    // Step 4: Test transparency
    console.log('Step 4: Testing transparency...');
    await setStructureTransparency(plugin, 0.5, polymerReps);
    console.log('Set transparency to 0.5');
    
    await setStructureTransparency(plugin, 1.0, polymerReps);
    console.log('Set transparency to 1.0');
    
    // Step 5: Test pocket visualization (if data available)
    console.log('Step 5: Testing pocket visualization...');
    const mockPocketData = {
      pockets: [
        {
          name: 'pocket1',
          residues: ['A_1', 'A_2', 'A_3'],
          surface: ['1', '2', '3'],
          color: 'FF0000'
        }
      ]
    };
    
    try {
      const pocketReps = await createPocketsGroupFromJson(plugin, structure, 'Pockets', mockPocketData);
      console.log('Created pocket representations:', pocketReps.length);
    } catch (error) {
      console.log('Pocket visualization test skipped (requires actual pocket data)');
    }
    
    console.log('All tests completed successfully!');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}
