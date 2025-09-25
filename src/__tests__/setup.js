// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve({ username: 'test', password: 'test' })),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('FaceID')),
  ACCESS_CONTROL: {
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
    DEVICE_PASSCODE: 'DevicePasscode',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
  },
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn((text) => ({ toString: () => `encrypted-${text}` })),
    decrypt: jest.fn((encryptedText) => ({ toString: () => encryptedText.replace('encrypted-', '') })),
  },
  enc: {
    Utf8: 'utf8',
  },
}));

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
  Auth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    confirmSignUp: jest.fn(),
    getCurrentUser: jest.fn(),
    currentAuthenticatedUser: jest.fn(),
    currentCredentials: jest.fn(),
    forgotPassword: jest.fn(),
    forgotPasswordSubmit: jest.fn(),
  },
  Storage: {
    get: jest.fn(),
    put: jest.fn(),
    remove: jest.fn(),
    list: jest.fn(),
  },
}));

// Mock @aws-amplify/react-native
jest.mock('@aws-amplify/react-native', () => ({
  Amplify: {
    configure: jest.fn(),
  },
}));

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Global test timeout
jest.setTimeout(10000);