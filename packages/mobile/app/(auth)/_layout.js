"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthLayout;
var expo_router_1 = require("expo-router");
function AuthLayout() {
    return (<expo_router_1.Stack>
      <expo_router_1.Stack.Screen name="login" options={{
            title: 'Sign In',
            headerShown: false,
        }}/>
    </expo_router_1.Stack>);
}
