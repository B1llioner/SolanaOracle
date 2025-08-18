import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RpcPoolService } from '../common/rpc/rpc-pool.service';
import { CacheService } from '../common/cache/cache.service';
import { PoolsRepository } from '../db/repositories/pools.repo';
import { RaydiumAmmService } from '../pools/raydium-amm/raydium-amm.service';
import { ConfigService } from '../config/config.service';
import { Protocol } from '../common/types/pools';

export interface IndexerStats {
  lastIndexTime: Date;
  totalPoolsIndexed: number;
  poolsByProtocol: Record<Protocol, number>;
  errors: number;
  isRunning: boolean;
  uptime: number;
}

export interface IndexerConfig {
  enabled: boolean;
  intervalMs: number;
  batchSize: number;
  maxConcurrentRequests: number;
  protocols: Protocol[];
}

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private indexingInterval: NodeJS.Timeout | null = null;
  private isIndexing = false;
  private startTime: Date | null = null;
  private stats: IndexerStats = {
    lastIndexTime: new Date(0),
    totalPoolsIndexed: 0,
    poolsByProtocol: {
      [Protocol.RAYDIUM_AMM]: 0,
      [Protocol.RAYDIUM_CLMM]: 0,
      [Protocol.ORCA_WHIRLPOOL]: 0,
      [Protocol.METEORA_DLMM]: 0,
    },
    errors: 0,
    isRunning: false,
    uptime: 0,
  };

  constructor(
    private rpcService: RpcPoolService,
    private cacheService: CacheService,
    private poolsRepository: PoolsRepository,
    private raydiumAmmService: RaydiumAmmService,
    private configService: ConfigService,
  ) {}

  /**
   * Инициализация модуля
   */
  async onModuleInit(): Promise<void> {
    this.startTime = new Date();
    await this.startIndexing();
  }

  /**
   * Завершение работы модуля
   */
  async onModuleDestroy(): Promise<void> {
    await this.stopIndexing();
  }

  /**
   * Запускает индексацию
   */
  async startIndexing(): Promise<void> {
    if (this.isIndexing) {
      this.logger.warn('Индексация уже запущена');
      return;
    }

    const config = this.getIndexerConfig();
    if (!config.enabled) {
      this.logger.log('Индексация отключена в конфигурации');
      return;
    }

    this.logger.log('Запуск индексации пулов ликвидности');
    this.isIndexing = true;
    this.stats.isRunning = true;

    // Запускаем периодическую индексацию
    this.indexingInterval = setInterval(async () => {
      await this.performIndexing();
    }, config.intervalMs);

    // Выполняем первую индексацию
    await this.performIndexing();
  }

  /**
   * Останавливает индексацию
   */
  async stopIndexing(): Promise<void> {
    if (!this.isIndexing) {
      return;
    }

    this.logger.log('Остановка индексации');
    this.isIndexing = false;
    this.stats.isRunning = false;

    if (this.indexingInterval) {
      clearInterval(this.indexingInterval);
      this.indexingInterval = null;
    }
  }

  /**
   * Выполняет индексацию
   */
  private async performIndexing(): Promise<void> {
    if (!this.isIndexing) {
      return;
    }

    const startTime = Date.now();
    this.logger.log('Начинаем индексацию пулов');

    try {
      const config = this.getIndexerConfig();
      let totalIndexed = 0;

      // Индексируем пулы по протоколам
      for (const protocol of config.protocols) {
        try {
          const indexed = await this.indexProtocol(protocol);
          totalIndexed += indexed;
          this.stats.poolsByProtocol[protocol] = indexed;
        } catch (error) {
          this.stats.errors++;
          this.logger.error(`Ошибка индексации протокола ${protocol}:`, error);
        }
      }

      this.stats.totalPoolsIndexed = totalIndexed;
      this.stats.lastIndexTime = new Date();
      this.stats.uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

      const duration = Date.now() - startTime;
      this.logger.log(`Индексация завершена: ${totalIndexed} пулов за ${duration}ms`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('Ошибка индексации:', error);
    }
  }

  /**
   * Индексирует пулы конкретного протокола
   */
  private async indexProtocol(protocol: Protocol): Promise<number> {
    switch (protocol) {
      case Protocol.RAYDIUM_AMM:
        return await this.indexRaydiumAmm();
      
      case Protocol.RAYDIUM_CLMM:
        return await this.indexRaydiumClmm();
      
      case Protocol.ORCA_WHIRLPOOL:
        return await this.indexOrcaWhirlpool();
      
      case Protocol.METEORA_DLMM:
        return await this.indexMeteoraDlmm();
      
      default:
        this.logger.warn(`Неизвестный протокол: ${protocol}`);
        return 0;
    }
  }

  /**
   * Индексирует пулы Raydium AMM
   */
  private async indexRaydiumAmm(): Promise<number> {
    try {
      const discoveryResult = await this.raydiumAmmService.discoverPools(1000);
      const updateResult = await this.raydiumAmmService.updatePools(discoveryResult.pools);
      
      return updateResult.created + updateResult.updated;
    } catch (error) {
      this.logger.error('Ошибка индексации Raydium AMM:', error);
      return 0;
    }
  }

  /**
   * Индексирует пулы Raydium CLMM
   */
  private async indexRaydiumClmm(): Promise<number> {
    // TODO: Реализовать индексацию Raydium CLMM
    this.logger.debug('Индексация Raydium CLMM не реализована');
    return 0;
  }

  /**
   * Индексирует пулы Orca Whirlpool
   */
  private async indexOrcaWhirlpool(): Promise<number> {
    // TODO: Реализовать индексацию Orca Whirlpool
    this.logger.debug('Индексация Orca Whirlpool не реализована');
    return 0;
  }

  /**
   * Индексирует пулы Meteora DLMM
   */
  private async indexMeteoraDlmm(): Promise<number> {
    // TODO: Реализовать индексацию Meteora DLMM
    this.logger.debug('Индексация Meteora DLMM не реализована');
    return 0;
  }

  /**
   * Получает конфигурацию индексера
   */
  private getIndexerConfig(): IndexerConfig {
    return {
      enabled: true,
      intervalMs: this.configService.indexerIntervalMs,
      batchSize: 100,
      maxConcurrentRequests: this.configService.maxConcurrentRequests,
      protocols: [
        Protocol.RAYDIUM_AMM,
        Protocol.RAYDIUM_CLMM,
        Protocol.ORCA_WHIRLPOOL,
        Protocol.METEORA_DLMM,
      ],
    };
  }

  /**
   * Получает статистику индексера
   */
  getStats(): IndexerStats {
    return { ...this.stats };
  }

  /**
   * Проверяет, запущена ли индексация
   */
  isRunning(): boolean {
    return this.isIndexing;
  }

  /**
   * Принудительно запускает индексацию
   */
  async forceIndex(): Promise<void> {
    this.logger.log('Принудительный запуск индексации');
    await this.performIndexing();
  }

  /**
   * Очищает старые данные
   */
  async cleanupOldData(): Promise<{
    deletedPools: number;
    deletedQuotes: number;
  }> {
    try {
      this.logger.log('Начинаем очистку старых данных');

      const [deletedPools, deletedQuotes] = await Promise.all([
        this.poolsRepository.deleteByProtocol(Protocol.RAYDIUM_AMM),
        this.poolsRepository.deleteByProtocol(Protocol.RAYDIUM_CLMM),
      ]);

      this.logger.log(`Очищено ${deletedPools} пулов и ${deletedQuotes} котировок`);
      
      return {
        deletedPools,
        deletedQuotes,
      };
    } catch (error) {
      this.logger.error('Ошибка очистки старых данных:', error);
      throw error;
    }
  }

  /**
   * Получает информацию о здоровье индексера
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    lastIndexTime: Date;
    uptime: number;
    errors: number;
    poolCounts: Record<Protocol, number>;
  }> {
    try {
      const poolCounts: Record<Protocol, number> = {
        [Protocol.RAYDIUM_AMM]: await this.poolsRepository.count({ protocol: Protocol.RAYDIUM_AMM }),
        [Protocol.RAYDIUM_CLMM]: await this.poolsRepository.count({ protocol: Protocol.RAYDIUM_CLMM }),
        [Protocol.ORCA_WHIRLPOOL]: await this.poolsRepository.count({ protocol: Protocol.ORCA_WHIRLPOOL }),
        [Protocol.METEORA_DLMM]: await this.poolsRepository.count({ protocol: Protocol.METEORA_DLMM }),
      };

      const totalPools = Object.values(poolCounts).reduce((sum, count) => sum + count, 0);
      const isHealthy = this.isIndexing && totalPools > 0 && this.stats.errors < 10;

      return {
        isHealthy,
        lastIndexTime: this.stats.lastIndexTime,
        uptime: this.stats.uptime,
        errors: this.stats.errors,
        poolCounts,
      };
    } catch (error) {
      this.logger.error('Ошибка проверки здоровья индексера:', error);
      return {
        isHealthy: false,
        lastIndexTime: this.stats.lastIndexTime,
        uptime: this.stats.uptime,
        errors: this.stats.errors + 1,
        poolCounts: {
          [Protocol.RAYDIUM_AMM]: 0,
          [Protocol.RAYDIUM_CLMM]: 0,
          [Protocol.ORCA_WHIRLPOOL]: 0,
          [Protocol.METEORA_DLMM]: 0,
        },
      };
    }
  }
}
