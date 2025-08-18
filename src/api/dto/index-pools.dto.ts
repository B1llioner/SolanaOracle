import { IsOptional, IsString, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Protocol, PoolType } from '../../common/types/pools';

export class GetPoolsDto {
  @ApiProperty({ required: false, description: 'Протокол пула' })
  @IsOptional()
  @IsEnum(Protocol)
  protocol?: Protocol;

  @ApiProperty({ required: false, description: 'Тип пула' })
  @IsOptional()
  @IsEnum(PoolType)
  poolType?: PoolType;

  @ApiProperty({ required: false, description: 'Адрес токена' })
  @IsOptional()
  @IsString()
  tokenMint?: string;

  @ApiProperty({ required: false, description: 'Минимальная ликвидность', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLiquidity?: number;

  @ApiProperty({ required: false, description: 'Максимальная комиссия', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxFee?: number;

  @ApiProperty({ required: false, description: 'Количество записей', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiProperty({ required: false, description: 'Смещение', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiProperty({ required: false, description: 'Поле для сортировки' })
  @IsOptional()
  @IsString()
  sortField?: 'liquidity' | 'volume24h' | 'tvl' | 'fee' | 'createdAt' = 'liquidity';

  @ApiProperty({ required: false, description: 'Направление сортировки' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';
}

export class GetPoolByIdDto {
  @ApiProperty({ description: 'ID пула' })
  @IsString()
  id: string;
}

export class GetPoolByAddressDto {
  @ApiProperty({ description: 'Адрес пула' })
  @IsString()
  address: string;
}

export class GetPoolsByTokensDto {
  @ApiProperty({ description: 'Адрес первого токена' })
  @IsString()
  tokenA: string;

  @ApiProperty({ description: 'Адрес второго токена' })
  @IsString()
  tokenB: string;

  @ApiProperty({ required: false, description: 'Количество записей', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class GetPoolsStatsDto {
  @ApiProperty({ required: false, description: 'Протоколы для фильтрации' })
  @IsOptional()
  @IsArray()
  @IsEnum(Protocol, { each: true })
  protocols?: Protocol[];
}

export class CreatePoolDto {
  @ApiProperty({ description: 'Адрес пула' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Протокол пула' })
  @IsEnum(Protocol)
  protocol: Protocol;

  @ApiProperty({ description: 'Тип пула' })
  @IsEnum(PoolType)
  poolType: PoolType;

  @ApiProperty({ description: 'Символ первого токена' })
  @IsString()
  tokenA: string;

  @ApiProperty({ description: 'Символ второго токена' })
  @IsString()
  tokenB: string;

  @ApiProperty({ description: 'Адрес первого токена' })
  @IsString()
  tokenAMint: string;

  @ApiProperty({ description: 'Адрес второго токена' })
  @IsString()
  tokenBMint: string;

  @ApiProperty({ description: 'Комиссия пула', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  fee: number;

  @ApiProperty({ description: 'Ставка комиссии', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  feeRate: number;

  @ApiProperty({ description: 'Ликвидность пула', minimum: 0 })
  @IsNumber()
  @Min(0)
  liquidity: number;

  @ApiProperty({ required: false, description: 'Объем за 24 часа', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volume24h?: number;

  @ApiProperty({ required: false, description: 'Общая заблокированная стоимость', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tvl?: number;
}

export class UpdatePoolDto {
  @ApiProperty({ required: false, description: 'Протокол пула' })
  @IsOptional()
  @IsEnum(Protocol)
  protocol?: Protocol;

  @ApiProperty({ required: false, description: 'Тип пула' })
  @IsOptional()
  @IsEnum(PoolType)
  poolType?: PoolType;

  @ApiProperty({ required: false, description: 'Символ первого токена' })
  @IsOptional()
  @IsString()
  tokenA?: string;

  @ApiProperty({ required: false, description: 'Символ второго токена' })
  @IsOptional()
  @IsString()
  tokenB?: string;

  @ApiProperty({ required: false, description: 'Адрес первого токена' })
  @IsOptional()
  @IsString()
  tokenAMint?: string;

  @ApiProperty({ required: false, description: 'Адрес второго токена' })
  @IsOptional()
  @IsString()
  tokenBMint?: string;

  @ApiProperty({ required: false, description: 'Комиссия пула', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  fee?: number;

  @ApiProperty({ required: false, description: 'Ставка комиссии', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  feeRate?: number;

  @ApiProperty({ required: false, description: 'Ликвидность пула', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  liquidity?: number;

  @ApiProperty({ required: false, description: 'Объем за 24 часа', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volume24h?: number;

  @ApiProperty({ required: false, description: 'Общая заблокированная стоимость', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tvl?: number;
}
