// Color scale definitions

export interface ColorScaleDef {
    name: string;
    colors: [number, string][];
}

export const BUILT_IN_COLORSCALES: Record<string, ColorScaleDef> = {
    Viridis: {
        name: 'Viridis',
        colors: [
            [0, '#440154'],
            [0.25, '#3b528b'],
            [0.5, '#21918c'],
            [0.75, '#5ec962'],
            [1, '#fde725']
        ]
    },
    Jet: {
        name: 'Jet',
        colors: [
            [0, '#000080'],
            [0.1, '#0000ff'],
            [0.3, '#00ffff'],
            [0.5, '#00ff00'],
            [0.7, '#ffff00'],
            [0.9, '#ff0000'],
            [1, '#800000']
        ]
    },
    Hot: {
        name: 'Hot',
        colors: [
            [0, '#000000'],
            [0.3, '#ff0000'],
            [0.6, '#ffff00'],
            [1, '#ffffff']
        ]
    }
};

export class ColorScale {
    private colors: [number, string][];
    private reversed: boolean;

    constructor(scale: string | [number, string][], reversed = false) {
        if (typeof scale === 'string') {
            const def = BUILT_IN_COLORSCALES[scale];
            if (!def) {
                throw new Error(`Unknown colorscale: ${scale}`);
            }
            this.colors = def.colors;
        } else {
            this.colors = scale;
        }
        this.reversed = reversed;
    }

    getColor(value: number): string {
        // Normalize value to [0, 1]
        const clampedValue = Math.max(0, Math.min(1, value));

        // Find the two colors to interpolate between
        for (let i = 0; i < this.colors.length - 1; i++) {
            const [v1, c1] = this.colors[i];
            const [v2, c2] = this.colors[i + 1];

            if (clampedValue >= v1 && clampedValue <= v2) {
                const t = (clampedValue - v1) / (v2 - v1);
                return this.interpolateColor(c1, c2, t);
            }
        }

        return this.colors[this.colors.length - 1][1];
    }

    private interpolateColor(c1: string, c2: string, t: number): string {
        // Simple color interpolation
        const r1 = parseInt(c1.slice(1, 3), 16);
        const g1 = parseInt(c1.slice(3, 5), 16);
        const b1 = parseInt(c1.slice(5, 7), 16);

        const r2 = parseInt(c2.slice(1, 3), 16);
        const g2 = parseInt(c2.slice(3, 5), 16);
        const b2 = parseInt(c2.slice(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
