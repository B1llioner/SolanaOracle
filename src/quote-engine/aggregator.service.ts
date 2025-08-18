import { Injectable, Logger } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CacheService } from '../common/cache/cache.service';
import { ConfigService } from '../config/config.service';
import {
  QuoteRequest,
  AggregatedQuote,
  QuoteResponse,
  QuoteSummary,
} from '../common/types/quote';
import { Protocol } from '../common/types/pools';

export interface AggregationStrategy {
  name: string;
  description: string;
  aggregate(quotes: QuoteResponse[]): QuoteResponse;
}

export interface AggregationConfig {
  strategies: AggregationStrategy[];
  timeoutMs: number;
  maxRetries: number;
  minQuotes: number;
  protocols: Protocol[];
}

@Injectable()
export class AggregatorService {
  private readonly logger = new Logger(AggregatorService.name);
  private readonly CACHE_PREFIX = 'aggregator';
  private readonly CACHE_TTL = 60; // 1 минута

  constructor(
    private quoteService: QuoteService,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {}

  /**
   * Получает агрегированную котировку с использованием различных стратегий
   */
  async getAggregatedQuote(request: QuoteRequest): Promise<AggregatedQuote | null> {
    const cacheKey = this.generateCacheKey(request);
    
    // Проверяем кэш
    const cached = await this.cacheService.get<AggregatedQuote>(cacheKey);
    if (cached) {
      this.logger.debug('Найдена кэшированная агрегированная котировка');
      return cached;
    }

    try {
      this.logger.log(`Получение агрегированной котировки: ${request.inputToken} -> ${request.outputToken}`);

      const config = this.getAggregationConfig();
      const quotes = await this.getQuotesFromAllProtocols(request, config);

      if (quotes.length < config.minQuotes) {
        this.logger.debug(`Недостаточно котировок: ${quotes.length}/${config.minQuotes}`);
        return null;
      }

      // Применяем различные стратегии агрегации
      const aggregatedQuotes = config.strategies.map(strategy => ({
        strategy: strategy.name,
        quote: strategy.aggregate(quotes),
      }));

      // Выбираем лучшую котировку среди всех стратегий
      const bestQuote = this.selectBestQuote(aggregatedQuotes.map(aq => aq.quote));
      const summary = this.calculateAggregatedSummary(quotes);

      const result: AggregatedQuote = {
        bestQuote,
        allQuotes: quotes,
        summary,
      };

      // Кэшируем результат
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error('Ошибка получения агрегированной котировки:', error);
      return null;
    }
  }

  /**
   * Получает котировки от всех протоколов
   */
  private async getQuotesFromAllProtocols(
    request: QuoteRequest,
    config: AggregationConfig
  ): Promise<QuoteResponse[]> {
    const quotes: QuoteResponse[] = [];

    // Получаем котировки от всех протоколов параллельно
    const quotePromises = config.protocols.map(async (protocol) => {
      try {
        // TODO: Реализовать получение котировок от конкретных протоколов
        // Пока используем общий сервис котировок
        return await this.quoteService.getQuote(request);
      } catch (error) {
        this.logger.debug(`Ошибка получения котировки от протокола ${protocol}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(quotePromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      }
    }

    return quotes;
  }

  /**
   * Выбирает лучшую котировку
   */
  private selectBestQuote(quotes: QuoteResponse[]): QuoteResponse {
    // Сортируем по выходному количеству (лучшие первыми)
    quotes.sort((a, b) => b.outputAmount - a.outputAmount);
    return quotes[0];
  }

  /**
   * Вычисляет сводку агрегированных котировок
   */
  private calculateAggregatedSummary(quotes: QuoteResponse[]): QuoteSummary {
    const totalInputAmount = quotes.reduce((sum, q) => sum + q.inputAmount, 0);
    const totalOutputAmount = quotes.reduce((sum, q) => sum + q.outputAmount, 0);
    const totalFee = quotes.reduce((sum, q) => sum + q.fee, 0);
    const totalPriceImpact = quotes.reduce((sum, q) => sum + q.priceImpact, 0);

    const prices = quotes.map(q => q.price);
    const bestPrice = Math.max(...prices);
    const worstPrice = Math.min(...prices);
    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return {
      totalInputAmount,
      totalOutputAmount,
      averagePrice,
      bestPrice,
      worstPrice,
      totalFee,
      totalPriceImpact,
      quoteCount: quotes.length,
    };
  }

  /**
   * Получает конфигурацию агрегации
   */
  private getAggregationConfig(): AggregationConfig {
    return {
      strategies: [
        {
          name: 'best_output',
          description: 'Выбирает котировку с максимальным выходным количеством',
          aggregate: (quotes: QuoteResponse[]) => {
            return quotes.reduce((best, current) => 
              current.outputAmount > best.outputAmount ? current : best
            );
          },
        },
        {
          name: 'lowest_fee',
          description: 'Выбирает котировку с минимальной комиссией',
          aggregate: (quotes: QuoteResponse[]) => {
            return quotes.reduce((best, current) => 
              current.fee < best.fee ? current : best
            );
          },
        },
        {
          name: 'lowest_price_impact',
          description: 'Выбирает котировку с минимальным влиянием на цену',
          aggregate: (quotes: QuoteResponse[]) => {
            return quotes.reduce((best, current) => 
              current.priceImpact < best.priceImpact ? current : best
            );
          },
        },
        {
          name: 'weighted_average',
          description: 'Вычисляет взвешенное среднее по ликвидности',
          aggregate: (quotes: QuoteResponse[]) => {
            // Упрощенная реализация взвешенного среднего
            const totalWeight = quotes.reduce((sum, q) => sum + q.outputAmount, 0);
            const weightedPrice = quotes.reduce((sum, q) => sum + q.price * q.outputAmount, 0) / totalWeight;
            
            // Возвращаем котировку, ближайшую к взвешенному среднему
            return quotes.reduce((best, current) => {
              const bestDiff = Math.abs(best.price - weightedPrice);
              const currentDiff = Math.abs(current.price - weightedPrice);
              return currentDiff < bestDiff ? current : best;
            });
          },
        },
      ],
      timeoutMs: 10000,
      maxRetries: 3,
      minQuotes: 1,
      protocols: [
        Protocol.RAYDIUM_AMM,
        Protocol.RAYDIUM_CLMM,
        Protocol.ORCA_WHIRLPOOL,
        Protocol.METEORA_DLMM,
      ],
    };
  }

  /**
   * Генерирует ключ кэша для запроса
   */
  private generateCacheKey(request: QuoteRequest): string {
    const { inputToken, outputToken, inputAmount, slippageTolerance } = request;
    return `${this.CACHE_PREFIX}:${inputToken}:${outputToken}:${inputAmount}:${slippageTolerance || 'default'}`;
  }

  /**
   * Получает статистику агрегации
   */
  async getAggregationStats(): Promise<{
    totalRequests: number;
    successfulRequests: number;
    averageResponseTime: number;
    protocolsUsed: Record<Protocol, number>;
    strategiesUsed: Record<string, number>;
  }> {
    // TODO: Реализовать сбор статистики
    return {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      protocolsUsed: {
        [Protocol.RAYDIUM_AMM]: 0,
        [Protocol.RAYDIUM_CLMM]: 0,
        [Protocol.ORCA_WHIRLPOOL]: 0,
        [Protocol.METEORA_DLMM]: 0,
      },
      strategiesUsed: {
        best_output: 0,
        lowest_fee: 0,
        lowest_price_impact: 0,
        weighted_average: 0,
      },
    };
  }

  /**
   * Очищает кэш агрегатора
   */
  async clearCache(): Promise<void> {
    try {
      await this.cacheService.deletePattern(`${this.CACHE_PREFIX}:*`);
      this.logger.log('Кэш агрегатора очищен');
    } catch (error) {
      this.logger.error('Ошибка очистки кэша агрегатора:', error);
      throw error;
    }
  }

  /**
   * Проверяет здоровье агрегатора
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    lastCheck: Date;
    protocolsAvailable: Record<Protocol, boolean>;
    strategiesAvailable: string[];
  }> {
    try {
      const config = this.getAggregationConfig();
      const protocolsAvailable: Record<Protocol, boolean> = {
        [Protocol.RAYDIUM_AMM]: true, // TODO: Проверить доступность
        [Protocol.RAYDIUM_CLMM]: false,
        [Protocol.ORCA_WHIRLPOOL]: false,
        [Protocol.METEORA_DLMM]: false,
      };

      return {
        isHealthy: true,
        lastCheck: new Date(),
        protocolsAvailable,
        strategiesAvailable: config.strategies.map(s => s.name),
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastCheck: new Date(),
        protocolsAvailable: {
          [Protocol.RAYDIUM_AMM]: false,
          [Protocol.RAYDIUM_CLMM]: false,
          [Protocol.ORCA_WHIRLPOOL]: false,
          [Protocol.METEORA_DLMM]: false,
        },
        strategiesAvailable: [],
      };
    }
  }
}
