"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TabsLayout;
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var theme_1 = require("@/lib/theme");
function TabsLayout() {
    return (<expo_router_1.Tabs screenOptions={{
            tabBarActiveTintColor: theme_1.Colors.primary,
            tabBarInactiveTintColor: theme_1.Colors.textMuted,
            tabBarStyle: {
                backgroundColor: theme_1.Colors.surface,
                borderTopColor: theme_1.Colors.border,
                borderTopWidth: 1,
                height: 60,
                paddingBottom: 8,
                paddingTop: 6,
            },
            tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '500',
            },
            headerStyle: {
                backgroundColor: theme_1.Colors.primary,
            },
            headerTintColor: theme_1.Colors.textWhite,
            headerTitleStyle: {
                fontWeight: '700',
                fontSize: 17,
            },
        }}>
      <expo_router_1.Tabs.Screen name="index" options={{
            title: 'Home',
            headerTitle: 'OwnerSuite',
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<vector_icons_1.Ionicons name="home" size={size} color={color}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="events" options={{
            title: 'Events',
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<vector_icons_1.Ionicons name="calendar" size={size} color={color}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="bookings" options={{
            title: 'Booked',
            headerTitle: 'Booked Events',
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<vector_icons_1.Ionicons name="checkmark-circle" size={size} color={color}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="clients" options={{
            title: 'Clients',
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<vector_icons_1.Ionicons name="people" size={size} color={color}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="invoices" options={{ href: null, headerShown: false }}/>
      <expo_router_1.Tabs.Screen name="estimates" options={{ href: null, headerShown: false }}/>
      <expo_router_1.Tabs.Screen name="messages" options={{ href: null, headerShown: false }}/>
      <expo_router_1.Tabs.Screen name="calendar" options={{ href: null }}/>
      <expo_router_1.Tabs.Screen name="settings" options={{
            href: null,
            title: 'Settings',
            headerStyle: { backgroundColor: theme_1.Colors.surface },
            headerTintColor: theme_1.Colors.textPrimary,
            headerShadowVisible: false,
        }}/>
      <expo_router_1.Tabs.Screen name="profile" options={{
            title: 'Profile',
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<vector_icons_1.Ionicons name="person" size={size} color={color}/>);
            },
        }}/>
    </expo_router_1.Tabs>);
}
