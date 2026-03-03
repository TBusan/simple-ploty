// Logarithmic axis utilities
import { isFinite } from '../utils/MathUtils';

/**
 * Log axis configuration
 */
export interface LogAxisConfig {
    type: 'log';
    base?: number;  // Base of logarithm (default: 10)
    autorange?: boolean;  // Auto-range the axis
    dtick?: number;  // Tick spacing
}

/**
 * Linear axis configuration
 */
export interface LinearAxisConfig {
    type: '-' | 'linear';
}

export type AxisConfig = LogAxisConfig | LinearAxisConfig;

/**
 * Check if a value is a valid log axis value
 * @param value - The value to check
 * @returns true if value is valid for log axis
 */
export function isValidLogValue(value: number): boolean {
    return isFinite(value) && value > 0;
}

/**
 * Convert a value to log scale
 * @param value - The value to convert
 * @param base - The logarithm base (default: 10)
 * @returns The log-scaled value, or NaN if invalid
 */
export function toLogScale(value: number, base: number = 10): number {
    if (!isValidLogValue(value)) {
        return NaN;
    }
    return Math.log(value) / Math.log(base);
}

/**
 * Convert a log-scaled value back to linear
 * @param logValue - The log-scaled value
 * @param base - The logarithm base (default: 10)
 * @returns The linear value
 */
export function fromLogScale(logValue: number, base: number = 10): number {
    return Math.pow(base, logValue);
}

/**
 * Calculate nice tick values for a log axis
 * @param min - Minimum value (linear scale)
 * @param max - Maximum value (linear scale)
 * @param base - The logarithm base (default: 10)
 * @returns Array of tick values in linear scale
 */
export function calculateLogTicks(min: number, max: number, base: number = 10): number[] {
    if (min <= 0 || max <= 0) {
        return [];
    }

    const logMin = toLogScale(min, base);
    const logMax = toLogScale(max, base);

    const ticks: number[] = [];
    const startExp = Math.floor(logMin);
    const endExp = Math.ceil(logMax);

    for (let exp = startExp; exp <= endExp; exp++) {
                const tickValue = fromLogScale(exp, base);
                if (tickValue >= min && tickValue <= max) {
                    ticks.push(tickValue);
                }
            }

            return ticks;
        }

/**
 * Transform data coordinates for log axis
 * @param value - The coordinate value
 * @param min - Minimum value in the data
 * @param max - Maximum value in the data
 * @param isLog - Whether the axis is logarithmic
 * @param base - The logarithm base (default: 10)
 * @returns The transformed coordinate
 */
export function transformCoordinate(
    value: number,
    min: number,
    max: number,
    isLog: boolean,
    base: number = 10
): number {
    if (!isLog) {
        return (value - min) / (max - min);
    }

    if (!isValidLogValue(value) || !isValidLogValue(min) || !isValidLogValue(max)) {
        return NaN;
    }

    const logValue = toLogScale(value, base);
    const logMin = toLogScale(min, base);
    const logMax = toLogScale(max, base);

    return (logValue - logMin) / (logMax - logMin);
}

/**
 * Interpolate in log space
 * @param v1 - First value
 * @param v2 - Second value
 * @param t - Interpolation factor (0-1)
 * @param base - The logarithm base (default: 10)
 * @returns Interpolated value
 */
export function logInterpolate(v1: number, v2: number, t: number, base: number = 10): number {
    if (!isValidLogValue(v1) || !isValidLogValue(v2)) {
        return NaN;
    }

    const logV1 = toLogScale(v1, base);
    const logV2 = toLogScale(v2, base);
    const logResult = logV1 + (logV2 - logV1) * t;

    return fromLogScale(logResult, base);
}
