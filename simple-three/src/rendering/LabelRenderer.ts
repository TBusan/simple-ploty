// Label rendering for contour plots
import * as THREE from 'three';
import type { PathInfo } from '../algorithms/types';
import { makeColorMap } from '../coloring/ColorMap';
import type { ContourTrace } from '../core/ContourOptions';

/**
 * LabelRenderer creates text labels for contour lines
 */
export class LabelRenderer {
    private scene: THREE.Scene;
    private trace: ContourTrace;
    private labelGroup: THREE.Group;
    private labels: THREE.Sprite[] = [];
    private colorMap: (value: number) => string;

    constructor(scene: THREE.Scene, trace: ContourTrace) {
        this.scene = scene;
        this.trace = trace;
        this.colorMap = makeColorMap(trace);
        this.labelGroup = new THREE.Group();
        this.scene.add(this.labelGroup);
        this.createLabels();
    }

    /**
     * Create label sprites
     */
    private createLabels(): void {
        const contours = this.trace.contours || {};
        if (!contours || !contours.showlabels) return;

        const labelOpts = contours.labelfont || {};
        const fontSize = labelOpts.fontSize || 12;
        const fontFamily = 'Arial';
        const textColor = labelOpts.color || '#000000';

        // Get paths with labels
        const paths = this.trace.paths || [];
        for (const path of paths) {
            if (!path.points || path.points.length < 2) continue

            // Find a good position for the label
            const position = this.findLabelPosition(path)
            if (!position) continue

            // Create text sprite
            const text = path.level.toFixed(1)
            const sprite = this.createTextSprite(text, position, fontSize, fontFamily, textColor)
            if (sprite) {
                this.labels.push(sprite)
                this.labelGroup.add(sprite)
            }
        }
    }

    /**
     * Find the best position for a label on a path
     */
    private findLabelPosition(path: PathInfo): { x: number; y: number; theta: number } | null {
        const points = path.points
        if (points.length < 10) return null

        // Simple approach: find the middle of the path
        const midIndex = Math.floor(points.length / 2)
        const midPoint = points[midIndex]

        // Calculate angle at this point
        let theta = 0
        if (midIndex > 0 && midIndex < points.length - 1) {
            const prev = points[midIndex - 1]
            const next = points[midIndex + 1]
            theta = Math.atan2(next.y - prev.y, next.x - prev.x)
        }

        return {
            x: midPoint.x,
            y: midPoint.y,
            theta
        }
    }

    /**
     * Create a text sprite using canvas
     */
    private createTextSprite(
        text: string,
        position: { x: number; y: number; theta: number },
        fontSize: number,
        fontFamily: string,
        color: string
    ): THREE.Sprite | null {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        ctx.font = `${fontSize}px ${fontFamily}`
        const metrics = ctx.measureText(text)
        const textWidth = metrics.width + 10
        const textHeight = fontSize + 6

        canvas.width = textWidth
        canvas.height = textHeight

        ctx.fillStyle = color
        ctx.font = `${fontSize}px ${fontFamily}`
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillText(text, textWidth / 2, textHeight / 2)

        const texture = new THREE.CanvasTexture(canvas)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        })

        const sprite = new THREE.Sprite(material)
        sprite.position.set(position.x, position.y, 0)
        sprite.rotation.z = -position.theta
        sprite.scale.set(textWidth / 2, textHeight / 2, 1)

        return sprite
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        for (const label of this.labels) {
            if (label.material.map) {
                label.material.map.dispose()
            }
            label.material.dispose()
        }
        this.labels = []
        this.scene.remove(this.labelGroup)
    }
}
