// Main entry point for three-contour library

// Core classes
export { Contour } from './core/Contour';
export type { ContourOptions } from './core/ContourOptions';
export type { ContourData } from './core/ContourData';

// Algorithms
export { MarchingSquares, getMarchingIndex, getCrossingPoint, getInterpFactor, } from './algorithms/MarchingSquares';
export { PathFinder, findAllPaths, makeCrossings } from './algorithms/PathFinder';
export type { PathInfo, Point, ContourLevel } from './algorithms/types';
export { applyConstraint, parseConstraint, ConstraintRenderer } from './algorithms/Constraints';
export type { Constraint, ConstraintOperator } from './algorithms/Constraints';

// Coloring
export { ColorScale, BUILT_IN_COLORSCALES } from './coloring/ColorScale';
export { makeColorMap } from './coloring/ColorMap';

// Smoothing
export { CatmullRom } from './smoothing/CatmullRom';

// Rendering
export { FillRenderer } from './rendering/FillRenderer';
export { LineRenderer } from './rendering/LineRenderer';
export { HeatmapRenderer } from './rendering/HeatmapRenderer';
export { LabelRenderer } from './rendering/LabelRenderer';

// Interaction
export { InteractionManager } from './interaction/InteractionManager';

// Utils
export { toLogScale, fromLogScale, logInterpolate, isValidLogValue } from './utils/LogAxis';
export { clamp, distance2D, normalizeAngle } from './utils/MathUtils';

// Constants
export {
    BOTTOMSTART,
    TOPSTART,
    LEFTSTART,
    RIGHTSTART,
    NEWDELTA,
    SADDLE_CODES
} from './algorithms/constants';
