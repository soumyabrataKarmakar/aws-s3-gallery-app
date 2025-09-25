import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AmplifyConfig from './config/AmplifyConfig';

const App = () => {
  useEffect(() => {
    // Initialize Amplify configuration on app start
    const initializeApp = async () => {
      try {
        AmplifyConfig.configure();
        console.log('App initialized with AWS Amplify configuration');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AWS S3 Gallery App</Text>
      <Text style={styles.subtitle}>AWS Amplify Configuration Ready</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

export default App;