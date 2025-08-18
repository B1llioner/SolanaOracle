import { Injectable } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { LiquidityPoolData } from '../common/liquidity-pool.interface';
import { Protocol, PoolType } from '../../common/types/pools';

export interface RaydiumAmmPoolLayout {
  status: number;
  nonce: number;
  maxOrder: number;
  depth: number;
  baseDecimal: number;
  quoteDecimal: number;
  state: number;
  resetFlag: number;
  minSize: number;
  volMaxCutRatio: number;
  amountWaveRatio: number;
  coinLotSize: number;
  pcLotSize: number;
  minPriceMultiplier: number;
  maxPriceMultiplier: number;
  systemDecimalValue: number;
  minSeparateNumerator: number;
  minSeparateDenominator: number;
  tradeFeeNumerator: number;
  tradeFeeDenominator: number;
  pnlNumerator: number;
  pnlDenominator: number;
  swapFeeNumerator: number;
  swapFeeDenominator: number;
  needTakePnlCoin: number;
  needTakePnlPc: number;
  totalPnlPc: number;
  totalPnlCoin: number;
  poolTotalDepositPc: number;
  poolTotalDepositCoin: number;
  swapCoinInAmount: number;
  swapPcOutAmount: number;
  swapCoinToPcFee: number;
  swapPcInAmount: number;
  swapCoinOutAmount: number;
  swapPcToCoinFee: number;
  tokenCoin: PublicKey;
  tokenPc: PublicKey;
  coinMint: PublicKey;
  pcMint: PublicKey;
  lpMint: PublicKey;
  openOrders: PublicKey;
  market: PublicKey;
  serumDex: PublicKey;
  targetOrders: PublicKey;
  withdrawQueue: PublicKey;
  lpVault: PublicKey;
  owner: PublicKey;
  pnlOwner: PublicKey;
}

@Injectable()
export class RaydiumAmmLayout {
  private readonly LAYOUT_SIZE = 752;
  private readonly PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

  /**
   * Парсит данные аккаунта пула Raydium AMM
   */
  parsePoolAccount(data: Buffer, address: string): LiquidityPoolData | null {
    try {
      if (data.length !== this.LAYOUT_SIZE) {
        return null;
      }

      const layout = this.decodeLayout(data);
      if (!this.validateLayout(layout)) {
        return null;
      }

      const poolData: LiquidityPoolData = {
        address,
        protocol: Protocol.RAYDIUM_AMM,
        poolType: PoolType.CONSTANT_PRODUCT,
        tokenA: layout.coinMint.toBase58(),
        tokenB: layout.pcMint.toBase58(),
        tokenAMint: layout.coinMint.toBase58(),
        tokenBMint: layout.pcMint.toBase58(),
        fee: layout.tradeFeeNumerator / layout.tradeFeeDenominator,
        feeRate: layout.tradeFeeNumerator / layout.tradeFeeDenominator,
        liquidity: this.calculateLiquidity(layout),
        reserves: {
          tokenA: layout.poolTotalDepositCoin,
          tokenB: layout.poolTotalDepositPc,
        },
        additionalData: {
          status: layout.status,
          market: layout.market.toBase58(),
          openOrders: layout.openOrders.toBase58(),
          lpMint: layout.lpMint.toBase58(),
          baseDecimal: layout.baseDecimal,
          quoteDecimal: layout.quoteDecimal,
        },
      };

      return poolData;
    } catch (error) {
      console.error('Ошибка парсинга Raydium AMM пула:', error);
      return null;
    }
  }

