import React from 'react';
import { StyleSheet, View } from 'react-native';
import CameraScreen from './screens/CameraScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <CameraScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
