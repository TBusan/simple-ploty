// Marching Squares algorithm implementation

import { NEWDELTA, SADDLE_CODES } from './constants';
import type { Point, PathInfo } from './types';

/**
 * Calculate the Marching Squares index for a 2x2 cell
 *
 * The index is computed based on which corner values are below the contour level.
 * Corner layout:
 *   [0][0] = top-left     [0][1] = top-right
 *   [1][0] = bottom-left  [1][1] = bottom-right
 *
 * Bit positions:
 *   bit 0 (1) = top-left
 *   bit 1 (2) = top-right
 *   bit 2 (4) = bottom-right
 *   bit 3 (8) = bottom-left
 *
 * @param level - The contour level value
 * @param corners - 2x2 array of corner values [[tl, tr], [bl, br]]
 * @returns Index 0-15, or special saddle codes (104, 208, 713, 1114)
 */
export function getMarchingIndex(level: number, corners: number[][]): number {
    // Calculate base index: bit is set if corner is below or equal to level
    const mi = (corners[0][0] > level ? 0 : 1) +   // top-left (bit 0)
               (corners[0][1] > level ? 0 : 2) +   // top-right (bit 1)
               (corners[1][1] > level ? 0 : 4) +   // bottom-right (bit 2)
               (corners[1][0] > level ? 0 : 8);    // bottom-left (bit 3)

    // Handle saddle points (cases 5 and 10)
    if (mi === 5 || mi === 10) {
        const avg = (corners[0][0] + corners[0][1] +
                     corners[1][0] + corners[1][1]) / 4;

        if (mi === 5) {
            // Saddle case 5: diagonals are tl-br below, tr-bl above (or vice versa)
            return level > avg ? SADDLE_CODES.CASE_5_HIGH : SADDLE_CODES.CASE_5_LOW;
        } else {
            // Saddle case 10: opposite diagonal pattern
            return level > avg ? SADDLE_CODES.CASE_10_HIGH : SADDLE_CODES.CASE_10_LOW;
        }
    }

    // Case 15 (all below level) is treated as case 0 (no crossing)
    return (mi === 15) ? 0 : mi;
}

/**
 * Check if an index is a saddle point code
 */
export function isSaddleCode(index: number): boolean {
    return index === SADDLE_CODES.CASE_5_LOW ||
           index === SADDLE_CODES.CASE_5_HIGH ||
           index === SADDLE_CODES.CASE_10_LOW ||
           index === SADDLE_CODES.CASE_10_HIGH;
}

/**
 * Decode a saddle code into two component indices
 * @returns Array of two indices that form the saddle configuration
 */
export function decodeSaddleCode(code: number): [number, number] {
    switch (code) {
        case SADDLE_CODES.CASE_5_LOW:
            return [1, 4];
        case SADDLE_CODES.CASE_5_HIGH:
            return [7, 13];
        case SADDLE_CODES.CASE_10_LOW:
            return [2, 8];
        case SADDLE_CODES.CASE_10_HIGH:
            return [11, 14];
        default:
            throw new Error(`Invalid saddle code: ${code}`);
    }
}

/**
 * Get the path delta for a given marching index
 * For saddle points, returns null (requires special handling)
 */
export function getPathDelta(index: number): [number, number] | null {
    if (index >= 0 && index < NEWDELTA.length) {
        return NEWDELTA[index];
    }
    return null;
}

/**
 * Interpolate the crossing point on an edge
 * @param v1 - First corner value
 * @param v2 - Second corner value
 * @param level - Contour level
 * @returns Interpolation factor (0-1) along the edge
 */
export function getInterpFactor(v1: number, v2: number, level: number): number {
    if (v1 === v2) return 0.5;
    return (level - v1) / (v2 - v1);
}

/**
 * Calculate the crossing point on a cell edge
 * @param xi - Cell x index
 * @param yi - Cell y index
 * @param edge - Which edge ('top', 'right', 'bottom', 'left')
 * @param corners - 2x2 corner values
 * @param level - Contour level
 * @returns The crossing point in grid coordinates
 */
export function getCrossingPoint(
    xi: number,
    yi: number,
    edge: 'top' | 'right' | 'bottom' | 'left',
    corners: number[][],
    level: number
): Point {
    let x: number;
    let y: number;

    switch (edge) {
        case 'top':
            x = xi + getInterpFactor(corners[0][0], corners[0][1], level);
            y = yi;
            break;
        case 'right':
            x = xi + 1;
            y = yi + getInterpFactor(corners[0][1], corners[1][1], level);
            break;
        case 'bottom':
            x = xi + getInterpFactor(corners[1][0], corners[1][1], level);
            y = yi + 1;
            break;
        case 'left':
            x = xi;
            y = yi + getInterpFactor(corners[0][0], corners[1][0], level);
            break;
    }

    return { x, y };
}

/**
 * MarchingSquares class for contour generation
 */
export class MarchingSquares {
    private data: number[][];
    private levels: number[];

    constructor(data: number[][], levels: number[]) {
        this.data = data;
        this.levels = levels;
    }

    /**
     * Generate all contour paths for the data
     */
    generatePaths(): Map<number, PathInfo[]> {
        const result = new Map<number, PathInfo[]>();

        for (const level of this.levels) {
            const paths = this.generatePathsForLevel(level);
            result.set(level, paths);
        }

        return result;
    }

    /**
     * Generate contour paths for a single level
     */
    private generatePathsForLevel(level: number): PathInfo[] {
        // TODO: Implement full path tracing (Phase 3)
        // This requires PathFinder implementation
        return [];
    }

    /**
     * Get the 2x2 corner values for a cell
     */
    getCellCorners(xi: number, yi: number): number[][] {
        return [
            [this.data[yi][xi], this.data[yi][xi + 1]],
            [this.data[yi + 1][xi], this.data[yi + 1][xi + 1]]
        ];
    }

    /**
     * Get marching index for a cell at given level
     */
    getCellIndex(xi: number, yi: number, level: number): number {
        const corners = this.getCellCorners(xi, yi);
        return getMarchingIndex(level, corners);
    }
}
