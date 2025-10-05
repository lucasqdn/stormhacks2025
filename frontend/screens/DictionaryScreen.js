import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import db from '../services/db';
import theme from '../utils/theme';

export default function DictionaryScreen() {
  const [words, setWords] = useState([]);

  const load = async () => {
    try {
      const list = await db.listWords();
      setWords(list);
    } catch (e) {
      console.warn('load words', e);
    }
  };

  useEffect(() => {
    db.init().then(load).catch((e) => console.warn('db init', e));
  }, []);

  const confirmDelete = (id) => {
    Alert.alert('Delete', 'Remove this word from your dictionary?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await db.deleteWord(id); load(); } }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dictionary</Text>
      <FlatList
        data={words}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.word}>{item.word}</Text>
              {item.translation ? <Text style={styles.trans}>{item.translation}</Text> : null}
            </View>
            <TouchableOpacity style={styles.del} onPress={() => confirmDelete(item.id)}>
              <Text style={styles.delText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '700', padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surface, borderRadius: 8 },
  word: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  trans: { color: theme.colors.muted, marginTop: 4 },
  del: { paddingHorizontal: 12, paddingVertical: 6 },
  delText: { color: theme.colors.danger, fontWeight: '700' },
});
