import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { StateObjectSelector } from 'molstar/lib/mol-state';
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";
import { Color } from "molstar/lib/mol-util/color";
import { PocketData, PocketRepresentation, PocketsViewType } from './types';
import { setSubtreeVisibility } from 'molstar/lib/mol-plugin/behavior/static/state';

/**
 * Method to create the pocket holder group (called "Pockets" in the tree)
 * @param plugin Mol* plugin
 * @param structure Mol* structure (returned from the first call of loadStructureIntoMolstar())
 * @param groupName Group name (in this case "Pockets")
 * @param prediction Prediction data
 * @param alpha Alpha for the pocket
 * @param createOverpaint Whether to create representations for overpaint
 * @returns Array of pocket representations
 */
export async function createPocketsGroupFromJson(plugin: PluginUIContext, structure: StateObjectSelector, groupName: string, prediction: any, alpha: number = 1, createOverpaint: boolean = true) {
    const builder = plugin.state.data.build();
    const group = builder.to(structure).apply(StateTransforms.Misc.CreateGroup, { label: groupName }, { ref: groupName });

    const pocketRepresentations: PocketRepresentation[] = [];

    prediction.pockets.map((pocket: PocketData, i: number) => {
        createPocketFromJson(plugin, structure, pocket, `Pocket ${i + 1}`, group, pocketRepresentations, alpha, createOverpaint);
    });
    await builder.commit();

    return pocketRepresentations;
}

/**
 * Creates pockets' representation one by one and assigns them to the groups
 * @param plugin Mol* plugin
 * @param structure Mol* structure (returned from the first call of loadStructureIntoMolstar())
 * @param pocket Current pocket data
 * @param groupName Name of the group to which the pocket will be assigned
 * @param group Group to which the pocket will be assigned (from createPocketsGroupFromJson())
 * @param pocketRepresentations Array of pocket representations
 * @param alpha Alpha of the pocket (0-1)
 * @param createOverpaint Whether to create representations for overpaint
 * @returns void
 */
export async function createPocketFromJson(plugin: PluginUIContext, structure: StateObjectSelector, pocket: PocketData, groupName: string, group: any, pocketRepresentations: PocketRepresentation[], alpha: number = 1, createOverpaint: boolean = true) {
    const group2 = group.apply(StateTransforms.Misc.CreateGroup, { label: groupName }, { ref: groupName }, { selectionTags: groupName });

    const atomsExpression = MS.struct.generator.atomGroups({
        'atom-test': MS.core.set.has([MS.set(...pocket.surface.map(Number)), MS.struct.atomProperty.macromolecular.id()])
    });

    //this selects the whole residues
    const wholeResiduesExpression = MS.struct.modifier.wholeResidues({ 0: atomsExpression });

    //create the gaussian surface representations...
    //we need to create one for the whole residue and one for the atoms
    const wholeResiduesSelection = group2.apply(StateTransforms.Model.StructureSelectionFromExpression, { expression: wholeResiduesExpression });
    const atomsSelection = group2.apply(StateTransforms.Model.StructureSelectionFromExpression, { expression: atomsExpression });
    const color = Number("0x" + pocket.color);

    //the first one selects the whole residues and does not color them -> for overpaints
    if (createOverpaint) {
        const repr_surface: StateObjectSelector = wholeResiduesSelection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
            type: 'gaussian-surface',
            typeParams: { alpha: alpha },
            color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
        }));

        pocketRepresentations.push({
            pocketId: pocket.name,
            type: PocketsViewType.Surface_Atoms_Color,
            representation: repr_surface,
            coloredPocket: false,
            overpaintRef: null
        });
    }

    //the second one selects the atoms and colors them
    const repr_surface2: StateObjectSelector = atomsSelection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
        type: 'gaussian-surface',
        typeParams: { alpha: alpha },
        color: 'uniform', colorParams: { value: Color(color) },
        size: 'physical', sizeParams: { scale: 1.10 }
    }));

    pocketRepresentations.push({
        pocketId: pocket.name,
        type: PocketsViewType.Surface_Atoms_Color,
        representation: repr_surface2,
        coloredPocket: true,
        overpaintRef: null
    });

    //the third one selects the whole residues and colors them
    const repr_surface3: StateObjectSelector = wholeResiduesSelection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
        type: 'gaussian-surface',
        typeParams: { alpha: alpha },
        color: 'uniform', colorParams: { value: Color(color) },
        size: 'physical', sizeParams: { scale: 1.10 }
    }));

    pocketRepresentations.push({
        pocketId: pocket.name,
        type: PocketsViewType.Surface_Residues_Color,
        representation: repr_surface3,
        coloredPocket: true,
        overpaintRef: null
    });

    //create the ball and stick representations
    //the first one selects the whole residues and does not color them -> again for overpaints
    if (createOverpaint) {
        const repr_ball_stick: StateObjectSelector = wholeResiduesSelection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
            type: 'ball-and-stick',
            typeParams: { alpha: alpha },
            color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
            size: 'physical', sizeParams: { scale: 1.10 }
        }));

        pocketRepresentations.push({
            pocketId: pocket.name,
            type: PocketsViewType.Ball_Stick_Residues_Color,
            representation: repr_ball_stick,
            coloredPocket: false,
            overpaintRef: null
        });
    }

    //the second one selects the atoms and colors them
    const repr_ball_stick2: StateObjectSelector = atomsSelection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
        type: 'ball-and-stick',
        typeParams: { alpha: alpha },
        color: 'uniform', colorParams: { value: Color(color) },
        size: 'physical', sizeParams: { scale: 1.10 }
    }));

    pocketRepresentations.push({
        pocketId: pocket.name,
        type: PocketsViewType.Ball_Stick_Atoms_Color,
        representation: repr_ball_stick2,
        coloredPocket: true,
        overpaintRef: null
    });

    //the third one selects the whole residues and colors them
    const repr_ball_stick3: StateObjectSelector = wholeResiduesSelection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
        type: 'ball-and-stick',
        typeParams: { alpha: alpha },
        color: 'uniform', colorParams: { value: Color(color) },
        size: 'physical', sizeParams: { scale: createOverpaint ? 1.50 : 1.10 }
    }));

    pocketRepresentations.push({
        pocketId: pocket.name,
        type: PocketsViewType.Ball_Stick_Residues_Color,
        representation: repr_ball_stick3,
        coloredPocket: true,
        overpaintRef: null
    });
}

