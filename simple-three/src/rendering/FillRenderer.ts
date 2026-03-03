// Fill rendering using band-based approach (Plotly style)
import * as THREE from 'three';
import type { PathInfo, Point } from '../algorithms/types';
import { makeColorMap } from '../coloring/ColorMap';
import type { ContourTrace } from '../core/ContourOptions';

/**
 * FillRenderer creates Three.js meshes for filled contour regions
 * using band-based coloring (Plotly style)
 */
export class FillRenderer {
    private scene: THREE.Scene;
    private trace: ContourTrace;
    private meshGroup: THREE.Group;
    private colorMap: (value: number) => string;
    private zmin: number;
    private zmax: number;
    private meshes: THREE.Mesh[] = [];

    constructor(scene: THREE.Scene, trace: ContourTrace) {
        this.scene = scene;
        this.trace = trace;
        this.colorMap = makeColorMap(trace);
        this.zmin = trace.zmin ?? 0;
        this.zmax = trace.zmax ?? 1;
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);
        this.createMeshes();
    }

    /**
     * Check if a point is inside a polygon (ray casting algorithm)
     */
    private isPointInPolygon(point: Point, polygon: Point[]): boolean {
        let inside = false;
        const n = polygon.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    /**
     * Check if polygon A contains polygon B (using B's centroid)
     */
    private polygonContainsPolygon(outer: Point[], inner: Point[]): boolean {
        // Calculate centroid of inner polygon
        let cx = 0, cy = 0;
        for (const p of inner) {
            cx += p.x;
            cy += p.y;
        }
        cx /= inner.length;
        cy /= inner.length;
        return this.isPointInPolygon({ x: cx, y: cy }, outer);
    }

    /**
     * Calculate polygon area (signed, positive = counter-clockwise)
     */
    private polygonArea(points: Point[]): number {
        let area = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return area / 2;
    }

    /**
     * Get paths for a specific level from trace
     */
    private getPathsForLevel(level: number): PathInfo[] {
        const tolerance = 0.01;
        return this.trace.paths?.filter(p => Math.abs(p.level - level) < tolerance) || [];
    }

    /**
     * Get all unique levels from paths
     */
    private getLevelsFromPaths(): number[] {
        const levelSet = new Set<number>();
        if (this.trace.paths) {
            for (const path of this.trace.paths) {
                // Round to avoid floating point issues
                levelSet.add(Math.round(path.level * 1000) / 1000);
            }
        }
        return Array.from(levelSet).sort((a, b) => a - b);
    }

    /**
     * Create filled meshes using band-based approach
     * Each band is the region between two consecutive levels
     */
    private createMeshes(): void {
        const contours = this.trace.contours || {};
        if (!contours || contours.coloring !== 'fill') return;

        // Get levels from paths (more reliable than calculating)
        const levels = this.getLevelsFromPaths();
        if (levels.length === 0) return;

        const levelSize = contours.size || 1;

        // Process each band: from levels[i] to levels[i+1]
        // Band color is based on the middle value of the band
        for (let i = 0; i < levels.length - 1; i++) {
            const lowerLevel = levels[i];
            const upperLevel = levels[i + 1];
            const midLevel = (lowerLevel + upperLevel) / 2;
            const color = this.colorMap(midLevel);

            // Get paths at the lower level (outer boundary of band)
            const lowerPaths = this.getPathsForLevel(lowerLevel);
            const lowerClosedPaths = lowerPaths.filter(p => p.isClosed && p.points.length >= 3);

            // Get paths at the upper level (inner boundary / holes)
            const upperPaths = this.getPathsForLevel(upperLevel);
            const upperClosedPaths = upperPaths.filter(p => p.isClosed && p.points.length >= 3);

            // For each lower level path, create a shape with upper level paths as holes
            for (const lowerPath of lowerClosedPaths) {
                const shape = this.createShapeWithHoles(lowerPath.points, upperClosedPaths);
                if (!shape) continue;

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

        // Handle the highest band (from last level to zmax)
        // This is the innermost region of peaks
        if (levels.length > 0) {
            const lastLevel = levels[levels.length - 1];
            const midLevel = (lastLevel + this.zmax) / 2;
            const color = this.colorMap(midLevel);

            const lastPaths = this.getPathsForLevel(lastLevel);
            const lastClosedPaths = lastPaths.filter(p => p.isClosed && p.points.length >= 3);

            // These are solid fills (no holes) for the peak regions
            for (const path of lastClosedPaths) {
                const shape = this.createShape(path.points);
                if (!shape) continue;

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

        // Handle the lowest band (from zmin to first level)
        // This fills the background region outside all contours
        if (levels.length > 0) {
            const firstLevel = levels[0];
            const midLevel = (this.zmin + firstLevel) / 2;
            const color = this.colorMap(midLevel);

            const firstPaths = this.getPathsForLevel(firstLevel);
            const firstClosedPaths = firstPaths.filter(p => p.isClosed && p.points.length >= 3);

            // Create background shape with first level paths as holes
            const bgShape = this.createBackgroundShape(firstClosedPaths);
            if (bgShape) {
                const geometry = new THREE.ShapeGeometry(bgShape);
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
     * Create a simple shape from points
     */
    private createShape(points: Point[]): THREE.Shape | null {
        if (points.length < 3) return null;

        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, -points[0].y);

        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, -points[i].y);
        }
        shape.closePath();

        return shape;
    }

    /**
     * Create a shape with holes from path points
     */
    private createShapeWithHoles(
        outerPoints: Point[],
        potentialHoles: PathInfo[]
    ): THREE.Shape | null {
        if (outerPoints.length < 3) return null;

        const shape = new THREE.Shape();

        // Determine winding order
        const area = this.polygonArea(outerPoints);
        const isCCW = area > 0;

        // Create outer path (ensure counter-clockwise for Three.js)
        const order = isCCW ?
            { start: 0, end: outerPoints.length, step: 1 } :
            { start: outerPoints.length - 1, end: -1, step: -1 };

        let first = true;
        for (let j = order.start; j !== order.end; j += order.step) {
            const px = outerPoints[j].x;
            const py = -outerPoints[j].y; // Flip Y for Three.js
            if (first) {
                shape.moveTo(px, py);
                first = false;
            } else {
                shape.lineTo(px, py);
            }
        }
        shape.closePath();

        // Add holes for paths that are inside the outer path
        for (const holePath of potentialHoles) {
            if (!this.polygonContainsPolygon(outerPoints, holePath.points)) continue;

            const hole = new THREE.Path();
            const holePoints = holePath.points;

            // Hole should be clockwise (opposite winding of outer)
            const holeOrder = isCCW ?
                { start: holePoints.length - 1, end: -1, step: -1 } :
                { start: 0, end: holePoints.length, step: 1 };

            let holeFirst = true;
            for (let j = holeOrder.start; j !== holeOrder.end; j += holeOrder.step) {
                const px = holePoints[j].x;
                const py = -holePoints[j].y;
                if (holeFirst) {
                    hole.moveTo(px, py);
                    holeFirst = false;
                } else {
                    hole.lineTo(px, py);
                }
            }
            hole.closePath();
            shape.holes.push(hole);
        }

        return shape;
    }

    /**
     * Create background shape (full area with paths as holes)
     */
    private createBackgroundShape(holes: PathInfo[]): THREE.Shape | null {
        // Calculate data bounds from trace
        let minX = -10, maxX = 10;
        let minY = -10, maxY = 10;

        // Use trace x/y bounds if available
        if (this.trace.x && this.trace.x.length > 0) {
            minX = Math.min(...this.trace.x);
            maxX = Math.max(...this.trace.x);
        }
        if (this.trace.y && this.trace.y.length > 0) {
            minY = Math.min(...this.trace.y);
            maxY = Math.max(...this.trace.y);
        }

        // Fallback: calculate from path bounds
        if (holes.length > 0) {
            let pathMinX = Infinity, pathMaxX = -Infinity;
            let pathMinY = Infinity, pathMaxY = -Infinity;
            for (const path of holes) {
                for (const p of path.points) {
                    pathMinX = Math.min(pathMinX, p.x);
                    pathMaxX = Math.max(pathMaxX, p.x);
                    pathMinY = Math.min(pathMinY, p.y);
                    pathMaxY = Math.max(pathMaxY, p.y);
                }
            }
            // Expand bounds slightly
            minX = Math.min(minX, pathMinX - 1);
            maxX = Math.max(maxX, pathMaxX + 1);
            minY = Math.min(minY, pathMinY - 1);
            maxY = Math.max(maxY, pathMaxY + 1);
        }

        const shape = new THREE.Shape();
        shape.moveTo(minX, -minY);
        shape.lineTo(maxX, -minY);
        shape.lineTo(maxX, -maxY);
        shape.lineTo(minX, -maxY);
        shape.closePath();

        // Add all paths as holes (counter-clockwise)
        for (const holePath of holes) {
            const hole = new THREE.Path();
            const holePoints = holePath.points;

            // Counter-clockwise for hole (reverse order)
            for (let j = holePoints.length - 1; j >= 0; j--) {
                const px = holePoints[j].x;
                const py = -holePoints[j].y;
                if (j === holePoints.length - 1) {
                    hole.moveTo(px, py);
                } else {
                    hole.lineTo(px, py);
                }
            }
            hole.closePath();
            shape.holes.push(hole);
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
