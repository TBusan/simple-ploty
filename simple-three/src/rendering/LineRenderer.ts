// Line rendering for contour lines
import * as THREE from 'three';
import type { PathInfo } from '../algorithms/types';
import { makeColorMap } from '../coloring/ColorMap'
import type { ContourTrace } from '../core/ContourOptions'

import { ColorScale } from '../coloring/ColorScale'

/**
 * LineRenderer creates Three.js lines for contour lines
 */
export class LineRenderer {
    private scene: THREE.Scene;
    private trace: ContourTrace
    private lineGroup: THREE.Group
    private colorMap: (value: number) => string
    private lines: THREE.Line[] = []

    constructor(scene: THREE.Scene, trace: ContourTrace) {
        this.scene = scene
        this.trace = trace
        this.colorMap = makeColorMap(trace)
        this.lineGroup = new THREE.Group()
        this.scene.add(this.lineGroup)
        this.createLines()
    }
    /**
     * Create line geometries for each contour level
     */
    private createLines(): void {
        const contours = this.trace.contours || {}
        if (!contours || !contours.showlines) return

        const levels = this.getLevels()
        for (const level of levels) {
            // Find all paths for this level
            const paths = this.trace.paths?.filter(p => Math.abs(p.level - level) < 0.001) || []
            if (paths.length === 0) continue
            for (const path of paths) {
                const geometry = this.createLineGeometry(path)
                if (!geometry) continue
                const color = this.colorMap(level)
                const material = new THREE.LineBasicMaterial({ color })
                const line = new THREE.Line(geometry, material)
                this.lines.push(line)
                this.lineGroup.add(line)
            }
        }
    }
    /**
     * Get levels that have lines
     */
    private getLevels(): number[] {
        const contours = this.trace.contours || {}
        const start = contours.start ?? 0
        const end = contours.end ?? 1
        const size = contours.size || 0.5
        const levels: number[] = []
        for (let l = start; l <= end; l += size) {
            levels.push(l)
        }
        return levels
    }
    /**
     * Create line geometry from path points
     */
    private createLineGeometry(path: PathInfo): THREE.BufferGeometry | null {
        const points = path.points
        if (points.length < 2) return null
        const vector3Points = points.map(p => new THREE.Vector3(p.x, p.y, 0))
        return new THREE.BufferGeometry().setFromPoints(vector3Points)
    }
    /**
     * Clean up resources
     */
    dispose(): void {
        for (const line of this.lines) {
            line.geometry.dispose()
            ;(line.material as THREE.Material).dispose()
        }
        this.lines = []
        this.scene.remove(this.lineGroup)
    }
}
