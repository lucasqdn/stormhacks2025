import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import theme from './utils/theme';
import UIActionsContext from './contexts/UIActionsContext';
import CameraScreen from './screens/CameraScreen';
import DictionaryScreen from './screens/DictionaryScreen';
import db from './services/db';

export default function App() {
  const actionsRef = useRef({});
  const [route, setRoute] = useState('camera');

  useEffect(() => {
    db.init().catch((e) => console.warn('db init', e));
  }, []);

  return (
    <UIActionsContext.Provider value={actionsRef.current}>
      <View style={styles.container}>
        <View style={styles.content}>
          {route === 'camera' ? <CameraScreen /> : <DictionaryScreen />}
        </View>

        <View style={styles.tabbar}>
          <TouchableOpacity style={styles.tab} onPress={() => setRoute('camera')}>
            <Text style={[styles.tabText, route === 'camera' && styles.tabActive]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => setRoute('dictionary')}>
            <Text style={[styles.tabText, route === 'dictionary' && styles.tabActive]}>Dictionary</Text>
          </TouchableOpacity>
        </View>
      </View>
    </UIActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1 },
  tabbar: { height: 64, flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' , backgroundColor: theme.colors.surface },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: theme.colors.muted, fontWeight: '700' },
  tabActive: { color: theme.colors.primary },
});
