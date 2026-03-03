// Contour configuration options

import type { ContourData } from './ContourData';

export interface LabelOptions {
    show?: boolean;
    format?: (value: number) => string;
    fontSize?: number;
    color?: string;
}

export interface ColorBarOptions {
    show?: boolean;
    title?: string;
    thickness?: number;
    len?: number;
}

export interface ContourOptions {
    z: number[][];
    x?: number[];
    y?: number[];

    contours?: {
        start?: number;
        end?: number;
        size?: number;
        coloring?: 'fill' | 'heatmap' | 'lines' | 'none';
        showlines?: boolean;
        showlabels?: boolean;
        labelfont?: LabelOptions;
    };

    colorscale?: string | [number, string][];
    reversescale?: boolean;
    zmin?: number;
    zmax?: number;

    colorbar?: ColorBarOptions;

    smoothing?: number;
    connectgaps?: boolean;

    // Constraints
    zhoverformat?: string;
    hoverongaps?: boolean;
}

export type { ContourData };

import type { PathInfo } from '../algorithms/types';

/**
 * Contour trace with all computed data
 */
export interface ContourTrace extends ContourOptions {
    paths?: PathInfo[];
    zmin?: number;
    zmax?: number;
}
