// Path tracing algorithm for contour generation

import {
    getMarchingIndex,
    getCrossingPoint,
    isSaddleCode,
    decodeSaddleCode
} from './MarchingSquares';
import {
    BOTTOMSTART,
    TOPSTART,
    LEFTSTART,
    RIGHTSTART
} from './constants';
import type { Point, PathInfo } from './types';

/**
 * Edge crossing information for a cell
 */
interface CellCrossing {
    edges: Set<string>;
    points: Map<string, Point>;
}

/**
 * Create a cell crossing from marching index
 */
function createCellCrossing(
    xi: number,
    yi: number,
    mi: number,
    corners: number[][],
    level: number
): CellCrossing {
    const crossing: CellCrossing = {
        edges: new Set(),
        points: new Map()
    };

    // Handle saddle points
    if (isSaddleCode(mi)) {
        const [idx1, idx2] = decodeSaddleCode(mi);
        addCrossingEdges(xi, yi, idx1, corners, level, crossing);
        addCrossingEdges(xi, yi, idx2, corners, level, crossing);
        return crossing;
    }

    addCrossingEdges(xi, yi, mi, corners, level, crossing);
    return crossing;
}

/**
 * Add crossing edges based on marching index
 */
function addCrossingEdges(
    xi: number,
    yi: number,
    mi: number,
    corners: number[][],
    level: number,
    crossing: CellCrossing
): void {
    const addPoint = (edge: string) => {
        crossing.edges.add(edge);
        if (!crossing.points.has(edge)) {
            crossing.points.set(edge, getCrossingPoint(xi, yi, edge as any, corners, level));
        }
    };

    switch (mi) {
        case 1: // top-left
            addPoint('top');
            addPoint('left');
            break;
        case 2: // top-right
            addPoint('top');
            addPoint('right');
            break;
        case 3: // left-right
            addPoint('left');
            addPoint('right');
            break;
        case 4: // right-bottom
            addPoint('right');
            addPoint('bottom');
            break;
        case 6: // top-bottom
            addPoint('top');
            addPoint('bottom');
            break;
        case 7: // left-bottom (3 inside, bl outside)
            addPoint('left');
            addPoint('bottom');
            break;
        case 8: // left-bottom
            addPoint('left');
            addPoint('bottom');
            break;
        case 9: // top-bottom
            addPoint('top');
            addPoint('bottom');
            break;
        case 11: // right-bottom (3 inside, br outside)
            addPoint('right');
            addPoint('bottom');
            break;
        case 12: // left-right
            addPoint('left');
            addPoint('right');
            break;
        case 13: // top-right (3 inside, tr outside)
            addPoint('top');
            addPoint('right');
            break;
        case 14: // top-left (3 inside, tl outside)
            addPoint('top');
            addPoint('left');
            break;
    }
}

/**
 * Get opposite edge
 */
function oppositeEdge(edge: string): string {
    switch (edge) {
        case 'top': return 'bottom';
        case 'bottom': return 'top';
        case 'left': return 'right';
        case 'right': return 'left';
        default: return edge;
    }
}

/**
 * Get neighbor cell coordinates
 */
function getNeighbor(xi: number, yi: number, exitEdge: string): { xi: number; yi: number } | null {
    switch (exitEdge) {
        case 'top': return { xi, yi: yi - 1 };
        case 'bottom': return { xi, yi: yi + 1 };
        case 'left': return { xi: xi - 1, yi };
        case 'right': return { xi: xi + 1, yi };
        default: return null;
    }
}

/**
 * Find all contour paths for a given level
 */
