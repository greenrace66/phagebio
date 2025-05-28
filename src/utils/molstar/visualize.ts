import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { Color } from "molstar/lib/mol-util/color";
import { Asset } from "molstar/lib/mol-util/assets";
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { createStructureRepresentationParams } from "molstar/lib/mol-plugin-state/helpers/structure-representation-params";
import { StructureSelection, StructureElement, StructureProperties } from "molstar/lib/mol-model/structure";
import { Script } from "molstar/lib/mol-script/script";
import { Bundle } from "molstar/lib/mol-model/structure/structure/element/bundle";
import { setSubtreeVisibility } from 'molstar/lib/mol-plugin/behavior/static/state';
import { StateObjectSelector } from 'molstar/lib/mol-state';
import { 
  PolymerViewType, PolymerRepresentation, PredictionData
} from './types';
import { getSelectionFromChainAuthId } from './helpers';

/**
 * Loads the structure to be predicted and adds the polymer representations to the viewer.
 * @param plugin Mol* plugin
 * @param structureUrl URL of the structure to be predicted
 * @param structureAlpha Alpha of the structure (0-1)
 * @param ligandColor Color of the ligands
 * @returns An array containing the model, structure and polymer representations
 */
export async function loadStructureIntoMolstar(plugin: PluginUIContext, structureUrl: string, structureAlpha: number = 1, ligandColor: `0x${string}` = "0x") {
    const data = await plugin.builders.data.download({
        url: Asset.Url(structureUrl),
        isBinary: false
    }, { state: { isGhost: true } });

    let trajectory;
    if (structureUrl.endsWith("cif")) trajectory = await plugin.builders.structure.parseTrajectory(data, "mmcif");
    else trajectory = await plugin.builders.structure.parseTrajectory(data, "pdb");

    //create the initial model
    const model = await plugin.builders.structure.createModel(trajectory);
    const structure: StateObjectSelector = await plugin.builders.structure.createStructure(model, { name: 'model', params: {} });

    const polymerRepresentations: PolymerRepresentation[] = [];

    // adds polymer representations
    const polymer = await plugin.builders.structure.tryCreateComponentStatic(structure, 'polymer');
    if (polymer) {
        polymerRepresentations.push({
            type: PolymerViewType.Gaussian_Surface,
            representation: await plugin.builders.structure.representation.addRepresentation(polymer, {
                type: 'gaussian-surface', //molecular-surface could be probably better, but is slower
                typeParams: { alpha: structureAlpha },
                color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
                ref: "polymer_gaussian"
            }),
            transparentRepresentationRef: null,
            overpaintRef: null
        });

        await plugin.builders.structure.representation.addRepresentation(polymer, {
            type: 'ball-and-stick',
            typeParams: { alpha: structureAlpha },
            color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
            ref: "polymer_balls"
        }).then((e) => {
            //hide ball and stick representation
            polymerRepresentations.push({
                type: PolymerViewType.Atoms,
                representation: e,
                transparentRepresentationRef: null,
                overpaintRef: null
            });
            setSubtreeVisibility(plugin.state.data, polymerRepresentations.find(e => e.type === PolymerViewType.Atoms)!.representation.ref, true);
        });

        await plugin.builders.structure.representation.addRepresentation(polymer, {
            type: 'cartoon',
            typeParams: { alpha: structureAlpha },
            color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
            ref: "polymer_cartoon"
        }).then((e) => {
            //hide ball and stick representation
            polymerRepresentations.push({
                type: PolymerViewType.Cartoon,
                representation: e,
                transparentRepresentationRef: null,
                overpaintRef: null
            });
            setSubtreeVisibility(plugin.state.data, polymerRepresentations.find(e => e.type === PolymerViewType.Cartoon)!.representation.ref, true);
        });
    }

    await createLigandRepresentations(plugin, structure, ligandColor);

    return [model, structure, polymerRepresentations];
}

/**
 * Creates representation of the ligands in the structure.
 * @param plugin Mol* plugin
 * @param structure Mol* structure representation
 * @param color Color of the ligands
 */
export async function createLigandRepresentations(plugin: PluginUIContext, structure: StateObjectSelector, color: `0x${string}` = "0x") {
    const shownGroups = ["water", "ion", "ligand", "nucleic", "lipid", "branched", "non-standard", "coarse"] as const;

    for (const group of shownGroups) {
        const component = await plugin.builders.structure.tryCreateComponentStatic(structure, group);
        if (component) {
            if (color !== "0x" && group !== "water") {
                await plugin.builders.structure.representation.addRepresentation(component, {
                    type: 'ball-and-stick',
                    color: 'uniform',
                    colorParams: { value: Color.fromHexString(color) }
                });
            }
            else {
                await plugin.builders.structure.representation.addRepresentation(component, {
                    type: 'ball-and-stick'
                });
            }
        }
    }

    await plugin.build().commit();
}