/**
 * Method which sets the visibility of one pocket in the desired representation
 * @param plugin Mol* plugin
 * @param representationType Type of the representation to be shown
 * @param pocketRepresentations Array of pocket representations
 * @param pocketIndex Index of the pocket
 * @param isVisible Visibility of the pocket
 * @returns void
 */
export function showPocketInCurrentRepresentation(plugin: PluginUIContext, representationType: PocketsViewType, pocketRepresentations: PocketRepresentation[], pocketIndex: number, isVisible: boolean) {
    if (isVisible) {
        //show the pocket
        const currentPocketRepr = pocketRepresentations.filter(e => e.type === representationType && e.pocketId === `pocket${pocketIndex + 1}`);
        currentPocketRepr.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, false));

        //hide other representations
        const otherPocketRepr = pocketRepresentations.filter(e => e.type !== representationType && e.pocketId === `pocket${pocketIndex + 1}`);
        otherPocketRepr.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, true));

        return;
    }

    //else hide all representations
    const pocketRepr = pocketRepresentations.filter(e => e.pocketId === `pocket${pocketIndex + 1}`);
    pocketRepr.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, true));
}

/**
 * Method which sets the visibility of all the pockets in the desired representation
 * @param plugin Mol* plugin
 * @param representationType Type of the representation to be shown
 * @param pocketRepresentations Array of pocket representations
 * @returns void
 */
export function showAllPocketsInRepresentation(plugin: PluginUIContext, representationType: PocketsViewType, pocketRepresentations: PocketRepresentation[]) {
    pocketRepresentations.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, element.type !== representationType));
}

/**
 * Focus the camera on the pocket
 * @param plugin Mol* plugin
 * @param pocket Pocket data
 * @returns void
 */
export function focusOnPocket(plugin: PluginUIContext, pocket: PocketData) {
    if (!plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data) return;
    
    // Implementation would require getSurfaceAtomSelection from helpers
    // This is a simplified version
    const query = MS.struct.generator.atomGroups({
        'atom-test': MS.core.set.has([MS.set(...pocket.surface.map(Number)), MS.struct.atomProperty.macromolecular.id()])
    });
    
    const sel = plugin.managers.structure.hierarchy.current.structures[0].cell.obj!.data;
    const loci = plugin.managers.structure.hierarchy.getStructureSelectionLoci(sel, query);
    plugin.managers.camera.focusLoci(loci);
}