export function findAllPaths(data: number[][], level: number): PathInfo[] {
    const ny = data.length - 1;
    const nx = data[0].length - 1;

    if (ny <= 0 || nx <= 0) return [];

    // Build crossing grid
    const crossings: (CellCrossing | null)[][] = [];
    let crossingCount = 0;
    for (let yi = 0; yi < ny; yi++) {
        crossings[yi] = [];
        for (let xi = 0; xi < nx; xi++) {
            const corners = [
                [data[yi][xi], data[yi][xi + 1]],
                [data[yi + 1][xi], data[yi + 1][xi + 1]]
            ];
            const mi = getMarchingIndex(level, corners);
            if (mi === 0) {
                crossings[yi][xi] = null;
            } else {
                crossings[yi][xi] = createCellCrossing(xi, yi, mi, corners, level);
                crossingCount++;
            }
        }
    }

    console.log(`[findAllPaths] level=${level}, ny=${ny}, nx=${nx}, crossingCount=${crossingCount}`);

    const paths: PathInfo[] = [];
    const usedEdges = new Set<string>();

    // Helper to mark edge as used
    const markUsed = (xi: number, yi: number, edge: string) => {
        usedEdges.add(`${xi},${yi},${edge}`);
    };

    // Helper to check if edge is used
    const isUsed = (xi: number, yi: number, edge: string): boolean => {
        return usedEdges.has(`${xi},${yi},${edge}`);
    };

    // Trace a path starting from a cell and edge
    const tracePath = (startXi: number, startYi: number, startEdge: string): PathInfo | null => {
        const points: Point[] = [];
        let xi = startXi;
        let yi = startYi;
        let edge = startEdge;

        let iterations = 0;
        const maxIterations = nx * ny * 4;

        while (iterations < maxIterations) {
            iterations++;

            const crossing = crossings[yi]?.[xi];
            if (!crossing) {
                console.log(`[tracePath] BREAK: no crossing at (${xi},${yi})`);
                break;
            }

            // Get point at current edge
            const point = crossing.points.get(edge);
            if (!point) {
                console.log(`[tracePath] BREAK: no point for edge=${edge} at (${xi},${yi}), available edges:`, Array.from(crossing.edges));
                break;
            }

            points.push(point);

            // Check if we've returned to start (closed path)
            // We check this after getting the point but before marking as used
            if (points.length > 3 && xi === startXi && yi === startYi && edge === startEdge) {
                // Remove the duplicate starting point
                return { level, points: points.slice(0, -1), isClosed: true };
            }

            markUsed(xi, yi, edge);

            // Find the other edge in this cell
            const otherEdges = Array.from(crossing.edges).filter(e => e !== edge);

            // For saddle points, we might have more than one other edge
            // Choose the one that maintains path continuity
            let nextEdge: string | null = null;
            for (const e of otherEdges) {
                if (!isUsed(xi, yi, e)) {
                    nextEdge = e;
                    break;
                }
            }

            if (!nextEdge) {
                // No more unvisited edges - check if we're back at start (closed path)
                if (xi === startXi && yi === startYi) {
                    return points.length > 1 ? { level, points, isClosed: true } : null;
                }
                // Otherwise it's an open path that couldn't continue
                return points.length > 1 ? { level, points, isClosed: false } : null;
            }

            // Move to neighbor cell
            const neighbor = getNeighbor(xi, yi, nextEdge);
            const entryEdge = oppositeEdge(nextEdge);

            if (!neighbor || neighbor.xi < 0 || neighbor.xi >= nx ||
                neighbor.yi < 0 || neighbor.yi >= ny) {
                // Path reaches grid boundary
                points.push(crossing.points.get(nextEdge)!);
                markUsed(xi, yi, nextEdge);
                return { level, points, isClosed: false };
            }

            // Check if neighbor cell has the corresponding crossing edge
            const neighborCrossing = crossings[neighbor.yi]?.[neighbor.xi];
            if (!neighborCrossing || !neighborCrossing.edges.has(entryEdge)) {
                // Neighbor doesn't have the corresponding edge - treat as open path end
                points.push(crossing.points.get(nextEdge)!);
                markUsed(xi, yi, nextEdge);
                return { level, points, isClosed: false };
            }

            // Move to next cell
            xi = neighbor.xi;
            yi = neighbor.yi;
            edge = entryEdge;
        }

        return points.length > 1 ? { level, points, isClosed: false } : null;
    };

    // First pass: find closed paths (start from any cell with crossings)
    let traceAttempts = 0;
    let pathsFound = 0;
    for (let yi = 0; yi < ny; yi++) {
        for (let xi = 0; xi < nx; xi++) {
            const crossing = crossings[yi][xi];
            if (!crossing) continue;

            for (const edge of crossing.edges) {
                if (isUsed(xi, yi, edge)) continue;

                traceAttempts++;
                const path = tracePath(xi, yi, edge);
                if (path) {
                    console.log(`[tracePath] Found path at (${xi},${yi}) edge=${edge}: isClosed=${path.isClosed}, points=${path.points.length}`);
                    pathsFound++;
                }
                if (path && path.isClosed) {
                    paths.push(path);
                }
            }
        }
    }
    console.log(`[First pass] traceAttempts=${traceAttempts}, pathsFound=${pathsFound}, closedPaths=${paths.length}`);

    // Reset used edges for open paths
    usedEdges.clear();

    // Mark closed paths' edges as used
    for (const path of paths) {
        // This is a simplified approach - in reality we'd need to track which edges belong to closed paths
    }

    // Second pass: find open paths starting from boundaries
    // Top edge (yi = 0): cells at yi=0 have their 'top' edge on the boundary
    for (let xi = 0; xi < nx; xi++) {
        const crossing = crossings[0]?.[xi];
        if (!crossing || !crossing.edges.has('top')) continue;

        if (!isUsed(xi, 0, 'top')) {
            const path = tracePath(xi, 0, 'top');
            if (path && !path.isClosed) {
                paths.push(path);
            }
        }
    }

    // Bottom edge (yi = ny-1): cells at yi=ny-1 have their 'bottom' edge on the boundary
    for (let xi = 0; xi < nx; xi++) {
        const crossing = crossings[ny - 1]?.[xi];
        if (!crossing || !crossing.edges.has('bottom')) continue;

        if (!isUsed(xi, ny - 1, 'bottom')) {
            const path = tracePath(xi, ny - 1, 'bottom');
            if (path && !path.isClosed) {
                paths.push(path);
            }
        }
    }

    // Left edge (xi = 0)
    for (let yi = 0; yi < ny; yi++) {
        const crossing = crossings[yi]?.[0];
        if (!crossing || !crossing.edges.has('left')) continue;

        if (!isUsed(0, yi, 'left')) {
            const path = tracePath(0, yi, 'left');
            if (path && !path.isClosed) {
                paths.push(path);
            }
        }
    }

    // Right edge (xi = nx-1)
    for (let yi = 0; yi < ny; yi++) {
        const crossing = crossings[yi]?.[nx - 1];
        if (!crossing || !crossing.edges.has('right')) continue;

        if (!isUsed(nx - 1, yi, 'right')) {
            const path = tracePath(nx - 1, yi, 'right');
            if (path && !path.isClosed) {
                paths.push(path);
            }
        }
    }

    return paths;
}

