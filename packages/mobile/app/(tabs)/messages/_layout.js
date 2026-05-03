"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MessagesLayout;
var expo_router_1 = require("expo-router");
var theme_1 = require("@/lib/theme");
function MessagesLayout() {
    return (<expo_router_1.Stack screenOptions={{
            headerStyle: { backgroundColor: theme_1.Colors.surface },
            headerTintColor: theme_1.Colors.textPrimary,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme_1.Colors.background },
        }}>
      <expo_router_1.Stack.Screen name="index" options={{ title: 'Messages' }}/>
      <expo_router_1.Stack.Screen name="send" options={{ title: 'Send Message' }}/>
    </expo_router_1.Stack>);
}
