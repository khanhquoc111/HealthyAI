import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#2563eb',
      headerStyle: { backgroundColor: '#2563eb' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Tabs.Screen 
        name="index"
        options={{ 
          title: 'Trang chủ',  
          tabBarLabel: 'Trang chủ',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>
        }} 
      />
      <Tabs.Screen 
        name="phan-tich-benh"
        options={{ 
          title: 'Phân tích',  
          tabBarLabel: 'Phân tích',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🩺</Text>
        }} 
      />
      <Tabs.Screen 
        name="ho-so-suc-khoe"
        options={{ 
          title: 'Hồ sơ',      
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>
        }} 
      />
      <Tabs.Screen 
        name="tra-thuoc"
        options={{ 
          title: 'Tra thuốc',  
          tabBarLabel: 'Tra thuốc',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💊</Text>
        }} 
      />
    </Tabs>
  );
}