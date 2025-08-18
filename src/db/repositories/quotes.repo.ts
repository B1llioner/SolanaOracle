import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Quote } from '@prisma/client';
import { QuoteFilter, QuoteSort } from '../../common/types/quote';

@Injectable()
export class QuotesRepository {
  private readonly logger = new Logger(QuotesRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Создает новую котировку
   */
  async create(quoteData: Omit<Quote, 'id' | 'createdAt'>): Promise<Quote> {
    try {
      const quote = await this.prisma.quote.create({
        data: quoteData,
      });
      
      this.logger.debug(`Создана котировка: ${quote.id}`);
      return quote;
    } catch (error) {
      this.logger.error(`Ошибка создания котировки:`, error);
      throw error;
    }
  }

  /**
   * Создает несколько котировок
   */
  async createMany(quotesData: Omit<Quote, 'id' | 'createdAt'>[]): Promise<Quote[]> {
    try {
      const quotes = await this.prisma.quote.createMany({
        data: quotesData,
        skipDuplicates: true,
      });
      
      this.logger.debug(`Создано ${quotes.count} котировок`);
      return [];
    } catch (error) {
      this.logger.error(`Ошибка создания котировок:`, error);
      throw error;
    }
  }

  /**
   * Находит котировку по ID
   */
  async findById(id: string): Promise<Quote | null> {
    try {
      return await this.prisma.quote.findUnique({
        where: { id },
        include: {
          pool: true,
        },
      });
    } catch (error) {
      this.logger.error(`Ошибка поиска котировки по ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Находит котировки по пулу
   */
  async findByPool(poolId: string, limit: number = 100): Promise<Quote[]> {
    try {
      return await this.prisma.quote.findMany({
        where: { poolId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Ошибка поиска котировок по пулу ${poolId}:`, error);
      throw error;
    }
  }

  /**
   * Находит котировки по токенам
   */
  async findByTokens(
    inputToken: string,
    outputToken: string,
    limit: number = 100
  ): Promise<Quote[]> {
    try {
      return await this.prisma.quote.findMany({
        where: {
          OR: [
            {
              inputToken,
              outputToken,
            },
            {
              inputToken: outputToken,
              outputToken: inputToken,
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          pool: true,
        },
      });
    } catch (error) {
      this.logger.error(`Ошибка поиска котировок по токенам ${inputToken}/${outputToken}:`, error);
      throw error;
    }
  }

  /**
   * Находит котировки с фильтрацией
   */
  async findWithFilters(
    filter: QuoteFilter,
    sort: QuoteSort = { field: 'createdAt', direction: 'desc' },
    limit: number = 100,
    offset: number = 0
  ): Promise<Quote[]> {
    try {
      const where: any = {};

      if (filter.inputToken) {
        where.inputToken = filter.inputToken;
      }

      if (filter.outputToken) {
        where.outputToken = filter.outputToken;
      }

      if (filter.minInputAmount) {
        where.inputAmount = {
          gte: filter.minInputAmount,
        };
      }

      if (filter.maxInputAmount) {
        where.inputAmount = {
          ...where.inputAmount,
          lte: filter.maxInputAmount,
        };
      }

      const orderBy: any = {};
      orderBy[sort.field] = sort.direction;

      return await this.prisma.quote.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          pool: true,
        },
      });
    } catch (error) {
      this.logger.error('Ошибка поиска котировок с фильтрами:', error);
      throw error;
    }
  }

