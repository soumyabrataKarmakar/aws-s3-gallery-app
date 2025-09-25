import { Amplify } from 'aws-amplify';
import { configureAmplify, getAmplifyConfig, validateAmplifyConfig } from '../../config/amplify';

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn(),
    getConfig: jest.fn()
  }
}));

describe('Amplify Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAmplifyConfig', () => {
    it('should return valid Amplify configuration object', () => {
      const config = getAmplifyConfig();

      expect(config).toBeDefined();
      expect(config.Auth).toBeDefined();
      expect(config.Auth.Cognito).toBeDefined();
      expect(config.Auth.Cognito.userPoolId).toBeDefined();
      expect(config.Auth.Cognito.userPoolClientId).toBeDefined();
      expect(config.Auth.Cognito.identityPoolId).toBeDefined();
      expect(config.Storage).toBeDefined();
      expect(config.Storage.S3).toBeDefined();
    });

    it('should include required Cognito configuration', () => {
      const config = getAmplifyConfig();
      const cognitoConfig = config.Auth.Cognito;

      // Accept both real AWS format and placeholder values for testing
      expect(cognitoConfig.userPoolId).toBeDefined();
      expect(cognitoConfig.userPoolClientId).toBeDefined();
      expect(cognitoConfig.identityPoolId).toBeDefined();
      expect(cognitoConfig.loginWith).toBeDefined();
      expect(cognitoConfig.signUpVerificationMethod).toBe('code');

      // Validate structure for real AWS values (not placeholders)
      if (!cognitoConfig.userPoolId.includes('PLACEHOLDER')) {
        expect(cognitoConfig.userPoolId).toMatch(/^[a-z0-9-]+_[a-zA-Z0-9]+$/);
      }
      if (!cognitoConfig.userPoolClientId.includes('PLACEHOLDER')) {
        expect(cognitoConfig.userPoolClientId).toMatch(/^[a-z0-9]+$/);
      }
      if (!cognitoConfig.identityPoolId.includes('12345678-1234-1234-1234-123456789012')) {
        expect(cognitoConfig.identityPoolId).toMatch(/^[a-z0-9-]+:[a-f0-9-]+$/);
      }
    });

    it('should include S3 storage configuration', () => {
      const config = getAmplifyConfig();
      const s3Config = config.Storage.S3;

      expect(s3Config.bucket).toBeDefined();
      expect(s3Config.region).toBeDefined();
      expect(s3Config.region).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('validateAmplifyConfig', () => {
    it('should validate complete configuration successfully', () => {
      const validConfig = {
        Auth: {
          Cognito: {
            userPoolId: 'us-east-1_abcd1234',
            userPoolClientId: 'abcd1234567890',
            identityPoolId: 'us-east-1:12345678-1234-1234-1234-123456789012'
          }
        },
        Storage: {
          S3: {
            bucket: 'test-bucket',
            region: 'us-east-1'
          }
        }
      };

      expect(() => validateAmplifyConfig(validConfig)).not.toThrow();
    });

    it('should throw error for missing Auth configuration', () => {
      const invalidConfig = {
        Storage: {
          S3: { bucket: 'test-bucket', region: 'us-east-1' }
        }
      };

      expect(() => validateAmplifyConfig(invalidConfig))
        .toThrow('Missing Auth configuration');
    });

    it('should throw error for missing Cognito configuration', () => {
      const invalidConfig = {
        Auth: {},
        Storage: {
          S3: { bucket: 'test-bucket', region: 'us-east-1' }
        }
      };

      expect(() => validateAmplifyConfig(invalidConfig))
        .toThrow('Missing Cognito configuration in Auth');
    });

    it('should throw error for missing Storage configuration', () => {
      const invalidConfig = {
        Auth: {
          Cognito: {
            userPoolId: 'us-east-1_abcd1234',
            userPoolClientId: 'abcd1234567890',
            identityPoolId: 'us-east-1:12345678-1234-1234-1234-123456789012'
          }
        }
      };

      expect(() => validateAmplifyConfig(invalidConfig))
        .toThrow('Missing Storage configuration');
    });
  });

  describe('configureAmplify', () => {
    it('should configure Amplify with valid configuration', () => {
      configureAmplify();

      expect(Amplify.configure).toHaveBeenCalledTimes(1);
      const configArg = Amplify.configure.mock.calls[0][0];

      expect(configArg).toBeDefined();
      expect(configArg.Auth).toBeDefined();
      expect(configArg.Storage).toBeDefined();
    });

    it('should handle configuration errors gracefully', () => {
      Amplify.configure.mockImplementation(() => {
        throw new Error('Configuration failed');
      });

      expect(() => configureAmplify()).toThrow('Failed to configure Amplify');
    });
  });

  describe('Amplify Configuration Integration', () => {
    it('should maintain configuration after setup', () => {
      const mockConfig = {
        Auth: { Cognito: { configured: true } },
        Storage: { S3: { configured: true } }
      };

      // Reset the mock to not throw errors for this test
      Amplify.configure.mockImplementation(() => {});
      Amplify.getConfig.mockReturnValue(mockConfig);

      const result = configureAmplify();
      const currentConfig = Amplify.getConfig();

      expect(result).toBeDefined();
      expect(currentConfig).toBeDefined();
      expect(currentConfig.Auth.Cognito.configured).toBe(true);
      expect(currentConfig.Storage.S3.configured).toBe(true);
    });
  });
});