import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import theme from './utils/theme';
import UIActionsContext from './contexts/UIActionsContext';
import TestHomeScreen from './screens/TestHomeScreen';
import CameraScreen from './screens/CameraScreen';

export default function App() {
  const actionsRef = useRef({});
  const [route, setRoute] = useState('home'); // 'home' | 'camera'

  return (
  <UIActionsContext.Provider value={actionsRef.current}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SightMate</Text>
        </View>

        <View style={styles.content}>
          {route === 'home' ? (
            <TestHomeScreen onOpenCamera={() => setRoute('camera')} />
          ) : (
            <CameraScreen />
          )}
        </View>

        <View style={styles.footer}>
          {route === 'camera' ? (
            <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onScan && actionsRef.current.onScan()}>
              <Text style={styles.footerButtonText}>Scan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.footerButton} onPress={() => setRoute('camera')}>
              <Text style={styles.footerButtonText}>Camera</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onRepeat && actionsRef.current.onRepeat()}>
            <Text style={styles.footerButtonText}>Repeat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onSettings && actionsRef.current.onSettings()}>
            <Text style={styles.footerButtonText}>Settings</Text>
          </TouchableOpacity>
          {route === 'camera' ? (
            <TouchableOpacity style={styles.footerButton} onPress={() => setRoute('home')}>
              <Text style={styles.footerButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onHelp && actionsRef.current.onHelp()}>
              <Text style={styles.footerButtonText}>Help</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </UIActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { height: 60, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  footer: { height: 72, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  footerButton: { padding: theme.spacing(1), backgroundColor: theme.colors.surface, borderRadius: 8 },
  footerButtonText: { color: theme.colors.text },
});
