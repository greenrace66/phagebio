import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { Script } from "molstar/lib/mol-script/script";
import { StructureSelection, StructureElement, StructureProperties, Bond } from "molstar/lib/mol-model/structure";
import { Loci } from "molstar/lib/mol-model/loci";
import { MolstarResidue, Point3D } from './types';

/**
 * Method which gets selection from specified chainId and residues
 * @param plugin Mol* plugin
 * @param chainId Chain (letter) to be focused on
 * @param positions Residue ids
 * @returns StructureSelection of the desired residues
 */
export function getSelectionFromChainAuthId(plugin: PluginUIContext, chainId: string, positions: number[]) {
    const query = MS.struct.generator.atomGroups({
        'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chainId]),
        'residue-test': MS.core.set.has([MS.set(...positions), MS.struct.atomProperty.macromolecular.auth_seq_id()]),
        'group-by': MS.struct.atomProperty.macromolecular.residueKey()
    });
    return Script.getStructureSelection(query, plugin.managers.structure.hierarchy.current.structures[0].cell.obj!.data);
}

/**
 * Method which gets selection from surface atom numbers
 * @param plugin Mol* plugin
 * @param ids Surface atoms ids
 * @returns StructureSelection of the surface atoms
 */
export function getSurfaceAtomSelection(plugin: PluginUIContext, ids: string[]) {
    const query = MS.struct.generator.atomGroups({
        'atom-test': MS.core.set.has([MS.set(...ids.map(Number)), MS.struct.atomProperty.macromolecular.id()])
    });
    return Script.getStructureSelection(query, plugin.managers.structure.hierarchy.current.structures[0].cell.obj!.data);
}

/**
 * Method which focuses on the residues loci specified by the user, can be called from anywhere
 * @param plugin Mol* plugin
 * @param chain Chain (letter) to be focused on
 * @param ids Residue ids
 * @returns void
 */
export function highlightInViewerLabelIdWithoutFocus(plugin: PluginUIContext, chain: string, ids: number[]) {
    const data = plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
    if (!data) return;

    const sel = getSelectionFromChainAuthId(plugin, chain, ids);
    const loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
}

/**
 * Highlights the selected surface atoms, if toggled, the method will focus on them as well
 * @param plugin Mol* plugin
 * @param ids Surface atoms ids
 * @param focus Focus on the surface atoms (if false, it will only highlight them)
 * @returns void
 */
export function highlightSurfaceAtomsInViewerLabelId(plugin: PluginUIContext, ids: string[], focus: boolean) {
    const data = plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
    if (!data) return;

    const sel = getSurfaceAtomSelection(plugin, ids);
    const loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
    if (focus) plugin.managers.camera.focusLoci(loci);
}

/**
 * Method which focuses on the loci specified by the user
 * @param plugin Mol* plugin
 * @param chain Chain (letter) to be focused on
 * @param ids Residue ids
 * @returns void
 */
export function highlightInViewerAuthId(plugin: PluginUIContext, chain: string, ids: number[]) {
    const data = plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;
    if (!data) return;

    const sel = getSelectionFromChainAuthId(plugin, chain, ids);
    const loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
    plugin.managers.camera.focusLoci(loci);
}

/**
 * Method which returns coordinates of the surface atoms
 * @param plugin Mol* plugin
 * @param ids Surface atom ids
 * @returns An array of coordinates
 */
export function getPocketAtomCoordinates(plugin: PluginUIContext, ids: string[]) {
    const coordinates: Point3D[] = [];

    for (let i of ids) {
        const sel = getSurfaceAtomSelection(plugin, [i]);
        const loci = getStructureElementLoci(StructureSelection.toLociWithSourceUnits(sel));

        if (loci) {
            const structureElement = StructureElement.Stats.ofLoci(loci);
            const location = structureElement.firstElementLoc;
            coordinates.push({ 
                x: StructureProperties.atom.x(location), 
                y: StructureProperties.atom.y(location), 
                z: StructureProperties.atom.z(location) 
            });
        }
    }

    return coordinates;
}

