// Tests for Catmull-Rom smoothing
import { describe, it, expect } from 'vitest';
import { CatmullRom } from '../src/smoothing/CatmullRom';

describe('CatmullRom', () => {
    it('no smoothing returns original points', () => {
        const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
        const result = CatmullRom.smooth(pts, 0);
        expect(result).toEqual(pts);
    });

    it('smoothing produces more points', () => {
        const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
        const result = CatmullRom.smooth(pts, 1);
        expect(result.length).toBeGreaterThan(pts.length);
    });

    it('preserves first and last points for open path', () => {
        const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }];
        const result = CatmullRom.smooth(pts, 0.5);
        expect(result[0]).toEqual(pts[0]);
        expect(result[result.length - 1]).toEqual(pts[pts.length - 1]);
    });

    it('handles closed path', () => {
        const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
        const result = CatmullRom.smooth(pts, 0.5, true);
        expect(result.length).toBeGreaterThan(pts.length);
    });

    it('returns original points for insufficient input', () => {
        const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
        const result = CatmullRom.smooth(pts, 1);
        expect(result.length).toBe(pts.length);
    });

    it('handles empty input', () => {
        const pts: { x: number; y: number }[] = [];
        const result = CatmullRom.smooth(pts, 1);
        expect(result).toEqual([]);
    });
});
