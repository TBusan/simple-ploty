// Mathematical utility functions

/**
 * Check if a value is finite
 * @param value - The value to check
 * @returns true if value is finite
 */
export function isFinite(value: number): boolean {
    return Number.isFinite(value);
}

/**
 * Clamp a value between min and max
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param v0 - Start value
 * @param v1 - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(v0: number, v1: number, t: number): number {
    return v0 + (v1 - v0) * t;
}

/**
 * Calculate distance between two points
 * @param x1 - First point x
 * @param y1 - First point y
 * @param x2 - Second point x
 * @param y2 - Second point y
 * @returns Distance
 */
export function distance2D(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the squared distance between two points
 * @param x1 - First point x
 * @param y1 - First point y
 * @param x2 - Second point x
 * @param y2 - Second point y
 * @returns Squared distance
 */
export function distance2DSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/**
 * Normalize an angle to the range [0, 2*PI)
 * @param angle - Angle in radians
 * @returns Normalized angle
 */
export function normalizeAngle(angle: number): number {
    const TWO_PI = 2 * Math.PI;
    angle = angle % TWO_PI;
    if (angle < 0) angle += TWO_PI;
    return angle;
}

/**
 * Calculate the determinant of a 2x2 matrix
 * @param a - Top-left
 * @param b - Top-right
 * @param c - Bottom-left
 * @param d - Bottom-right
 * @returns Determinant
 */
export function determinant2x2(a: number, b: number, c: number, d: number): number {
    return a * d - b * c;
}
