import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadow } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/roleRouting';
import OwnerMenu, { MenuButton } from '@/components/OwnerMenu';

// Roles that land on /(tabs)/dashboard (see ROLE_HOME in lib/roleRouting.ts) get
// the venue-owner-oriented tab set below instead of the attendee tabs. Keep
// this list in sync with ROLE_HOME's owner-type entries.
const OWNER_TYPE_ROLES = ['owner', 'admin', 'venue_owner', 'concierge'];

export default function TabsLayout() {
  const [isOwnerType, setIsOwnerType] = useState<boolean | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        if (isMounted) setIsOwnerType(false);
        return;
      }
      // Always resolve the role from the live `users` table — never trust
      // cached auth user_metadata/app_metadata here, since those claims can
      // go stale relative to the DB and land the user on the wrong tab set.
      const role = await getUserRole(user.id);
      if (isMounted) setIsOwnerType(OWNER_TYPE_ROLES.includes(role));
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Avoid flashing the wrong tab set while the role is resolving.
  if (isOwnerType === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Only show the hamburger button on a section's root screen (e.g.
  // /(tabs)/venues), not on nested detail/create screens (e.g.
  // /(tabs)/venues/[id]) where a normal back arrow already handles navigation.
  const atOwnerRoot = isOwnerType && segments.length <= 2;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: isOwnerType
            ? { display: 'none' }
            : {
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
        {/* Attendee tabs — hidden for owner-type roles */}
        <Tabs.Screen
          name="index"
          options={{
            href: isOwnerType ? null : undefined,
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
            href: isOwnerType ? null : undefined,
            title: 'Events',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tickets"
          options={{
            href: isOwnerType ? null : undefined,
            title: 'Tickets',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="ticket" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            href: isOwnerType ? null : undefined,
            title: 'Favorites',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: isOwnerType ? null : undefined,
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />

        {/* Venue-owner sections — reachable via the hamburger menu, not a tab
            bar. headerShown:true (with no custom back/left button since these
            are section roots) reserves proper top safe-area space, which flat
            single-file screens don't otherwise account for themselves. */}
        <Tabs.Screen name="dashboard" options={{ href: null, headerShown: isOwnerType, title: 'Dashboard' }} />
        <Tabs.Screen name="bookings" options={{ href: null, headerShown: isOwnerType, title: 'Bookings' }} />
        <Tabs.Screen name="clients" options={{ href: null, headerShown: isOwnerType, title: 'Clients' }} />
        <Tabs.Screen name="calendar" options={{ href: null, headerShown: isOwnerType, title: 'Calendar' }} />
        <Tabs.Screen name="settings" options={{ href: null, headerShown: isOwnerType, title: 'Settings' }} />

        {/* Folder routes already render their own nested header/title, so the
            outer header stays hidden to avoid a duplicate header. */}
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

      {isOwnerType && <OwnerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />}
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
