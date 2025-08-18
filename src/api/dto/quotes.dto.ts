import { IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetQuoteDto {
  @ApiProperty({ description: 'Адрес входного токена' })
  @IsString()
  inputToken: string;

  @ApiProperty({ description: 'Адрес выходного токена' })
  @IsString()
  outputToken: string;

  @ApiProperty({ description: 'Количество входного токена', minimum: 0 })
  @IsNumber()
  @Min(0)
  inputAmount: number;

  @ApiProperty({ required: false, description: 'Допустимое проскальзывание', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  slippageTolerance?: number;

  @ApiProperty({ required: false, description: 'Протоколы для поиска' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  protocols?: string[];

  @ApiProperty({ required: false, description: 'Типы пулов для поиска' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  poolTypes?: string[];
}

export class GetAggregatedQuoteDto {
  @ApiProperty({ description: 'Адрес входного токена' })
  @IsString()
  inputToken: string;

  @ApiProperty({ description: 'Адрес выходного токена' })
  @IsString()
  outputToken: string;

  @ApiProperty({ description: 'Количество входного токена', minimum: 0 })
  @IsNumber()
  @Min(0)
  inputAmount: number;

  @ApiProperty({ required: false, description: 'Допустимое проскальзывание', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  slippageTolerance?: number;

  @ApiProperty({ required: false, description: 'Протоколы для поиска' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  protocols?: string[];

  @ApiProperty({ required: false, description: 'Типы пулов для поиска' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  poolTypes?: string[];
}

export class GetQuoteHistoryDto {
  @ApiProperty({ description: 'Адрес входного токена' })
  @IsString()
  inputToken: string;

  @ApiProperty({ description: 'Адрес выходного токена' })
  @IsString()
  outputToken: string;

  @ApiProperty({ required: false, description: 'Количество записей', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

export class GetQuotesDto {
  @ApiProperty({ required: false, description: 'Адрес входного токена' })
  @IsOptional()
  @IsString()
  inputToken?: string;

  @ApiProperty({ required: false, description: 'Адрес выходного токена' })
  @IsOptional()
  @IsString()
  outputToken?: string;

  @ApiProperty({ required: false, description: 'Минимальное количество входного токена', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minInputAmount?: number;

  @ApiProperty({ required: false, description: 'Максимальное количество входного токена', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxInputAmount?: number;

  @ApiProperty({ required: false, description: 'Протоколы для фильтрации' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  protocols?: string[];

  @ApiProperty({ required: false, description: 'Типы пулов для фильтрации' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  poolTypes?: string[];

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
  sortField?: 'price' | 'outputAmount' | 'fee' | 'priceImpact' | 'createdAt' = 'createdAt';

  @ApiProperty({ required: false, description: 'Направление сортировки' })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';
}

export class GetQuoteByIdDto {
  @ApiProperty({ description: 'ID котировки' })
  @IsString()
  id: string;
}

export class GetQuotesByPoolDto {
  @ApiProperty({ description: 'ID пула' })
  @IsString()
  poolId: string;

  @ApiProperty({ required: false, description: 'Количество записей', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

export class GetQuotesStatsDto {
  @ApiProperty({ required: false, description: 'Адрес входного токена' })
  @IsOptional()
  @IsString()
  inputToken?: string;

  @ApiProperty({ required: false, description: 'Адрес выходного токена' })
  @IsOptional()
  @IsString()
  outputToken?: string;

  @ApiProperty({ required: false, description: 'Протоколы для фильтрации' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  protocols?: string[];

  @ApiProperty({ required: false, description: 'Типы пулов для фильтрации' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  poolTypes?: string[];
}
