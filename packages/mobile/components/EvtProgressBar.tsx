import { Fragment } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/lib/theme';
import type { EvtProgressStep } from '@/components/EvtDate';

export default function EvtProgressBar({ steps, size = 'md' }: { steps: EvtProgressStep[]; size?: 'sm' | 'md' }) {
  const currentIdx = steps.findIndex((s) => !s.done && !s.skipped);
  const dot = size === 'sm' ? 22 : 28;
  return (
    <View>
      <View style={styles.row}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isCurrent = i === currentIdx;
          const bg = step.done ? Colors.success : isCurrent ? Colors.primary : Colors.border;
          return (
            <Fragment key={step.label}>
              <View
                style={[
                  styles.dot,
                  { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: step.skipped && !step.done ? Colors.borderLight : bg },
                  step.skipped && !step.done && styles.skipped,
                ]}
              >
                {step.done ? (
                  <Ionicons name="checkmark" size={dot * 0.5} color={Colors.textWhite} />
                ) : step.skipped ? (
                  <Text style={styles.dash}>—</Text>
                ) : (
                  <Text style={[styles.num, isCurrent && { color: Colors.textWhite }]}>{i + 1}</Text>
                )}
              </View>
              {!isLast && <View style={[styles.line, { backgroundColor: step.done ? Colors.success : Colors.border }]} />}
            </Fragment>
          );
        })}
      </View>
      <View style={styles.labels}>
        {steps.map((step, i) => (
          <Text
            key={step.label}
            style={[
              styles.label,
              step.done ? { color: Colors.success } : i === currentIdx ? { color: Colors.primary } : { color: Colors.textMuted },
            ]}
          >
            {step.label}{step.skipped && !step.done ? '*' : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { alignItems: 'center', justifyContent: 'center' },
  skipped: { borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.textMuted },
  dash: { fontSize: 10, color: Colors.textMuted },
  num: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  line: { flex: 1, height: 2, marginHorizontal: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { flex: 1, fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
