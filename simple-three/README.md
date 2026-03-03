# three-contour

A Three.js library for rendering contour plots, compatible with Plotly.js contour features.

## Features

- 🎨 **Multiple Coloring Modes**: Fill, Heatmap, Lines, None
- 📊 **Marching Squares Algorithm**: Accurate contour line generation
- 🔄 **Path Finding**: Automatic open/closed path detection
- 🎨 **Color Scales**: Viridis, Jet, Hot, and custom scales
- ✨ **Smoothing**: Catmull-Rom spline interpolation
- 🏷 **Labels**: Automatic label placement with collision avoidance
- 🔧 **Constraint Contours**: Filter regions by value constraints
- 📈 **Log Axis Support**: Logarithmic scale interpolation
- 🖱️ **Null Handling**: Handle missing data gracefully
- 🎮 **Interactions**: Zoom, pan, hover

## Installation

```bash
npm install three-contour three
```

## Quick Start

```typescript
import * as THREE from 'three';
import { Contour } from 'three-contour';

// Create a scene
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
camera.position.set(0, 0, 10);

// Create contour plot
const contour = new Contour(scene, {
    z: [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
        [3, 4, 5, 6, 7],
        [4, 5, 6, 7, 8],
        [5, 6, 7, 8, 9]
    ],
    contours: {
        coloring: 'fill',
        showlines: true,
        start: 2,
        end: 8,
        size: 1
    },
    colorscale: 'Viridis'
});

// Update data
contour.update({
    z: newData
});

// Clean up
contour.dispose();
```

## API Reference

### ContourOptions

```typescript
interface ContourOptions {
    // Data
    z: number[][];           // 2D grid of values
    x?: number[];            // X coordinates (optional)
    y?: number[];            // Y coordinates (optional)

    // Contour settings
    contours?: {
        start?: number;      // First contour level
        end?: number;        // Last contour level
        size?: number;        // Step between levels
        coloring?: 'fill' | 'heatmap' | 'lines' | 'none';
        showlines?: boolean;  // Show contour lines
        showlabels?: boolean; // Show level labels
        labelfont?: {
            family?: string;
            size?: number;
            color?: string;
        };
    };

    // Color settings
    colorscale?: string | [number, string][];
    reversescale?: boolean;
    zmin?: number;
    zmax?: number;

    // Smoothing
    smoothing?: number;  // 0-1.3, higher = smoother

    // Data handling
    connectgaps?: boolean;  // Connect through null regions
}
```

### Color Scales

Built-in color scales:
- `Viridis` (default)
- `Jet`
- `Hot`
- `Cool`
- `Rainbow`

Custom color scales can be provided as an array of `[position, color]` pairs:

```typescript
const customScale: [number, string][] = [
    [0, '#0000ff'],
    [0.5, '#00ff00'],
    [1, '#ff0000']
];
```

### Constraint Contours

Filter contour regions based on value constraints:

```typescript
import { applyConstraint, parseConstraint } from 'three-contour';

const paths = contour.getPaths();

// Only show regions > 5
const filtered = applyConstraint(paths, { operator: '>', value: 5 });

// Parse constraint string
const constraint = parseConstraint('>5');
```

### Log Axis

Convert between linear and logarithmic scales:

```typescript
import { toLogScale, fromLogScale, logInterpolate } from 'three-contour';

// Convert to log scale (base 10)
const logValue = toLogScale(100); // 2

// Convert back to linear
const linearValue = fromLogScale(2); // 100

// Interpolate in log space
const interpolated = logInterpolate(10, 100, 0.5); // ~31.6
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Generate documentation
npm run docs
```

## License

MIT
