import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { PolymerViewType, PolymerRepresentation } from './types';
import { setSubtreeVisibility } from 'molstar/lib/mol-plugin/behavior/static/state';

/**
 * Method used to show only the currently selected representation.
 * @param value Currently shown type of polymer representation
 * @param plugin Mol* plugin
 * @param polymerRepresentations Array of polymer representations
 * @param predictedPolymerRepresentations Array of predicted polymer representations
 * @param showConfidentResidues Whether to show only the confident residues 
 * @returns void
 */
export function updatePolymerView(value: PolymerViewType, plugin: PluginUIContext, polymerRepresentations: PolymerRepresentation[], predictedPolymerRepresentations: PolymerRepresentation[], showConfidentResidues: boolean) {
    // firstly check if the structure is a predicted one
    // and if we're supposed to show only confident residues
    if (predictedPolymerRepresentations.length > 0 && showConfidentResidues) {
        // if so, show the predicted polymer representation
        // it might seem weird, but setSubtreeVisibility "false" means "show"
        predictedPolymerRepresentations.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, element.type !== value));

        // hide all other ones
        polymerRepresentations.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, true));
        return;
    }

    // if predicted and not showing confident residues, show none
    predictedPolymerRepresentations.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, true));

    // lastly, show only the selected representation
    polymerRepresentations.forEach(element => setSubtreeVisibility(plugin.state.data, element.representation.ref, element.type !== value));
}
