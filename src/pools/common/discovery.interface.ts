import { LiquidityPoolData, PoolDiscoveryResult } from './liquidity-pool.interface';

export interface DiscoveryConfig {
  programId: string;
  batchSize: number;
  maxConcurrentRequests: number;
  retryAttempts: number;
  timeoutMs: number;
  filters?: DiscoveryFilter[];
}

export interface DiscoveryFilter {
  type: 'token' | 'liquidity' | 'fee' | 'protocol';
  value: any;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
}

export interface DiscoveryOptions {
  fromSlot?: number;
  toSlot?: number;
  limit?: number;
  includeInactive?: boolean;
  protocols?: string[];
  poolTypes?: string[];
}

export interface DiscoveryProgress {
  currentSlot: number;
  totalSlots: number;
  processedPools: number;
  foundPools: number;
  errors: number;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface DiscoveryStats {
  totalPoolsFound: number;
  poolsByProtocol: Record<string, number>;
  poolsByType: Record<string, number>;
  averageLiquidity: number;
  totalTvl: number;
  discoveryDuration: number;
  lastDiscoveryTime: Date;
}

export interface PoolValidator {
  validatePool(pool: LiquidityPoolData): boolean;
  validatePoolData(data: any): boolean;
  getValidationErrors(pool: LiquidityPoolData): string[];
}

export interface DiscoveryStrategy {
  name: string;
  description: string;
  
  discoverPools(
    config: DiscoveryConfig,
    options: DiscoveryOptions,
    onProgress?: (progress: DiscoveryProgress) => void
  ): Promise<PoolDiscoveryResult>;
  
  validateConfig(config: DiscoveryConfig): boolean;
  getConfigErrors(config: DiscoveryConfig): string[];
}

export interface PoolDataParser {
  parsePoolData(rawData: any): LiquidityPoolData | null;
  parsePoolAccount(accountData: any, address: string): LiquidityPoolData | null;
  validateParsedData(pool: LiquidityPoolData): boolean;
}

export interface DiscoveryService {
  startDiscovery(
    config: DiscoveryConfig,
    options: DiscoveryOptions
  ): Promise<PoolDiscoveryResult>;
  
  stopDiscovery(): Promise<void>;
  
  getDiscoveryProgress(): DiscoveryProgress | null;
  
  getDiscoveryStats(): DiscoveryStats;
  
  isDiscoveryRunning(): boolean;
}
