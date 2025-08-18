import { Injectable, Logger } from '@nestjs/common';
import { RpcPoolService } from '../../common/rpc/rpc-pool.service';
import { CacheService } from '../../common/cache/cache.service';
import { PoolsRepository } from '../../db/repositories/pools.repo';
import { RaydiumAmmLayout } from './raydium-amm.layout';
import { ConfigService } from '../../config/config.service';
import {
  LiquidityPoolData,
  PoolQuoteRequest,
  PoolQuoteResponse,
  PoolDiscoveryResult,
  PoolUpdateResult,
  PoolHealthCheck,
} from '../common/liquidity-pool.interface';
import { Protocol, PoolType } from '../../common/types/pools';
import { PoolMath } from '../../common/utils/math';
import { PubkeyUtils } from '../../common/utils/pubkey';

@Injectable()
export class RaydiumAmmService {
  private readonly logger = new Logger(RaydiumAmmService.name);
  private readonly PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
  private readonly CACHE_PREFIX = 'raydium_amm';
  private readonly CACHE_TTL = 60; // 1 минута

  constructor(
    private rpcService: RpcPoolService,
    private cacheService: CacheService,
    private poolsRepository: PoolsRepository,
    private layout: RaydiumAmmLayout,
    private configService: ConfigService,
  ) {}

  /**
   * Обнаруживает пулы Raydium AMM
   */
  async discoverPools(limit: number = 1000): Promise<PoolDiscoveryResult> {
    const cacheKey = `${this.CACHE_PREFIX}:discovery:${limit}`;
    
    // Проверяем кэш
    const cached = await this.cacheService.get<PoolDiscoveryResult>(cacheKey);
    if (cached) {
      this.logger.debug('Найдены кэшированные пулы Raydium AMM');
      return cached;
    }

    try {
      this.logger.log(`Начинаем обнаружение пулов Raydium AMM (лимит: ${limit})`);

      // Получаем все аккаунты программы
      const accounts = await this.rpcService.getProgramAccounts(this.PROGRAM_ID, [
        { dataSize: this.layout.getLayoutSize() },
      ]);

      this.logger.log(`Найдено ${accounts.length} аккаунтов программы Raydium AMM`);

      const pools: LiquidityPoolData[] = [];
      let processedCount = 0;
      let errorCount = 0;

      // Обрабатываем аккаунты батчами
      const batchSize = 50;
      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (account) => {
          try {
            const poolData = this.layout.parsePoolAccount(
              Buffer.from(account.account.data, 'base64'),
              account.pubkey
            );

            if (poolData) {
              pools.push(poolData);
            }
          } catch (error) {
            errorCount++;
            this.logger.debug(`Ошибка обработки аккаунта ${account.pubkey}: ${error.message}`);
          }
        });

        await Promise.allSettled(batchPromises);
        processedCount += batch.length;

        // Логируем прогресс
        if (processedCount % 100 === 0) {
          this.logger.log(`Обработано ${processedCount}/${accounts.length} аккаунтов`);
        }

        // Проверяем лимит
        if (pools.length >= limit) {
          break;
        }
      }

      const result: PoolDiscoveryResult = {
        pools: pools.slice(0, limit),
        totalFound: pools.length,
        lastSlot: await this.rpcService.getSlot(),
        discoveryTime: new Date(),
      };

