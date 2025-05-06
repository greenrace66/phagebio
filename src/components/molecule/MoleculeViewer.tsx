
import { useEffect, useRef } from 'react';
import { Structure } from '@rcsb/rcsb-molstar/lib/mol-model/structure';
import { StructureElement } from '@rcsb/rcsb-molstar/lib/mol-model/structure/structure';
import { StructureRepresentation } from '@rcsb/rcsb-molstar/lib/mol-repr/structure/representation';
import { createPluginUI } from '@rcsb/rcsb-molstar/lib/mol-plugin-ui';
import { PluginUIContext } from '@rcsb/rcsb-molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from '@rcsb/rcsb-molstar/lib/mol-plugin-ui/spec';
import { Color } from '@rcsb/rcsb-molstar/lib/mol-util/color';
import { ColorNames } from '@rcsb/rcsb-molstar/lib/mol-util/color/names';

export interface MoleculeViewerProps {
  pdb: string;
  hideInfoOnMobile?: boolean;
}

const MoleculeViewer = ({ pdb }: MoleculeViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);
  const structureRef = useRef<Structure | null>(null);
  const representationRef = useRef<StructureRepresentation<any> | null>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    const plugin = createPluginUI(viewerRef.current, {
      ...DefaultPluginUISpec(),
      layout: {
        initial: {
          isExpanded: false,
          showControls: false,
          controlsDisplay: 'hidden',
        }
      },
      components: {
        controls: { left: 'none', right: 'none', top: 'none', bottom: 'none' },
      }
    });
    
    pluginRef.current = plugin;

    return () => {
      plugin.dispose();
    };
  }, []);

  useEffect(() => {
    const loadStructure = async () => {
      if (!pluginRef.current || !pdb) return;

      try {
        await pluginRef.current.clear();

        const data = await pluginRef.current.builders.data.rawData({ data: pdb, label: 'PDB' });
        const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, 'pdb');
        
        const model = await pluginRef.current.builders.structure.createModel(trajectory);
        const structure = await pluginRef.current.builders.structure.createStructure(model);
        
        structureRef.current = structure;

        // Add cartoon representation
        const cartoonRepr = await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
          type: 'cartoon',
          color: 'chain-id',
          size: 'uniform'
        });

        // Add ball-and-stick representation for ligands
        const ballAndStickRepr = await pluginRef.current.builders.structure.representation.addRepresentation(structure, {
          type: 'ball-and-stick',
          typeParams: { alpha: 0.5 },
          color: 'element-symbol',
          size: 'uniform'
        });

        const canvas = pluginRef.current.canvas3d!;
        canvas.setBackground(Color(ColorNames.white));
        
        // Fixed: Now we only pass one argument to setSpin
        canvas.setSpin(true);
        
        await pluginRef.current.canvas3d?.resetCamera();
        await pluginRef.current.canvas3d?.requestAnimation();
      } catch (error) {
        console.error('Error loading structure:', error);
      }
    };

    loadStructure();
  }, [pdb]);

  return <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />;
};

export default MoleculeViewer;
