"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
require("react-native-url-polyfill/auto");
var react_1 = require("react");
var expo_router_1 = require("expo-router");
var supabase_1 = require("@/lib/supabase");
function RootLayout() {
    var router = (0, expo_router_1.useRouter)();
    var segments = (0, expo_router_1.useSegments)();
    // Use refs so the auth listener always has the latest values
    // without being re-registered on every navigation
    var segmentsRef = (0, react_1.useRef)(segments);
    var routerRef = (0, react_1.useRef)(router);
    segmentsRef.current = segments;
    routerRef.current = router;
    (0, react_1.useEffect)(function () {
        var subscription = supabase_1.supabase.auth.onAuthStateChange(function (_event, session) {
            var inAuthGroup = segmentsRef.current[0] === '(auth)';
            var onIndex = segmentsRef.current[0] === 'index' || segmentsRef.current.length === 0;
            if (!session && !inAuthGroup) {
                routerRef.current.replace('/(auth)/login');
            }
            else if (session && (inAuthGroup || onIndex)) {
                routerRef.current.replace('/(tabs)/');
            }
        }).data.subscription;
        return function () { return subscription.unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only register once on mount
    return (<expo_router_1.Stack screenOptions={{ headerShown: false }}>
      <expo_router_1.Stack.Screen name="index"/>
      <expo_router_1.Stack.Screen name="(auth)"/>
      <expo_router_1.Stack.Screen name="(tabs)"/>
    </expo_router_1.Stack>);
}
