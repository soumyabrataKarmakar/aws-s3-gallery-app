import { Amplify } from 'aws-amplify';
import AmplifyConfig from '../../config/AmplifyConfig';

describe('AmplifyConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Setup', () => {
    it('should configure Amplify with correct AWS Cognito settings', () => {
      AmplifyConfig.configure();

      expect(Amplify.configure).toHaveBeenCalledWith({
        Auth: {
          region: expect.any(String),
          userPoolId: expect.any(String),
          userPoolWebClientId: expect.any(String),
          identityPoolId: expect.any(String),
          mandatorySignIn: true,
          authenticationFlowType: 'USER_SRP_AUTH',
          passwordPolicy: {
            minimumLength: 12,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSymbols: true,
          },
        },
        Storage: {
          AWSS3: {
            bucket: expect.any(String),
            region: expect.any(String),
            level: 'private',
          },
        },
        ssr: false,
      });
    });

    it('should validate required configuration parameters', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.AWS_REGION;
      delete process.env.AWS_USER_POOL_ID;
      delete process.env.AWS_USER_POOL_WEB_CLIENT_ID;
      delete process.env.AWS_IDENTITY_POOL_ID;
      delete process.env.AWS_S3_BUCKET;

      expect(() => AmplifyConfig.configure()).toThrow('Missing required AWS configuration parameters');

      process.env = originalEnv;
    });

    it('should provide default configuration values when environment variables are missing', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.AWS_REGION;

      const config = AmplifyConfig.getDefaultConfig();

      expect(config.Auth.region).toBe('us-east-1');
      expect(config.Storage.AWSS3.region).toBe('us-east-1');

      process.env = originalEnv;
    });

    it('should handle configuration errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      Amplify.configure.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      expect(() => AmplifyConfig.configure()).toThrow('Failed to configure AWS Amplify');
      expect(consoleSpy).toHaveBeenCalledWith('AWS Amplify configuration error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate Cognito User Pool configuration', () => {
      const config = AmplifyConfig.validateUserPoolConfig({
        region: 'us-east-1',
        userPoolId: 'us-east-1_test123',
        userPoolWebClientId: 'test-client-id',
      });

      expect(config.isValid).toBe(true);
      expect(config.errors).toHaveLength(0);
    });

    it('should detect invalid User Pool configuration', () => {
      const config = AmplifyConfig.validateUserPoolConfig({
        region: '',
        userPoolId: 'invalid-id',
        userPoolWebClientId: '',
      });

      expect(config.isValid).toBe(false);
      expect(config.errors).toContain('Invalid AWS region');
      expect(config.errors).toContain('Invalid User Pool ID format');
      expect(config.errors).toContain('User Pool Web Client ID is required');
    });

    it('should validate Identity Pool configuration', () => {
      const config = AmplifyConfig.validateIdentityPoolConfig({
        region: 'us-east-1',
        identityPoolId: 'us-east-1:12345678-1234-1234-1234-123456789012',
      });

      expect(config.isValid).toBe(true);
      expect(config.errors).toHaveLength(0);
    });

    it('should detect invalid Identity Pool configuration', () => {
      const config = AmplifyConfig.validateIdentityPoolConfig({
        region: '',
        identityPoolId: 'invalid-identity-pool-id',
      });

      expect(config.isValid).toBe(false);
      expect(config.errors).toContain('Invalid AWS region');
      expect(config.errors).toContain('Invalid Identity Pool ID format');
    });

    it('should validate S3 Storage configuration', () => {
      const config = AmplifyConfig.validateStorageConfig({
        bucket: 'my-s3-bucket',
        region: 'us-east-1',
        level: 'private',
      });

      expect(config.isValid).toBe(true);
      expect(config.errors).toHaveLength(0);
    });

    it('should detect invalid S3 Storage configuration', () => {
      const config = AmplifyConfig.validateStorageConfig({
        bucket: '',
        region: 'invalid-region',
        level: 'invalid-level',
      });

      expect(config.isValid).toBe(false);
      expect(config.errors).toContain('S3 bucket name is required');
      expect(config.errors).toContain('Invalid AWS region');
      expect(config.errors).toContain('Invalid storage level');
    });
  });

  describe('Environment Configuration', () => {
    it('should load configuration from environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AWS_REGION: 'us-west-2',
        AWS_USER_POOL_ID: 'us-west-2_testpool',
        AWS_USER_POOL_WEB_CLIENT_ID: 'test-web-client',
        AWS_IDENTITY_POOL_ID: 'us-west-2:12345678-1234-1234-1234-123456789012',
        AWS_S3_BUCKET: 'test-s3-bucket',
      };

      const config = AmplifyConfig.getConfigFromEnvironment();

      expect(config.Auth.region).toBe('us-west-2');
      expect(config.Auth.userPoolId).toBe('us-west-2_testpool');
      expect(config.Auth.userPoolWebClientId).toBe('test-web-client');
      expect(config.Auth.identityPoolId).toBe('us-west-2:12345678-1234-1234-1234-123456789012');
      expect(config.Storage.AWSS3.bucket).toBe('test-s3-bucket');
      expect(config.Storage.AWSS3.region).toBe('us-west-2');

      process.env = originalEnv;
    });

    it('should handle missing environment variables with fallbacks', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };

      // Remove AWS environment variables
      delete process.env.AWS_REGION;
      delete process.env.AWS_USER_POOL_ID;
      delete process.env.AWS_USER_POOL_WEB_CLIENT_ID;
      delete process.env.AWS_IDENTITY_POOL_ID;
      delete process.env.AWS_S3_BUCKET;

      const config = AmplifyConfig.getConfigFromEnvironment();

      expect(config.Auth.region).toBe('us-east-1'); // Default region
      expect(config.Auth.userPoolId).toBe('');
      expect(config.Auth.userPoolWebClientId).toBe('');
      expect(config.Auth.identityPoolId).toBe('');
      expect(config.Storage.AWSS3.bucket).toBe('');
      expect(config.Storage.AWSS3.region).toBe('us-east-1'); // Default region

      process.env = originalEnv;
    });
  });

  describe('Security Settings', () => {
    it('should enforce strong password policy', () => {
      const config = AmplifyConfig.getPasswordPolicy();

      expect(config.minimumLength).toBeGreaterThanOrEqual(12);
      expect(config.requireLowercase).toBe(true);
      expect(config.requireUppercase).toBe(true);
      expect(config.requireNumbers).toBe(true);
      expect(config.requireSymbols).toBe(true);
    });

    it('should configure mandatory sign-in', () => {
      const config = AmplifyConfig.getAuthConfig();

      expect(config.mandatorySignIn).toBe(true);
    });

    it('should use secure authentication flow', () => {
      const config = AmplifyConfig.getAuthConfig();

      expect(config.authenticationFlowType).toBe('USER_SRP_AUTH');
    });

    it('should configure private storage access level', () => {
      const config = AmplifyConfig.getStorageConfig();

      expect(config.level).toBe('private');
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error messages for configuration failures', () => {
      const errors = AmplifyConfig.validateConfiguration({
        Auth: {
          region: 'invalid',
          userPoolId: '',
          userPoolWebClientId: '',
          identityPoolId: '',
        },
        Storage: {
          AWSS3: {
            bucket: '',
            region: 'invalid',
          },
        },
      });

      expect(errors).toContain('Invalid AWS region in Auth configuration');
      expect(errors).toContain('User Pool ID is required');
      expect(errors).toContain('User Pool Web Client ID is required');
      expect(errors).toContain('Identity Pool ID is required');
      expect(errors).toContain('S3 bucket name is required');
      expect(errors).toContain('Invalid AWS region in Storage configuration');
    });

    it('should handle network connectivity issues during configuration', async () => {
      const mockNetworkError = new Error('Network error');
      Amplify.configure.mockRejectedValue(mockNetworkError);

      const result = await AmplifyConfig.configureWithRetry();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});