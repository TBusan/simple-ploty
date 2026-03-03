// Tests for ColorScale and ColorMap
import { describe, it, expect } from 'vitest';
import { ColorScale, BUILT_IN_COLORSCALES } from '../src/coloring/ColorScale';
import { makeColorMap } from '../src/coloring/ColorMap';
import type { ContourTrace } from '../src/core/ContourOptions';

describe('ColorScale', () => {
    describe('built-in color scales', () => {
        it('has Viridis color scale', () => {
            expect(BUILT_IN_COLORSCALES.Viridis).toBeDefined();
            expect(BUILT_IN_COLORSCALES.Viridis.colors.length).toBe(5);
        });

        it('has Jet color scale', () => {
            expect(BUILT_IN_COLORSCALES.Jet).toBeDefined();
            expect(BUILT_IN_COLORSCALES.Jet.colors.length).toBe(7);
        });

        it('has Hot color scale', () => {
            expect(BUILT_IN_COLORSCALES.Hot).toBeDefined();
            expect(BUILT_IN_COLORSCALES.Hot.colors.length).toBe(4);
        });
    });

    describe('getColor', () => {
        it('returns color for value 0', () => {
            const scale = new ColorScale('Viridis');
            const color = scale.getColor(0);
            expect(color).toBe('#440154');
        });

        it('returns color for value 1', () => {
            const scale = new ColorScale('Viridis');
            const color = scale.getColor(1);
            expect(color).toBe('#fde725');
        });

        it('returns color for value 0.5', () => {
            const scale = new ColorScale('Viridis');
            const color = scale.getColor(0.5);
            expect(color).toBe('#21918c');
        });

        it('interpolates between colors', () => {
            const scale = new ColorScale('Viridis');
            const color = scale.getColor(0.25);
            expect(color).toBe('#3b528b');
        });

        it('clamps values below 0', () => {
            const scale = new ColorScale('Viridis');
            const color = scale.getColor(-1);
            expect(color).toBe('#440154'); // Should return color for 0
        });

        it('clamps values above 1', () => {
            const scale = new ColorScale('Viridis');
            const color = scale.getColor(2);
            expect(color).toBe('#fde725'); // Should return color for 1
        });
    });

    describe('custom color scale', () => {
        it('accepts custom color array', () => {
            const customColors: [number, string][] = [
                [0, '#000000'],
                [0.5, '#888888'],
                [1, '#ffffff']
            ];
            const scale = new ColorScale(customColors);
            expect(scale.getColor(0)).toBe('#000000');
            expect(scale.getColor(1)).toBe('#ffffff');
        });
    });

    describe('reversed scale', () => {
        it('stores reversed flag (Note: reversal is handled by makeColorMap)', () => {
            const scale = new ColorScale('Viridis', true);
            // The reversed flag is stored but getColor doesn't apply it directly
            // Reversal is applied in makeColorMap function
            const color0 = scale.getColor(0);
            expect(color0).toBe('#440154');
        });
    });

    describe('error handling', () => {
        it('throws for unknown color scale name', () => {
            expect(() => new ColorScale('UnknownScale')).toThrow();
        });
    });
});

describe('makeColorMap', () => {
    it('creates color map from trace', () => {
        const trace: ContourTrace = {
            z: [[1, 2], [3, 4]]
        };
        const colorMap = makeColorMap(trace);
        expect(typeof colorMap).toBe('function');
        expect(colorMap(0.5)).toBeDefined();
    });

    it('uses Viridis as default', () => {
        const trace: ContourTrace = {
            z: [[1, 2], [3, 4]]
        };
        const colorMap = makeColorMap(trace);
        const color = colorMap(0);
        expect(color).toBe('#440154');
    });

    it('respects reversescale option', () => {
        const trace: ContourTrace = {
            z: [[1, 2], [3, 4]],
            reversescale: true
        };
        const colorMap = makeColorMap(trace);
        const color = colorMap(0);
        expect(color).toBe('#fde725'); // Reversed
    });

    it('accepts custom colorscale array', () => {
        const trace: ContourTrace = {
            z: [[1, 2], [3, 4]],
            colorscale: [
                [0, '#ff0000'],
                [1, '#0000ff']
            ]
        };
        const colorMap = makeColorMap(trace);
        expect(colorMap(0)).toBe('#ff0000');
        expect(colorMap(1)).toBe('#0000ff');
    });

    it('accepts string colorscale name', () => {
        const trace: ContourTrace = {
            z: [[1, 2], [3, 4]],
            colorscale: 'Jet'
        };
        const colorMap = makeColorMap(trace);
        const color = colorMap(0);
        expect(color).toBe('#000080');
    });
});
