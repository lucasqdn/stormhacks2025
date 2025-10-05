import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import UIActionsContext from './contexts/UIActionsContext';
import TestHomeScreen from './screens/TestHomeScreen';
import CameraScreen from './screens/CameraScreen';
import NavigationHome from './screens/NavigationHome';
import NavigationScreen from './screens/NavigationScreen';
import { GOOGLE_MAPS_API_KEY } from './config';

export default function App() {
  const actionsRef = useRef({});
  const [route, setRoute] = useState('home'); // 'home' | 'camera' | 'nav-home' | 'navigating'
  const [navDestination, setNavDestination] = useState('');

  return (
  <UIActionsContext.Provider value={actionsRef.current}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SightMate</Text>
        </View>

        <View style={styles.content}>
          {route === 'home' && (
            <TestHomeScreen onOpenCamera={() => setRoute('camera')} />
          )}
          {route === 'camera' && <CameraScreen />}
          {route === 'nav-home' && (
            <NavigationHome
              onSubmit={(dest) => {
                setNavDestination(dest);
                setRoute('navigating');
              }}
            />
          )}
          {route === 'navigating' && (
            <NavigationScreen destinationText={navDestination} apiKey={GOOGLE_MAPS_API_KEY} />
          )}
        </View>

        <View style={styles.footer}>
          {route === 'camera' && (
            <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onScan && actionsRef.current.onScan()}>
              <Text style={styles.footerButtonText}>Scan</Text>
            </TouchableOpacity>
          )}
          {route !== 'camera' && (
            <TouchableOpacity style={styles.footerButton} onPress={() => setRoute('camera')}>
              <Text style={styles.footerButtonText}>Camera</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.footerButton} onPress={() => setRoute('nav-home')}>
            <Text style={styles.footerButtonText}>Navigate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onRepeat && actionsRef.current.onRepeat()}>
            <Text style={styles.footerButtonText}>Repeat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={() => actionsRef.current.onSettings && actionsRef.current.onSettings()}>
            <Text style={styles.footerButtonText}>Settings</Text>
          </TouchableOpacity>
          {(route === 'camera' || route === 'nav-home' || route === 'navigating') && (
            <TouchableOpacity style={styles.footerButton} onPress={() => setRoute('home')}>
              <Text style={styles.footerButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {route === 'home' && (
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
  container: { flex: 1, backgroundColor: '#000' },
  header: { height: 60, backgroundColor: '#0a84ff', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  footer: { height: 72, backgroundColor: '#111', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  footerButton: { padding: 10, backgroundColor: '#222', borderRadius: 8 },
  footerButtonText: { color: '#fff' },
});
