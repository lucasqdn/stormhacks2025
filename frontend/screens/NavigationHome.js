import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function NavigationHome({ onSubmit }) {
  const [dest, setDest] = useState('');
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where would you like to go?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter destination"
        placeholderTextColor="#999"
        value={dest}
        onChangeText={setDest}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={() => dest && onSubmit(dest)}
      />
      <TouchableOpacity style={styles.button} onPress={() => dest && onSubmit(dest)}>
        <Text style={styles.buttonText}>Start Navigation</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { color: '#fff', fontSize: 20, marginBottom: 12 },
  input: { width: '100%', backgroundColor: '#111', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: '#0a84ff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
