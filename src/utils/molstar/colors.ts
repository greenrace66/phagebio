import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { Color } from "molstar/lib/mol-util/color";
import { Bundle } from "molstar/lib/mol-model/structure/structure/element/bundle";
import { PolymerColorType, PolymerRepresentation, PocketRepresentation, PredictionData, OverPaintParams, ChainData, AlphaFoldThresholdsMolStar, AlphaFoldColorsMolStar } from './types';
import { StateTransforms } from "molstar/lib/mol-plugin-state/transforms";
import { getSelectionFromChainAuthId } from './helpers';

/**
 * Method used to overpaint the currently selected polymer representation.
 * @param value Currently shown type of polymer representation
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param polymerRepresentations Array of polymer representations
 * @param predictedPolymerRepresentations Array of predicted polymer representations
 * @param pocketRepresentations Array of pocket representations
 * @returns void
 */
export async function overPaintPolymer(value: PolymerColorType, plugin: PluginUIContext, prediction: PredictionData, polymerRepresentations: PolymerRepresentation[], predictedPolymerRepresentations: PolymerRepresentation[], pocketRepresentations: PocketRepresentation[]) {
    switch (value) {
        case PolymerColorType.White:
            overPaintStructureWhite(plugin, prediction, polymerRepresentations, predictedPolymerRepresentations);
            overPaintPocketsWhite(plugin, prediction, pocketRepresentations);
            return;
        case PolymerColorType.Conservation:
            overPaintStructureWithConservation(plugin, prediction, polymerRepresentations, predictedPolymerRepresentations);
            overPaintPocketsWithConservation(plugin, prediction, pocketRepresentations);
            return;
        case PolymerColorType.AlphaFold:
            overPaintStructureWithAlphaFold(plugin, prediction, polymerRepresentations, predictedPolymerRepresentations);
            overPaintPocketsWithAlphaFold(plugin, prediction, pocketRepresentations);
            return;
    }
}

/**
 * Overpaints a given element representation with given parameters.
 * @param plugin Mol* plugin
 * @param element Element to be overpainted (either a pocket or a polymer representation)
 * @param params Parameters for the overpaint
 */
export async function overPaintOneRepresentation(plugin: PluginUIContext, element: PocketRepresentation | PolymerRepresentation, params: OverPaintParams[]) {
    const builder = plugin.state.data.build();
    if (element.overpaintRef) {
        builder.to(element.representation.ref).delete(element.overpaintRef);
    }
    await builder.commit();

    const r = await plugin.build().to(element.representation).apply(StateTransforms.Representation.OverpaintStructureRepresentation3DFromBundle, { layers: params }).commit();
    element.overpaintRef = r.ref;
}

/**
 * Overpaints the structure with a white color.
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param polymerRepresentations Array of polymer representations
 * @param predictedPolymerRepresentations Array of predicted polymer representations
 * @returns void
 */
async function overPaintStructureWhite(plugin: PluginUIContext, prediction: PredictionData, polymerRepresentations: PolymerRepresentation[], predictedPolymerRepresentations: PolymerRepresentation[]) {
    const chains: ChainData[] = [];
    const params: OverPaintParams[] = [];

    for (let i = 0; i < prediction.structure.indices.length; i++) {
        let splitIndice = prediction.structure.indices[i].split("_");
        let element = chains.find(x => x.chainId === splitIndice[0]);
        if (element) {
            element.residueNums.push(Number(splitIndice[1]));
        } else {
            chains.push({ chainId: splitIndice[0], residueNums: [Number(splitIndice[1])] });
        }
    }

    for (let i = 0; i < chains.length; i++) {
        const sel = getSelectionFromChainAuthId(plugin, chains[i].chainId, chains[i].residueNums);
        const bundle = Bundle.fromSelection(sel);

        params.push({
            bundle: bundle,
            color: Color(0xFFFFFF),
            clear: false
        });
    }

    polymerRepresentations.forEach(element => overPaintOneRepresentation(plugin, element, params));
    predictedPolymerRepresentations.forEach(element => overPaintOneRepresentation(plugin, element, params));
}

/**
 * Overpaints the pockets' whole residues (not atoms!) with white color
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param pocketRepresentations Array of pocket representations
 * @returns void
 */
async function overPaintPocketsWhite(plugin: PluginUIContext, prediction: PredictionData, pocketRepresentations: PocketRepresentation[]) {
    for (const pocket of prediction.pockets) {
        const chains: ChainData[] = [];
        const params: OverPaintParams[] = [];

        for (const residue of pocket.residues) {
            let splitResidue = residue.split("_");
            let element = chains.find(x => x.chainId === splitResidue[0]);
            if (element) {
                element.residueNums.push(Number(splitResidue[1]));
            } else {
                chains.push({ chainId: splitResidue[0], residueNums: [Number(splitResidue[1])] });
            }
        }

        for (let i = 0; i < chains.length; i++) {
            const sel = getSelectionFromChainAuthId(plugin, chains[i].chainId, chains[i].residueNums);
            const bundle = Bundle.fromSelection(sel);

            params.push({
                bundle: bundle,
                color: Color(0xFFFFFF),
                clear: false
            });
        }

        const pocketReprs = pocketRepresentations.filter(e => e.pocketId === pocket.name);
        for (const element of pocketReprs) {
            if (!element.coloredPocket) {
                overPaintOneRepresentation(plugin, element, params);
            }
        }
    }
}