  /**
   * Получает лучшую котировку для пары токенов
   */
  async getBestQuote(
    inputToken: string,
    outputToken: string,
    inputAmount: number
  ): Promise<Quote | null> {
    try {
      return await this.prisma.quote.findFirst({
        where: {
          OR: [
            {
              inputToken,
              outputToken,
              inputAmount: {
                gte: inputAmount * 0.95, // 5% толерантность
                lte: inputAmount * 1.05,
              },
            },
            {
              inputToken: outputToken,
              outputToken: inputToken,
              inputAmount: {
                gte: inputAmount * 0.95,
                lte: inputAmount * 1.05,
              },
            },
          ],
        },
        orderBy: [
          { price: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          pool: true,
        },
      });
    } catch (error) {
      this.logger.error(`Ошибка получения лучшей котировки для ${inputToken}/${outputToken}:`, error);
      throw error;
    }
  }

  /**
   * Получает статистику котировок
   */
  async getStats(): Promise<{
    totalQuotes: number;
    averagePrice: number;
    bestPrice: number;
    worstPrice: number;
    totalVolume: number;
    lastQuoteTime: Date | null;
  }> {
    try {
      const [
        totalQuotes,
        averagePrice,
        bestPrice,
        worstPrice,
        totalVolume,
        lastQuote,
      ] = await Promise.all([
        this.prisma.quote.count(),
        this.prisma.quote.aggregate({
          _avg: { price: true },
        }),
        this.prisma.quote.aggregate({
          _max: { price: true },
        }),
        this.prisma.quote.aggregate({
          _min: { price: true },
        }),
        this.prisma.quote.aggregate({
          _sum: { inputAmount: true },
        }),
        this.prisma.quote.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      return {
        totalQuotes,
        averagePrice: averagePrice._avg.price || 0,
        bestPrice: bestPrice._max.price || 0,
        worstPrice: worstPrice._min.price || 0,
        totalVolume: totalVolume._sum.inputAmount || 0,
        lastQuoteTime: lastQuote?.createdAt || null,
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики котировок:', error);
      throw error;
    }
  }

  /**
   * Удаляет котировку
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.quote.delete({
        where: { id },
      });
      
      this.logger.debug(`Удалена котировка: ${id}`);
    } catch (error) {
      this.logger.error(`Ошибка удаления котировки ${id}:`, error);
      throw error;
    }
  }

  /**
   * Удаляет старые котировки
   */
  async deleteOldQuotes(hoursOld: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

      const result = await this.prisma.quote.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });
      
      this.logger.debug(`Удалено ${result.count} старых котировок`);
      return result.count;
    } catch (error) {
      this.logger.error(`Ошибка удаления старых котировок:`, error);
      throw error;
    }
  }

  /**
   * Получает количество котировок
   */
  async count(filter?: QuoteFilter): Promise<number> {
    try {
      const where: any = {};

      if (filter?.inputToken) {
        where.inputToken = filter.inputToken;
      }

      if (filter?.outputToken) {
        where.outputToken = filter.outputToken;
      }

      if (filter?.minInputAmount) {
        where.inputAmount = {
          gte: filter.minInputAmount,
        };
      }

      if (filter?.maxInputAmount) {
        where.inputAmount = {
          ...where.inputAmount,
          lte: filter.maxInputAmount,
        };
      }

      return await this.prisma.quote.count({ where });
    } catch (error) {
      this.logger.error('Ошибка подсчета котировок:', error);
      throw error;
    }
  }

  /**
   * Получает котировки с пагинацией
   */
  async findWithPagination(
    page: number = 1,
    pageSize: number = 20,
    filter?: QuoteFilter,
    sort?: QuoteSort
  ): Promise<{ quotes: Quote[]; total: number; page: number; pageSize: number; totalPages: number }> {
    try {
      const offset = (page - 1) * pageSize;
      const [quotes, total] = await Promise.all([
        this.findWithFilters(filter || {}, sort || { field: 'createdAt', direction: 'desc' }, pageSize, offset),
        this.count(filter),
      ]);

      return {
        quotes,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.logger.error('Ошибка получения котировок с пагинацией:', error);
      throw error;
    }
  }

  /**
   * Получает агрегированную статистику по токенам
   */
  async getTokenStats(tokenMint: string): Promise<{
    totalQuotes: number;
    averagePrice: number;
    totalVolume: number;
    lastQuoteTime: Date | null;
  }> {
    try {
      const [
        totalQuotes,
        averagePrice,
        totalVolume,
        lastQuote,
      ] = await Promise.all([
        this.prisma.quote.count({
          where: {
            OR: [
              { inputToken: tokenMint },
              { outputToken: tokenMint },
            ],
          },
        }),
        this.prisma.quote.aggregate({
          where: {
            OR: [
              { inputToken: tokenMint },
              { outputToken: tokenMint },
            ],
          },
          _avg: { price: true },
        }),
        this.prisma.quote.aggregate({
          where: {
            OR: [
              { inputToken: tokenMint },
              { outputToken: tokenMint },
            ],
          },
          _sum: { inputAmount: true },
        }),
        this.prisma.quote.findFirst({
          where: {
            OR: [
              { inputToken: tokenMint },
              { outputToken: tokenMint },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      return {
        totalQuotes,
        averagePrice: averagePrice._avg.price || 0,
        totalVolume: totalVolume._sum.inputAmount || 0,
        lastQuoteTime: lastQuote?.createdAt || null,
      };
    } catch (error) {
      this.logger.error(`Ошибка получения статистики токена ${tokenMint}:`, error);
      throw error;
    }
  }
}
