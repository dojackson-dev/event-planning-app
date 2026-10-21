import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Switch, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/lib/theme';
import AppButton from '@/components/AppButton';
import { requestClientOtp, verifyClientOtp } from '@/lib/clientApi';

type Step = 'phone' | 'otp';

const TERMS_URL = 'https://eventecos.com/terms-of-service';
const PRIVACY_URL = 'https://eventecos.com/privacy-policy';

// Clients sign in with the phone number on file and a one-time SMS code — no password.
export default function ClientLoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [agreedToSms, setAgreedToSms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const sendCode = async () => {
    setError('');
    if (!name.trim()) return setError('Please enter your full name.');
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit U.S. phone number.');
    if (!agreedToSms || !agreedToTerms) {
      return setError('Please agree to both SMS communications and the Terms of Service / Privacy Policy to continue.');
    }
    setLoading(true);
    try {
      const res = await requestClientOtp(name.trim(), phone.trim(), agreedToSms, agreedToTerms);
      setDevOtp(res?.devOtp ?? null);
      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError('');
    setLoading(true);
    try {
      await verifyClientOtp(phone.trim(), otp.trim(), name.trim());
      router.replace('/(client)' as never);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(guest)' as never))} style={styles.back} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconWrap}><Ionicons name="phone-portrait-outline" size={30} color={Colors.primary} /></View>
          <Text style={styles.title}>Client Portal</Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Sign in with your phone number. We’ll text you a one-time code.'
              : `Enter the 6-digit code we texted to ${phone}.`}
          </Text>
        </View>

        {!!error && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Jane Smith"
              placeholderTextColor={Colors.textMuted}
              autoComplete="name"
              textContentType="name"
            />
            <Text style={styles.hint}>Use the name from your booking or event intake form.</Text>

            <Text style={[styles.label, { marginTop: 16 }]}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 555-5555"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
            <Text style={styles.hint}>Use the phone number on file with EventEcos.</Text>

            <View style={styles.consentRow}>
              <Switch value={agreedToSms} onValueChange={setAgreedToSms} />
              <Text style={styles.consentText}>
                <Text style={styles.bold}>SMS communications</Text> – I agree to receive one-time passcodes and event
                notifications via SMS from EventEcos. Message & data rates may apply.
              </Text>
            </View>
            <View style={styles.consentRow}>
              <Switch value={agreedToTerms} onValueChange={setAgreedToTerms} />
              <Text style={styles.consentText}>
                I agree to the{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text> and{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
              </Text>
            </View>

            <AppButton title="Send Code" onPress={sendCode} loading={loading} style={styles.cta} />
          </View>
        ) : (
          <View style={styles.form}>
            {!!devOtp && <Text style={styles.devOtp}>Test code: {devOtp}</Text>}
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
            />
            <AppButton title="Verify & Sign In" onPress={verify} loading={loading} disabled={otp.length !== 6} style={styles.cta} />
            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setError(''); setDevOtp(null); }} style={styles.again}>
              <Text style={styles.link}>Use a different number or resend code</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => router.replace('/(auth)/login' as never)} style={styles.staff}>
          <Text style={styles.staffText}>Venue owner, vendor, artist or promoter? <Text style={styles.link}>Log in here</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 56, flexGrow: 1 },
  back: { position: 'absolute', top: 56, left: 20, zIndex: 2 },
  header: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: Radius.md, padding: 12, marginBottom: 14 },
  errorText: { color: Colors.errorText, fontSize: 14 },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: Colors.textPrimary,
  },
  otpInput: { fontSize: 26, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  consentText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  bold: { fontWeight: '700', color: Colors.textPrimary },
  link: { color: Colors.primary, fontWeight: '600' },
  cta: { marginTop: 22 },
  again: { alignItems: 'center', marginTop: 16 },
  devOtp: { fontSize: 13, color: Colors.warning, marginBottom: 10, textAlign: 'center' },
  staff: { marginTop: 32, alignItems: 'center' },
  staffText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
