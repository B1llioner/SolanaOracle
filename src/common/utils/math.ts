import { PoolType } from '../types/pools';

/**
 * Константный продукт (Constant Product Market Maker) математика
 */
export class CPMMMath {
  /**
   * Вычисляет количество токенов B при свапе токена A
   */
  static getAmountOut(
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    fee: number
  ): number {
    const amountInWithFee = amountIn * (1 - fee);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    return numerator / denominator;
  }

  /**
   * Вычисляет количество токенов A для получения определенного количества токенов B
   */
  static getAmountIn(
    amountOut: number,
    reserveIn: number,
    reserveOut: number,
    fee: number
  ): number {
    const numerator = reserveIn * amountOut;
    const denominator = (reserveOut - amountOut) * (1 - fee);
    return numerator / denominator;
  }

  /**
   * Вычисляет цену токена
   */
  static getPrice(reserveA: number, reserveB: number): number {
    return reserveB / reserveA;
  }

  /**
   * Вычисляет влияние на цену (price impact)
   */
  static getPriceImpact(
    amountIn: number,
    reserveIn: number,
    reserveOut: number
  ): number {
    const priceBefore = this.getPrice(reserveIn, reserveOut);
    const newReserveIn = reserveIn + amountIn;
    const newReserveOut = reserveOut - this.getAmountOut(amountIn, reserveIn, reserveOut, 0);
    const priceAfter = this.getPrice(newReserveIn, newReserveOut);
    return ((priceAfter - priceBefore) / priceBefore) * 100;
  }
}

/**
 * Концентрированная ликвидность (Concentrated Liquidity) математика
 */
export class CLMMMath {
  /**
   * Вычисляет количество токенов при свапе в диапазоне цен
   */
  static getAmountOut(
    amountIn: number,
    sqrtPriceX64: number,
    sqrtPriceLimitX64: number,
    liquidity: number,
    fee: number
  ): number {
    // Упрощенная реализация для примера
    const amountInWithFee = amountIn * (1 - fee);
    const priceImpact = Math.abs(sqrtPriceX64 - sqrtPriceLimitX64) / sqrtPriceX64;
    return amountInWithFee * (1 - priceImpact);
  }

  /**
   * Вычисляет ликвидность для диапазона цен
   */
  static calculateLiquidity(
    sqrtPriceAX64: number,
    sqrtPriceBX64: number,
    amountA: number,
    amountB: number
  ): number {
    const sqrtPriceDiff = Math.abs(sqrtPriceBX64 - sqrtPriceAX64);
    return Math.min(amountA * sqrtPriceAX64, amountB / sqrtPriceBX64) / sqrtPriceDiff;
  }
}

/**
 * Динамическая ликвидность (Dynamic Liquidity) математика
 */
export class DLMMMath {
  /**
   * Вычисляет количество токенов с учетом динамических весов
   */
  static getAmountOut(
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    weightIn: number,
    weightOut: number,
    fee: number
  ): number {
    const amountInWithFee = amountIn * (1 - fee);
    const weightRatio = weightIn / weightOut;
    const numerator = amountInWithFee * reserveOut * weightRatio;
    const denominator = reserveIn + amountInWithFee;
    return numerator / denominator;
  }

  /**
   * Вычисляет оптимальные веса токенов
   */
  static calculateOptimalWeights(
    reserveA: number,
    reserveB: number,
    volatilityA: number,
    volatilityB: number
  ): { weightA: number; weightB: number } {
    const totalReserve = reserveA + reserveB;
    const weightA = reserveA / totalReserve * (1 - volatilityA);
    const weightB = reserveB / totalReserve * (1 - volatilityB);
    
    // Нормализация весов
    const totalWeight = weightA + weightB;
    return {
      weightA: weightA / totalWeight,
      weightB: weightB / totalWeight,
    };
  }
}

/**
 * Общий класс для работы с математикой пулов
 */
export class PoolMath {
  /**
   * Вычисляет количество токенов в зависимости от типа пула
   */
  static getAmountOut(
    poolType: PoolType,
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    fee: number,
    additionalParams?: Record<string, any>
  ): number {
    switch (poolType) {
      case PoolType.CONSTANT_PRODUCT:
        return CPMMMath.getAmountOut(amountIn, reserveIn, reserveOut, fee);
      
      case PoolType.CONCENTRATED:
        const { sqrtPriceX64, sqrtPriceLimitX64, liquidity } = additionalParams || {};
        return CLMMMath.getAmountOut(amountIn, sqrtPriceX64, sqrtPriceLimitX64, liquidity, fee);
      
      case PoolType.WEIGHTED:
        const { weightIn, weightOut } = additionalParams || {};
        return DLMMMath.getAmountOut(amountIn, reserveIn, reserveOut, weightIn, weightOut, fee);
      
      default:
        throw new Error(`Неподдерживаемый тип пула: ${poolType}`);
    }
  }

  /**
   * Вычисляет влияние на цену
   */
  static getPriceImpact(
    poolType: PoolType,
    amountIn: number,
    reserveIn: number,
    reserveOut: number,
    additionalParams?: Record<string, any>
  ): number {
    switch (poolType) {
      case PoolType.CONSTANT_PRODUCT:
        return CPMMMath.getPriceImpact(amountIn, reserveIn, reserveOut);
      
      case PoolType.CONCENTRATED:
        // Упрощенная реализация для CLMM
        return CPMMMath.getPriceImpact(amountIn, reserveIn, reserveOut) * 0.5;
      
      case PoolType.WEIGHTED:
        // Упрощенная реализация для DLMM
        return CPMMMath.getPriceImpact(amountIn, reserveIn, reserveOut) * 0.8;
      
      default:
        throw new Error(`Неподдерживаемый тип пула: ${poolType}`);
    }
  }

  /**
   * Вычисляет комиссию за свап
   */
  static calculateFee(amountIn: number, feeRate: number): number {
    return amountIn * feeRate;
  }

  /**
   * Проверяет достаточность ликвидности
   */
  static hasSufficientLiquidity(
    amountIn: number,
    reserveIn: number,
    minLiquidityRatio: number = 0.01
  ): boolean {
    return reserveIn >= amountIn * minLiquidityRatio;
  }
}
