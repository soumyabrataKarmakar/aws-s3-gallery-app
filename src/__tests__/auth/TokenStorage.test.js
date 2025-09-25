import * as Keychain from 'react-native-keychain';
import TokenStorage from '../../auth/TokenStorage';

describe('TokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Storage Operations', () => {
    it('should store authentication tokens securely', async () => {
      const tokenStorage = new TokenStorage();
      const tokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        idToken: 'id-token-789',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      await tokenStorage.storeTokens(tokens);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        TokenStorage.SERVICE_NAME,
        TokenStorage.USERNAME,
        JSON.stringify(tokens),
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );
    });

    it('should retrieve stored tokens', async () => {
      const tokenStorage = new TokenStorage();
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        idToken: 'id-token-789',
        expiresAt: Date.now() + 3600000,
      };

      Keychain.getInternetCredentials.mockResolvedValue({
        username: TokenStorage.USERNAME,
        password: JSON.stringify(mockTokens),
      });

      const retrievedTokens = await tokenStorage.getTokens();

      expect(retrievedTokens).toEqual(mockTokens);
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(TokenStorage.SERVICE_NAME);
    });

    it('should return null when no tokens are stored', async () => {
      const tokenStorage = new TokenStorage();

      Keychain.getInternetCredentials.mockResolvedValue(false);

      const retrievedTokens = await tokenStorage.getTokens();

      expect(retrievedTokens).toBeNull();
    });

    it('should clear stored tokens', async () => {
      const tokenStorage = new TokenStorage();

      Keychain.resetInternetCredentials.mockResolvedValue(true);

      const result = await tokenStorage.clearTokens();

      expect(result).toBe(true);
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith(TokenStorage.SERVICE_NAME);
    });

    it('should handle keychain errors gracefully', async () => {
      const tokenStorage = new TokenStorage();
      const keychainError = new Error('Keychain access denied');

      Keychain.getInternetCredentials.mockRejectedValue(keychainError);

      const retrievedTokens = await tokenStorage.getTokens();

      expect(retrievedTokens).toBeNull();
    });
  });

  describe('Token Validation', () => {
    it('should validate token format', () => {
      const tokenStorage = new TokenStorage();
      const validTokens = {
        accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.test',
        refreshToken: 'refresh-token',
        idToken: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.test',
      };

      expect(tokenStorage.validateTokenFormat(validTokens)).toBe(true);
    });

    it('should reject invalid token format', () => {
      const tokenStorage = new TokenStorage();
      const invalidTokens = {
        accessToken: 'invalid-token',
        refreshToken: '',
        idToken: null,
      };

      expect(tokenStorage.validateTokenFormat(invalidTokens)).toBe(false);
    });

    it('should check token expiration', () => {
      const tokenStorage = new TokenStorage();
      const expiredTokens = {
        accessToken: 'token',
        expiresAt: Date.now() - 3600000, // 1 hour ago
      };
      const validTokens = {
        accessToken: 'token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      expect(tokenStorage.isTokenExpired(expiredTokens)).toBe(true);
      expect(tokenStorage.isTokenExpired(validTokens)).toBe(false);
    });

    it('should handle missing expiration time', () => {
      const tokenStorage = new TokenStorage();
      const tokensWithoutExpiration = {
        accessToken: 'token',
      };

      expect(tokenStorage.isTokenExpired(tokensWithoutExpiration)).toBe(false);
    });
  });

  describe('Security Features', () => {
    it('should use biometric authentication when available', async () => {
      const tokenStorage = new TokenStorage();

      Keychain.getSupportedBiometryType.mockResolvedValue('FaceID');

      const biometryType = await tokenStorage.getSupportedBiometry();

      expect(biometryType).toBe('FaceID');
      expect(Keychain.getSupportedBiometryType).toHaveBeenCalled();
    });

    it('should handle biometric authentication unavailable', async () => {
      const tokenStorage = new TokenStorage();

      Keychain.getSupportedBiometryType.mockResolvedValue(null);

      const biometryType = await tokenStorage.getSupportedBiometry();

      expect(biometryType).toBeNull();
    });

    it('should store tokens with appropriate security access control', async () => {
      const tokenStorage = new TokenStorage();
      const tokens = { accessToken: 'token' };

      await tokenStorage.storeTokens(tokens);

      const [serviceName, username, data, options] = Keychain.setInternetCredentials.mock.calls[0];

      expect(options.accessControl).toBe(Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE);
      expect(options.accessible).toBe(Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY);
    });

    it('should encrypt sensitive token data', async () => {
      const tokenStorage = new TokenStorage();
      const tokens = {
        accessToken: 'sensitive-token',
        refreshToken: 'sensitive-refresh',
      };

      const encryptedTokens = await tokenStorage.encryptTokens(tokens);

      expect(encryptedTokens).not.toEqual(JSON.stringify(tokens));
      expect(typeof encryptedTokens).toBe('string');
    });

    it('should decrypt token data correctly', async () => {
      const tokenStorage = new TokenStorage();
      const originalTokens = {
        accessToken: 'sensitive-token',
        refreshToken: 'sensitive-refresh',
      };

      const encrypted = await tokenStorage.encryptTokens(originalTokens);
      const decrypted = await tokenStorage.decryptTokens(encrypted);

      expect(decrypted).toEqual(originalTokens);
    });
  });

  describe('Token Refresh Management', () => {
    it('should update tokens after refresh', async () => {
      const tokenStorage = new TokenStorage();
      const oldTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
      };
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      // Store old tokens first
      await tokenStorage.storeTokens(oldTokens);
      jest.clearAllMocks();

      // Update with new tokens
      await tokenStorage.updateTokens(newTokens);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        TokenStorage.SERVICE_NAME,
        TokenStorage.USERNAME,
        JSON.stringify(newTokens),
        expect.any(Object)
      );
    });

    it('should preserve refresh token during access token update', async () => {
      const tokenStorage = new TokenStorage();
      const existingTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
      };
      const newAccessToken = 'new-access-token';

      Keychain.getInternetCredentials.mockResolvedValue({
        username: TokenStorage.USERNAME,
        password: JSON.stringify(existingTokens),
      });

      await tokenStorage.updateAccessToken(newAccessToken);

      const expectedTokens = {
        ...existingTokens,
        accessToken: newAccessToken,
      };

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        TokenStorage.SERVICE_NAME,
        TokenStorage.USERNAME,
        JSON.stringify(expectedTokens),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle keychain service unavailable', async () => {
      const tokenStorage = new TokenStorage();
      const keychainError = new Error('Keychain service unavailable');

      Keychain.setInternetCredentials.mockRejectedValue(keychainError);

      const result = await tokenStorage.storeTokens({ accessToken: 'token' });

      expect(result).toBe(false);
    });

    it('should recover from corrupted token data', async () => {
      const tokenStorage = new TokenStorage();

      Keychain.getInternetCredentials.mockResolvedValue({
        username: TokenStorage.USERNAME,
        password: 'corrupted-json-data',
      });

      const retrievedTokens = await tokenStorage.getTokens();

      expect(retrievedTokens).toBeNull();
    });

    it('should handle biometric authentication failure', async () => {
      const tokenStorage = new TokenStorage();
      const biometricError = new Error('Biometric authentication failed');

      Keychain.getInternetCredentials.mockRejectedValue(biometricError);

      const retrievedTokens = await tokenStorage.getTokens();

      expect(retrievedTokens).toBeNull();
    });

    it('should provide fallback when biometry is not available', async () => {
      const tokenStorage = new TokenStorage();
      const tokens = { accessToken: 'token' };

      Keychain.getSupportedBiometryType.mockResolvedValue(null);

      await tokenStorage.storeTokens(tokens);

      const [, , , options] = Keychain.setInternetCredentials.mock.calls[0];

      expect(options.accessControl).toBe(Keychain.ACCESS_CONTROL.DEVICE_PASSCODE);
    });
  });

  describe('Static Properties', () => {
    it('should have correct service configuration', () => {
      expect(TokenStorage.SERVICE_NAME).toBe('aws-s3-gallery-auth');
      expect(TokenStorage.USERNAME).toBe('auth-tokens');
    });

    it('should have secure default access controls', () => {
      expect(TokenStorage.DEFAULT_ACCESS_CONTROL).toBe(
        Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
      );
      expect(TokenStorage.DEFAULT_ACCESSIBLE).toBe(
        Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      );
    });
  });
});