// Constraint contour operations
// Supports operations like >, <, =, [], ][ for filtering contour regions

import type { PathInfo, Point } from '../algorithms/types';

/**
 * Constraint operators for contour filtering
 */
export type ConstraintOperator = '>' | '<' | '=' | '[]' | '][';

/**
 * Constraint definition
 */
export interface Constraint {
    operator: ConstraintOperator;
    value: number;
}

/**
 * Apply constraint to paths, filtering and modifying them
 * @param paths - Original paths
 * @param constraint - Constraint to apply
 * @returns Filtered/modified paths
 */
export function applyConstraint(
    paths: PathInfo[],
    constraint: Constraint
): PathInfo[] {
    const result: PathInfo[] = [];

    for (const path of paths) {
        const modifiedPath = applyConstraintToPath(path, constraint);
        if (modifiedPath) {
            result.push(modifiedPath);
        }
    }

    return result;
}

/**
 * Apply constraint to a single path
 */
function applyConstraintToPath(
    path: PathInfo,
    constraint: Constraint
): PathInfo | null {
    const { operator, value } = constraint;
    const level = path.level;

    switch (operator) {
        case '>':
            // Only keep paths above this value
            if (level > value) return path;
            return null;

        case '<':
            // Only keep paths below this value
            if (level < value) return path;
            return null;

        case '=':
            // Only keep paths at exactly this value
            if (Math.abs(level - value) < 0.001) return path;
            return null;

        case '[]':
            // Keep paths within range [value, value+size]
            // This requires knowing the contour size
            return path; // Keep all, will be filtered by coloring

        case '][':
            // Keep paths outside range
            return path; // Keep all, will be filtered by coloring

        default:
            return path;
    }
}

/**
 * Check if a point satisfies a constraint
 */
export function pointSatisfiesConstraint(
    value: number,
    constraint: Constraint
): boolean {
    const { operator, value: cvalue } = constraint;

    switch (operator) {
        case '>':
            return value > cvalue;
        case '<':
            return value < cvalue;
        case '=':
            return Math.abs(value - cvalue) < 0.001;
        case '[]':
            return value >= cvalue;
        case '][':
            return value < cvalue;
        default:
            return true;
    }
}

/**
 * Create constraint from string representation
 * @param str - Constraint string like "> 5", "< 3", "= 4"
 */
export function parseConstraint(str: string): Constraint | null {
    const trimmed = str.trim();

    if (trimmed.startsWith('>=')) {
        return { operator: '>', value: parseFloat(trimmed.slice(2)) };
    }
    if (trimmed.startsWith('<=')) {
        return { operator: '<', value: parseFloat(trimmed.slice(2)) };
    }
    if (trimmed.startsWith('>')) {
        return { operator: '>', value: parseFloat(trimmed.slice(1)) };
    }
    if (trimmed.startsWith('<')) {
        return { operator: '<', value: parseFloat(trimmed.slice(1)) };
    }
    if (trimmed.startsWith('=')) {
        return { operator: '=', value: parseFloat(trimmed.slice(1)) };
    }

    return null;
}

/**
 * Constraint contour renderer
 * Renders only contours that match the constraint
 */
export class ConstraintRenderer {
    private constraints: Constraint[] = [];

    addConstraint(constraint: Constraint): void {
        this.constraints.push(constraint);
    }

    clearConstraints(): void {
        this.constraints = [];
    }

    /**
     * Filter paths based on all constraints
     */
    filterPaths(paths: PathInfo[]): PathInfo[] {
        let result = paths;

        for (const constraint of this.constraints) {
            result = applyConstraint(result, constraint);
        }

        return result;
    }
}
