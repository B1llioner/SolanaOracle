export interface QuoteRequest {
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  slippageTolerance?: number;
  protocols?: string[];
  poolTypes?: string[];
}

export interface QuoteResponse {
  id: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  price: number;
  priceImpact: number;
  fee: number;
  poolId: string;
  protocol: string;
  poolType: string;
  route: QuoteRoute[];
  estimatedGas?: number;
  validUntil: Date;
}

export interface QuoteRoute {
  poolId: string;
  protocol: string;
  poolType: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  price: number;
  fee: number;
}

export interface AggregatedQuote {
  bestQuote: QuoteResponse;
  allQuotes: QuoteResponse[];
  summary: QuoteSummary;
}

export interface QuoteSummary {
  totalInputAmount: number;
  totalOutputAmount: number;
  averagePrice: number;
  bestPrice: number;
  worstPrice: number;
  totalFee: number;
  totalPriceImpact: number;
  quoteCount: number;
}

export interface QuoteFilter {
  inputToken?: string;
  outputToken?: string;
  minInputAmount?: number;
  maxInputAmount?: number;
  protocols?: string[];
  poolTypes?: string[];
  limit?: number;
  offset?: number;
}

export interface QuoteSort {
  field: 'price' | 'outputAmount' | 'fee' | 'priceImpact' | 'createdAt';
  direction: 'asc' | 'desc';
}
