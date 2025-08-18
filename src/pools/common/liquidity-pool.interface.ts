import { Protocol, PoolType } from '../../common/types/pools';

export interface LiquidityPoolData {
  address: string;
  protocol: Protocol;
  poolType: PoolType;
  tokenA: string;
  tokenB: string;
  tokenAMint: string;
  tokenBMint: string;
  fee: number;
  feeRate: number;
  liquidity: number;
  volume24h?: number;
  tvl?: number;
  reserves?: {
    tokenA: number;
    tokenB: number;
  };
  additionalData?: Record<string, any>;
}

export interface LiquidityPoolState {
  isActive: boolean;
  isFrozen: boolean;
  lastUpdate: Date;
  blockNumber?: number;
  slot?: number;
}

export interface PoolQuoteRequest {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  slippageTolerance?: number;
}

export interface PoolQuoteResponse {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  price: number;
  priceImpact: number;
  fee: number;
  poolAddress: string;
  protocol: Protocol;
  poolType: PoolType;
  validUntil: Date;
  route?: PoolQuoteRoute[];
}

export interface PoolQuoteRoute {
  poolAddress: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  price: number;
  fee: number;
}

export interface PoolDiscoveryResult {
  pools: LiquidityPoolData[];
  totalFound: number;
  lastSlot: number;
  discoveryTime: Date;
}

export interface PoolUpdateResult {
  updated: number;
  created: number;
  errors: number;
  lastUpdate: Date;
}

export interface PoolHealthCheck {
  isHealthy: boolean;
  lastCheck: Date;
  errorCount: number;
  responseTime: number;
  details?: Record<string, any>;
}
