// Tests for log axis utilities
import { describe, it, expect } from 'vitest';
import {
    toLogScale,
    fromLogScale,
    logInterpolate,
    isValidLogValue
} from '../src/utils/LogAxis';

describe('LogAxis', () => {
    describe('toLogScale', () => {
        it('converts positive values to log scale', () => {
            expect(toLogScale(10)).toBe(1); // log10(10) = 1
            expect(toLogScale(100)).toBe(2); // log10(100) = 2
            expect(toLogScale(1)).toBe(0); // log10(1) = 0
        });

        it('handles different bases', () => {
            expect(toLogScale(8, 2)).toBeCloseTo(3); // log2(8) = 3
            expect(toLogScale(Math.E, Math.E)).toBeCloseTo(1);
        });
    });

    describe('fromLogScale', () => {
        it('converts log values back to linear', () => {
            expect(fromLogScale(1)).toBe(10);
            expect(fromLogScale(2)).toBe(100);
            expect(fromLogScale(0)).toBe(1);
        });

        it('handles negative log values', () => {
            expect(fromLogScale(-1)).toBeCloseTo(0.1);
            expect(fromLogScale(-2)).toBeCloseTo(0.01);
        });
    });

    describe('logInterpolate', () => {
        it('interpolates in log space', () => {
            const result = logInterpolate(10, 100, 0.5);
            expect(result).toBeCloseTo(31.62); // sqrt(10 * 100)
        });

        it('handles edge cases', () => {
            expect(logInterpolate(10, 100, 0)).toBe(10);
            expect(logInterpolate(10, 100, 1)).toBe(100);
        });

        it('returns NaN for invalid inputs', () => {
            expect(logInterpolate(0, 100, 0.5)).toBe(NaN);
            expect(logInterpolate(-1, 100, 0.5)).toBe(NaN);
        });
    });

    describe('isValidLogValue', () => {
        it('returns true for positive finite values', () => {
            expect(isValidLogValue(1)).toBe(true);
            expect(isValidLogValue(0.5)).toBe(true);
            expect(isValidLogValue(100)).toBe(true);
        });

        it('returns false for invalid values', () => {
            expect(isValidLogValue(0)).toBe(false);
            expect(isValidLogValue(-1)).toBe(false);
            expect(isValidLogValue(NaN)).toBe(false);
            expect(isValidLogValue(Infinity)).toBe(false);
        });
    });
});
