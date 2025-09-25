import { Auth, Storage } from 'aws-amplify';
import * as Keychain from 'react-native-keychain';
import AmplifyConfig from '../config/AmplifyConfig';

/**
 * Authentication Service
 * Handles all AWS Cognito authentication operations
 */
class AuthService {
  constructor() {
    this.isConfigured = false;
    this.currentUser = null;
  }

  /**
   * Initialize the authentication service
   */
  async initialize() {
    try {
      await this.configureAmplify();
      this.isConfigured = true;
    } catch (error) {
      console.error('AuthService initialization error:', error);
      throw new Error('Failed to initialize AuthService');
    }
  }

  /**
   * Configure AWS Amplify
   */
  async configureAmplify() {
    return AmplifyConfig.configure();
  }

  /**
   * Sign in user with email and password
   */
  async signIn(email, password) {
    try {
      const user = await Auth.signIn(email, password);
      this.currentUser = user;

      // Store authentication tokens securely
      const session = await Auth.currentSession();
      await this.storeTokens({
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        idToken: session.getIdToken().getJwtToken(),
        expiresAt: session.getAccessToken().getExpiration() * 1000,
      });

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Sign in error:', error);

      if (error.code === 'UserNotConfirmedException') {
        return {
          success: false,
          requiresConfirmation: true,
          error: error.message,
        };
      }

      if (error.code === 'NetworkError' || error.message.includes('Network')) {
        return {
          success: false,
          networkError: true,
          error: error.message,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sign out user and clear stored tokens
   */
  async signOut() {
    try {
      await Auth.signOut({ global: true });
      await this.clearStoredTokens();
      this.currentUser = null;

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      this.currentUser = user;
      return true;
    } catch (error) {
      this.currentUser = null;
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      this.currentUser = user;
      return user;
    } catch (error) {
      this.currentUser = null;
      return null;
    }
  }

  /**
   * Refresh authentication credentials
   */
  async refreshCredentials() {
    try {
      const credentials = await Auth.currentCredentials({ forceRefresh: true });
      return credentials;
    } catch (error) {
      console.error('Failed to refresh credentials:', error);
      return null;
    }
  }

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokens) {
    try {
      await Keychain.setInternetCredentials(
        'aws-s3-gallery-auth',
        'tokens',
        JSON.stringify(tokens)
      );
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Retrieve stored authentication tokens
   */
  async getStoredTokens() {
    try {
      const credentials = await Keychain.getInternetCredentials('aws-s3-gallery-auth');
      if (credentials) {
        return JSON.parse(credentials.password);
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication tokens
   */
  async clearStoredTokens() {
    try {
      await Keychain.resetInternetCredentials('aws-s3-gallery-auth');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    if (!token.payload || !token.payload.exp) {
      return false;
    }
    const currentTime = Math.floor(Date.now() / 1000);
    return token.payload.exp < currentTime;
  }

  /**
   * Verify S3 permissions for the authenticated user
   */
  async verifyS3Permissions() {
    try {
      const credentials = await Auth.currentCredentials();
      if (!credentials) {
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canList: false,
        };
      }

      return await this.testS3Permissions();
    } catch (error) {
      console.error('Failed to verify S3 permissions:', error);
      return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canList: false,
      };
    }
  }

  /**
   * Test S3 permissions by attempting operations
   */
  async testS3Permissions() {
    const permissions = {
      canRead: false,
      canWrite: false,
      canDelete: false,
      canList: false,
    };

    try {
      permissions.canRead = await this.testS3Read();
      permissions.canWrite = await this.testS3Write();
      permissions.canDelete = await this.testS3Delete();
      permissions.canList = await this.testS3List();
    } catch (error) {
      console.error('Error testing S3 permissions:', error);
    }

    return permissions;
  }

  /**
   * Test S3 read permission
   */
  async testS3Read() {
    try {
      // Attempt to list objects to test read permission
      await Storage.list('', { level: 'private', pageSize: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test S3 write permission
   */
  async testS3Write() {
    try {
      // Attempt to put a small test object
      const testKey = 'permission-test.txt';
      await Storage.put(testKey, 'test', { level: 'private' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test S3 delete permission
   */
  async testS3Delete() {
    try {
      // Attempt to delete the test object
      const testKey = 'permission-test.txt';
      await Storage.remove(testKey, { level: 'private' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test S3 list permission
   */
  async testS3List() {
    try {
      // Attempt to list objects
      await Storage.list('', { level: 'private', pageSize: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    const errorMessages = {
      UserNotFoundException: 'User not found. Please check your email address.',
      NotAuthorizedException: 'Invalid username or password.',
      UserNotConfirmedException: 'Please confirm your account before signing in.',
      TooManyRequestsException: 'Too many attempts. Please try again later.',
      TooManyFailedAttemptsException: 'Too many failed attempts. Please try again later.',
      PasswordResetRequiredException: 'Password reset is required for this account.',
      InvalidParameterException: 'Invalid parameters provided.',
      InvalidPasswordException: 'Password does not meet requirements.',
    };

    return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
  }
}

export default AuthService;