import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './package.json';

// Initialize AWS Amplify configuration
import './src/config/AmplifyConfig';

AppRegistry.registerComponent(appName, () => App);