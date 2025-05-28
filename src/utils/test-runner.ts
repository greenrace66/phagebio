// Test script to validate MolStar integration
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec';
import { testMolstarUtilities } from './utils/molstar/test';

// Create a simple test harness
async function runTests() {
  console.log('Starting MolStar integration tests...');
  
  // Create a temporary container for the plugin
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  container.style.position = 'absolute';
  container.style.left = '-9999px'; // Off-screen
  document.body.appendChild(container);
  
  // Initialize Mol* plugin
  const plugin = new PluginContext(DefaultPluginSpec());
  await plugin.init();
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  plugin.initViewer(canvas, container);
  
  try {
    // Run the test utilities with a sample PDB
    const testPdbUrl = 'https://files.rcsb.org/download/1crn.pdb';
    const result = await testMolstarUtilities(plugin, testPdbUrl);
    
    console.log('Test result:', result ? 'PASSED' : 'FAILED');
    
    // Clean up
    plugin.dispose();
    document.body.removeChild(container);
    
    return result;
  } catch (error) {
    console.error('Test error:', error);
    
    // Clean up
    plugin.dispose();
    document.body.removeChild(container);
    
    return false;
  }
}

// Export the test runner
export default runTests;
