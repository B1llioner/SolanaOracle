import { Injectable, Logger } from '@nestjs/common';
import { Connection, Commitment, ConnectionConfig } from '@solana/web3.js';
import { ConfigService } from '../../config/config.service';
import { RpcError } from '../types/errors';

interface RpcEndpoint {
  url: string;
  connection: Connection;
  isHealthy: boolean;
  lastHealthCheck: Date;
  errorCount: number;
  responseTime: number;
}

interface RpcRequest {
  method: string;
  params: any[];
  timeout?: number;
  retries?: number;
}

@Injectable()
export class RpcPoolService {
  private readonly logger = new Logger(RpcPoolService.name);
  private endpoints: RpcEndpoint[] = [];
  private currentIndex = 0;
  private healthCheckInterval: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    this.initializeEndpoints();
    this.startHealthCheck();
  }

  /**
   * Инициализирует RPC эндпоинты
   */
  private initializeEndpoints(): void {
    const urls = this.configService.solanaRpcEndpoints;
    
    if (urls.length === 0) {
      throw new Error('Не настроены RPC эндпоинты');
    }

    this.endpoints = urls.map(url => ({
      url,
      connection: new Connection(url, {
        commitment: 'confirmed' as Commitment,
        confirmTransactionInitialTimeout: 60000,
      } as ConnectionConfig),
      isHealthy: true,
      lastHealthCheck: new Date(),
      errorCount: 0,
      responseTime: 0,
    }));

    this.logger.log(`Инициализировано ${this.endpoints.length} RPC эндпоинтов`);
  }

  /**
   * Запускает периодическую проверку здоровья эндпоинтов
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkEndpointsHealth();
    }, 30000); // Проверка каждые 30 секунд
  }

  /**
   * Проверяет здоровье всех эндпоинтов
   */
  private async checkEndpointsHealth(): Promise<void> {
    const promises = this.endpoints.map(async (endpoint, index) => {
      try {
        const startTime = Date.now();
        await endpoint.connection.getSlot();
        const responseTime = Date.now() - startTime;

        endpoint.isHealthy = true;
        endpoint.lastHealthCheck = new Date();
        endpoint.errorCount = 0;
        endpoint.responseTime = responseTime;

        this.logger.debug(`Эндпоинт ${endpoint.url} здоров (${responseTime}ms)`);
      } catch (error) {
        endpoint.isHealthy = false;
        endpoint.errorCount++;
        endpoint.lastHealthCheck = new Date();

        this.logger.warn(`Эндпоинт ${endpoint.url} не отвечает: ${error.message}`);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Получает следующий здоровый эндпоинт
   */
  private getNextHealthyEndpoint(): RpcEndpoint | null {
    const healthyEndpoints = this.endpoints.filter(ep => ep.isHealthy);
    
    if (healthyEndpoints.length === 0) {
      return null;
    }

    // Выбираем эндпоинт с наименьшим временем отклика
    const bestEndpoint = healthyEndpoints.reduce((best, current) => 
      current.responseTime < best.responseTime ? current : best
    );

    return bestEndpoint;
  }

  /**
   * Выполняет RPC запрос с автоматическим переключением между эндпоинтами
   */
  async executeRequest<T>(
    request: RpcRequest,
    retries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < retries; attempt++) {
      const endpoint = this.getNextHealthyEndpoint();
      
      if (!endpoint) {
        throw new RpcError('Нет доступных RPC эндпоинтов');
      }

      try {
        const result = await this.executeRequestOnEndpoint<T>(endpoint, request);
        return result;
      } catch (error) {
        lastError = error;
        endpoint.errorCount++;
        
        // Если ошибка критическая, помечаем эндпоинт как нездоровый
        if (endpoint.errorCount >= 3) {
          endpoint.isHealthy = false;
          this.logger.warn(`Эндпоинт ${endpoint.url} помечен как нездоровый`);
        }

        this.logger.warn(
          `Попытка ${attempt + 1}/${retries} не удалась для ${endpoint.url}: ${error.message}`
        );

        // Небольшая задержка перед следующей попыткой
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new RpcError(`Все попытки RPC запроса не удались: ${lastError.message}`);
  }

  /**
   * Выполняет RPC запрос на конкретном эндпоинте
   */
  private async executeRequestOnEndpoint<T>(
    endpoint: RpcEndpoint,
    request: RpcRequest
  ): Promise<T> {
    const timeout = request.timeout || 30000;
    
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('RPC запрос превысил время ожидания'));
      }, timeout);

      // Используем rpcRequest для более гибкого управления
      endpoint.connection.rpcRequest(
        request.method,
        request.params,
        { commitment: 'confirmed' }
      ).then((response) => {
        clearTimeout(timeoutId);
        resolve(response.result as T);
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Получает информацию о слоте
   */
  async getSlot(): Promise<number> {
    return this.executeRequest<number>({
      method: 'getSlot',
      params: [],
    });
  }

  /**
   * Получает баланс аккаунта
   */
  async getBalance(pubkey: string): Promise<number> {
    return this.executeRequest<number>({
      method: 'getBalance',
      params: [pubkey],
    });
  }

  /**
   * Получает данные аккаунта
   */
  async getAccountInfo(pubkey: string): Promise<any> {
    return this.executeRequest<any>({
      method: 'getAccountInfo',
      params: [pubkey, { encoding: 'base64' }],
    });
  }

  /**
   * Получает несколько аккаунтов
   */
  async getMultipleAccounts(pubkeys: string[]): Promise<any[]> {
    return this.executeRequest<any[]>({
      method: 'getMultipleAccounts',
      params: [pubkeys, { encoding: 'base64' }],
    });
  }

  /**
   * Получает программу
   */
  async getProgramAccounts(
    programId: string,
    filters?: any[]
  ): Promise<any[]> {
    return this.executeRequest<any[]>({
      method: 'getProgramAccounts',
      params: [programId, { filters, encoding: 'base64' }],
    });
  }

  /**
   * Получает статистику эндпоинтов
   */
  getEndpointsStats(): Array<{
    url: string;
    isHealthy: boolean;
    errorCount: number;
    responseTime: number;
    lastHealthCheck: Date;
  }> {
    return this.endpoints.map(ep => ({
      url: ep.url,
      isHealthy: ep.isHealthy,
      errorCount: ep.errorCount,
      responseTime: ep.responseTime,
      lastHealthCheck: ep.lastHealthCheck,
    }));
  }

  /**
   * Получает количество здоровых эндпоинтов
   */
  getHealthyEndpointsCount(): number {
    return this.endpoints.filter(ep => ep.isHealthy).length;
  }

  /**
   * Очищает ресурсы при завершении работы
   */
  onModuleDestroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
