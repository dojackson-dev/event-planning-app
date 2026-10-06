import { useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Colors, Radius } from '@/lib/theme';

interface SignaturePadProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

export default function SignaturePad({ visible, onClose, onSave }: SignaturePadProps) {
  const ref = useRef<SignatureViewRef>(null);

  const handleOK = (signature: string) => {
    onSave(signature);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sign Here</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.canvasWrap}>
          <SignatureScreen
            ref={ref}
            onOK={handleOK}
            descriptionText=""
            webStyle={`.m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; margin: 0; }
              body,html { width: 100%; height: 100%; }`}
          />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearBtn} onPress={() => ref.current?.clearSignature()}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={() => ref.current?.readSignature()}>
            <Text style={styles.saveText}>Save Signature</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  cancel: { fontSize: 16, color: Colors.textSecondary },
  canvasWrap: { flex: 1, margin: 16, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  clearText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
