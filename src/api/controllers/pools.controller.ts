import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PoolsRepository } from '../../db/repositories/pools.repo';
import { IndexerService } from '../../indexer/indexer.service';
import {
  GetPoolsDto,
  GetPoolByIdDto,
  GetPoolByAddressDto,
  GetPoolsByTokensDto,
  GetPoolsStatsDto,
  CreatePoolDto,
  UpdatePoolDto,
} from '../dto/index-pools.dto';
import { PoolFilter, PoolSort } from '../../common/types/pools';

@ApiTags('pools')
@Controller('api/v1/pools')
export class PoolsController {
  private readonly logger = new Logger(PoolsController.name);

  constructor(
    private poolsRepository: PoolsRepository,
    private indexerService: IndexerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить список пулов с фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список пулов успешно получен' })
  @ApiResponse({ status: 400, description: 'Неверные параметры запроса' })
  async getPools(@Query() query: GetPoolsDto) {
    try {
      const filter: PoolFilter = {
        protocol: query.protocol,
        poolType: query.poolType,
        tokenMint: query.tokenMint,
        minLiquidity: query.minLiquidity,
        maxFee: query.maxFee,
      };

      const sort: PoolSort = {
        field: query.sortField || 'liquidity',
        direction: query.sortDirection || 'desc',
      };

      const pools = await this.poolsRepository.findWithFilters(
        filter,
        sort,
        query.limit || 100,
        query.offset || 0
      );

      return {
        success: true,
        data: pools,
        meta: {
          count: pools.length,
          limit: query.limit || 100,
          offset: query.offset || 0,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка получения пулов:', error);
      throw new HttpException(
        'Ошибка получения пулов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику пулов' })
  @ApiResponse({ status: 200, description: 'Статистика пулов успешно получена' })
  async getPoolsStats(@Query() query: GetPoolsStatsDto) {
    try {
      const stats = await this.poolsRepository.getStats();
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики пулов:', error);
      throw new HttpException(
        'Ошибка получения статистики пулов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('tokens/:tokenA/:tokenB')
  @ApiOperation({ summary: 'Получить пулы по паре токенов' })
  @ApiParam({ name: 'tokenA', description: 'Адрес первого токена' })
  @ApiParam({ name: 'tokenB', description: 'Адрес второго токена' })
  @ApiResponse({ status: 200, description: 'Пулы по паре токенов успешно получены' })
  async getPoolsByTokens(@Param() params: GetPoolsByTokensDto) {
    try {
      const pools = await this.poolsRepository.findByTokens(
        params.tokenA,
        params.tokenB,
        params.limit || 50
      );

      return {
        success: true,
        data: pools,
        meta: {
          count: pools.length,
          tokenA: params.tokenA,
          tokenB: params.tokenB,
        },
      };
    } catch (error) {
      this.logger.error('Ошибка получения пулов по токенам:', error);
      throw new HttpException(
        'Ошибка получения пулов по токенам',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Получить пул по ID' })
  @ApiParam({ name: 'id', description: 'ID пула' })
  @ApiResponse({ status: 200, description: 'Пул успешно получен' })
  @ApiResponse({ status: 404, description: 'Пул не найден' })
  async getPoolById(@Param() params: GetPoolByIdDto) {
    try {
      const pool = await this.poolsRepository.findById(params.id);
      
      if (!pool) {
        throw new HttpException('Пул не найден', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: pool,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Ошибка получения пула по ID:', error);
      throw new HttpException(
        'Ошибка получения пула',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('address/:address')
  @ApiOperation({ summary: 'Получить пул по адресу' })
  @ApiParam({ name: 'address', description: 'Адрес пула' })
  @ApiResponse({ status: 200, description: 'Пул успешно получен' })
  @ApiResponse({ status: 404, description: 'Пул не найден' })
  async getPoolByAddress(@Param() params: GetPoolByAddressDto) {
    try {
      const pool = await this.poolsRepository.findByAddress(params.address);
      
      if (!pool) {
        throw new HttpException('Пул не найден', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: pool,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Ошибка получения пула по адресу:', error);
      throw new HttpException(
        'Ошибка получения пула',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый пул' })
  @ApiResponse({ status: 201, description: 'Пул успешно создан' })
  @ApiResponse({ status: 400, description: 'Неверные данные пула' })
  async createPool(@Body() createPoolDto: CreatePoolDto) {
    try {
      const pool = await this.poolsRepository.create(createPoolDto);
      
      return {
        success: true,
        data: pool,
        message: 'Пул успешно создан',
      };
    } catch (error) {
      this.logger.error('Ошибка создания пула:', error);
      throw new HttpException(
        'Ошибка создания пула',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('address/:address')
  @ApiOperation({ summary: 'Обновить пул по адресу' })
  @ApiParam({ name: 'address', description: 'Адрес пула' })
  @ApiResponse({ status: 200, description: 'Пул успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Пул не найден' })
  async updatePool(
    @Param() params: GetPoolByAddressDto,
    @Body() updatePoolDto: UpdatePoolDto,
  ) {
    try {
      const pool = await this.poolsRepository.update(params.address, updatePoolDto);
      
      return {
        success: true,
        data: pool,
        message: 'Пул успешно обновлен',
      };
    } catch (error) {
      this.logger.error('Ошибка обновления пула:', error);
      throw new HttpException(
        'Ошибка обновления пула',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('address/:address')
  @ApiOperation({ summary: 'Удалить пул по адресу' })
  @ApiParam({ name: 'address', description: 'Адрес пула' })
  @ApiResponse({ status: 200, description: 'Пул успешно удален' })
  @ApiResponse({ status: 404, description: 'Пул не найден' })
  async deletePool(@Param() params: GetPoolByAddressDto) {
    try {
      await this.poolsRepository.delete(params.address);
      
      return {
        success: true,
        message: 'Пул успешно удален',
      };
    } catch (error) {
      this.logger.error('Ошибка удаления пула:', error);
      throw new HttpException(
        'Ошибка удаления пула',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Принудительно обновить пулы' })
  @ApiResponse({ status: 200, description: 'Обновление пулов запущено' })
  async refreshPools() {
    try {
      await this.indexerService.forceIndex();
      
      return {
        success: true,
        message: 'Обновление пулов запущено',
      };
    } catch (error) {
      this.logger.error('Ошибка обновления пулов:', error);
      throw new HttpException(
        'Ошибка обновления пулов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверить здоровье сервиса пулов' })
  @ApiResponse({ status: 200, description: 'Статус здоровья получен' })
  async getHealth() {
    try {
      const stats = await this.poolsRepository.getStats();
      const indexerStats = this.indexerService.getStats();
      
      return {
        success: true,
        data: {
          pools: {
            total: stats.poolCount,
            byProtocol: stats.protocolDistribution,
          },
          indexer: {
            isRunning: indexerStats.isRunning,
            lastIndexTime: indexerStats.lastIndexTime,
            errors: indexerStats.errors,
          },
        },
      };
    } catch (error) {
      this.logger.error('Ошибка проверки здоровья:', error);
      throw new HttpException(
        'Ошибка проверки здоровья',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
