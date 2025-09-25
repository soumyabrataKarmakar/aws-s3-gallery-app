import * as Keychain from 'react-native-keychain';
import * as CryptoJS from 'crypto-js';

/**
 * Secure Token Storage Manager
 * Handles secure storage and retrieval of authentication tokens
 */
class TokenStorage {
  static SERVICE_NAME = 'aws-s3-gallery-auth';
  static USERNAME = 'auth-tokens';
  static DEFAULT_ACCESS_CONTROL = Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE;
  static DEFAULT_ACCESSIBLE = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  static ENCRYPTION_KEY = 'aws-s3-gallery-secure-key';

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokens) {
    try {
      const biometryType = await this.getSupportedBiometry();
      const accessControl = biometryType
        ? TokenStorage.DEFAULT_ACCESS_CONTROL
        : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE;

      const encryptedTokens = await this.encryptTokens(tokens);

      await Keychain.setInternetCredentials(
        TokenStorage.SERVICE_NAME,
        TokenStorage.USERNAME,
        encryptedTokens,
        {
          accessControl,
          accessible: TokenStorage.DEFAULT_ACCESSIBLE,
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }
  }

  /**
   * Retrieve stored authentication tokens
   */
  async getTokens() {
    try {
      const credentials = await Keychain.getInternetCredentials(TokenStorage.SERVICE_NAME);

      if (!credentials) {
        return null;
      }

      const decryptedTokens = await this.decryptTokens(credentials.password);
      return decryptedTokens;
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication tokens
   */
  async clearTokens() {
    try {
      return await Keychain.resetInternetCredentials(TokenStorage.SERVICE_NAME);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      return false;
    }
  }

  /**
   * Update existing tokens
   */
  async updateTokens(newTokens) {
    return await this.storeTokens(newTokens);
  }

  /**
   * Update only the access token, preserving other tokens
   */
  async updateAccessToken(newAccessToken) {
    try {
      const existingTokens = await this.getTokens();
      if (!existingTokens) {
        throw new Error('No existing tokens found');
      }

      const updatedTokens = {
        ...existingTokens,
        accessToken: newAccessToken,
      };

      return await this.storeTokens(updatedTokens);
    } catch (error) {
      console.error('Failed to update access token:', error);
      return false;
    }
  }

  /**
   * Validate token format
   */
  validateTokenFormat(tokens) {
    if (!tokens || typeof tokens !== 'object') {
      return false;
    }

    // Check for required token fields
    const requiredFields = ['accessToken'];
    for (const field of requiredFields) {
      if (!tokens[field] || typeof tokens[field] !== 'string') {
        return false;
      }
    }

    // Validate JWT format for access token
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    if (!jwtRegex.test(tokens.accessToken)) {
      return false;
    }

    return true;
  }

  /**
   * Check if tokens are expired
   */
  isTokenExpired(tokens) {
    if (!tokens || !tokens.expiresAt) {
      return false; // If no expiration time, assume not expired
    }

    return Date.now() >= tokens.expiresAt;
  }

  /**
   * Get supported biometry type
   */
  async getSupportedBiometry() {
    try {
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      console.error('Failed to get biometry support:', error);
      return null;
    }
  }

  /**
   * Encrypt token data
   */
  async encryptTokens(tokens) {
    try {
      const tokenString = JSON.stringify(tokens);
      const encrypted = CryptoJS.AES.encrypt(tokenString, TokenStorage.ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error('Failed to encrypt tokens:', error);
      return JSON.stringify(tokens); // Fallback to unencrypted
    }
  }

  /**
   * Decrypt token data
   */
  async decryptTokens(encryptedTokens) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedTokens, TokenStorage.ENCRYPTION_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        // Might be unencrypted legacy data
        return JSON.parse(encryptedTokens);
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      try {
        // Try parsing as unencrypted JSON (legacy support)
        return JSON.parse(encryptedTokens);
      } catch (parseError) {
        console.error('Failed to parse tokens as JSON:', parseError);
        return null;
      }
    }
  }

  /**
   * Check if keychain is available
   */
  async isKeychainAvailable() {
    try {
      const biometryType = await this.getSupportedBiometry();
      return biometryType !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get keychain security level
   */
  async getSecurityLevel() {
    const biometryType = await this.getSupportedBiometry();

    if (biometryType === 'FaceID') {
      return 'high-biometric-face';
    } else if (biometryType === 'TouchID' || biometryType === 'Fingerprint') {
      return 'high-biometric-fingerprint';
    } else if (biometryType) {
      return 'high-biometric-other';
    } else {
      return 'medium-passcode';
    }
  }

  /**
   * Validate stored token integrity
   */
  async validateStoredTokens() {
    try {
      const tokens = await this.getTokens();

      if (!tokens) {
        return { valid: false, reason: 'no-tokens' };
      }

      if (!this.validateTokenFormat(tokens)) {
        return { valid: false, reason: 'invalid-format' };
      }

      if (this.isTokenExpired(tokens)) {
        return { valid: false, reason: 'expired' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'error', error: error.message };
    }
  }
}

export default TokenStorage;