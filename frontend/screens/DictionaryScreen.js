import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import db from '../services/db';
import theme from '../utils/theme';
import settings from '../services/settings';

function DictionaryScreen() {
  const [words, setWords] = useState([]);
  const [language, setLanguage] = useState(null); // null = all

  const LANGUAGES = [
    { code: null, label: 'All' },
    { code: 'en', label: 'English' },
    { code: 'ko', label: 'Korean' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'ja', label: 'Japanese' },
    { code: 'pt', label: 'Portuguese' },
  ];

  const load = async () => {
    try {
      const list = await db.listWords(language);
      setWords(list);
    } catch (e) {
      console.warn('load words', e);
    }
  };

  useEffect(() => {
    db.init().then(load).catch((e) => console.warn('db init', e));
  }, []);

  useEffect(() => {
    // reload when language filter changes
    load();
  }, [language]);

  const setAsCameraTarget = async (lang) => {
    try {
      await settings.setTargetLang(lang || 'ko');
    } catch (e) {
      console.warn('setAsCameraTarget', e);
    }
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete', 'Remove this word from your dictionary?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await db.deleteWord(id, language); load(); } }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dictionary</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 6 }}>
        <Text style={{ color: theme.colors.muted, marginRight: 8 }}>Language:</Text>
        <FlatList
          horizontal
          data={LANGUAGES}
          keyExtractor={(i) => String(i.code)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setLanguage(item.code)} style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: item.code === language ? theme.colors.primary : 'transparent', borderRadius: 6, marginRight: 6 }}>
              <Text style={{ color: item.code === language ? '#fff' : theme.colors.text }}>{item.label}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12 }}>
        <TouchableOpacity onPress={() => setAsCameraTarget(language)} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: theme.colors.primary, borderRadius: 6 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{language ? 'Set as Camera Target' : 'Set Camera to All'}</Text>
        </TouchableOpacity>
      </View>

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

export default DictionaryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '700', paddingTop: 50, paddingBottom: 12, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surface, borderRadius: 8 },
  word: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  trans: { color: theme.colors.muted, marginTop: 4 },
  del: { paddingHorizontal: 12, paddingVertical: 6 },
  delText: { color: theme.colors.danger, fontWeight: '700' },
});