/**
 * Overpaints the structure with AlphaFold colors
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param polymerRepresentations Array of polymer representations
 * @param predictedPolymerRepresentations Array of predicted polymer representations
 * @returns void
 */
async function overPaintStructureWithAlphaFold(plugin: PluginUIContext, prediction: PredictionData, polymerRepresentations: PolymerRepresentation[], predictedPolymerRepresentations: PolymerRepresentation[]) {
    if (!prediction.structure.scores.plddt) return;

    const params: OverPaintParams[] = [];
    const selections: ChainData[] = [];

    //create the selections for the pockets
    for (let i = 0; i < prediction.structure.indices.length; i++) {
        const residue = prediction.structure.indices[i];
        const splitResidue = residue.split("_");
        const chain = splitResidue[0];
        const id = Number(splitResidue[1]);

        const score = prediction.structure.scores.plddt[i];

        for (let y = 0; y < AlphaFoldThresholdsMolStar.length; y++) {
            if (score > AlphaFoldThresholdsMolStar[y]) {
                const element = selections.find(e => e.threshold === AlphaFoldThresholdsMolStar[y] && e.chainId == chain);
                if (element) {
                    element.residueNums.push(id);
                }
                else {
                    selections.push({ chainId: chain, residueNums: [id], threshold: AlphaFoldThresholdsMolStar[y] });
                }
                break;
            }
        }
    }

    //color the residues
    for (let i = 0; i < selections.length; i++) {
        const sel = getSelectionFromChainAuthId(plugin, selections[i].chainId, selections[i].residueNums);
        const bundle = Bundle.fromSelection(sel);

        params.push({
            bundle: bundle,
            color: AlphaFoldColorsMolStar[AlphaFoldThresholdsMolStar.findIndex(e => e === selections[i].threshold)],
            clear: false
        });
    }

    polymerRepresentations.forEach(element => overPaintOneRepresentation(plugin, element, params));
    predictedPolymerRepresentations.forEach(element => overPaintOneRepresentation(plugin, element, params));
}

/**
 * Overpaints the pockets' whole residues (not atoms!) with AlphaFold colors
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param pocketRepresentations Array of pocket representations
 * @returns void
 */
async function overPaintPocketsWithAlphaFold(plugin: PluginUIContext, prediction: PredictionData, pocketRepresentations: PocketRepresentation[]) {
    if (!prediction.structure.scores.plddt) return;

    const thresholds = [90, 70, 50, 0];
    const colors: Color[] = [ //those are the colors from ALPHAFOLD db
        Color.fromRgb(0, 83, 214),
        Color.fromRgb(101, 203, 243),
        Color.fromRgb(255, 219, 19),
        Color.fromRgb(255, 125, 69),
    ];

    for (const pocket of prediction.pockets) {
        const params: OverPaintParams[] = [];
        const selections: ChainData[] = [];

        for (const residue of pocket.residues) {
            const splitResidue = residue.split("_");
            const chain = splitResidue[0];
            const id = Number(splitResidue[1]);

            const index = prediction.structure.indices.findIndex(e => e === residue);
            const score = prediction.structure.scores.plddt[index];

            for (let y = 0; y < thresholds.length; y++) {
                if (score > thresholds[y]) {
                    const element = selections.find(e => e.threshold === thresholds[y] && e.chainId == chain);
                    if (element) {
                        element.residueNums.push(id);
                    }
                    else {
                        selections.push({ chainId: chain, residueNums: [id], threshold: thresholds[y] });
                    }
                    break;
                }
            }
        }

        //color the residues
        for (let i = 0; i < selections.length; i++) {
            const sel = getSelectionFromChainAuthId(plugin, selections[i].chainId, selections[i].residueNums);
            const bundle = Bundle.fromSelection(sel);

            params.push({
                bundle: bundle,
                color: colors[thresholds.findIndex(e => e === selections[i].threshold)],
                clear: false
            });
        }

        const pocketReprs = pocketRepresentations.filter(e => e.pocketId === pocket.name);
        for (const element of pocketReprs) {
            if (!element.coloredPocket) {
                overPaintOneRepresentation(plugin, element, params);
            }
        }
    }
}

/**
 * Computes the normalized conservation scores and saves them in the conservationNormalized variable.
 * @param prediction Prediction data
 * @returns Array of normalized conservation scores
 */
