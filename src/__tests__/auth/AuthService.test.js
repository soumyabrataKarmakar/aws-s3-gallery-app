import { Auth } from 'aws-amplify';
import * as Keychain from 'react-native-keychain';
import AuthService from '../../auth/AuthService';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const authService = new AuthService();

      expect(authService.isConfigured).toBe(false);
      expect(authService.currentUser).toBeNull();
    });

    it('should initialize Amplify configuration on first use', async () => {
      const authService = new AuthService();

      await authService.initialize();

      expect(authService.isConfigured).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const authService = new AuthService();

      // Mock initialization failure
      jest.spyOn(authService, 'configureAmplify').mockRejectedValue(new Error('Init error'));

      await expect(authService.initialize()).rejects.toThrow('Failed to initialize AuthService');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Token Management', () => {
    it('should securely store authentication tokens', async () => {
      const authService = new AuthService();
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
      };

      await authService.storeTokens(mockTokens);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'aws-s3-gallery-auth',
        'tokens',
        JSON.stringify(mockTokens)
      );
    });

    it('should retrieve stored authentication tokens', async () => {
      const authService = new AuthService();
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
      };

      Keychain.getInternetCredentials.mockResolvedValue({
        username: 'tokens',
        password: JSON.stringify(mockTokens),
      });

      const tokens = await authService.getStoredTokens();

      expect(tokens).toEqual(mockTokens);
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith('aws-s3-gallery-auth');
    });

    it('should handle missing stored tokens gracefully', async () => {
      const authService = new AuthService();

      Keychain.getInternetCredentials.mockResolvedValue(false);

      const tokens = await authService.getStoredTokens();

      expect(tokens).toBeNull();
    });

    it('should clear stored tokens on logout', async () => {
      const authService = new AuthService();

      await authService.clearStoredTokens();

      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('aws-s3-gallery-auth');
    });

    it('should validate token expiration', () => {
      const authService = new AuthService();
      const expiredToken = {
        payload: {
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
      };
      const validToken = {
        payload: {
          exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        },
      };

      expect(authService.isTokenExpired(expiredToken)).toBe(true);
      expect(authService.isTokenExpired(validToken)).toBe(false);
    });
  });

  describe('Authentication Flow', () => {
    it('should authenticate user with valid credentials', async () => {
      const authService = new AuthService();
      const mockUser = { username: 'testuser', attributes: { email: 'test@example.com' } };

      Auth.signIn.mockResolvedValue(mockUser);
      Auth.currentAuthenticatedUser.mockResolvedValue(mockUser);

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(Auth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should handle authentication failure', async () => {
      const authService = new AuthService();
      const authError = new Error('Invalid credentials');

      Auth.signIn.mockRejectedValue(authError);

      const result = await authService.signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle user not confirmed error', async () => {
      const authService = new AuthService();
      const notConfirmedError = new Error('User is not confirmed.');
      notConfirmedError.code = 'UserNotConfirmedException';

      Auth.signIn.mockRejectedValue(notConfirmedError);

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should sign out user and clear tokens', async () => {
      const authService = new AuthService();

      Auth.signOut.mockResolvedValue();

      const result = await authService.signOut();

      expect(result.success).toBe(true);
      expect(Auth.signOut).toHaveBeenCalledWith({ global: true });
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith('aws-s3-gallery-auth');
    });

    it('should handle sign out errors', async () => {
      const authService = new AuthService();
      const signOutError = new Error('Sign out failed');

      Auth.signOut.mockRejectedValue(signOutError);

      const result = await authService.signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('Session Management', () => {
    it('should check if user is authenticated', async () => {
      const authService = new AuthService();
      const mockUser = { username: 'testuser' };

      Auth.currentAuthenticatedUser.mockResolvedValue(mockUser);

      const isAuthenticated = await authService.isAuthenticated();

      expect(isAuthenticated).toBe(true);
      expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
    });

    it('should return false when no user is authenticated', async () => {
      const authService = new AuthService();

      Auth.currentAuthenticatedUser.mockRejectedValue(new Error('No user'));

      const isAuthenticated = await authService.isAuthenticated();

      expect(isAuthenticated).toBe(false);
    });

    it('should get current authenticated user', async () => {
      const authService = new AuthService();
      const mockUser = { username: 'testuser', attributes: { email: 'test@example.com' } };

      Auth.currentAuthenticatedUser.mockResolvedValue(mockUser);

      const user = await authService.getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should refresh authentication tokens automatically', async () => {
      const authService = new AuthService();
      const mockCredentials = {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        sessionToken: 'session-token',
      };

      Auth.currentCredentials.mockResolvedValue(mockCredentials);

      const credentials = await authService.refreshCredentials();

      expect(credentials).toEqual(mockCredentials);
      expect(Auth.currentCredentials).toHaveBeenCalledWith({ forceRefresh: true });
    });
  });

  describe('S3 Permissions Verification', () => {
    it('should verify S3 permissions after authentication', async () => {
      const authService = new AuthService();
      const mockCredentials = {
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        sessionToken: 'session-token',
      };

      Auth.currentCredentials.mockResolvedValue(mockCredentials);

      // Mock S3 operations
      jest.spyOn(authService, 'testS3Permissions').mockResolvedValue({
        canRead: true,
        canWrite: true,
        canDelete: true,
        canList: true,
      });

      const permissions = await authService.verifyS3Permissions();

      expect(permissions.canRead).toBe(true);
      expect(permissions.canWrite).toBe(true);
      expect(permissions.canDelete).toBe(true);
      expect(permissions.canList).toBe(true);
    });

    it('should handle S3 permission verification failure', async () => {
      const authService = new AuthService();

      Auth.currentCredentials.mockRejectedValue(new Error('No credentials'));

      const permissions = await authService.verifyS3Permissions();

      expect(permissions.canRead).toBe(false);
      expect(permissions.canWrite).toBe(false);
      expect(permissions.canDelete).toBe(false);
      expect(permissions.canList).toBe(false);
    });

    it('should test individual S3 permissions', async () => {
      const authService = new AuthService();

      // Mock individual permission tests
      jest.spyOn(authService, 'testS3Read').mockResolvedValue(true);
      jest.spyOn(authService, 'testS3Write').mockResolvedValue(true);
      jest.spyOn(authService, 'testS3Delete').mockResolvedValue(false);
      jest.spyOn(authService, 'testS3List').mockResolvedValue(true);

      const permissions = await authService.testS3Permissions();

      expect(permissions.canRead).toBe(true);
      expect(permissions.canWrite).toBe(true);
      expect(permissions.canDelete).toBe(false);
      expect(permissions.canList).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      const authService = new AuthService();
      const networkError = new Error('Network error');
      networkError.code = 'NetworkError';

      Auth.signIn.mockRejectedValue(networkError);

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.networkError).toBe(true);
    });

    it('should provide user-friendly error messages', () => {
      const authService = new AuthService();

      expect(authService.getErrorMessage({ code: 'UserNotFoundException' }))
        .toBe('User not found. Please check your email address.');

      expect(authService.getErrorMessage({ code: 'NotAuthorizedException' }))
        .toBe('Invalid username or password.');

      expect(authService.getErrorMessage({ code: 'UserNotConfirmedException' }))
        .toBe('Please confirm your account before signing in.');

      expect(authService.getErrorMessage({ code: 'TooManyRequestsException' }))
        .toBe('Too many attempts. Please try again later.');
    });

    it('should handle token refresh failures', async () => {
      const authService = new AuthService();
      const refreshError = new Error('Token refresh failed');

      Auth.currentCredentials.mockRejectedValue(refreshError);

      const result = await authService.refreshCredentials();

      expect(result).toBeNull();
    });
  });
});