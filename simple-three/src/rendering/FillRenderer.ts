// Fill rendering using layer-based approach (ZRender/Plotly style)
import * as THREE from 'three';
import type { PathInfo, Point } from '../algorithms/types';
import { makeColorMap } from '../coloring/ColorMap';
import type { ContourTrace } from '../core/ContourOptions';

/**
 * Options for creating fill meshes from paths
 */
export interface CreateFillMeshesOptions {
    /** All paths grouped by level */
    levelPaths: Map<number, PathInfo[]>;
    /** Color scale function - converts normalized value (0-1) to color */
    colorScale: (normalizedValue: number) => string;
    /** Minimum data value */
    zmin: number;
    /** Maximum data value */
    zmax: number;
    /** Data bounds (optional) */
    bounds?: { minX: number; maxX: number; minY: number; maxY: number };
    /** Coordinate transform function (optional) */
    transform?: (point: Point) => { x: number; y: number };
}

/**
 * FillRenderer creates Three.js meshes for filled contour regions
 * using layer-based rendering (similar to ZRender/Plotly)
 *
 * The key insight: instead of using complex hole calculations,
 * we render layers in order (from background to foreground),
 * letting later layers naturally cover earlier ones.
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
     * Create filled meshes using layer-based approach
     */
    private createMeshes(): void {
        const contours = this.trace.contours || {};
        if (contours.coloring !== 'fill') return;

        // Get levels from paths
        const levels = this.getLevelsFromPaths();
        if (levels.length === 0) return;

        // Calculate data bounds
        const bounds = this.calculateBounds();

        // Step 1: Render background rectangle
        const bgColor = this.colorMap(this.zmin);
        const bgShape = new THREE.Shape();
        bgShape.moveTo(bounds.minX, -bounds.minY);
        bgShape.lineTo(bounds.maxX, -bounds.minY);
        bgShape.lineTo(bounds.maxX, -bounds.maxY);
        bgShape.lineTo(bounds.minX, -bounds.maxY);
        bgShape.closePath();

        const bgGeometry = new THREE.ShapeGeometry(bgShape);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: bgColor,
            side: THREE.DoubleSide
        });
        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.renderOrder = 0;
        this.meshes.push(bgMesh);
        this.meshGroup.add(bgMesh);

        // Step 2: Render each level's closed paths (from low to high)
        // Each level renders polygons that cover the previous layer
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const color = this.colorMap(level);
            const paths = this.getPathsForLevel(level);
            const closedPaths = paths.filter(p => p.isClosed && p.points.length >= 3);

            for (const path of closedPaths) {
                const shape = this.createShape(path.points);
                if (!shape) continue;

                const geometry = new THREE.ShapeGeometry(shape);
                const material = new THREE.MeshBasicMaterial({
                    color,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                // Higher levels have higher render order (rendered on top)
                mesh.renderOrder = i + 1;
                this.meshes.push(mesh);
                this.meshGroup.add(mesh);
            }
        }
    }

    /**
     * Calculate data bounds from trace
     */
    private calculateBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
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
        if (this.trace.paths && this.trace.paths.length > 0) {
            let pathMinX = Infinity, pathMaxX = -Infinity;
            let pathMinY = Infinity, pathMaxY = -Infinity;
            for (const path of this.trace.paths) {
                for (const p of path.points) {
                    pathMinX = Math.min(pathMinX, p.x);
                    pathMaxX = Math.max(pathMaxX, p.x);
                    pathMinY = Math.min(pathMinY, p.y);
                    pathMaxY = Math.max(pathMaxY, p.y);
                }
            }
            if (isFinite(pathMinX)) {
                // Add margin
                const margin = Math.max(1, (pathMaxX - pathMinX) * 0.1);
                minX = Math.min(minX, pathMinX - margin);
                maxX = Math.max(maxX, pathMaxX + margin);
                minY = Math.min(minY, pathMinY - margin);
                maxY = Math.max(maxY, pathMaxY + margin);
            }
        }

        return { minX, maxX, minY, maxY };
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

    /**
     * Static method to create fill meshes from PathFinder results
     *
     * This is the recommended way to create filled contours when using PathFinder directly.
     *
     * @example
     * ```typescript
     * const pathFinder = new PathFinder(data);
     * const levels = [-8, -7, -6, ..., 8];
     *
     * // Collect paths for all levels
     * const levelPaths = new Map();
     * for (const level of levels) {
     *     levelPaths.set(level, pathFinder.findPaths(level));
     * }
     *
     * // Create fill meshes
     * const colorScale = new ColorScale('Viridis');
     * const meshes = FillRenderer.createFillMeshes({
     *     levelPaths,
     *     colorScale: (v) => colorScale.getColor((v - zmin) / (zmax - zmin)),
     *     zmin: -8,
     *     zmax: 8
     * });
     *
     * // Add to scene
     * meshes.forEach(mesh => scene.add(mesh));
     * ```
     */
    static createFillMeshes(options: CreateFillMeshesOptions): THREE.Mesh[] {
        const { levelPaths, colorScale, zmin, zmax, bounds, transform } = options;
        const meshes: THREE.Mesh[] = [];

        // Get sorted levels
        const levels = Array.from(levelPaths.keys()).sort((a, b) => a - b);
        if (levels.length === 0) return meshes;

        // Calculate bounds if not provided
        let minX = -10, maxX = 10;
        let minY = -10, maxY = 10;
        if (bounds) {
            minX = bounds.minX;
            maxX = bounds.maxX;
            minY = bounds.minY;
            maxY = bounds.maxY;
        } else {
            // Calculate from all paths
            for (const paths of levelPaths.values()) {
                for (const pathInfo of paths) {
                    for (const p of pathInfo.points) {
                        minX = Math.min(minX, p.x);
                        maxX = Math.max(maxX, p.x);
                        minY = Math.min(minY, p.y);
                        maxY = Math.max(maxY, p.y);
                    }
                }
            }
            // Add margin
            const margin = Math.max(1, (maxX - minX) * 0.1);
            minX -= margin;
            maxX += margin;
            minY -= margin;
            maxY += margin;
        }

        // Transform function (default: flip Y axis for Three.js)
        const tx = transform || ((p: Point) => ({ x: p.x, y: -p.y }));

        // Step 1: Create background rectangle
        const bgColor = colorScale(0); // Background uses lowest color (normalized to 0)
        const bgShape = new THREE.Shape();
        const p0 = tx({ x: minX, y: minY });
        const p1 = tx({ x: maxX, y: minY });
        const p2 = tx({ x: maxX, y: maxY });
        const p3 = tx({ x: minX, y: maxY });
        bgShape.moveTo(p0.x, p0.y);
        bgShape.lineTo(p1.x, p1.y);
        bgShape.lineTo(p2.x, p2.y);
        bgShape.lineTo(p3.x, p3.y);
        bgShape.closePath();

        const bgGeometry = new THREE.ShapeGeometry(bgShape);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: bgColor,
            side: THREE.DoubleSide
        });
        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.renderOrder = 0;
        meshes.push(bgMesh);

        // Step 2: Render each level's closed paths (from low to high)
        // Each level renders polygons that cover the previous layer
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const normalizedValue = (level - zmin) / (zmax - zmin);
            const color = colorScale(normalizedValue);
            const paths = levelPaths.get(level) || [];
            const closedPaths = paths.filter(p => p.isClosed && p.points.length >= 3);

            for (const path of closedPaths) {
                const shape = FillRenderer.createShapeFromPoints(path.points, tx);
                if (!shape) continue;

                const geometry = new THREE.ShapeGeometry(shape);
                const material = new THREE.MeshBasicMaterial({
                    color,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                // Higher levels have higher render order (rendered on top)
                mesh.renderOrder = i + 1;
                meshes.push(mesh);
            }
        }

        return meshes;
    }

    /**
     * Helper: Create a Three.js Shape from points
     */
    private static createShapeFromPoints(
        points: Point[],
        transform: (p: Point) => { x: number; y: number }
    ): THREE.Shape | null {
        if (points.length < 3) return null;

        const shape = new THREE.Shape();
        const p0 = transform(points[0]);
        shape.moveTo(p0.x, p0.y);

        for (let i = 1; i < points.length; i++) {
            const p = transform(points[i]);
            shape.lineTo(p.x, p.y);
        }
        shape.closePath();

        return shape;
    }
}
