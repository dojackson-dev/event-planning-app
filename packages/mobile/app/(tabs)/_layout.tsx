import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: Colors.textPrimary,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'EventEcos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Hide legacy screens + dashboard (accessed directly, not via tab) */}
      <Tabs.Screen name="dashboard" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="bookings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="clients" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="invoices" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="estimates" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="messages" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="calendar" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="settings" options={{ href: null, headerShown: false }} />

      {/* Vendor role screens (accessed directly, not via tab) */}
      <Tabs.Screen name="vendor-dashboard" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="vendor-bookings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="vendor-invoices" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="vendor-profile" options={{ href: null, headerShown: false }} />

      {/* Artist role screens (accessed directly, not via tab) */}
      <Tabs.Screen name="artist-dashboard" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="artist-bookings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="artist-invoices" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="artist-profile" options={{ href: null, headerShown: false }} />

      {/* Promoter role screens (accessed directly, not via tab) */}
      <Tabs.Screen name="promoter-dashboard" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="promoter-events" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="promoter-bookings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="promoter-invoices" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="promoter-profile" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
