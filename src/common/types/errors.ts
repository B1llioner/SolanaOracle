export enum ErrorCode {
  // Общие ошибки
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Ошибки базы данных
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',

  // Ошибки RPC
  RPC_ERROR = 'RPC_ERROR',
  RPC_CONNECTION_ERROR = 'RPC_CONNECTION_ERROR',
  RPC_TIMEOUT = 'RPC_TIMEOUT',
  RPC_RATE_LIMIT = 'RPC_RATE_LIMIT',

  // Ошибки кэша
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_CONNECTION_ERROR = 'CACHE_CONNECTION_ERROR',

  // Ошибки пулов
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  POOL_INVALID = 'POOL_INVALID',
  POOL_INSUFFICIENT_LIQUIDITY = 'POOL_INSUFFICIENT_LIQUIDITY',
  POOL_FROZEN = 'POOL_FROZEN',

  // Ошибки котировок
  QUOTE_NOT_FOUND = 'QUOTE_NOT_FOUND',
  QUOTE_EXPIRED = 'QUOTE_EXPIRED',
  QUOTE_INVALID = 'QUOTE_INVALID',
  QUOTE_INSUFFICIENT_LIQUIDITY = 'QUOTE_INSUFFICIENT_LIQUIDITY',
  QUOTE_SLIPPAGE_TOO_HIGH = 'QUOTE_SLIPPAGE_TOO_HIGH',
  QUOTE_PRICE_IMPACT_TOO_HIGH = 'QUOTE_PRICE_IMPACT_TOO_HIGH',

  // Ошибки токенов
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_PAIR_NOT_SUPPORTED = 'TOKEN_PAIR_NOT_SUPPORTED',

  // Ошибки протоколов
  PROTOCOL_NOT_SUPPORTED = 'PROTOCOL_NOT_SUPPORTED',
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  PROTOCOL_TIMEOUT = 'PROTOCOL_TIMEOUT',

  // Ошибки агрегатора
  AGGREGATOR_ERROR = 'AGGREGATOR_ERROR',
  AGGREGATOR_NO_QUOTES = 'AGGREGATOR_NO_QUOTES',
  AGGREGATOR_TIMEOUT = 'AGGREGATOR_TIMEOUT',

  // Ошибки индексера
  INDEXER_ERROR = 'INDEXER_ERROR',
  INDEXER_SYNC_ERROR = 'INDEXER_SYNC_ERROR',
  INDEXER_BLOCK_NOT_FOUND = 'INDEXER_BLOCK_NOT_FOUND',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

export class LiquidityError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message);
    this.name = 'LiquidityError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

export class ValidationError extends LiquidityError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends LiquidityError {
  constructor(resource: string, details?: Record<string, any>) {
    super(ErrorCode.NOT_FOUND, `${resource} не найден`, details);
    this.name = 'NotFoundError';
  }
}

export class RpcError extends LiquidityError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.RPC_ERROR, message, details);
    this.name = 'RpcError';
  }
}

export class QuoteError extends LiquidityError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.QUOTE_INVALID, message, details);
    this.name = 'QuoteError';
  }
}

export class PoolError extends LiquidityError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.POOL_INVALID, message, details);
    this.name = 'PoolError';
  }
}

export class AggregatorError extends LiquidityError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.AGGREGATOR_ERROR, message, details);
    this.name = 'AggregatorError';
  }
}
