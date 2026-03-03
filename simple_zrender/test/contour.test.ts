import { Contour } from '../src/contour/Contour';

describe('Contour', () => {
  test('should create contour with basic options', () => {
    const contour = new Contour({
      z: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
      x: [0, 1, 2],
      y: [0, 1, 2]
    });

    expect(contour).toBeDefined();
    expect(contour.getOption()).toBeDefined();
    expect(contour.getGridData()).toBeDefined();
  });

  test('should merge default options', () => {
    const contour = new Contour({
      z: [[1, 2], [3, 4]]
    });

    const option = contour.getOption();
    expect(option.contours?.coloring).toBe('fill');
    expect(option.contours?.showlines).toBe(true);
    expect(option.line?.smoothing).toBe(1);
  });

  test('should generate default x and y coordinates', () => {
    const contour = new Contour({
      z: [[1, 2, 3], [4, 5, 6]]
    });

    const gridData = contour.getGridData();
    expect(gridData.x).toEqual([0, 1, 2]);
    expect(gridData.y).toEqual([0, 1]);
  });
});
