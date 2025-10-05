import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TestHomeScreen({ onOpenCamera }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SightMate</Text>
      <Text style={styles.subtitle}>This is a simple test page.</Text>
      <TouchableOpacity style={styles.button} onPress={onOpenCamera} accessibilityRole="button" accessibilityLabel="Open Camera">
        <Text style={styles.buttonText}>Open Camera</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#ccc', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#0a84ff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
