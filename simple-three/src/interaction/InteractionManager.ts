// Interaction system for contour plots
import * as THREE from 'three';

/**
 * Mouse interaction state
 */
export interface MouseState {
    x: number;
    y: number;
    isDown: boolean;
    button: number;
    startX: number;
    startY: number;
}

/**
 * Zoom state
 */
export interface ZoomState {
    current: number;
    min: number;
    max: number;
    centerX: number;
    centerY: number;
}

/**
 * Interaction manager for contour plots
 */
export class InteractionManager {
    private domElement: HTMLElement;
    private camera: THREE.Camera;
    private renderer: THREE.Renderer;
    private mouseState: MouseState;
    private zoomState: ZoomState;
    private panOffset: { x: number; y: number } = { x: 0, y: 0 };
    private callbacks: Map<string, Function[]> = new Map();
    private raycaster: THREE.Raycaster;
    private hoveredObject: THREE.Object3D | null = null;

    constructor(
        domElement: HTMLElement,
        camera: THREE.Camera,
        renderer: THREE.Renderer
    ) {
        this.domElement = domElement;
        this.camera = camera;
        this.renderer = renderer;
        this.raycaster = new THREE.Raycaster();

        this.mouseState = {
            x: 0,
            y: 0,
            isDown: false,
            button: 0,
            startX: 0,
            startY: 0
        };

        this.zoomState = {
            current: 1,
            min: 0.1,
            max: 10,
            centerX: 0,
            centerY: 0
        };

        this.setupEventListeners();
    }

    /**
     * Set up DOM event listeners
     */
    private setupEventListeners(): void {
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('wheel', this.onWheel.bind(this));
        this.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    }

    /**
     * Handle mouse down event
     */
    private onMouseDown(event: MouseEvent): void {
        const rect = this.domElement.getBoundingClientRect();
        this.mouseState.isDown = true;
        this.mouseState.button = event.button;
        this.mouseState.startX = event.clientX - rect.left;
        this.mouseState.startY = event.clientY - rect.top;
        this.mouseState.x = this.mouseState.startX;
        this.mouseState.y = this.mouseState.startY;

        this.emit('mousedown', {
            x: this.mouseState.x,
            y: this.mouseState.y,
            button: event.button
        });
    }

    /**
     * Handle mouse up event
     */
    private onMouseUp(event: MouseEvent): void {
        const rect = this.domElement.getBoundingClientRect();
        this.mouseState.isDown = false;
        this.mouseState.x = event.clientX - rect.left;
        this.mouseState.y = event.clientY - rect.top;

        this.emit('mouseup', {
            x: this.mouseState.x,
            y: this.mouseState.y,
            button: event.button
        });

        // Check for click
        const dx = this.mouseState.x - this.mouseState.startX;
        const dy = this.mouseState.y - this.mouseState.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            this.emit('click', {
                x: this.mouseState.x,
                y: this.mouseState.y,
                button: event.button
            });
        }
    }

    /**
     * Handle mouse move event
     */
    private onMouseMove(event: MouseEvent): void {
        const rect = this.domElement.getBoundingClientRect();
        const prevX = this.mouseState.x;
        const prevY = this.mouseState.y;

        this.mouseState.x = event.clientX - rect.left;
        this.mouseState.y = event.clientY - rect.top;

        this.emit('mousemove', {
            x: this.mouseState.x,
            y: this.mouseState.y
        });

        // Handle panning
        if (this.mouseState.isDown) {
            const dx = this.mouseState.x - prevX;
            const dy = this.mouseState.y - prevY;

            if (this.mouseState.button === 0 || this.mouseState.button === 2) {
                this.pan(dx, dy);
            }
        }

        // Handle hover
        this.updateHover();
    }

    /**
     * Handle wheel event for zooming
     */
    private onWheel(event: WheelEvent): void {
        event.preventDefault();

        const rect = this.domElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        this.zoom(delta, mouseX, mouseY);

        this.emit('zoom', {
            zoom: this.zoomState.current,
            x: mouseX,
            y: mouseY
        });
    }

    /**
     * Handle mouse leave event
     */
    private onMouseLeave(): void {
        this.mouseState.isDown = false;

        if (this.hoveredObject) {
            this.emit('hoverend', { object: this.hoveredObject });
            this.hoveredObject = null;
        }
    }

    /**
     * Pan the view
     */
    private pan(dx: number, dy: number): void {
        this.panOffset.x += dx;
        this.panOffset.y += dy;

        // Apply to camera (for orthographic)
        if (this.camera instanceof THREE.OrthographicCamera) {
            this.camera.position.x -= dx * 0.01;
            this.camera.position.y += dy * 0.01;
        }

        this.emit('pan', {
            dx,
            dy,
            offsetX: this.panOffset.x,
            offsetY: this.panOffset.y
        });
    }

    /**
     * Zoom the view
     */
    private zoom(delta: number, centerX: number, centerY: number): void {
        const newZoom = Math.max(
            this.zoomState.min,
            Math.min(this.zoomState.max, this.zoomState.current * delta)
        );

        this.zoomState.current = newZoom;
        this.zoomState.centerX = centerX;
        this.zoomState.centerY = centerY;

        // Apply to camera (for orthographic)
        if (this.camera instanceof THREE.OrthographicCamera) {
            const cam = this.camera as THREE.OrthographicCamera;
            cam.zoom = newZoom;
            cam.updateProjectionMatrix();
        }

        this.emit('zoomchange', {
            zoom: newZoom,
            centerX,
            centerY
        });
    }

    /**
     * Update hover state using raycasting
     */
    private updateHover(): void {
        // Convert mouse position to normalized device coordinates
        const rect = this.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            (this.mouseState.x / rect.width) * 2 - 1,
            -(this.mouseState.y / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);

        // Note: In a full implementation, we would raycast against scene objects
        // For now, this is a placeholder for the hover system
    }

    /**
     * Register an event callback
     */
    on(event: string, callback: Function): void {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event)!.push(callback);
    }

    /**
     * Remove an event callback
     */
    off(event: string, callback: Function): void {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit an event
     */
    private emit(event: string, data: unknown): void {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            for (const callback of callbacks) {
                callback(data);
            }
        }
    }

    /**
     * Get current zoom level
     */
    getZoom(): number {
        return this.zoomState.current;
    }

    /**
     * Set zoom level
     */
    setZoom(zoom: number): void {
        this.zoomState.current = Math.max(
            this.zoomState.min,
            Math.min(this.zoomState.max, zoom)
        );

        if (this.camera instanceof THREE.OrthographicCamera) {
            const cam = this.camera as THREE.OrthographicCamera;
            cam.zoom = this.zoomState.current;
            cam.updateProjectionMatrix();
        }
    }

    /**
     * Reset view to default
     */
    reset(): void {
        this.panOffset = { x: 0, y: 0 };
        this.zoomState.current = 1;

        if (this.camera instanceof THREE.OrthographicCamera) {
            const cam = this.camera as THREE.OrthographicCamera;
            cam.position.set(0, 0, 0);
            cam.zoom = 1;
            cam.updateProjectionMatrix();
        }

        this.emit('reset', {});
    }

    /**
     * Clean up event listeners
     */
    dispose(): void {
        this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
        this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
        this.domElement.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
        this.callbacks.clear();
    }
}
