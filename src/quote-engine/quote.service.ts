import { Injectable, Logger } from '@nestjs/common';
import { RpcPoolService } from '../common/rpc/rpc-pool.service';
import { CacheService } from '../common/cache/cache.service';
import { PoolsRepository } from '../db/repositories/pools.repo';
import { QuotesRepository } from '../db/repositories/quotes.repo';
import { RaydiumAmmService } from '../pools/raydium-amm/raydium-amm.service';
import { ConfigService } from '../config/config.service';
import {
  QuoteRequest,
  QuoteResponse,
  AggregatedQuote,
  QuoteSummary,
} from '../common/types/quote';
import { Protocol } from '../common/types/pools';
import { PoolMath } from '../common/utils/math';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  private readonly CACHE_PREFIX = 'quote';
  private readonly CACHE_TTL = 30; // 30 секунд

  constructor(
    private rpcService: RpcPoolService,
    private cacheService: CacheService,
    private poolsRepository: PoolsRepository,
    private quotesRepository: QuotesRepository,
    private raydiumAmmService: RaydiumAmmService,
    private configService: ConfigService,
  ) {}

  /**
   * Получает котировку для свапа
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse | null> {
    const cacheKey = this.generateCacheKey(request);
    
    // Проверяем кэш
    const cached = await this.cacheService.get<QuoteResponse>(cacheKey);
    if (cached && cached.validUntil > new Date()) {
      this.logger.debug('Найдена кэшированная котировка');
      return cached;
    }

    try {
      this.logger.log(`Получение котировки: ${request.inputToken} -> ${request.outputToken} (${request.inputAmount})`);

      // Находим пулы для данной пары токенов
      const pools = await this.poolsRepository.findByTokens(
        request.inputToken,
        request.outputToken
      );

      if (pools.length === 0) {
        this.logger.debug(`Не найдены пулы для пары ${request.inputToken}/${request.outputToken}`);
        return null;
      }

      let bestQuote: QuoteResponse | null = null;
      let bestOutputAmount = 0;

      // Получаем котировки от всех протоколов
      const quotePromises = pools.map(async (pool) => {
        try {
          return await this.getPoolQuote(pool, request);
        } catch (error) {
          this.logger.debug(`Ошибка получения котировки для пула ${pool.address}: ${error.message}`);
          return null;
        }
      });

      const quotes = (await Promise.allSettled(quotePromises))
        .filter((result): result is PromiseFulfilledResult<QuoteResponse> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      // Выбираем лучшую котировку
      for (const quote of quotes) {
        if (quote.outputAmount > bestOutputAmount) {
          bestQuote = quote;
          bestOutputAmount = quote.outputAmount;
        }
      }

      if (bestQuote) {
        // Сохраняем котировку в базу
        await this.saveQuote(bestQuote);
        
        // Кэшируем результат
        await this.cacheService.set(cacheKey, bestQuote, this.CACHE_TTL);
      }

      return bestQuote;
    } catch (error) {
      this.logger.error('Ошибка получения котировки:', error);
      return null;
    }
  }

  /**
   * Получает агрегированную котировку
   */
  async getAggregatedQuote(request: QuoteRequest): Promise<AggregatedQuote | null> {
    try {
      this.logger.log(`Получение агрегированной котировки: ${request.inputToken} -> ${request.outputToken}`);

      // Получаем котировки от всех протоколов
      const quotes = await this.getAllProtocolQuotes(request);

      if (quotes.length === 0) {
        return null;
      }

      // Сортируем по выходному количеству (лучшие первыми)
      quotes.sort((a, b) => b.outputAmount - a.outputAmount);

      const bestQuote = quotes[0];
      const summary = this.calculateQuoteSummary(quotes);

      const aggregatedQuote: AggregatedQuote = {
        bestQuote,
        allQuotes: quotes,
        summary,
      };

      return aggregatedQuote;
    } catch (error) {
      this.logger.error('Ошибка получения агрегированной котировки:', error);
      return null;
    }
  }

  /**
   * Получает котировки от всех протоколов
   */
  private async getAllProtocolQuotes(request: QuoteRequest): Promise<QuoteResponse[]> {
    const quotes: QuoteResponse[] = [];

    // Raydium AMM
    try {
      const raydiumQuote = await this.raydiumAmmService.getQuote({
        inputToken: request.inputToken,
        outputToken: request.outputToken,
        inputAmount: request.inputAmount,
        slippageTolerance: request.slippageTolerance,
      });

      if (raydiumQuote) {
        quotes.push(this.convertPoolQuoteToResponse(raydiumQuote));
      }
    } catch (error) {
      this.logger.debug('Ошибка получения котировки Raydium AMM:', error);
    }

    // TODO: Добавить другие протоколы
    // Raydium CLMM, Orca Whirlpool, Meteora DLMM

    return quotes;
  }

  /**
   * Получает котировку от конкретного пула
   */
  private async getPoolQuote(pool: any, request: QuoteRequest): Promise<QuoteResponse | null> {
    try {
      // Получаем актуальные данные пула
      const accountInfo = await this.rpcService.getAccountInfo(pool.address);
      if (!accountInfo) {
        return null;
      }

      const { inputToken, outputToken, inputAmount } = request;
      const isTokenAToB = pool.tokenAMint === inputToken && pool.tokenBMint === outputToken;

      // Определяем резервы токенов
      let reserveIn: number;
      let reserveOut: number;

      if (isTokenAToB) {
        reserveIn = pool.liquidity * 0.5; // Упрощенный расчет
        reserveOut = pool.liquidity * 0.5;
      } else {
        reserveIn = pool.liquidity * 0.5;
        reserveOut = pool.liquidity * 0.5;
      }

      // Проверяем достаточность ликвидности
      if (!PoolMath.hasSufficientLiquidity(inputAmount, reserveIn)) {
        return null;
      }

      // Вычисляем выходное количество
      const outputAmount = PoolMath.getAmountOut(
        pool.poolType,
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
        pool.poolType,
        inputAmount,
        reserveIn,
        reserveOut
      );

      // Вычисляем комиссию
      const fee = PoolMath.calculateFee(inputAmount, pool.fee);

      const quote: QuoteResponse = {
        id: this.generateQuoteId(),
        inputToken,
        outputToken,
        inputAmount,
        outputAmount,
        price: outputAmount / inputAmount,
        priceImpact,
        fee,
        poolId: pool.id,
        protocol: pool.protocol,
        poolType: pool.poolType,
        route: [{
          poolId: pool.id,
          protocol: pool.protocol,
          poolType: pool.poolType,
          inputToken,
          outputToken,
          inputAmount,
          outputAmount,
          price: outputAmount / inputAmount,
          fee,
        }],
        estimatedGas: 0, // TODO: Реализовать оценку газа
        validUntil: new Date(Date.now() + 30000), // 30 секунд
      };

      return quote;
    } catch (error) {
      this.logger.error(`Ошибка расчета котировки для пула ${pool.address}:`, error);
      return null;
    }
  }

  /**
   * Сохраняет котировку в базу данных
   */
  private async saveQuote(quote: QuoteResponse): Promise<void> {
    try {
      await this.quotesRepository.create({
        poolId: quote.poolId,
        inputToken: quote.inputToken,
        outputToken: quote.outputToken,
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        price: quote.price,
        priceImpact: quote.priceImpact,
        fee: quote.fee,
      });
    } catch (error) {
      this.logger.error('Ошибка сохранения котировки:', error);
    }
  }

  /**
   * Конвертирует котировку пула в ответ API
   */
  private convertPoolQuoteToResponse(poolQuote: any): QuoteResponse {
    return {
      id: this.generateQuoteId(),
      inputToken: poolQuote.inputToken,
      outputToken: poolQuote.outputToken,
      inputAmount: poolQuote.inputAmount,
      outputAmount: poolQuote.outputAmount,
      price: poolQuote.price,
      priceImpact: poolQuote.priceImpact,
      fee: poolQuote.fee,
      poolId: poolQuote.poolAddress,
      protocol: poolQuote.protocol,
      poolType: poolQuote.poolType,
      route: poolQuote.route || [],
      estimatedGas: 0,
      validUntil: poolQuote.validUntil,
    };
  }

  /**
   * Вычисляет сводку котировок
   */
  private calculateQuoteSummary(quotes: QuoteResponse[]): QuoteSummary {
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
   * Генерирует ключ кэша для запроса
   */
  private generateCacheKey(request: QuoteRequest): string {
    const { inputToken, outputToken, inputAmount, slippageTolerance } = request;
    return `${this.CACHE_PREFIX}:${inputToken}:${outputToken}:${inputAmount}:${slippageTolerance || 'default'}`;
  }

  /**
   * Генерирует уникальный ID котировки
   */
  private generateQuoteId(): string {
    return `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Получает историю котировок
   */
  async getQuoteHistory(
    inputToken: string,
    outputToken: string,
    limit: number = 100
  ): Promise<QuoteResponse[]> {
    try {
      const quotes = await this.quotesRepository.findByTokens(inputToken, outputToken, limit);
      
      return quotes.map(quote => ({
        id: quote.id,
        inputToken: quote.inputToken,
        outputToken: quote.outputToken,
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        price: quote.price,
        priceImpact: quote.priceImpact || 0,
        fee: quote.fee,
        poolId: quote.poolId,
        protocol: quote.pool.protocol,
        poolType: quote.pool.poolType,
        route: [],
        estimatedGas: 0,
        validUntil: quote.createdAt,
      }));
    } catch (error) {
      this.logger.error('Ошибка получения истории котировок:', error);
      return [];
    }
  }

  /**
   * Очищает кэш котировок
   */
  async clearCache(): Promise<void> {
    try {
      await this.cacheService.deletePattern(`${this.CACHE_PREFIX}:*`);
      this.logger.log('Кэш котировок очищен');
    } catch (error) {
      this.logger.error('Ошибка очистки кэша котировок:', error);
      throw error;
    }
  }
}
