import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec';
import { PluginContext } from 'molstar/lib/mol-plugin/context';

const parent = document.getElementById('app') as HTMLDivElement;
const canvas = document.createElement('canvas');
parent.appendChild(canvas);

const plugin = new PluginContext(DefaultPluginSpec());
await plugin.init();
plugin.initViewer(canvas, parent);

// Load a structure
await plugin.loadStructureFromUrl('https://files.rcsb.org/download/1cbs.cif', 'mmcif');
