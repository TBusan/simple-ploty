// Tests for Marching Squares algorithm
import { describe, it, expect } from 'vitest';
import {
    getMarchingIndex,
    isSaddleCode,
    decodeSaddleCode,
    getInterpFactor,
    getCrossingPoint
} from '../src/algorithms/MarchingSquares';
import { SADDLE_CODES } from '../src/algorithms/constants';

describe('getMarchingIndex', () => {
    it('case 0: all corners above level', () => {
        const corners = [[5, 5], [5, 5]];
        expect(getMarchingIndex(3, corners)).toBe(0);
    });

    it('case 15: all corners below level (treated as 0)', () => {
        const corners = [[1, 1], [1, 1]];
        expect(getMarchingIndex(3, corners)).toBe(0);
    });

    it('case 1: only top-left below level', () => {
        const corners = [[2, 5], [5, 5]];
        expect(getMarchingIndex(3, corners)).toBe(1);
    });

    it('case 2: only top-right below level', () => {
        const corners = [[5, 2], [5, 5]];
        expect(getMarchingIndex(3, corners)).toBe(2);
    });

    it('case 3: top-left and top-right below level', () => {
        const corners = [[2, 2], [5, 5]];
        expect(getMarchingIndex(3, corners)).toBe(3);
    });

    it('case 4: only bottom-right below level', () => {
        const corners = [[5, 5], [5, 2]];
        expect(getMarchingIndex(3, corners)).toBe(4);
    });

    it('case 6: top-right and bottom-right below level', () => {
        const corners = [[5, 2], [5, 2]];
        expect(getMarchingIndex(3, corners)).toBe(6);
    });

    it('case 8: only bottom-left below level', () => {
        const corners = [[5, 5], [2, 5]];
        expect(getMarchingIndex(3, corners)).toBe(8);
    });

    it('case 9: top-left and bottom-left below level', () => {
        const corners = [[2, 5], [2, 5]];
        expect(getMarchingIndex(3, corners)).toBe(9);
    });

    it('case 12: bottom-left and bottom-right below level', () => {
        const corners = [[5, 5], [2, 2]];
        expect(getMarchingIndex(3, corners)).toBe(12);
    });

    describe('saddle point cases', () => {
        it('saddle point 5 with low average (level < avg)', () => {
            // tl=2, tr=5, bl=5, br=2 -> avg=3.5, level=3 < avg
            const corners = [[2, 5], [5, 2]];
            const result = getMarchingIndex(3, corners);
            expect(result).toBe(SADDLE_CODES.CASE_5_LOW); // 104
        });

        it('saddle point 5 with high average (level > avg)', () => {
            // tl=2, tr=5, bl=5, br=2 -> avg=3.5, level=4 > avg
            const corners = [[2, 5], [5, 2]];
            const result = getMarchingIndex(4, corners);
            expect(result).toBe(SADDLE_CODES.CASE_5_HIGH); // 713
        });

        it('saddle point 10 with low average (level < avg)', () => {
            // tl=5, tr=2, bl=2, br=5 -> avg=3.5, level=3 < avg
            const corners = [[5, 2], [2, 5]];
            const result = getMarchingIndex(3, corners);
            expect(result).toBe(SADDLE_CODES.CASE_10_LOW); // 208
        });

        it('saddle point 10 with high average (level > avg)', () => {
            // tl=5, tr=2, bl=2, br=5 -> avg=3.5, level=4 > avg
            const corners = [[5, 2], [2, 5]];
            const result = getMarchingIndex(4, corners);
            expect(result).toBe(SADDLE_CODES.CASE_10_HIGH); // 1114
        });
    });
});

describe('isSaddleCode', () => {
    it('returns true for saddle codes', () => {
        expect(isSaddleCode(104)).toBe(true);
        expect(isSaddleCode(208)).toBe(true);
        expect(isSaddleCode(713)).toBe(true);
        expect(isSaddleCode(1114)).toBe(true);
    });

    it('returns false for normal indices', () => {
        expect(isSaddleCode(0)).toBe(false);
        expect(isSaddleCode(5)).toBe(false);
        expect(isSaddleCode(10)).toBe(false);
        expect(isSaddleCode(15)).toBe(false);
    });
});

describe('decodeSaddleCode', () => {
    it('decodes CASE_5_LOW correctly', () => {
        expect(decodeSaddleCode(SADDLE_CODES.CASE_5_LOW)).toEqual([1, 4]);
    });

    it('decodes CASE_5_HIGH correctly', () => {
        expect(decodeSaddleCode(SADDLE_CODES.CASE_5_HIGH)).toEqual([7, 13]);
    });

    it('decodes CASE_10_LOW correctly', () => {
        expect(decodeSaddleCode(SADDLE_CODES.CASE_10_LOW)).toEqual([2, 8]);
    });

    it('decodes CASE_10_HIGH correctly', () => {
        expect(decodeSaddleCode(SADDLE_CODES.CASE_10_HIGH)).toEqual([11, 14]);
    });

    it('throws for invalid code', () => {
        expect(() => decodeSaddleCode(999)).toThrow();
    });
});

describe('getInterpFactor', () => {
    it('returns 0.5 for equal values', () => {
        expect(getInterpFactor(5, 5, 3)).toBe(0.5);
    });

    it('returns 0 when level equals first value', () => {
        expect(getInterpFactor(3, 5, 3)).toBe(0);
    });

    it('returns 1 when level equals second value', () => {
        expect(getInterpFactor(1, 3, 3)).toBe(1);
    });

    it('returns correct interpolation for midpoint', () => {
        expect(getInterpFactor(1, 5, 3)).toBe(0.5);
    });
});

describe('getCrossingPoint', () => {
    it('calculates top edge crossing', () => {
        const corners = [[1, 5], [1, 5]];
        const point = getCrossingPoint(2, 3, 'top', corners, 3);
        expect(point.y).toBe(3);
        expect(point.x).toBeCloseTo(2.5);
    });

    it('calculates right edge crossing', () => {
        const corners = [[1, 1], [5, 5]];
        const point = getCrossingPoint(2, 3, 'right', corners, 3);
        expect(point.x).toBe(3);
        expect(point.y).toBeCloseTo(3.5);
    });

    it('calculates bottom edge crossing', () => {
        const corners = [[1, 5], [1, 5]];
        const point = getCrossingPoint(2, 3, 'bottom', corners, 3);
        expect(point.y).toBe(4);
        expect(point.x).toBeCloseTo(2.5);
    });

    it('calculates left edge crossing', () => {
        const corners = [[1, 1], [5, 5]];
        const point = getCrossingPoint(2, 3, 'left', corners, 3);
        expect(point.x).toBe(2);
        expect(point.y).toBeCloseTo(3.5);
    });
});
