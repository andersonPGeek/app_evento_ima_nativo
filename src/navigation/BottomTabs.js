import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import WebviewScreen from '../screens/WebviewScreen';
import CheckinScreen from '../screens/CheckinScreen';
import EventListScreen from '../screens/EventListScreen';
import EventScheduleScreen from '../screens/EventScheduleScreen';
import SponsorShowcaseScreen from '../screens/SponsorShowcaseScreen';
import CheckinListScreen from '../screens/CheckinListScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { role, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // Fallback para role indefinido
  if (!role) {
    return null;
  }

  // Fallback para roles não suportadas
  const validRoles = ['user', 'estande', 'estandeAdmin'];
  if (!validRoles.includes(role)) {
    React.useEffect(() => {
      logout();
    }, [logout]);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#b91c1c', fontSize: 18, textAlign: 'center', margin: 32 }}>
          Seu perfil não tem acesso a este aplicativo.
        </Text>
      </View>
    );
  }

  // Função para facilitar a criação de tabs de webview
  const WebTab = (url) => (props) => <WebviewScreen {...props} route={{ ...props.route, params: { url } }} />;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#101828',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'Eventos':
              return <Ionicons name="grid" size={size} color={color} />;
            case 'Agenda':
              return <Ionicons name="calendar" size={size} color={color} />;
            case 'Estandes':
              return <Ionicons name="business" size={size} color={color} />;
            case 'Leitura':
              return <Ionicons name="qr-code" size={size} color={color} />;
            case 'Listagem':
              return <Ionicons name="list" size={size} color={color} />;
            case 'Cadastrar':
              return <Ionicons name="person-add" size={size} color={color} />;
            case 'Sair':
              return <Ionicons name="log-out-outline" size={size} color={color} />;
            default:
              return <Ionicons name="ellipse" size={size} color={color} />;
          }
        },
      })}
    >
      {/* Role: user */}
      {role === 'user' && (
        <>
          <Tab.Screen name="Eventos" component={EventListScreen} />
          <Tab.Screen name="Agenda" component={EventScheduleScreen} />
          <Tab.Screen name="Estandes" component={SponsorShowcaseScreen} />
          <Tab.Screen name="Sair" component={() => <LogoutTab logout={logout} />} />
        </>
      )}
      {/* Role: estande ou estandeAdmin */}
      {(role === 'estande' || role === 'estandeAdmin') && (
        <>
          <Tab.Screen name="Leitura" component={CheckinScreen} />
          <Tab.Screen name="Listagem" component={CheckinListScreen} />
          {role === 'estandeAdmin' && (
            <Tab.Screen name="Cadastrar" component={RegisterScreen} />
          )}
          <Tab.Screen name="Sair" component={() => <LogoutTab logout={logout} />} />
        </>
      )}
    </Tab.Navigator>
  );
}

function LogoutTab({ logout }) {
  React.useEffect(() => {
    logout();
  }, [logout]);
  return <View />;
} 