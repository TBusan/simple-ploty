// Color mapping utilities
import type { ContourTrace } from '../core/ContourOptions';
import { ColorScale } from './ColorScale';

/**
 * Creates a color map function for a contour trace
 * @param trace - The contour trace data
 * @returns A function that maps values to colors
 */
export function makeColorMap(trace: ContourTrace): (value: number) => string {
    const colorscale = trace.colorscale;
    const reversescale = trace.reversescale;

    const colorScale = colorscale
        ? (typeof colorscale === 'string'
            ? new ColorScale(colorscale)
            : new ColorScale(colorscale))
        : new ColorScale('Viridis');

    const colorMap = colorScale.getColor.bind(colorScale);

    return (value: number) => {
        const v = reversescale ? 1 - value : value;
        return colorMap(v);
    };
}
