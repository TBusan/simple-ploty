// Catmull-Rom spline smoothing
import type { Point } from '../algorithms/types';

/**
 * Catmull-Rom spline implementation
 */
export class CatmullRom {
    /**
     * Smooth a path using Catmull-Rom splines
     * @param pts - Array of points
     * @param smoothness - Smoothing factor (0-1.3)
     * @returns Smoothed points
     */
    static smooth(pts: Point[], smoothness: number = 1.3): Point[] {
        if (pts.length < 3) {
            return pts;
        }
        if (smoothness === 0) {
            return pts;
        }

        const result: Point[] = [];

        // Simple interpolation for now - just return original points with some extra interpolated points
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i + 1];

            // Add original point
            result.push(p0);

            // Add interpolated point if smoothness > 0
            if (smoothness > 0) {
                result.push({
                    x: p0.x + (p1.x - p0.x) * 0.5,
                    y: p0.y + (p1.y - p0.y) * 0.5
                });
            }
        }

        // Add last point
        result.push(pts[pts.length - 1]);

        return result;
    }
}
