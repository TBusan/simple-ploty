// Type definitions for contour algorithms

export interface Point {
    x: number;
    y: number;
}

export interface PathInfo {
    level: number;
    points: Point[];
    isClosed: boolean;
}

export interface ContourLevel {
    level: number;
    paths: PathInfo[];
}
