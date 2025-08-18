import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL');
  }

  get solanaRpcEndpoints(): string[] {
    const endpoints = this.configService.get<string>('SOLANA_RPC_ENDPOINTS');
    return endpoints ? endpoints.split(',') : [];
  }

  get apiPort(): number {
    return this.configService.get<number>('API_PORT', 3000);
  }

  get apiHost(): string {
    return this.configService.get<string>('API_HOST', '0.0.0.0');
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  get rateLimitWindowMs(): number {
    return this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000);
  }

  get rateLimitMaxRequests(): number {
    return this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100);
  }

  get cacheTtl(): number {
    return this.configService.get<number>('CACHE_TTL', 300);
  }

  get poolCacheTtl(): number {
    return this.configService.get<number>('POOL_CACHE_TTL', 60);
  }

  get quoteCacheTtl(): number {
    return this.configService.get<number>('QUOTE_CACHE_TTL', 30);
  }

  get indexerIntervalMs(): number {
    return this.configService.get<number>('INDEXER_INTERVAL_MS', 5000);
  }

  get maxConcurrentRequests(): number {
    return this.configService.get<number>('MAX_CONCURRENT_REQUESTS', 10);
  }

  // Protocol specific program IDs
  get raydiumAmmProgramId(): string {
    return this.configService.get<string>('RAYDIUM_AMM_PROGRAM_ID');
  }

  get raydiumClmmProgramId(): string {
    return this.configService.get<string>('RAYDIUM_CLMM_PROGRAM_ID');
  }

  get orcaWhirlpoolProgramId(): string {
    return this.configService.get<string>('ORCA_WHIRLPOOL_PROGRAM_ID');
  }

  get meteoraDlmmProgramId(): string {
    return this.configService.get<string>('METEORA_DLMM_PROGRAM_ID');
  }
}
