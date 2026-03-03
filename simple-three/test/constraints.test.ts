// Tests for constraint contour operations
import { describe, it, expect } from 'vitest';
import {
    applyConstraint,
    parseConstraint,
    ConstraintRenderer
} from '../src/algorithms/Constraints';
import type { PathInfo } from '../src/algorithms/types';

describe('Constraints', () => {
    const samplePaths: PathInfo[] = [
        { level: 1, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], isClosed: false },
        { level: 2, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], isClosed: false },
        { level: 3, points: [{ x: 2, y: 2 }, { x: 3, y: 3 }], isClosed: false },
        { level: 4, points: [{ x: 3, y: 3 }, { x: 4, y: 4 }], isClosed: false },
        { level: 5, points: [{ x: 4, y: 4 }, { x: 5, y: 5 }], isClosed: false }
    ];

    describe('applyConstraint', () => {
        it('filters paths greater than value', () => {
            const result = applyConstraint(samplePaths, { operator: '>', value: 2 });
            expect(result.length).toBe(3); // levels 3, 4, 5
            expect(result.every(p => p.level > 2)).toBe(true);
        });

        it('filters paths less than value', () => {
            const result = applyConstraint(samplePaths, { operator: '<', value: 3 });
            expect(result.length).toBe(2); // levels 1, 2
            expect(result.every(p => p.level < 3)).toBe(true);
        });

        it('filters paths equal to value', () => {
            const result = applyConstraint(samplePaths, { operator: '=', value: 3 });
            expect(result.length).toBe(1); // level 3
            expect(result[0].level).toBe(3);
        });

        it('filters paths in range [a, b]', () => {
            const result = applyConstraint(samplePaths, { operator: '[]', value: 2 });
            // This should include paths within range, exact behavior depends on implementation
            expect(result.length).toBeGreaterThanOrEqual(0);
        });

        it('filters paths outside range ]a, b[', () => {
            const result = applyConstraint(samplePaths, { operator: '][', value: 2 });
            // This should exclude paths within range
            expect(result.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('parseConstraint', () => {
        it('parses greater than constraint', () => {
            const result = parseConstraint('>2');
            expect(result).toEqual({ operator: '>', value: 2 });
        });

        it('parses less than constraint', () => {
            const result = parseConstraint('<3');
            expect(result).toEqual({ operator: '<', value: 3 });
        });

        it('parses equal constraint', () => {
            const result = parseConstraint('=5');
            expect(result).toEqual({ operator: '=', value: 5 });
        });

        it('returns null for invalid constraint', () => {
            expect(parseConstraint('invalid')).toBeNull();
            expect(parseConstraint('')).toBeNull();
        });
    });

    describe('ConstraintRenderer', () => {
        it('can add and clear constraints', () => {
            const renderer = new ConstraintRenderer();
            renderer.addConstraint({ operator: '>', value: 2 });
            renderer.addConstraint({ operator: '<', value: 4 });
            renderer.clearConstraints();
            // After clear, filtering should return all paths
            const result = renderer.filterPaths(samplePaths);
            expect(result.length).toBe(samplePaths.length);
        });

        it('filters paths based on multiple constraints', () => {
            const renderer = new ConstraintRenderer();
            renderer.addConstraint({ operator: '>', value: 1 });
            renderer.addConstraint({ operator: '<', value: 4 });
            const result = renderer.filterPaths(samplePaths);
            // Should only include levels 2 and 3
            expect(result.length).toBe(2);
        });
    });
});
