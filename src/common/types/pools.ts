export enum Protocol {
  RAYDIUM_AMM = 'RAYDIUM_AMM',
  RAYDIUM_CLMM = 'RAYDIUM_CLMM',
  ORCA_WHIRLPOOL = 'ORCA_WHIRLPOOL',
  METEORA_DLMM = 'METEORA_DLMM',
}

export enum PoolType {
  CONSTANT_PRODUCT = 'CONSTANT_PRODUCT',
  CONSTANT_SUM = 'CONSTANT_SUM',
  WEIGHTED = 'WEIGHTED',
  CONCENTRATED = 'CONCENTRATED',
}

export interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
  name?: string;
}

export interface PoolInfo {
  id: string;
  address: string;
  protocol: Protocol;
  poolType: PoolType;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  fee: number;
  feeRate: number;
  liquidity: number;
  volume24h?: number;
  tvl?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PoolStats {
  totalLiquidity: number;
  totalVolume24h: number;
  totalTvl: number;
  poolCount: number;
  protocolDistribution: Record<Protocol, number>;
}

export interface PoolFilter {
  protocol?: Protocol;
  poolType?: PoolType;
  tokenMint?: string;
  minLiquidity?: number;
  maxFee?: number;
  limit?: number;
  offset?: number;
}

export interface PoolSort {
  field: 'liquidity' | 'volume24h' | 'tvl' | 'fee' | 'createdAt';
  direction: 'asc' | 'desc';
}
