import { StateObjectSelector } from 'molstar/lib/mol-state';
import { Color } from "molstar/lib/mol-util/color";

// Polymer representation types
export enum PolymerViewType {
  Gaussian_Surface = 'gaussian-surface',
  Atoms = 'ball-and-stick',
  Cartoon = 'cartoon'
}

// Polymer color types
export enum PolymerColorType {
  White = 'white',
  Conservation = 'conservation',
  AlphaFold = 'alphafold',
  Chain = 'chain',
  Element = 'element',
  Residue = 'residue'
}

// Pocket view types
export enum PocketsViewType {
  Surface_Atoms_Color = 'surface-atoms-color',
  Surface_Residues_Color = 'surface-residues-color',
  Ball_Stick_Atoms_Color = 'ball-stick-atoms-color',
  Ball_Stick_Residues_Color = 'ball-stick-residues-color'
}

// Structure for polymer representations
export interface PolymerRepresentation {
  type: PolymerViewType;
  representation: StateObjectSelector;
  transparentRepresentationRef: string | null;
  overpaintRef: string | null;
}

// Structure for pocket representations
export interface PocketRepresentation {
  pocketId: string;
  type: PocketsViewType;
  representation: StateObjectSelector;
  coloredPocket: boolean;
  overpaintRef: string | null;
}

// Structure for chain data
export interface ChainData {
  chainId: string;
  residueNums: number[];
  threshold?: number;
}

// Structure for pocket data
export interface PocketData {
  name: string;
  residues: string[];
  surface: string[];
  color: string;
}

// Structure for prediction data
export interface PredictionData {
  structure: {
    indices: string[];
    scores: {
      plddt?: number[];
      conservation?: number[];
    };
    regions: {
      name: string;
      end: number;
    }[];
  };
  pockets: PocketData[];
}

// Structure for overpaint parameters
export interface OverPaintParams {
  bundle: any;
  color: Color;
  clear: boolean;
}

// Structure for 3D point
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// AlphaFold thresholds and colors
export const AlphaFoldThresholdsMolStar = [90, 70, 50, 0];
export const AlphaFoldColorsMolStar = [
  Color.fromRgb(0, 83, 214),    // Very high (90-100)
  Color.fromRgb(101, 203, 243), // High (70-90)
  Color.fromRgb(255, 219, 19),  // Medium (50-70)
  Color.fromRgb(255, 125, 69),  // Low (0-50)
];

// Structure for residue information
export interface MolstarResidue {
  authName: string;
  name: string;
  isHet: boolean;
  insCode: string;
  index: number;
  seqNumber: number;
  authSeqNumber: number;
  chain: {
    asymId: string;
    authAsymId: string;
    entity: {
      entityId: string;
      index: number;
    };
    index: number;
  };
}
