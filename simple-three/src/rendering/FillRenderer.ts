// Fill rendering using evenodd fill rule
import * as THREE from 'three';
import type { PathInfo } from '../algorithms/types';
import { makeColorMap } from '../coloring/ColorMap';
import type { ContourTrace } from '../core/ContourOptions';

/**
 * FillRenderer creates Three.js meshes for filled contour regions
 */
export class FillRenderer {
    private scene: THREE.Scene;
    private trace: ContourTrace;
    private meshGroup: THREE.Group;
    private colorMap: (value: number) => string;
    private zmin: number;
    private zmax: number;
    private levels: number[] = [];
    private meshes: THREE.Mesh[] = [];

    constructor(scene: THREE.Scene, trace: ContourTrace) {
        this.scene = scene;
        this.trace = trace;
        this.colorMap = makeColorMap(trace);
        this.zmin = trace.zmin ?? 0;
        this.zmax = trace.zmax ?? 1;
        this.levels = this.calculateLevels(trace);
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);
        this.createMeshes();
    }

    /**
     * Calculate contour levels from trace data
     */
    private calculateLevels(trace: ContourTrace): number[] {
        const contours = trace.contours || {};
        const zmin = trace.zmin ?? 0;
        const zmax = trace.zmax ?? 1;
        const start = contours.start ?? zmin;
        const end = contours.end ?? zmax;
        const size = contours.size || 1;
        const levels: number[] = [];
        const ncontours = size > 0 ? Math.ceil((end - start) / size) : 1;
        for (let i = 0; i <= ncontours; i++) {
            const level = start + i * size;
            if (level > end) break;
            levels.push(level);
        }
        return levels;
    }

    /**
     * Create filled meshes for each contour level
     */
    private createMeshes(): void {
        const contours = this.trace.contours || {};
        if (!contours || contours.coloring !== 'fill') return;

        const levels = this.levels;
        for (const level of levels) {
            // Find all paths for this level
            const paths = this.trace.paths?.filter(p => Math.abs(p.level - level) < 0.001) || [];
            if (paths.length === 0) continue;

            // Create a shape for each path
            for (const path of paths) {
                const shape = this.createShape(path);
                if (!shape) continue;

                const color = this.colorMap(level + 0.5 * (contours.size || 1));
                const geometry = new THREE.ShapeGeometry(shape);
                const material = new THREE.MeshBasicMaterial({
                    color,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                this.meshes.push(mesh);
                this.meshGroup.add(mesh);
            }
        }
    }

    /**
     * Create a Three.js shape from path points
     */
    private createShape(path: PathInfo): THREE.Shape | null {
        const points = path.points;
        if (points.length < 3) return null;

        const shape = new THREE.Shape();

        // Move to first point
        shape.moveTo(points[0].x, -points[0].y);

        // Draw lines to remaining points
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, -points[i].y);
        }

        // Close the path if it's closed
        if (path.isClosed) {
            shape.lineTo(points[0].x, -points[0].y);
        }

        return shape;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        for (const mesh of this.meshes) {
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) {
                mesh.material.dispose();
            }
        }
        this.meshes = [];
        this.scene.remove(this.meshGroup);
    }
}
