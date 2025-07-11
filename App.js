import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import CreatePasswordScreen from './src/screens/CreatePasswordScreen';
import SyncSymplaScreen from './src/screens/SyncSymplaScreen';
import BottomTabs from './src/navigation/BottomTabs';
import BannerModal from './src/components/BannerModal';
import { ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const Stack = createStackNavigator();

function RootNavigator() {
  const { user, role, initializing, showBanner, setShowBanner } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' }
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
            <Stack.Screen name="SyncSympla" component={SyncSymplaScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={BottomTabs} />
        )}
      </Stack.Navigator>
      
      <BannerModal 
        visible={showBanner} 
        onClose={() => setShowBanner(false)} 
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>}
        >
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
      <Toast />
    </SafeAreaProvider>
  );
} 