      // Кэшируем результат
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      this.logger.log(`Обнаружено ${result.pools.length} пулов Raydium AMM`);
      return result;
    } catch (error) {
      this.logger.error('Ошибка обнаружения пулов Raydium AMM:', error);
      throw error;
    }
  }

  /**
   * Обновляет пулы в базе данных
   */
  async updatePools(pools: LiquidityPoolData[]): Promise<PoolUpdateResult> {
    let updated = 0;
    let created = 0;
    let errors = 0;

    for (const pool of pools) {
      try {
        const existingPool = await this.poolsRepository.findByAddress(pool.address);
        
        if (existingPool) {
          await this.poolsRepository.update(pool.address, {
            protocol: pool.protocol,
            poolType: pool.poolType,
            tokenA: pool.tokenA,
            tokenB: pool.tokenB,
            tokenAMint: pool.tokenAMint,
            tokenBMint: pool.tokenBMint,
            fee: pool.fee,
            feeRate: pool.feeRate,
            liquidity: pool.liquidity,
            volume24h: pool.volume24h,
            tvl: pool.tvl,
          });
          updated++;
        } else {
          await this.poolsRepository.create({
            address: pool.address,
            protocol: pool.protocol,
            poolType: pool.poolType,
            tokenA: pool.tokenA,
            tokenB: pool.tokenB,
            tokenAMint: pool.tokenAMint,
            tokenBMint: pool.tokenBMint,
            fee: pool.fee,
            feeRate: pool.feeRate,
            liquidity: pool.liquidity,
            volume24h: pool.volume24h,
            tvl: pool.tvl,
          });
          created++;
        }
      } catch (error) {
        errors++;
        this.logger.error(`Ошибка обновления пула ${pool.address}:`, error);
      }
    }

    const result: PoolUpdateResult = {
      updated,
      created,
      errors,
      lastUpdate: new Date(),
    };

    this.logger.log(`Обновлено пулов Raydium AMM: ${updated} обновлено, ${created} создано, ${errors} ошибок`);
    return result;
  }

  /**
   * Получает котировку для свапа
   */
  async getQuote(request: PoolQuoteRequest): Promise<PoolQuoteResponse | null> {
    const { inputToken, outputToken, inputAmount } = request;

    try {
      // Находим пулы для данной пары токенов
      const pools = await this.poolsRepository.findByTokens(inputToken, outputToken);
      const raydiumPools = pools.filter(pool => pool.protocol === Protocol.RAYDIUM_AMM);

      if (raydiumPools.length === 0) {
        this.logger.debug(`Не найдены пулы Raydium AMM для пары ${inputToken}/${outputToken}`);
        return null;
      }

      let bestQuote: PoolQuoteResponse | null = null;
      let bestOutputAmount = 0;

      // Проверяем каждый пул
      for (const pool of raydiumPools) {
        try {
          const quote = await this.calculatePoolQuote(pool, request);
          if (quote && quote.outputAmount > bestOutputAmount) {
            bestQuote = quote;
            bestOutputAmount = quote.outputAmount;
          }
        } catch (error) {
          this.logger.debug(`Ошибка расчета котировки для пула ${pool.address}: ${error.message}`);
        }
      }

      return bestQuote;
    } catch (error) {
      this.logger.error(`Ошибка получения котировки Raydium AMM:`, error);
      return null;
    }
  }

  /**
   * Вычисляет котировку для конкретного пула
   */
  private async calculatePoolQuote(
    pool: any,
    request: PoolQuoteRequest
  ): Promise<PoolQuoteResponse | null> {
    try {
      // Получаем актуальные данные пула
      const accountInfo = await this.rpcService.getAccountInfo(pool.address);
      if (!accountInfo) {
        return null;
      }

      const poolData = this.layout.parsePoolAccount(
        Buffer.from(accountInfo.data, 'base64'),
        pool.address
      );

      if (!poolData || !poolData.reserves) {
        return null;
      }

      const { inputToken, outputToken, inputAmount } = request;
      const isTokenAToB = pool.tokenAMint === inputToken && pool.tokenBMint === outputToken;

      let reserveIn: number;
      let reserveOut: number;

      if (isTokenAToB) {
        reserveIn = poolData.reserves.tokenA;
        reserveOut = poolData.reserves.tokenB;
      } else {
        reserveIn = poolData.reserves.tokenB;
        reserveOut = poolData.reserves.tokenA;
      }

      // Проверяем достаточность ликвидности
      if (!PoolMath.hasSufficientLiquidity(inputAmount, reserveIn)) {
        return null;
      }

      // Вычисляем выходное количество
      const outputAmount = PoolMath.getAmountOut(
        PoolType.CONSTANT_PRODUCT,
        inputAmount,
        reserveIn,
        reserveOut,
        pool.fee
      );

      if (outputAmount <= 0) {
        return null;
      }

      // Вычисляем влияние на цену
      const priceImpact = PoolMath.getPriceImpact(
        PoolType.CONSTANT_PRODUCT,
        inputAmount,
        reserveIn,
        reserveOut
      );

      // Вычисляем комиссию
      const fee = PoolMath.calculateFee(inputAmount, pool.fee);

      const quote: PoolQuoteResponse = {
        inputToken,
        outputToken,
        inputAmount,
        outputAmount,
        price: outputAmount / inputAmount,
        priceImpact,
        fee,
        poolAddress: pool.address,
        protocol: Protocol.RAYDIUM_AMM,
        poolType: PoolType.CONSTANT_PRODUCT,
        validUntil: new Date(Date.now() + 30000), // 30 секунд
      };

      return quote;
    } catch (error) {
      this.logger.error(`Ошибка расчета котировки для пула ${pool.address}:`, error);
      return null;
    }
  }

  /**
   * Проверяет здоровье сервиса
   */
  async healthCheck(): Promise<PoolHealthCheck> {
    const startTime = Date.now();
    let isHealthy = true;
    let errorCount = 0;

    try {
      // Проверяем подключение к RPC
      await this.rpcService.getSlot();

      // Проверяем наличие пулов в базе
      const poolCount = await this.poolsRepository.count({ protocol: Protocol.RAYDIUM_AMM });
      if (poolCount === 0) {
        isHealthy = false;
        errorCount++;
      }

      const responseTime = Date.now() - startTime;

      return {
        isHealthy,
        lastCheck: new Date(),
        errorCount,
        responseTime,
        details: {
          poolCount,
          programId: this.PROGRAM_ID,
        },
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastCheck: new Date(),
        errorCount: errorCount + 1,
        responseTime: Date.now() - startTime,
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Получает статистику пулов Raydium AMM
   */
  async getStats(): Promise<{
    totalPools: number;
    totalLiquidity: number;
    averageFee: number;
    lastUpdate: Date;
  }> {
    try {
      const pools = await this.poolsRepository.findWithFilters(
        { protocol: Protocol.RAYDIUM_AMM },
        { field: 'liquidity', direction: 'desc' },
        1000
      );

      const totalPools = pools.length;
      const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidity, 0);
      const averageFee = pools.reduce((sum, pool) => sum + pool.fee, 0) / totalPools;

      return {
        totalPools,
        totalLiquidity,
        averageFee,
        lastUpdate: new Date(),
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики Raydium AMM:', error);
      throw error;
    }
  }

  /**
   * Очищает кэш
   */
  async clearCache(): Promise<void> {
    try {
      await this.cacheService.deletePattern(`${this.CACHE_PREFIX}:*`);
      this.logger.log('Кэш Raydium AMM очищен');
    } catch (error) {
      this.logger.error('Ошибка очистки кэша Raydium AMM:', error);
      throw error;
    }
  }
}
