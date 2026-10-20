import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import EmptyState from '@/components/EmptyState';

type Result = { ok: boolean; title: string; detail: string };

const RESULT_MS = 2500;

// Camera door scanner. Same order as the web scanner: try a regular ticket
// first, then fall back to a VIP QR code. Ticket QR = ticket id; VIP QR = qr_code.
export default function PromoterScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<Result | null>(null);
  const [torch, setTorch] = useState(false);
  const [vipMode, setVipMode] = useState<'full' | 'single'>('full');
  const [counts, setCounts] = useState({ ok: 0, denied: 0 });
  const [active, setActive] = useState(true);
  // A ref (not state) guards against the camera firing several frames for one code.
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => { setActive(false); setTorch(false); };
  }, []));

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const resume = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setResult(null);
    busy.current = false;
  }, []);

  const showResult = useCallback((r: Result) => {
    setResult(r);
    setCounts((c) => ({ ok: c.ok + (r.ok ? 1 : 0), denied: c.denied + (r.ok ? 0 : 1) }));
    timer.current = setTimeout(resume, RESULT_MS);
  }, [resume]);

  const processCode = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) { busy.current = false; return; }
    try {
      try {
        const res = await apiRequest<{ valid?: boolean; reason?: string; ticket?: { ticket_tiers?: { name?: string } | null } }>(
          `/promoter-events/${id}/scan-ticket`,
          { method: 'POST', body: { ticket_id: value } },
        );
        const tier = res?.ticket?.ticket_tiers?.name;
        showResult({
          ok: res?.valid !== false,
          title: res?.valid === false ? 'Denied' : 'Valid ticket',
          detail: [tier, res?.reason].filter(Boolean).join(' · ') || 'Ticket scanned successfully',
        });
      } catch (ticketErr: any) {
        const msg = String(ticketErr?.message || '');
        if (!/not found/i.test(msg)) throw ticketErr;
        const vip = await apiRequest<{ message?: string }>(`/vip/events/${id}/scan`, {
          method: 'POST',
          body: { qr_code: value, check_in_mode: vipMode },
        });
        showResult({ ok: true, title: 'VIP checked in', detail: vip?.message || 'VIP guest checked in' });
      }
    } catch (err: any) {
      showResult({ ok: false, title: 'Denied', detail: err?.message || 'Code not recognized' });
    }
  }, [id, vipMode, showResult]);

  const onScanned = useCallback(({ data }: { data: string }) => {
    if (busy.current) return;
    busy.current = true;
    processCode(data);
  }, [processCode]);

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.purple} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <EmptyState
          icon="camera-outline"
          title="Camera access needed"
          message="Allow camera access to scan ticket and VIP QR codes at the door."
        />
        <View style={styles.permissionBtns}>
          {permission.canAskAgain ? (
            <AppButton title="Allow Camera" onPress={requestPermission} />
          ) : (
            <AppButton title="Open Settings" onPress={() => Linking.openSettings()} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {active && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={result ? undefined : onScanned}
        />
      )}

      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.pill}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.pillText}>{counts.ok}</Text>
          <Ionicons name="close-circle" size={16} color={Colors.error} style={{ marginLeft: 10 }} />
          <Text style={styles.pillText}>{counts.denied}</Text>
        </View>
        <TouchableOpacity
          style={[styles.roundBtn, torch && { backgroundColor: Colors.purple }]}
          onPress={() => setTorch((t) => !t)}
          accessibilityLabel="Toggle flashlight"
        >
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Point the camera at a ticket or VIP QR code</Text>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.modeLabel}>VIP check-in</Text>
        <View style={styles.modeRow}>
          {([['full', 'Full group'], ['single', 'One guest']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.modeBtn, vipMode === key && styles.modeBtnActive]}
              onPress={() => setVipMode(key)}
              accessibilityRole="button"
            >
              <Text style={[styles.modeText, vipMode === key && styles.modeTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {result && (
        <TouchableOpacity
          activeOpacity={0.95}
          style={[styles.overlay, { backgroundColor: result.ok ? Colors.success : Colors.error }]}
          onPress={resume}
        >
          <Ionicons name={result.ok ? 'checkmark-circle' : 'close-circle'} size={96} color="#FFFFFF" />
          <Text style={styles.resultTitle}>{result.title}</Text>
          <Text style={styles.resultDetail}>{result.detail}</Text>
          <Text style={styles.tapHint}>Tap to scan next</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  permission: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center' },
  permissionBtns: { paddingHorizontal: 24, marginTop: 8 },
  topBar: {
    position: 'absolute', top: 12, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 8,
  },
  pillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  roundBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 260, borderRadius: 24, borderWidth: 3, borderColor: '#FFFFFF' },
  hint: { color: '#FFFFFF', marginTop: 16, fontSize: 14, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
  bottomBar: {
    position: 'absolute', bottom: 28, left: 16, right: 16, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.lg, padding: 12,
  },
  modeLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginBottom: 8, opacity: 0.85 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  modeBtnActive: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  modeText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  modeTextActive: { color: '#FFFFFF' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  resultDetail: { color: '#FFFFFF', fontSize: 16, marginTop: 8, textAlign: 'center' },
  tapHint: { color: '#FFFFFF', opacity: 0.8, marginTop: 28, fontSize: 13 },
});
