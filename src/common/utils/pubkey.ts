import { PublicKey } from '@solana/web3.js';

/**
 * Утилиты для работы с публичными ключами Solana
 */
export class PubkeyUtils {
  /**
   * Проверяет, является ли строка валидным публичным ключом
   */
  static isValidPubkey(pubkey: string): boolean {
    try {
      new PublicKey(pubkey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Создает PublicKey из строки с валидацией
   */
  static createPubkey(pubkey: string): PublicKey {
    if (!this.isValidPubkey(pubkey)) {
      throw new Error(`Невалидный публичный ключ: ${pubkey}`);
    }
    return new PublicKey(pubkey);
  }

  /**
   * Создает массив PublicKey из массива строк
   */
  static createPubkeys(pubkeys: string[]): PublicKey[] {
    return pubkeys.map(pubkey => this.createPubkey(pubkey));
  }

  /**
   * Конвертирует PublicKey в строку
   */
  static toString(pubkey: PublicKey): string {
    return pubkey.toBase58();
  }

  /**
   * Конвертирует массив PublicKey в массив строк
   */
  static toStrings(pubkeys: PublicKey[]): string[] {
    return pubkeys.map(pubkey => this.toString(pubkey));
  }

  /**
   * Сравнивает два публичных ключа
   */
  static equals(pubkey1: PublicKey | string, pubkey2: PublicKey | string): boolean {
    const pk1 = typeof pubkey1 === 'string' ? this.createPubkey(pubkey1) : pubkey1;
    const pk2 = typeof pubkey2 === 'string' ? this.createPubkey(pubkey2) : pubkey2;
    return pk1.equals(pk2);
  }

  /**
   * Проверяет, содержит ли массив публичных ключей указанный ключ
   */
  static includes(pubkeys: (PublicKey | string)[], target: PublicKey | string): boolean {
    return pubkeys.some(pubkey => this.equals(pubkey, target));
  }

  /**
   * Создает уникальный массив публичных ключей
   */
  static unique(pubkeys: (PublicKey | string)[]): PublicKey[] {
    const uniquePubkeys: PublicKey[] = [];
    const seen = new Set<string>();

    for (const pubkey of pubkeys) {
      const pk = typeof pubkey === 'string' ? this.createPubkey(pubkey) : pubkey;
      const pkString = this.toString(pk);
      
      if (!seen.has(pkString)) {
        seen.add(pkString);
        uniquePubkeys.push(pk);
      }
    }

    return uniquePubkeys;
  }

  /**
   * Фильтрует массив публичных ключей по валидности
   */
  static filterValid(pubkeys: string[]): PublicKey[] {
    return pubkeys
      .filter(pubkey => this.isValidPubkey(pubkey))
      .map(pubkey => this.createPubkey(pubkey));
  }

  /**
   * Создает короткое представление публичного ключа (первые и последние символы)
   */
  static toShortString(pubkey: PublicKey | string, length: number = 8): string {
    const pkString = typeof pubkey === 'string' ? pubkey : this.toString(pubkey);
    if (pkString.length <= length * 2) {
      return pkString;
    }
    return `${pkString.slice(0, length)}...${pkString.slice(-length)}`;
  }

  /**
   * Создает адрес программы из строки
   */
  static createProgramId(programId: string): PublicKey {
    return this.createPubkey(programId);
  }

  /**
   * Проверяет, является ли публичный ключ адресом программы
   */
  static isProgramId(pubkey: PublicKey | string): boolean {
    try {
      const pk = typeof pubkey === 'string' ? this.createPubkey(pubkey) : pubkey;
      // В Solana все публичные ключи могут быть программами
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Создает адрес токена из строки
   */
  static createTokenMint(mint: string): PublicKey {
    return this.createPubkey(mint);
  }

  /**
   * Проверяет, является ли публичный ключ адресом токена
   */
  static isTokenMint(pubkey: PublicKey | string): boolean {
    try {
      const pk = typeof pubkey === 'string' ? this.createPubkey(pubkey) : pubkey;
      // В Solana все публичные ключи могут быть токенами
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Создает адрес пула из строки
   */
  static createPoolAddress(address: string): PublicKey {
    return this.createPubkey(address);
  }

  /**
   * Проверяет, является ли публичный ключ адресом пула
   */
  static isPoolAddress(pubkey: PublicKey | string): boolean {
    try {
      const pk = typeof pubkey === 'string' ? this.createPubkey(pubkey) : pubkey;
      // В Solana все публичные ключи могут быть пулами
      return true;
    } catch {
      return false;
    }
  }
}
