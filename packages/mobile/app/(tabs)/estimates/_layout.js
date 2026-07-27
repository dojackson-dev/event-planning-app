"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EstimatesLayout;
var expo_router_1 = require("expo-router");
var theme_1 = require("@/lib/theme");
function EstimatesLayout() {
    return (<expo_router_1.Stack screenOptions={{
            headerStyle: { backgroundColor: theme_1.Colors.primary },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 17 },
            headerBackTitle: 'Estimates',
        }}>
      <expo_router_1.Stack.Screen name="index" options={{ title: 'Estimates' }}/>
      <expo_router_1.Stack.Screen name="new" options={{ title: 'New Estimate', headerBackTitle: 'Back' }}/>
      <expo_router_1.Stack.Screen name="[id]" options={{ title: 'Estimate' }}/>
    </expo_router_1.Stack>);
}