/**
 * Compute all edge crossings for a grid at a given level
 */
export function makeCrossings(data: number[][], level: number): CellCrossing[][] {
    const ny = data.length - 1;
    const nx = data[0].length - 1;
    const crossings: CellCrossing[][] = [];

    for (let yi = 0; yi < ny; yi++) {
        crossings[yi] = [];
        for (let xi = 0; xi < nx; xi++) {
            const corners = [
                [data[yi][xi], data[yi][xi + 1]],
                [data[yi + 1][xi], data[yi + 1][xi + 1]]
            ];
            const mi = getMarchingIndex(level, corners);
            crossings[yi][xi] = createCellCrossing(xi, yi, mi, corners, level);
        }
    }

    return crossings;
}

/**
 * PathFinder class for contour path generation
 */
export class PathFinder {
    private data: number[][];

    constructor(data: number[][]) {
        this.data = data;
    }

    /**
     * Find all paths for a given level
     */
    findPaths(level: number): PathInfo[] {
        return findAllPaths(this.data, level);
    }

    /**
     * Find paths for multiple levels
     */
    findAllLevels(levels: number[]): Map<number, PathInfo[]> {
        const result = new Map<number, PathInfo[]>();
        for (const level of levels) {
            result.set(level, this.findPaths(level));
        }
        return result;
    }
}
