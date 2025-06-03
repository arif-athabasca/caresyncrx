/**
 * Token Storage Implementation
 * 
 * Provides a class-based implementation of token storage with singleton pattern
 * to avoid circular dependencies and ensure consistent token access.
 */

interface TokenData {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

/**
 * Class-based implementation of token storage
 */
class TokenStorageClass {
  private static instance: TokenStorageClass;
  private tokenData: TokenData = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
  };
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    // Initialize with stored tokens if available
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage();
    }
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TokenStorageClass {
    if (!TokenStorageClass.instance) {
      TokenStorageClass.instance = new TokenStorageClass();
    }
    return TokenStorageClass.instance;
  }
  
  /**
   * Load tokens from storage (browser environment only)
   */
  private loadTokensFromStorage(): void {
    try {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedExpiresAt = localStorage.getItem('expiresAt');
      
      if (storedAccessToken) {
        this.tokenData.accessToken = storedAccessToken;
      }
      
      if (storedRefreshToken) {
        this.tokenData.refreshToken = storedRefreshToken;
      }
      
      if (storedExpiresAt) {
        this.tokenData.expiresAt = parseInt(storedExpiresAt, 10);
      }
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
    }
  }
  
  /**
   * Store tokens in storage (browser environment only)
   */
  private saveTokensToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        if (this.tokenData.accessToken) {
          localStorage.setItem('accessToken', this.tokenData.accessToken);
        } else {
          localStorage.removeItem('accessToken');
        }
        
        if (this.tokenData.refreshToken) {
          localStorage.setItem('refreshToken', this.tokenData.refreshToken);
        } else {
          localStorage.removeItem('refreshToken');
        }
        
        if (this.tokenData.expiresAt) {
          localStorage.setItem('expiresAt', this.tokenData.expiresAt.toString());
        } else {
          localStorage.removeItem('expiresAt');
        }
      }
    } catch (error) {
      console.error('Failed to save tokens to storage:', error);
    }
  }
  
  /**
   * Get the access token
   */
  public getAccessToken(): string | null {
    return this.tokenData.accessToken;
  }
  
  /**
   * Set the access token
   */
  public setAccessToken(token: string | null): void {
    this.tokenData.accessToken = token;
    this.saveTokensToStorage();
  }
  
  /**
   * Get the refresh token
   */
  public getRefreshToken(): string | null {
    return this.tokenData.refreshToken;
  }
  
  /**
   * Set the refresh token
   */
  public setRefreshToken(token: string | null): void {
    this.tokenData.refreshToken = token;
    this.saveTokensToStorage();
  }
  
  /**
   * Get the expiration timestamp
   */
  public getExpiresAt(): number | null {
    return this.tokenData.expiresAt;
  }
  
  /**
   * Set the expiration timestamp
   */
  public setExpiresAt(timestamp: number | null): void {
    this.tokenData.expiresAt = timestamp;
    this.saveTokensToStorage();
  }
  
  /**
   * Check if the access token is expired
   */
  public isTokenExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return true;
    
    // Add a 30-second buffer to account for network latency
    return Date.now() >= (expiresAt - 30000);
  }
  
  /**
   * Set all token data at once
   */
  public setTokens(accessToken: string | null, refreshToken: string | null, expiresAt: number | null): void {
    this.tokenData = {
      accessToken,
      refreshToken,
      expiresAt
    };
    this.saveTokensToStorage();
  }
  
  /**
   * Clear all tokens
   */
  public clearTokens(): void {
    this.tokenData = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    };
    this.saveTokensToStorage();
  }
}

// Create the singleton instance
const tokenStorageInstance = TokenStorageClass.getInstance();

// Export the instance as TokenStorage
export const TokenStorage = tokenStorageInstance;