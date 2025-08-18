import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QuoteService } from '../../quote-engine/quote.service';
import { AggregatorService } from '../../quote-engine/aggregator.service';
import { QuotesRepository } from '../../db/repositories/quotes.repo';
import {
  GetQuoteDto,
  GetAggregatedQuoteDto,
  GetQuoteHistoryDto,
  GetQuotesDto,
  GetQuoteByIdDto,
  GetQuotesByPoolDto,
  GetQuotesStatsDto,
} from '../dto/quotes.dto';
import { QuoteFilter, QuoteSort } from '../../common/types/quote';

@ApiTags('quotes')
@Controller('api/v1/quotes')
export class QuotesController {
  private readonly logger = new Logger(QuotesController.name);

  constructor(
    private quoteService: QuoteService,
    private aggregatorService: AggregatorService,
    private quotesRepository: QuotesRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Получить котировку для свапа' })
  @ApiResponse({ status: 200, description: 'Котировка успешно получена' })
  @ApiResponse({ status: 400, description: 'Неверные параметры запроса' })
  @ApiResponse({ status: 404, description: 'Котировка не найдена' })
  async getQuote(@Body() getQuoteDto: GetQuoteDto) {
    try {
      const quote = await this.quoteService.getQuote({
        inputToken: getQuoteDto.inputToken,
        outputToken: getQuoteDto.outputToken,
        inputAmount: getQuoteDto.inputAmount,
        slippageTolerance: getQuoteDto.slippageTolerance,
        protocols: getQuoteDto.protocols,
        poolTypes: getQuoteDto.poolTypes,
      });

      if (!quote) {
        throw new HttpException('Котировка не найдена', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: quote,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Ошибка получения котировки:', error);
      throw new HttpException(
        'Ошибка получения котировки',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('aggregated')
  @ApiOperation({ summary: 'Получить агрегированную котировку' })
  @ApiResponse({ status: 200, description: 'Агрегированная котировка успешно получена' })
  @ApiResponse({ status: 400, description: 'Неверные параметры запроса' })
  @ApiResponse({ status: 404, description: 'Котировки не найдены' })
  async getAggregatedQuote(@Body() getAggregatedQuoteDto: GetAggregatedQuoteDto) {
    try {
      const aggregatedQuote = await this.aggregatorService.getAggregatedQuote({
        inputToken: getAggregatedQuoteDto.inputToken,
        outputToken: getAggregatedQuoteDto.outputToken,
        inputAmount: getAggregatedQuoteDto.inputAmount,
        slippageTolerance: getAggregatedQuoteDto.slippageTolerance,
        protocols: getAggregatedQuoteDto.protocols,
        poolTypes: getAggregatedQuoteDto.poolTypes,
      });

      if (!aggregatedQuote) {
        throw new HttpException('Котировки не найдены', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: aggregatedQuote,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Ошибка получения агрегированной котировки:', error);
      throw new HttpException(
        'Ошибка получения агрегированной котировки',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Получить историю котировок' })
  @ApiResponse({ status: 200, description: 'История котировок успешно получена' })
  async getQuoteHistory(@Query() query: GetQuoteHistoryDto) {
    try {
      const quotes = await this.quoteService.getQuoteHistory(
        query.inputToken,
        query.outputToken,
        query.limit || 100
      );

      return {
        success: true,
        data: quotes,
        meta: {
          count: quotes.length,
          inputToken: query.inputToken,
          outputToken: query.outputToken,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка получения истории котировок:', error);
      throw new HttpException(
        'Ошибка получения истории котировок',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Получить список котировок с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список котировок успешно получен' })
  @ApiResponse({ status: 400, description: 'Неверные параметры запроса' })
  async getQuotes(@Query() query: GetQuotesDto) {
    try {
      const filter: QuoteFilter = {
        inputToken: query.inputToken,
        outputToken: query.outputToken,
        minInputAmount: query.minInputAmount,
        maxInputAmount: query.maxInputAmount,
        protocols: query.protocols,
        poolTypes: query.poolTypes,
      };

      const sort: QuoteSort = {
        field: query.sortField || 'createdAt',
        direction: query.sortDirection || 'desc',
      };

      const quotes = await this.quotesRepository.findWithFilters(
        filter,
        sort,
        query.limit || 100,
        query.offset || 0
      );

      return {
        success: true,
        data: quotes,
        meta: {
          count: quotes.length,
          limit: query.limit || 100,
          offset: query.offset || 0,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка получения котировок:', error);
      throw new HttpException(
        'Ошибка получения котировок',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Получить котировку по ID' })
  @ApiParam({ name: 'id', description: 'ID котировки' })
  @ApiResponse({ status: 200, description: 'Котировка успешно получена' })
  @ApiResponse({ status: 404, description: 'Котировка не найдена' })
  async getQuoteById(@Param() params: GetQuoteByIdDto) {
    try {
      const quote = await this.quotesRepository.findById(params.id);
      
      if (!quote) {
        throw new HttpException('Котировка не найдена', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: quote,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Ошибка получения котировки по ID:', error);
      throw new HttpException(
        'Ошибка получения котировки',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pool/:poolId')
  @ApiOperation({ summary: 'Получить котировки по пулу' })
  @ApiParam({ name: 'poolId', description: 'ID пула' })
  @ApiResponse({ status: 200, description: 'Котировки по пулу успешно получены' })
  async getQuotesByPool(@Param() params: GetQuotesByPoolDto) {
    try {
      const quotes = await this.quotesRepository.findByPool(
        params.poolId,
        params.limit || 100
      );

      return {
        success: true,
        data: quotes,
        meta: {
          count: quotes.length,
          poolId: params.poolId,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка получения котировок по пулу:', error);
      throw new HttpException(
        'Ошибка получения котировок по пулу',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику котировок' })
  @ApiResponse({ status: 200, description: 'Статистика котировок успешно получена' })
  async getQuotesStats(@Query() query: GetQuotesStatsDto) {
    try {
      const stats = await this.quotesRepository.getStats();
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики котировок:', error);
      throw new HttpException(
        'Ошибка получения статистики котировок',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('token/:tokenMint/stats')
  @ApiOperation({ summary: 'Получить статистику котировок по токену' })
  @ApiParam({ name: 'tokenMint', description: 'Адрес токена' })
  @ApiResponse({ status: 200, description: 'Статистика котировок по токену успешно получена' })
  async getTokenStats(@Param('tokenMint') tokenMint: string) {
    try {
      const stats = await this.quotesRepository.getTokenStats(tokenMint);
      
      return {
        success: true,
        data: {
          tokenMint,
          ...stats,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики токена:', error);
      throw new HttpException(
        'Ошибка получения статистики токена',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('aggregator/stats')
  @ApiOperation({ summary: 'Получить статистику агрегатора' })
  @ApiResponse({ status: 200, description: 'Статистика агрегатора успешно получена' })
  async getAggregatorStats() {
    try {
      const stats = await this.aggregatorService.getAggregationStats();
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики агрегатора:', error);
      throw new HttpException(
        'Ошибка получения статистики агрегатора',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('aggregator/health')
  @ApiOperation({ summary: 'Проверить здоровье агрегатора' })
  @ApiResponse({ status: 200, description: 'Статус здоровья агрегатора получен' })
  async getAggregatorHealth() {
    try {
      const health = await this.aggregatorService.healthCheck();
      
      return {
        success: true,
        data: health,
      };
    } catch (error) {
      this.logger.error('Ошибка проверки здоровья агрегатора:', error);
      throw new HttpException(
        'Ошибка проверки здоровья агрегатора',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('clear-cache')
  @ApiOperation({ summary: 'Очистить кэш котировок' })
  @ApiResponse({ status: 200, description: 'Кэш котировок очищен' })
  async clearCache() {
    try {
      await Promise.all([
        this.quoteService.clearCache(),
        this.aggregatorService.clearCache(),
      ]);
      
      return {
        success: true,
        message: 'Кэш котировок очищен',
      };
    } catch (error) {
      this.logger.error('Ошибка очистки кэша котировок:', error);
      throw new HttpException(
        'Ошибка очистки кэша котировок',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
