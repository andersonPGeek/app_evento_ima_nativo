import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WebviewScreen({ route }) {
  const { url } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#101828" />
        </View>
      )}
      <WebView
        source={{ uri: url }}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 1,
  },
}); 