/**
 * Sets the transparency of all polymer representations.
 * @param plugin Mol* plugin
 * @param alpha Structure alpha (0-1)
 * @param polymerRepresentations Array of polymer representations
 */
export async function setStructureTransparency(plugin: PluginUIContext, alpha: number, polymerRepresentations: PolymerRepresentation[]) {
    const params: any = [];

    const query = MS.struct.generator.all;
    const sel = Script.getStructureSelection(query, plugin.managers.structure.hierarchy.current.structures[0].cell.obj!.data);
    const bundle = Bundle.fromSelection(sel);

    params.push({
        bundle: bundle,
        value: alpha
    });

    for (const element of polymerRepresentations) {
        const builder = plugin.state.data.build();
        if (element.transparentRepresentationRef) {
            builder.to(element.representation.ref).delete(element.transparentRepresentationRef);
        }
        await builder.commit();

        const r = await plugin.state.data.build().to(element.representation.ref).apply(StateTransforms.Representation.TransparencyStructureRepresentation3DFromBundle, { layers: params }).commit();
        element.transparentRepresentationRef = r.ref;
    }
}

/**
 * Method which adds predicted structure representation to the viewer
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param structure Mol* structure (returned from the first call of loadStructureIntoMolstar())
 * @returns Array of predicted polymer representations
 */
export async function addPredictedPolymerRepresentation(plugin: PluginUIContext, prediction: PredictionData, structure: StateObjectSelector) {
    const predictedPolymerRepresentations: PolymerRepresentation[] = [];

    const builder = plugin.state.data.build();
    const group = builder.to(structure).apply(StateTransforms.Misc.CreateGroup, { label: "Confident Polymer 70" }, { ref: "Confident Polymer 70" });

    const confidentResiduesExpression = getConfidentResiduesFromPrediction(prediction);

    const selection = group.apply(StateTransforms.Model.StructureSelectionFromExpression, { expression: confidentResiduesExpression });

    const repr_ball_stick_predict = selection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
        type: 'ball-and-stick',
        color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
    }));

    predictedPolymerRepresentations.push({
        type: PolymerViewType.Atoms,
        representation: repr_ball_stick_predict.selector,
        transparentRepresentationRef: null,
        overpaintRef: null
    });

    const repr_surface_predict = selection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
        type: 'gaussian-surface',
        color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
    }));

    predictedPolymerRepresentations.push({
        type: PolymerViewType.Gaussian_Surface,
        representation: repr_surface_predict.selector,
        transparentRepresentationRef: null,
        overpaintRef: null
    });

    const repr_cartoon_predict = selection.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure.data, {
        type: 'cartoon',
        color: 'uniform', colorParams: { value: Color(0xFFFFFF) },
    }));

    predictedPolymerRepresentations.push({
        type: PolymerViewType.Cartoon,
        representation: repr_cartoon_predict.selector,
        transparentRepresentationRef: null,
        overpaintRef: null
    });

    await builder.commit();

    //after creating the representations, hide them
    setSubtreeVisibility(plugin.state.data, repr_ball_stick_predict.ref, true);
    setSubtreeVisibility(plugin.state.data, repr_surface_predict.ref, true);
    setSubtreeVisibility(plugin.state.data, repr_cartoon_predict.ref, true);

    return predictedPolymerRepresentations;
}

/**
 * Method which gets selection of the confident residues (plddt > 70) for predicted structures
 * @param prediction Prediction data
 * @returns Expression with the selection of the confident residues
 */
export function getConfidentResiduesFromPrediction(prediction: PredictionData) {
    const queries: any[] = [];
    //for each chain create a query for the residues
    let totalIndex = 0;

    for (let i = 0; i < prediction.structure.regions.length; i++) {
        const chain = prediction.structure.regions[i].name;
        const positions = prediction.structure.indices.slice(totalIndex, prediction.structure.regions[i].end + 1);
        const newPositions: number[] = [];

        for (let y = 0; y < positions.length; y++) {
            if (prediction.structure.scores.plddt![totalIndex + y] > 70) {
                newPositions.push(Number(positions[y].split("_")[1]));
            }
        }

        const query = MS.struct.generator.atomGroups({
            'chain-test': MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]),
            'residue-test': MS.core.set.has([MS.set(...newPositions), MS.struct.atomProperty.macromolecular.auth_seq_id()]),
            'group-by': MS.struct.atomProperty.macromolecular.residueKey()
        });

        totalIndex = prediction.structure.regions[i].end + 1;
        queries.push(query);
    }

    const finalQuery = MS.struct.modifier.union(queries);

    return finalQuery;
}
