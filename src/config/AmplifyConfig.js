import { Amplify } from 'aws-amplify';

/**
 * AWS Amplify Configuration Manager
 * Handles all AWS Cognito and S3 configuration for the application
 */
class AmplifyConfig {
  /**
   * Configure AWS Amplify with proper settings
   */
  static configure() {
    try {
      const config = this.getConfigFromEnvironment();
      const validationErrors = this.validateConfiguration(config);

      if (validationErrors.length > 0) {
        throw new Error(`Missing required AWS configuration parameters: ${validationErrors.join(', ')}`);
      }

      Amplify.configure(config);
      console.log('AWS Amplify configured successfully');
    } catch (error) {
      console.error('AWS Amplify configuration error:', error);
      throw new Error('Failed to configure AWS Amplify');
    }
  }

  /**
   * Configure with retry mechanism for network issues
   */
  static async configureWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.configure();
        return { success: true };
      } catch (error) {
        if (attempt === maxRetries) {
          return { success: false, error: error.message };
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Get configuration from environment variables
   */
  static getConfigFromEnvironment() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const userPoolId = process.env.AWS_USER_POOL_ID || '';
    const userPoolWebClientId = process.env.AWS_USER_POOL_WEB_CLIENT_ID || '';
    const identityPoolId = process.env.AWS_IDENTITY_POOL_ID || '';
    const s3Bucket = process.env.AWS_S3_BUCKET || '';

    return {
      Auth: {
        region,
        userPoolId,
        userPoolWebClientId,
        identityPoolId,
        mandatorySignIn: true,
        authenticationFlowType: 'USER_SRP_AUTH',
        passwordPolicy: this.getPasswordPolicy(),
      },
      Storage: {
        AWSS3: {
          bucket: s3Bucket,
          region,
          level: 'private',
        },
      },
      ssr: false,
    };
  }

  /**
   * Get default configuration values
   */
  static getDefaultConfig() {
    return {
      Auth: {
        region: 'us-east-1',
        userPoolId: '',
        userPoolWebClientId: '',
        identityPoolId: '',
        mandatorySignIn: true,
        authenticationFlowType: 'USER_SRP_AUTH',
        passwordPolicy: this.getPasswordPolicy(),
      },
      Storage: {
        AWSS3: {
          bucket: '',
          region: 'us-east-1',
          level: 'private',
        },
      },
      ssr: false,
    };
  }

  /**
   * Get password policy configuration
   */
  static getPasswordPolicy() {
    return {
      minimumLength: 12,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: true,
    };
  }

  /**
   * Get authentication configuration
   */
  static getAuthConfig() {
    return {
      mandatorySignIn: true,
      authenticationFlowType: 'USER_SRP_AUTH',
    };
  }

  /**
   * Get storage configuration
   */
  static getStorageConfig() {
    return {
      level: 'private',
    };
  }

  /**
   * Validate User Pool configuration
   */
  static validateUserPoolConfig(config) {
    const errors = [];

    if (!config.region || config.region.length === 0) {
      errors.push('Invalid AWS region');
    }

    if (!config.userPoolId || !config.userPoolId.match(/^[a-z0-9-]+_[a-zA-Z0-9]+$/)) {
      errors.push('Invalid User Pool ID format');
    }

    if (!config.userPoolWebClientId || config.userPoolWebClientId.length === 0) {
      errors.push('User Pool Web Client ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Identity Pool configuration
   */
  static validateIdentityPoolConfig(config) {
    const errors = [];

    if (!config.region || config.region.length === 0) {
      errors.push('Invalid AWS region');
    }

    if (!config.identityPoolId || !config.identityPoolId.match(/^[a-z0-9-]+:[a-f0-9-]+$/)) {
      errors.push('Invalid Identity Pool ID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate S3 Storage configuration
   */
  static validateStorageConfig(config) {
    const errors = [];

    if (!config.bucket || config.bucket.length === 0) {
      errors.push('S3 bucket name is required');
    }

    if (!config.region || config.region.length === 0) {
      errors.push('Invalid AWS region');
    }

    if (!['private', 'protected', 'public'].includes(config.level)) {
      errors.push('Invalid storage level');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate complete configuration
   */
  static validateConfiguration(config) {
    const errors = [];

    // Validate Auth configuration
    if (!config.Auth.region) {
      errors.push('Invalid AWS region in Auth configuration');
    }

    if (!config.Auth.userPoolId) {
      errors.push('User Pool ID is required');
    }

    if (!config.Auth.userPoolWebClientId) {
      errors.push('User Pool Web Client ID is required');
    }

    if (!config.Auth.identityPoolId) {
      errors.push('Identity Pool ID is required');
    }

    // Validate Storage configuration
    if (!config.Storage.AWSS3.bucket) {
      errors.push('S3 bucket name is required');
    }

    if (!config.Storage.AWSS3.region) {
      errors.push('Invalid AWS region in Storage configuration');
    }

    return errors;
  }
}

export default AmplifyConfig;