import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';

export interface OwnerMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

export const OWNER_MENU_ITEMS: OwnerMenuItem[] = [
  { icon: 'grid-outline', label: 'Dashboard', route: '/(tabs)/dashboard' },
  { icon: 'checkmark-circle-outline', label: 'Bookings', route: '/(tabs)/bookings' },
  { icon: 'people-outline', label: 'Clients', route: '/(tabs)/clients' },
  { icon: 'calendar-outline', label: 'Calendar', route: '/(tabs)/calendar' },
  { icon: 'document-text-outline', label: 'Estimates', route: '/(tabs)/estimates' },
  { icon: 'receipt-outline', label: 'Invoices', route: '/(tabs)/invoices' },
  { icon: 'business-outline', label: 'Venues', route: '/(tabs)/venues' },
  { icon: 'storefront-outline', label: 'Vendors', route: '/(tabs)/vendors' },
  { icon: 'cash-outline', label: 'Vendor Invoices', route: '/(tabs)/vendor-invoices' },
  { icon: 'chatbubble-ellipses-outline', label: 'Messages', route: '/(tabs)/messages' },
  { icon: 'link-outline', label: 'Booking Link', route: '/(tabs)/booking-link' },
  { icon: 'clipboard-outline', label: 'Door Lists', route: '/(tabs)/door-lists' },
  { icon: 'document-lock-outline', label: 'Contracts', route: '/(tabs)/contracts' },
  { icon: 'settings-outline', label: 'Settings', route: '/(tabs)/settings' },
];

export function MenuButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuButton} hitSlop={12}>
      <Ionicons name="menu" size={26} color={Colors.textPrimary} />
    </TouchableOpacity>
  );
}

export default function OwnerMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleLogout = async () => {
    onClose();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.panel, { paddingTop: insets.top + 12 }]}
          onPress={() => {}}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Menu</Text>
            {OWNER_MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.item}
                onPress={() => go(item.route)}
              >
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
                <Text style={styles.itemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.item, styles.logoutItem]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={[styles.itemLabel, { color: Colors.error }]}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menuButton: { paddingHorizontal: 4, paddingVertical: 4 },
  backdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: Colors.surface,
    paddingBottom: 24,
    paddingHorizontal: 16,
    ...Shadow.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
  },
  itemLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  logoutItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
});
