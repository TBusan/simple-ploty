import { CHOOSE_SADDLE, SADDLE_REMAINDER } from './constants';

/**
 * 鞍点处理器
 * 负责处理 Marching Squares 算法中的鞍点消歧
 */
export class SaddleHandler {
  /**
   * 消除鞍点歧义
   * 使用平均值法判断鞍点的正确路径
   *
   * @param corners 四个角点的值 [左上, 右上, 右下, 左下]
   * @param level 等值线级别
   * @returns 消歧后的 Marching Index (104, 208, 713, 1114)
   */
  static disambiguateSaddle(
    corners: [number, number, number, number],
    level: number
  ): number {
    // 计算四个角点的平均值
    const avg = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;

    // 判断基本鞍点类型 (5 或 10)
    const baseCase = (corners[0] > level ? 0 : 1) +
                     (corners[1] > level ? 0 : 2) +
                     (corners[2] > level ? 0 : 4) +
                     (corners[3] > level ? 0 : 8);

    // 根据平均值与 level 的关系决定路径
    if (baseCase === 5) {
      // 对角情况 1: 左上和右下 <= level
      if (level > avg) {
        // 两个峰之间的谷
        return 713;
      } else {
        // 两个谷之间的峰
        return 104;
      }
    } else if (baseCase === 10) {
      // 对角情况 2: 右上和左下 <= level
      if (level > avg) {
        // 两个峰之间的谷
        return 1114;
      } else {
        // 两个谷之间的峰
        return 208;
      }
    }

    // 如果不是鞍点情况，返回基本索引
    return baseCase;
  }

  /**
   * 获取鞍点的两条路径
   *
   * @param saddleCode 鞍点编码 (104, 208, 713, 1114)
   * @param dx x 方向梯度
   * @param dy y 方向梯度
   * @returns [第一条路径索引, 第二条路径索引]
   */
  static getSaddlePaths(
    saddleCode: number,
    dx: number,
    dy: number
  ): [number, number] {
    const choose = CHOOSE_SADDLE[saddleCode];
    if (!choose) {
      throw new Error(`Invalid saddle code: ${saddleCode}`);
    }

    const [negPath, posPath] = choose;
    const gradient = dx * dy;

    if (gradient < 0) {
      // 使用负梯度路径
      return [negPath, SADDLE_REMAINDER[negPath]];
    } else {
      // 使用正梯度路径
      return [posPath, SADDLE_REMAINDER[posPath]];
    }
  }

  /**
   * 检查是否为鞍点
   *
   * @param mi Marching Index
   * @returns 是否为鞍点
   */
  static isSaddle(mi: number): boolean {
    return mi === 104 || mi === 208 || mi === 713 || mi === 1114;
  }

  /**
   * 检查基础情况是否为鞍点
   *
   * @param baseCase 基础 Marching Index (5 或 10)
   * @returns 是否为鞍点情况
   */
  static isSaddleCase(baseCase: number): boolean {
    return baseCase === 5 || baseCase === 10;
  }
}
