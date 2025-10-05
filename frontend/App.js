import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import UIActionsContext from './contexts/UIActionsContext';
import TestHomeScreen from './screens/TestHomeScreen';

export default function App() {
  const actionsRef = useRef({});

  return (
  <UIActionsContext.Provider value={actionsRef.current}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SightMate</Text>
        </View>

        <View style={styles.content}>
          <TestHomeScreen
            onOpenCamera={() =>
              Alert.alert(
                'Camera disabled',
                'The camera screen is temporarily disabled while we resolve a native module issue.'
              )
            }
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() =>
              Alert.alert(
                'Camera disabled',
                'The camera screen is temporarily disabled while we resolve a native module issue.'
              )
            }
          >
            <Text style={styles.footerButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onRepeat && actionsRef.current.onRepeat()}>
            <Text style={styles.footerButtonText}>Repeat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onSettings && actionsRef.current.onSettings()}>
            <Text style={styles.footerButtonText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onHelp && actionsRef.current.onHelp()}>
            <Text style={styles.footerButtonText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>
    </UIActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { height: 60, backgroundColor: '#0a84ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  footer: { height: 72, backgroundColor: '#111', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  footerButton: { padding: 10, backgroundColor: '#222', borderRadius: 8 },
  footerButtonText: { color: '#fff' },
});
