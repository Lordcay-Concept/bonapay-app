import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function QRPaymentsScreen({ navigation }: any) {
  const [showQR, setShowQR] = useState(false);
  const [amount, setAmount] = useState('');
  const [qrData, setQrData] = useState('');

  const generateQR = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    const data = JSON.stringify({
      amount: parseFloat(amount),
      recipient: 'BonaPay User',
      timestamp: new Date().toISOString(),
    });
    setQrData(data);
    setShowQR(true);
  };

  const scanQR = () => {
    navigation.navigate('QRScanner');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Payments</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionCard} onPress={() => setShowQR(true)}>
            <View style={styles.optionIcon}>
              <Ionicons name="qr-code" size={40} color="#2563eb" />
            </View>
            <Text style={styles.optionTitle}>Generate QR</Text>
            <Text style={styles.optionDesc}>Receive payment via QR code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={scanQR}>
            <View style={styles.optionIcon}>
              <Ionicons name="scan" size={40} color="#2563eb" />
            </View>
            <Text style={styles.optionTitle}>Scan QR</Text>
            <Text style={styles.optionDesc}>Pay by scanning QR code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Generate a QR code to receive payments or scan a QR code to make instant payments
          </Text>
        </View>
      </ScrollView>

      {/* Generate QR Modal */}
      <Modal visible={showQR && !qrData} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate QR Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowQR(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={generateQR}
              >
                <Text style={styles.confirmButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Display QR Modal */}
      <Modal visible={!!qrData} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.qrModalContent}>
            <Text style={styles.modalTitle}>Your QR Code</Text>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code" size={180} color="#2563eb" />
            </View>
            <Text style={styles.qrAmount}>Amount: ₦{amount}</Text>
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => {
                setShowQR(false);
                setQrData('');
                setAmount('');
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  content: { flex: 1, padding: 16 },
  optionsContainer: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  optionCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center' },
  optionIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  optionDesc: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, gap: 12 },
  infoText: { flex: 1, fontSize: 14, color: '#1e40af' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%' },
  qrModalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 20 },
  qrPlaceholder: { padding: 20, backgroundColor: '#f3f4f6', borderRadius: 16, marginBottom: 16 },
  qrAmount: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f3f4f6' },
  cancelButtonText: { color: '#6b7280', fontWeight: '500' },
  confirmButton: { backgroundColor: '#2563eb' },
  confirmButtonText: { color: 'white', fontWeight: '500' },
  doneButton: { backgroundColor: '#10b981', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  doneButtonText: { color: 'white', fontWeight: '600' },
});