// Tests for interaction system
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionManager } from '../src/interaction/InteractionManager';
import * as THREE from 'three';

describe('InteractionManager', () => {
    let manager: InteractionManager;
    let mockElement: HTMLElement;
    let mockCamera: THREE.OrthographicCamera;
    let mockRenderer: THREE.WebGLRenderer;

    beforeEach(() => {
        // Create mock DOM element
        mockElement = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            getBoundingClientRect: vi.fn().mockReturnValue({
                left: 0,
                top: 0,
                width: 800,
                height: 600
            })
        } as unknown as HTMLElement;

        // Create mock camera
        mockCamera = new THREE.OrthographicCamera(-1, 1, 1, -1);

        // Create mock renderer
        mockRenderer = {
            domElement: mockElement
        } as unknown as THREE.WebGLRenderer;

        manager = new InteractionManager(mockElement, mockCamera, mockRenderer);
    });

    afterEach(() => {
        manager.dispose();
    });

    describe('initialization', () => {
        it('sets up event listeners', () => {
            expect(mockElement.addEventListener).toHaveBeenCalled();
        });

        it('initializes zoom state', () => {
            expect(manager.getZoom()).toBe(1);
        });
    });

    describe('zoom', () => {
        it('can set zoom level', () => {
            manager.setZoom(2);
            expect(manager.getZoom()).toBe(2);
        });

        it('clamps zoom to min/max', () => {
            manager.setZoom(0.01);
            expect(manager.getZoom()).toBeGreaterThan(0.05);

            manager.setZoom(100);
            expect(manager.getZoom()).toBeLessThan(20);
        });
    });

    describe('reset', () => {
        it('resets zoom and pan', () => {
            manager.setZoom(3);
            manager.reset();
            expect(manager.getZoom()).toBe(1);
        });
    });

    describe('events', () => {
        it('can register and emit events', () => {
            const callback = vi.fn();
            manager.on('test', callback);

            // Access private emit method
            (manager as unknown as { emit: (event: string, data: unknown) => void }).emit('test', { data: 'value' });

            expect(callback).toHaveBeenCalledWith({ data: 'value' });
        });

        it('can remove event listeners', () => {
            const callback = vi.fn();
            manager.on('test', callback);
            manager.off('test', callback);

            (manager as unknown as { emit: (event: string, data: unknown) => void }).emit('test', { data: 'value' });

            expect(callback).not.toHaveBeenCalled();
        });
    });
});
