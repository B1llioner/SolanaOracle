import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Pool, Protocol, PoolType } from '@prisma/client';
import { PoolInfo, PoolFilter, PoolSort, PoolStats } from '../../common/types/pools';

@Injectable()
export class PoolsRepository {
  private readonly logger = new Logger(PoolsRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Создает новый пул
   */
  async create(poolData: Omit<Pool, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pool> {
    try {
      const pool = await this.prisma.pool.create({
        data: poolData,
      });
      
      this.logger.debug(`Создан пул: ${pool.address}`);
      return pool;
    } catch (error) {
      this.logger.error(`Ошибка создания пула ${poolData.address}:`, error);
      throw error;
    }
  }

  /**
   * Обновляет существующий пул
   */
  async update(address: string, poolData: Partial<Pool>): Promise<Pool> {
    try {
      const pool = await this.prisma.pool.update({
        where: { address },
        data: poolData,
      });
      
      this.logger.debug(`Обновлен пул: ${address}`);
      return pool;
    } catch (error) {
      this.logger.error(`Ошибка обновления пула ${address}:`, error);
      throw error;
    }
  }

  /**
   * Создает или обновляет пул (upsert)
   */
  async upsert(poolData: Omit<Pool, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pool> {
    try {
      const pool = await this.prisma.pool.upsert({
        where: { address: poolData.address },
        update: {
          protocol: poolData.protocol,
          poolType: poolData.poolType,
          tokenA: poolData.tokenA,
          tokenB: poolData.tokenB,
          tokenAMint: poolData.tokenAMint,
          tokenBMint: poolData.tokenBMint,
          fee: poolData.fee,
          feeRate: poolData.feeRate,
          liquidity: poolData.liquidity,
          volume24h: poolData.volume24h,
          tvl: poolData.tvl,
        },
        create: poolData,
      });
      
      this.logger.debug(`Upsert пула: ${pool.address}`);
      return pool;
    } catch (error) {
      this.logger.error(`Ошибка upsert пула ${poolData.address}:`, error);
      throw error;
    }
  }

  /**
   * Находит пул по адресу
   */
  async findByAddress(address: string): Promise<Pool | null> {
    try {
      return await this.prisma.pool.findUnique({
        where: { address },
      });
    } catch (error) {
      this.logger.error(`Ошибка поиска пула по адресу ${address}:`, error);
      throw error;
    }
  }

  /**
   * Находит пул по ID
   */
  async findById(id: string): Promise<Pool | null> {
    try {
      return await this.prisma.pool.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Ошибка поиска пула по ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Находит пулы по токенам
   */
  async findByTokens(tokenAMint: string, tokenBMint: string): Promise<Pool[]> {
    try {
      return await this.prisma.pool.findMany({
        where: {
          OR: [
            {
              tokenAMint,
              tokenBMint,
            },
            {
              tokenAMint: tokenBMint,
              tokenBMint: tokenAMint,
            },
          ],
        },
        orderBy: { liquidity: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Ошибка поиска пулов по токенам ${tokenAMint}/${tokenBMint}:`, error);
      throw error;
    }
  }

  /**
   * Находит пулы с фильтрацией
   */
  async findWithFilters(
    filter: PoolFilter,
    sort: PoolSort = { field: 'liquidity', direction: 'desc' },
    limit: number = 100,
    offset: number = 0
  ): Promise<Pool[]> {
    try {
      const where: any = {};

      if (filter.protocol) {
        where.protocol = filter.protocol;
      }

      if (filter.poolType) {
        where.poolType = filter.poolType;
      }

      if (filter.tokenMint) {
        where.OR = [
          { tokenAMint: filter.tokenMint },
          { tokenBMint: filter.tokenMint },
        ];
      }

      if (filter.minLiquidity) {
        where.liquidity = {
          gte: filter.minLiquidity,
        };
      }

      if (filter.maxFee) {
        where.fee = {
          lte: filter.maxFee,
        };
      }

      const orderBy: any = {};
      orderBy[sort.field] = sort.direction;

      return await this.prisma.pool.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      });
    } catch (error) {
      this.logger.error('Ошибка поиска пулов с фильтрами:', error);
      throw error;
    }
  }

  /**
   * Получает статистику пулов
   */
  async getStats(): Promise<PoolStats> {
    try {
      const [
        totalLiquidity,
        totalVolume24h,
        totalTvl,
        poolCount,
        protocolDistribution,
      ] = await Promise.all([
        this.prisma.pool.aggregate({
          _sum: { liquidity: true },
        }),
        this.prisma.pool.aggregate({
          _sum: { volume24h: true },
        }),
        this.prisma.pool.aggregate({
          _sum: { tvl: true },
        }),
        this.prisma.pool.count(),
        this.prisma.pool.groupBy({
          by: ['protocol'],
          _count: { protocol: true },
        }),
      ]);

      const distribution: Record<Protocol, number> = {
        [Protocol.RAYDIUM_AMM]: 0,
        [Protocol.RAYDIUM_CLMM]: 0,
        [Protocol.ORCA_WHIRLPOOL]: 0,
        [Protocol.METEORA_DLMM]: 0,
      };

      protocolDistribution.forEach((item) => {
        distribution[item.protocol] = item._count.protocol;
      });

      return {
        totalLiquidity: totalLiquidity._sum.liquidity || 0,
        totalVolume24h: totalVolume24h._sum.volume24h || 0,
        totalTvl: totalTvl._sum.tvl || 0,
        poolCount,
        protocolDistribution: distribution,
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики пулов:', error);
      throw error;
    }
  }

  /**
   * Удаляет пул
   */
  async delete(address: string): Promise<void> {
    try {
      await this.prisma.pool.delete({
        where: { address },
      });
      
      this.logger.debug(`Удален пул: ${address}`);
    } catch (error) {
      this.logger.error(`Ошибка удаления пула ${address}:`, error);
      throw error;
    }
  }

  /**
   * Удаляет пулы по протоколу
   */
  async deleteByProtocol(protocol: Protocol): Promise<number> {
    try {
      const result = await this.prisma.pool.deleteMany({
        where: { protocol },
      });
      
      this.logger.debug(`Удалено ${result.count} пулов протокола ${protocol}`);
      return result.count;
    } catch (error) {
      this.logger.error(`Ошибка удаления пулов протокола ${protocol}:`, error);
      throw error;
    }
  }

  /**
   * Получает количество пулов
   */
  async count(filter?: PoolFilter): Promise<number> {
    try {
      const where: any = {};

      if (filter?.protocol) {
        where.protocol = filter.protocol;
      }

      if (filter?.poolType) {
        where.poolType = filter.poolType;
      }

      if (filter?.tokenMint) {
        where.OR = [
          { tokenAMint: filter.tokenMint },
          { tokenBMint: filter.tokenMint },
        ];
      }

      return await this.prisma.pool.count({ where });
    } catch (error) {
      this.logger.error('Ошибка подсчета пулов:', error);
      throw error;
    }
  }

  /**
   * Получает пулы с пагинацией
   */
  async findWithPagination(
    page: number = 1,
    pageSize: number = 20,
    filter?: PoolFilter,
    sort?: PoolSort
  ): Promise<{ pools: Pool[]; total: number; page: number; pageSize: number; totalPages: number }> {
    try {
      const offset = (page - 1) * pageSize;
      const [pools, total] = await Promise.all([
        this.findWithFilters(filter || {}, sort || { field: 'liquidity', direction: 'desc' }, pageSize, offset),
        this.count(filter),
      ]);

      return {
        pools,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.logger.error('Ошибка получения пулов с пагинацией:', error);
      throw error;
    }
  }
}