export function computeNormalizedConservation(prediction: PredictionData) {
    if (!prediction.structure.scores.conservation) return;
    //by the definition of conservation scoring the maximum is log_2(20)
    const maxConservation = getLogBaseX(2, 20);
    const conservationNormalized = [];
    for (let i = 0; i < prediction.structure.scores.conservation.length; i++) {
        conservationNormalized.push(prediction.structure.scores.conservation[i] / maxConservation);
    }

    return conservationNormalized;
}

/** Method returning log_x(y) */
function getLogBaseX(x: number, y: number) {
    return Math.log(y) / Math.log(x);
}

/**
 * Overpaints the structure with grayscale colors based on the conservation scores for each residue
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param polymerRepresentations Array of polymer representations
 * @param predictedPolymerRepresentations Array of predicted polymer representations
 * @returns void
 */
async function overPaintStructureWithConservation(plugin: PluginUIContext, prediction: PredictionData, polymerRepresentations: PolymerRepresentation[], predictedPolymerRepresentations: PolymerRepresentation[]) {
    if (!prediction.structure.scores.conservation) return;

    const params: OverPaintParams[] = [];
    const thresholds = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];
    const colors: Color[] = [];

    //create shades of gray
    //the first one is 120, 120, 120
    //the last one is 255, 255, 255
    for (let i = 0; i < thresholds.length; i++) {
        let colorShade = i * 15 + 120;
        colors.push(Color.fromRgb(colorShade, colorShade, colorShade));
    }

    const selections: ChainData[] = [];

    for (let i = 0; i < prediction.structure.indices.length; i++) {
        let residue = prediction.structure.indices[i];
        const splitResidue = residue.split("_");
        const chain = splitResidue[0];
        const id = Number(splitResidue[1]);

        let score = prediction.structure.scores.conservation[i];

        for (let y = 0; y < thresholds.length; y++) {
            if (score > thresholds[y]) {
                let element = selections.find(e => e.threshold === thresholds[y] && e.chainId == chain);
                if (element) {
                    element.residueNums.push(id);
                }
                else {
                    selections.push({ chainId: chain, residueNums: [id], threshold: thresholds[y] });
                }
                break;
            }
        }
    }

    //color the residues
    for (let i = 0; i < selections.length; i++) {
        const sel = getSelectionFromChainAuthId(plugin, selections[i].chainId, selections[i].residueNums);
        const bundle = Bundle.fromSelection(sel);

        params.push({
            bundle: bundle,
            color: colors[thresholds.findIndex(e => e === selections[i].threshold)],
            clear: false
        });
    }

    polymerRepresentations.forEach(element => overPaintOneRepresentation(plugin, element, params));
    predictedPolymerRepresentations.forEach(element => overPaintOneRepresentation(plugin, element, params));
}

/**
 * Overpaints the pockets' whole residues (not atoms!) with grayscale colors based on the conservation scores for each residue
 * @param plugin Mol* plugin
 * @param prediction Prediction data
 * @param pocketRepresentations Array of pocket representations
 * @returns void
 */
async function overPaintPocketsWithConservation(plugin: PluginUIContext, prediction: PredictionData, pocketRepresentations: PocketRepresentation[]) {
    if (!prediction.structure.scores.conservation) return;

    const thresholds = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];
    const colors: Color[] = [];
    //create shades of gray
    //the first one is 120, 120, 120
    //the last one is 255, 255, 255
    for (let i = 0; i < thresholds.length; i++) {
        let colorShade = i * 15 + 120;
        colors.push(Color.fromRgb(colorShade, colorShade, colorShade));
    }

    for (const pocket of prediction.pockets) {
        const params: OverPaintParams[] = [];
        const selections: ChainData[] = [];

        for (const residue of pocket.residues) {
            const splitResidue = residue.split("_");
            const chain = splitResidue[0];
            const id = Number(splitResidue[1]);

            let index = prediction.structure.indices.findIndex(e => e === residue);
            let score = prediction.structure.scores.conservation[index];

            for (let y = 0; y < thresholds.length; y++) {
                if (score > thresholds[y]) {
                    let element = selections.find(e => e.threshold === thresholds[y] && e.chainId == chain);
                    if (element) {
                        element.residueNums.push(id);
                    }
                    else {
                        selections.push({ chainId: chain, residueNums: [id], threshold: thresholds[y] });
                    }
                    break;
                }
            }
        }

        //color the residues
        for (let i = 0; i < selections.length; i++) {
            const sel = getSelectionFromChainAuthId(plugin, selections[i].chainId, selections[i].residueNums);
            const bundle = Bundle.fromSelection(sel);

            params.push({
                bundle: bundle,
                color: colors[thresholds.findIndex(e => e === selections[i].threshold)],
                clear: false
            });
        }

        const pocketReprs = pocketRepresentations.filter(e => e.pocketId === pocket.name);
        for (const element of pocketReprs) {
            if (!element.coloredPocket) {
                overPaintOneRepresentation(plugin, element, params);
            }
        }
    }
}
