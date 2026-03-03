// Heatmap rendering using canvas texture
import * as THREE from 'three';
import type { ContourTrace } from '../core/ContourOptions';
import { ColorScale } from '../coloring/ColorScale';

/**
 * HeatmapRenderer creates a continuous color heatmap using canvas
 */
export class HeatmapRenderer {
    private canvas: HTMLCanvasElement;
    private texture!: THREE.CanvasTexture;
    private mesh!: THREE.Mesh;
    private trace: ContourTrace;

    constructor(trace: ContourTrace, width: number, height: number) {
        this.trace = trace;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.createHeatmap();
    }

    /**
     * Create heatmap from trace data
     */
    private createHeatmap(): void {
        const z = this.trace.z;
        const ny = z.length;
        const nx = z[0].length;

        const zmin = this.trace.zmin ?? Infinity;
        const zmax = this.trace.zmax ?? Infinity;

        const colorscale = this.trace.colorscale;
        const range = colorscale
            ? (typeof colorscale === 'string')
                ? new ColorScale(colorscale)
                : new ColorScale(colorscale)
            : null;

        const colorMap = range ? range.getColor.bind(range) : (v: number) => '#000000';

        // Get canvas context
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.createImageData(ny, nx);

        // Fill image data
        for (let yi = 0; yi < ny; yi++) {
            for (let xi = 0; xi < nx; xi++) {
                const value = z[yi][xi];
                const normalizedValue = (value - zmin) / (zmax - zmin);
                const color = colorMap(normalizedValue);

                // Convert hex color to RGBA
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);

                const idx = (yi * nx + xi) * 4;
                imageData.data[idx] = r;
                imageData.data[idx + 1] = g;
                imageData.data[idx + 2] = b;
                imageData.data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Create texture
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.NearestFilter;

        // Create mesh
        const geometry = new THREE.PlaneGeometry(nx, ny);
        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(geometry, material);
    }

    /**
     * Get the texture
     */
    getTexture(): THREE.CanvasTexture | null {
        return this.texture;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.texture.dispose();
        this.canvas.remove();
    }
}
