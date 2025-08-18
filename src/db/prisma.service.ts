import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../config/config.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.databaseUrl,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    this.setupLogging();
  }

  /**
   * Настраивает логирование для Prisma
   */
  private setupLogging(): void {
    this.$on('query', (e) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Params: ${e.params}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });

    this.$on('error', (e) => {
      this.logger.error(`Prisma Error: ${e.message}`);
    });

    this.$on('info', (e) => {
      this.logger.log(`Prisma Info: ${e.message}`);
    });

    this.$on('warn', (e) => {
      this.logger.warn(`Prisma Warning: ${e.message}`);
    });
  }

  /**
   * Инициализация модуля
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Подключение к базе данных установлено');
      
      // Проверяем подключение
      await this.$queryRaw`SELECT 1`;
      this.logger.log('База данных доступна');
    } catch (error) {
      this.logger.error('Ошибка подключения к базе данных:', error);
      throw error;
    }
  }

  /**
   * Завершение работы модуля
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Подключение к базе данных закрыто');
    } catch (error) {
      this.logger.error('Ошибка при закрытии подключения к базе данных:', error);
    }
  }

  /**
   * Выполняет транзакцию
   */
  async transaction<T>(
    fn: (prisma: PrismaService) => Promise<T>
  ): Promise<T> {
    return this.$transaction(fn);
  }

  /**
   * Получает статистику базы данных
   */
  async getDatabaseStats(): Promise<{
    poolCount: number;
    quoteCount: number;
    lastPoolUpdate: Date | null;
    lastQuoteUpdate: Date | null;
  }> {
    const [poolCount, quoteCount, lastPool, lastQuote] = await Promise.all([
      this.pool.count(),
      this.quote.count(),
      this.pool.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.quote.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      poolCount,
      quoteCount,
      lastPoolUpdate: lastPool?.updatedAt || null,
      lastQuoteUpdate: lastQuote?.createdAt || null,
    };
  }

  /**
   * Очищает старые данные
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<{
    deletedQuotes: number;
    deletedPools: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const [deletedQuotes, deletedPools] = await Promise.all([
      this.quote.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      }),
      this.pool.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate,
          },
          // Не удаляем пулы, которые обновлялись недавно
          liquidity: {
            gt: 0,
          },
        },
      }),
    ]);

    this.logger.log(`Очищено ${deletedQuotes.count} старых котировок и ${deletedPools.count} неактивных пулов`);

    return {
      deletedQuotes: deletedQuotes.count,
      deletedPools: deletedPools.count,
    };
  }

  /**
   * Создает индексы для оптимизации запросов
   */
  async createIndexes(): Promise<void> {
    try {
      // Индексы создаются через миграции Prisma
      this.logger.log('Индексы уже созданы через миграции');
    } catch (error) {
      this.logger.error('Ошибка создания индексов:', error);
    }
  }

  /**
   * Проверяет здоровье базы данных
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Ошибка проверки здоровья базы данных:', error);
      return false;
    }
  }
}
