import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadow } from '@/lib/theme';
import OwnerMenu, { MenuButton } from '@/components/OwnerMenu';

// This entire group is venue-owner-type only (owner/admin/venue_owner/concierge
// — see ROLE_HOME in lib/roleRouting.ts). The old attendee tab set (mock-data
// Home/Events/Tickets/Favorites/Profile screens) has been removed — the real,
// live guest browsing experience lives under app/(guest)/ instead.
export default function TabsLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  // Only show the hamburger button on a section's root screen (e.g.
  // /(tabs)/venues), not on nested detail/create screens (e.g.
  // /(tabs)/venues/[id]) where a normal back arrow already handles navigation.
  const atOwnerRoot = segments.length <= 2;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="dashboard"
        screenOptions={{
          tabBarStyle: { display: 'none' },
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
        {/* Venue-owner sections — reachable via the hamburger menu, not a tab
            bar. headerShown:true (with no custom back/left button since these
            are section roots) reserves proper top safe-area space, which flat
            single-file screens don't otherwise account for themselves. */}
        <Tabs.Screen name="dashboard" options={{ href: null, headerShown: true, title: 'Dashboard' }} />
        <Tabs.Screen name="bookings" options={{ href: null, headerShown: true, title: 'Bookings' }} />
        <Tabs.Screen name="clients" options={{ href: null, headerShown: true, title: 'Clients' }} />
        <Tabs.Screen name="calendar" options={{ href: null, headerShown: true, title: 'Calendar' }} />
        <Tabs.Screen name="settings" options={{ href: null, headerShown: true, title: 'Settings' }} />

        {/* Folder routes already render their own nested header/title, so the
            outer header stays hidden to avoid a duplicate header. */}
        <Tabs.Screen name="events" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="venues" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="messages" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="invoices" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="vendor-invoices" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="estimates" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="vendors" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="booking-link" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="door-lists" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="contracts" options={{ href: null, headerShown: false }} />
      </Tabs>

      {atOwnerRoot && (
        <View style={[styles.fab, { top: insets.top + 6 }]}>
          <MenuButton onPress={() => setMenuVisible(true)} />
        </View>
      )}

      <OwnerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
});