/**
 * Focuses the camera on the second loaded structure. Typically used for focusing on the ligand.
 * @param plugin Mol* plugin
 * @param extraRadius Extra radius for the focus (to zoom out)
 * @returns void
 */
export function focusOnSecondLoadedStructure(plugin: PluginUIContext, extraRadius: number = 0) {
    const data = plugin.managers.structure.hierarchy.current.structures[1]?.cell.obj?.data;
    if (!data) return;
    const query = MS.struct.generator.all;
    const sel = Script.getStructureSelection(query, data);
    const loci = StructureSelection.toLociWithSourceUnits(sel);
    plugin.managers.camera.focusLoci(loci, { extraRadius: extraRadius });
}

/**
 * Returns the residue information from a given surface atom id
 * @param plugin Mol* plugin
 * @param surfaceAtom Surface atom id
 * @returns Residue information
 */
export function getResidueFromSurfaceAtom(plugin: PluginUIContext, surfaceAtom: string) {
    const sel = getSurfaceAtomSelection(plugin, [surfaceAtom.toString()]);
    const loci = getStructureElementLoci(StructureSelection.toLociWithSourceUnits(sel));
    if (!loci) return null;

    const structureElement = StructureElement.Stats.ofLoci(loci);
    const location = structureElement.firstElementLoc;
    const residue: MolstarResidue = {
        authName: StructureProperties.atom.auth_comp_id(location),
        name: StructureProperties.atom.label_comp_id(location),
        isHet: StructureProperties.residue.hasMicroheterogeneity(location),
        insCode: StructureProperties.residue.pdbx_PDB_ins_code(location),
        index: StructureProperties.residue.key(location),
        seqNumber: StructureProperties.residue.label_seq_id(location),
        authSeqNumber: StructureProperties.residue.auth_seq_id(location),
        chain: {
            asymId: StructureProperties.chain.label_asym_id(location),
            authAsymId: StructureProperties.chain.auth_asym_id(location),
            entity: {
                entityId: StructureProperties.entity.id(location),
                index: StructureProperties.entity.key(location)
            },
            index: StructureProperties.chain.key(location)
        }
    };

    return residue;
}

/**
 * Helper function to get StructureElement.Loci from Loci
 * @param loci Loci object
 * @returns StructureElement.Loci or undefined
 */
export function getStructureElementLoci(loci: Loci): StructureElement.Loci | undefined {
    if (loci.kind == "bond-loci") {
        return Bond.toStructureElementLoci(loci);
    } else if (loci.kind == "element-loci") {
        return loci;
    }
    return undefined;
}

/**
 * Converts ESMFold prediction results to PredictionData format
 * @param pdbData PDB data string
 * @param confidenceScores Array of confidence scores
 * @returns PredictionData object
 */
export function convertESMFoldToPredictionData(pdbData: string, confidenceScores: number[]) {
    // Parse PDB data to extract residue indices
    const indices: string[] = [];
    const lines = pdbData.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('ATOM')) {
            const chainId = line.substring(21, 22).trim();
            const resNum = parseInt(line.substring(22, 26).trim());
            const index = `${chainId}_${resNum}`;
            
            if (!indices.includes(index)) {
                indices.push(index);
            }
        }
    }
    
    // Create regions based on chain IDs
    const chains = new Set<string>();
    indices.forEach(index => chains.add(index.split('_')[0]));
    
    const regions = Array.from(chains).map((chain, i) => {
        const chainIndices = indices.filter(index => index.startsWith(`${chain}_`));
        return {
            name: chain,
            end: i === chains.size - 1 ? indices.length - 1 : chainIndices.length - 1
        };
    });
    
    // Create prediction data
    return {
        structure: {
            indices,
            scores: {
                plddt: confidenceScores
            },
            regions
        },
        pockets: []
    };
}
