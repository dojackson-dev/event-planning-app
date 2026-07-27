"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Index;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var supabase_1 = require("@/lib/supabase");
function Index() {
    var router = (0, expo_router_1.useRouter)();
    (0, react_1.useEffect)(function () {
        supabase_1.supabase.auth.getSession().then(function (_a) {
            var session = _a.data.session;
            if (session) {
                router.replace('/(tabs)/');
            }
            else {
                router.replace('/(auth)/login');
            }
        });
    }, []);
    return (<react_native_1.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <react_native_1.ActivityIndicator size="large" color="#007AFF"/>
    </react_native_1.View>);
}
