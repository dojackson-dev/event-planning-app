"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EventsLayout;
var expo_router_1 = require("expo-router");
var theme_1 = require("@/lib/theme");
function EventsLayout() {
    return (<expo_router_1.Stack screenOptions={{
            headerStyle: { backgroundColor: theme_1.Colors.primary },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', fontSize: 17 },
            headerBackTitleVisible: false,
        }}/>);
}
