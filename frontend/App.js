import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import theme from './utils/theme';
import UIActionsContext from './contexts/UIActionsContext';
import CameraScreen from './screens/CameraScreen';

export default function App() {
  const actionsRef = useRef({});
  const [route] = useState('camera');

  return (
  <UIActionsContext.Provider value={actionsRef.current}>
      <View style={styles.container}>
        <View style={styles.content}>
          <CameraScreen />
        </View>
      </View>
    </UIActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1 },
});
