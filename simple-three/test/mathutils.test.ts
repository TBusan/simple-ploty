// Tests for MathUtils
import { describe, it, expect } from 'vitest';
import {
    clamp,
    distance2D,
    normalizeAngle
} from '../src/utils/MathUtils';

describe('MathUtils', () => {
    describe('clamp', () => {
        it('returns value when within range', () => {
            expect(clamp(5, 0, 10)).toBe(5);
        });

        it('returns min when value is below', () => {
            expect(clamp(-5, 0, 10)).toBe(0);
        });

        it('returns max when value is above', () => {
            expect(clamp(15, 0, 10)).toBe(10);
        });

        it('handles negative range', () => {
            expect(clamp(-5, -10, -1)).toBe(-5);
        });

        it('handles equal min and max', () => {
            expect(clamp(5, 3, 3)).toBe(3);
        });
    });

    describe('distance2D', () => {
        it('calculates distance between two points', () => {
            const dist = distance2D(0, 0, 3, 4);
            expect(dist).toBe(5); // 3-4-5 triangle
        });

        it('returns 0 for same point', () => {
            expect(distance2D(5, 5, 5, 5)).toBe(0);
        });

        it('handles negative coordinates', () => {
            const dist = distance2D(-1, -1, 2, 3);
            expect(dist).toBe(5);
        });

        it('handles horizontal line', () => {
            expect(distance2D(0, 0, 5, 0)).toBe(5);
        });

        it('handles vertical line', () => {
            expect(distance2D(0, 0, 0, 5)).toBe(5);
        });
    });

    describe('normalizeAngle', () => {
        it('returns same angle for values in range', () => {
            expect(normalizeAngle(0)).toBe(0);
            expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
        });

        it('wraps angles above 2*PI', () => {
            const result = normalizeAngle(3 * Math.PI);
            expect(result).toBeCloseTo(Math.PI);
        });

        it('wraps negative angles', () => {
            const result = normalizeAngle(-Math.PI);
            expect(result).toBeCloseTo(Math.PI);
        });

        it('handles zero', () => {
            expect(normalizeAngle(0)).toBe(0);
        });

        it('handles 2*PI', () => {
            const result = normalizeAngle(2 * Math.PI);
            expect(result).toBeCloseTo(0);
        });
    });
});