  /**
   * Декодирует layout из буфера
   */
  private decodeLayout(data: Buffer): RaydiumAmmPoolLayout {
    let offset = 0;

    const readU8 = () => {
      const value = data.readUInt8(offset);
      offset += 1;
      return value;
    };

    const readU64 = () => {
      const value = data.readBigUInt64LE(offset);
      offset += 8;
      return Number(value);
    };

    const readU128 = () => {
      const value = data.readBigUInt64LE(offset);
      offset += 8;
      return Number(value);
    };

    const readPubkey = () => {
      const pubkey = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      return pubkey;
    };

    return {
      status: readU8(),
      nonce: readU8(),
      maxOrder: readU64(),
      depth: readU64(),
      baseDecimal: readU64(),
      quoteDecimal: readU64(),
      state: readU8(),
      resetFlag: readU8(),
      minSize: readU64(),
      volMaxCutRatio: readU64(),
      amountWaveRatio: readU64(),
      coinLotSize: readU64(),
      pcLotSize: readU64(),
      minPriceMultiplier: readU64(),
      maxPriceMultiplier: readU64(),
      systemDecimalValue: readU64(),
      minSeparateNumerator: readU64(),
      minSeparateDenominator: readU64(),
      tradeFeeNumerator: readU64(),
      tradeFeeDenominator: readU64(),
      pnlNumerator: readU64(),
      pnlDenominator: readU64(),
      swapFeeNumerator: readU64(),
      swapFeeDenominator: readU64(),
      needTakePnlCoin: readU64(),
      needTakePnlPc: readU64(),
      totalPnlPc: readU64(),
      totalPnlCoin: readU64(),
      poolTotalDepositPc: readU64(),
      poolTotalDepositCoin: readU64(),
      swapCoinInAmount: readU64(),
      swapPcOutAmount: readU64(),
      swapCoinToPcFee: readU64(),
      swapPcInAmount: readU64(),
      swapCoinOutAmount: readU64(),
      swapPcToCoinFee: readU64(),
      tokenCoin: readPubkey(),
      tokenPc: readPubkey(),
      coinMint: readPubkey(),
      pcMint: readPubkey(),
      lpMint: readPubkey(),
      openOrders: readPubkey(),
      market: readPubkey(),
      serumDex: readPubkey(),
      targetOrders: readPubkey(),
      withdrawQueue: readPubkey(),
      lpVault: readPubkey(),
      owner: readPubkey(),
      pnlOwner: readPubkey(),
    };
  }

  /**
   * Валидирует layout
   */
  private validateLayout(layout: RaydiumAmmPoolLayout): boolean {
    // Проверяем базовые условия
    if (layout.status !== 1) return false; // Только активные пулы
    if (layout.tradeFeeDenominator === 0) return false;
    if (layout.poolTotalDepositCoin === 0 && layout.poolTotalDepositPc === 0) return false;

    // Проверяем, что пул не пустой
    if (layout.poolTotalDepositCoin === 0 || layout.poolTotalDepositPc === 0) {
      return false;
    }

    return true;
  }

  /**
   * Вычисляет ликвидность пула
   */
  private calculateLiquidity(layout: RaydiumAmmPoolLayout): number {
    // Упрощенный расчет ликвидности как сумма депозитов
    return layout.poolTotalDepositCoin + layout.poolTotalDepositPc;
  }

  /**
   * Вычисляет цену токена
   */
  calculatePrice(layout: RaydiumAmmPoolLayout): number {
    if (layout.poolTotalDepositCoin === 0) return 0;
    return layout.poolTotalDepositPc / layout.poolTotalDepositCoin;
  }

  /**
   * Вычисляет количество токенов при свапе
   */
  calculateSwapOutput(
    layout: RaydiumAmmPoolLayout,
    inputAmount: number,
    isCoinToPc: boolean
  ): { outputAmount: number; fee: number } {
    const feeRate = layout.tradeFeeNumerator / layout.tradeFeeDenominator;
    const inputAmountWithFee = inputAmount * (1 - feeRate);

    let outputAmount: number;
    let fee: number;

    if (isCoinToPc) {
      // Coin -> PC
      const newCoinReserve = layout.poolTotalDepositCoin + inputAmountWithFee;
      const newPcReserve = (layout.poolTotalDepositCoin * layout.poolTotalDepositPc) / newCoinReserve;
      outputAmount = layout.poolTotalDepositPc - newPcReserve;
      fee = inputAmount * feeRate;
    } else {
      // PC -> Coin
      const newPcReserve = layout.poolTotalDepositPc + inputAmountWithFee;
      const newCoinReserve = (layout.poolTotalDepositCoin * layout.poolTotalDepositPc) / newPcReserve;
      outputAmount = layout.poolTotalDepositCoin - newCoinReserve;
      fee = inputAmount * feeRate;
    }

    return { outputAmount, fee };
  }

  /**
   * Проверяет, является ли аккаунт пулом Raydium AMM
   */
  isRaydiumAmmPool(data: Buffer): boolean {
    return data.length === this.LAYOUT_SIZE;
  }

  /**
   * Получает размер layout
   */
  getLayoutSize(): number {
    return this.LAYOUT_SIZE;
  }

  /**
   * Получает ID программы
   */
  getProgramId(): string {
    return this.PROGRAM_ID;
  }
}
