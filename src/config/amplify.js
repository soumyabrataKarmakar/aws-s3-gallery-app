import { Amplify } from 'aws-amplify';

// Environment configuration - these should be replaced with actual values during deployment
const AWS_CONFIG = {
  // These are placeholder values - replace with actual AWS resource IDs
  USER_POOL_ID: process.env.AWS_USER_POOL_ID || 'us-east-1_PLACEHOLDER',
  USER_POOL_CLIENT_ID: process.env.AWS_USER_POOL_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID',
  IDENTITY_POOL_ID: process.env.AWS_IDENTITY_POOL_ID || 'us-east-1:12345678-1234-1234-1234-123456789012',
  S3_BUCKET: process.env.AWS_S3_BUCKET || 'aws-s3-gallery-app-bucket',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1'
};

/**
 * Get the complete Amplify configuration object
 * @returns {Object} Amplify configuration
 */
export const getAmplifyConfig = () => {
  return {
    Auth: {
      Cognito: {
        userPoolId: AWS_CONFIG.USER_POOL_ID,
        userPoolClientId: AWS_CONFIG.USER_POOL_CLIENT_ID,
        identityPoolId: AWS_CONFIG.IDENTITY_POOL_ID,
        loginWith: {
          email: true,
          username: false,
          phone: false
        },
        signUpVerificationMethod: 'code',
        userAttributes: {
          email: {
            required: true,
            mutable: true
          }
        },
        passwordFormat: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialCharacters: true
        },
        accountRecovery: 'EMAIL_ONLY',
        mfa: {
          status: 'off',
          totpEnabled: false,
          smsEnabled: false
        }
      }
    },
    Storage: {
      S3: {
        bucket: AWS_CONFIG.S3_BUCKET,
        region: AWS_CONFIG.AWS_REGION,
        prefixResolver: {
          default: () => 'media/',
          public: () => 'public/',
          private: (identityId) => `private/${identityId}/`,
          protected: (identityId) => `protected/${identityId}/`
        }
      }
    }
  };
};

/**
 * Validate the Amplify configuration object
 * @param {Object} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export const validateAmplifyConfig = (config) => {
  if (!config.Auth) {
    throw new Error('Missing Auth configuration');
  }

  if (!config.Auth.Cognito) {
    throw new Error('Missing Cognito configuration in Auth');
  }

  const cognito = config.Auth.Cognito;
  if (!cognito.userPoolId || !cognito.userPoolClientId || !cognito.identityPoolId) {
    throw new Error('Missing required Cognito configuration fields');
  }

  if (!config.Storage) {
    throw new Error('Missing Storage configuration');
  }

  if (!config.Storage.S3) {
    throw new Error('Missing S3 configuration in Storage');
  }

  const s3 = config.Storage.S3;
  if (!s3.bucket || !s3.region) {
    throw new Error('Missing required S3 configuration fields');
  }
};

/**
 * Configure Amplify with the application settings
 * @throws {Error} If configuration fails
 */
export const configureAmplify = () => {
  try {
    const config = getAmplifyConfig();
    validateAmplifyConfig(config);

    Amplify.configure(config);

    console.log('✅ Amplify configured successfully');
    return config;
  } catch (error) {
    console.error('❌ Failed to configure Amplify:', error.message);
    throw new Error(`Failed to configure Amplify: ${error.message}`);
  }
};

/**
 * Check if Amplify is properly configured
 * @returns {boolean} True if configured, false otherwise
 */
export const isAmplifyConfigured = () => {
  try {
    const config = Amplify.getConfig();
    return !!(config && config.Auth && config.Storage);
  } catch (error) {
    console.warn('Unable to check Amplify configuration:', error.message);
    return false;
  }
};