import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import Redis from 'redis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis.RedisClientType;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  /**
   * Инициализирует подключение к Redis
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = Redis.createClient({
        url: this.configService.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Превышено максимальное количество попыток переподключения к Redis');
              return new Error('Превышено максимальное количество попыток переподключения');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Подключение к Redis установлено');
        this.isConnected = true;
      });

      this.redisClient.on('error', (error) => {
        this.logger.error('Ошибка Redis:', error);
        this.isConnected = false;
      });

      this.redisClient.on('disconnect', () => {
        this.logger.warn('Отключение от Redis');
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.error('Не удалось подключиться к Redis:', error);
      throw error;
    }
  }

  /**
   * Проверяет подключение к Redis
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.initializeRedis();
    }
  }

  /**
   * Устанавливает значение в кэш
   */
  async set(
    key: string,
    value: any,
    ttl: number = this.configService.cacheTtl
  ): Promise<void> {
    try {
      await this.ensureConnection();
      const serializedValue = JSON.stringify(value);
      await this.redisClient.setEx(key, ttl, serializedValue);
      this.logger.debug(`Кэш установлен: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Ошибка установки кэша для ключа ${key}:`, error);
      throw error;
    }
  }

  /**
   * Получает значение из кэша
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnection();
      const value = await this.redisClient.get(key);
      
      if (value === null) {
        this.logger.debug(`Кэш не найден: ${key}`);
        return null;
      }

      const parsedValue = JSON.parse(value) as T;
      this.logger.debug(`Кэш получен: ${key}`);
      return parsedValue;
    } catch (error) {
      this.logger.error(`Ошибка получения кэша для ключа ${key}:`, error);
      return null;
    }
  }

  /**
   * Удаляет значение из кэша
   */
  async delete(key: string): Promise<void> {
    try {
      await this.ensureConnection();
      await this.redisClient.del(key);
      this.logger.debug(`Кэш удален: ${key}`);
    } catch (error) {
      this.logger.error(`Ошибка удаления кэша для ключа ${key}:`, error);
      throw error;
    }
  }

  /**
   * Проверяет существование ключа в кэше
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Ошибка проверки существования ключа ${key}:`, error);
      return false;
    }
  }

  /**
   * Устанавливает время жизни ключа
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.ensureConnection();
      await this.redisClient.expire(key, ttl);
      this.logger.debug(`TTL установлен для ключа ${key}: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Ошибка установки TTL для ключа ${key}:`, error);
      throw error;
    }
  }

  /**
   * Получает время жизни ключа
   */
  async ttl(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.redisClient.ttl(key);
    } catch (error) {
      this.logger.error(`Ошибка получения TTL для ключа ${key}:`, error);
      return -1;
    }
  }

  /**
   * Увеличивает значение счетчика
   */
  async increment(key: string, value: number = 1): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.redisClient.incrBy(key, value);
    } catch (error) {
      this.logger.error(`Ошибка увеличения счетчика для ключа ${key}:`, error);
      throw error;
    }
  }

  /**
   * Устанавливает значение с условием (только если ключ не существует)
   */
  async setNX(key: string, value: any, ttl: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      const serializedValue = JSON.stringify(value);
      const result = await this.redisClient.setNX(key, serializedValue);
      
      if (result) {
        await this.redisClient.expire(key, ttl);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Ошибка установки NX для ключа ${key}:`, error);
      throw error;
    }
  }

  /**
   * Получает или устанавливает значение (get-or-set)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.configService.cacheTtl
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Удаляет все ключи по паттерну
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      await this.ensureConnection();
      const keys = await this.redisClient.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redisClient.del(keys);
      this.logger.debug(`Удалено ${deleted} ключей по паттерну: ${pattern}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Ошибка удаления по паттерну ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Получает статистику кэша
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: any;
    keyspace: any;
  }> {
    try {
      await this.ensureConnection();
      
      const [memory, keyspace] = await Promise.all([
        this.redisClient.memoryUsage(),
        this.redisClient.info('keyspace'),
      ]);

      return {
        connected: this.isConnected,
        memory,
        keyspace,
      };
    } catch (error) {
      this.logger.error('Ошибка получения статистики Redis:', error);
      return {
        connected: this.isConnected,
        memory: null,
        keyspace: null,
      };
    }
  }

  /**
   * Очищает весь кэш
   */
  async flushAll(): Promise<void> {
    try {
      await this.ensureConnection();
      await this.redisClient.flushAll();
      this.logger.warn('Весь кэш очищен');
    } catch (error) {
      this.logger.error('Ошибка очистки кэша:', error);
      throw error;
    }
  }

  /**
   * Очищает ресурсы при завершении работы
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Подключение к Redis закрыто');
    }
  }
}
