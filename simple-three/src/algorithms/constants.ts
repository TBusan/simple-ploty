// Marching Squares algorithm constants

// Edge crossing start indicators for each boundary
// Used to identify if a cell on the boundary starts an open path

/**
 * Cells that can start a path from the bottom edge (yi = 0)
 */
export const BOTTOMSTART = [1, 9, 13, 104, 713];

/**
 * Cells that can start a path from the top edge (yi = m-2)
 */
export const TOPSTART = [4, 6, 7, 104, 713];

/**
 * Cells that can start a path from the left edge (xi = 0)
 */
export const LEFTSTART = [8, 12, 14, 208, 1114];

/**
 * Cells that can start a path from the right edge (xi = n-2)
 */
export const RIGHTSTART = [2, 3, 11, 208, 1114];

/**
 * Direction deltas for path traversal
 * Index corresponds to marching index (0-14)
 * [dx, dy] where negative dx = left, negative dy = up
 */
export const NEWDELTA: ([number, number] | null)[] = [
    null,       // 0: no crossing
    [-1, 0],    // 1: left
    [0, -1],    // 2: up
    [-1, 0],    // 3: left
    [1, 0],     // 4: right
    null,       // 5: saddle (special handling)
    [0, -1],    // 6: up
    [-1, 0],    // 7: left
    [0, 1],     // 8: down
    [0, 1],     // 9: down
    null,       // 10: saddle (special handling)
    [0, 1],     // 11: down
    [1, 0],     // 12: right
    [1, 0],     // 13: right
    [0, -1]     // 14: up
];

/**
 * Edge crossing types
 * 0 = no crossing
 * 1 = top edge crossing
 * 2 = right edge crossing
 * 4 = bottom edge crossing
 * 8 = left edge crossing
 */
export const CROSSING_FLAGS = {
    NONE: 0,
    TOP: 1,
    RIGHT: 2,
    BOTTOM: 4,
    LEFT: 8
};

/**
 * Saddle point encoded values
 * Format: two indices concatenated (e.g., 104 = case 1 + case 04)
 */
export const SADDLE_CODES = {
    CASE_5_LOW: 104,    // case 1 + case 4
    CASE_5_HIGH: 713,   // case 7 + case 13
    CASE_10_LOW: 208,   // case 2 + case 8
    CASE_10_HIGH: 1114  // case 11 + case 14
};
