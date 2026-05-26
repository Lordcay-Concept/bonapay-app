import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { pinService } from '../../services/pin.service';

const NIGERIAN_NAMES = [
  'CHUKWUEMEKA OKAFOR', 'IFEANYI EZE', 'OLUWASEUN ADEBAYO', 'FUNMILAYO AKINDELE',
  'ABDULLAHI BELLO', 'CHIOMA NWOSU', 'EMMANUEL OBI', 'GRACE OKONKWO',
  'MICHAEL OLAYINKA', 'PRECIOUS ADELEKE', 'SAMUEL CHIDIEBERE', 'VICTORIA ONAH',
];

export default function SendMoneyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [sending, setSending] = useState(false);
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const pinInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    if (!user || !user.id) return;
    
    const { data } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    if (data) setBalance(data.balance);
  };

  const handleAccountNumberChange = (text: string) => {
    setAccountNumber(text);
    if (text.length === 10) {
      const randomIndex = Math.floor(Math.random() * NIGERIAN_NAMES.length);
      setVerifiedName(NIGERIAN_NAMES[randomIndex]);
    } else {
      setVerifiedName(null);
    }
  };

  const handleContinue = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (amountNum > balance) {
      Alert.alert('Insufficient Funds', `Your balance is ₦${balance.toLocaleString()}`);
      return;
    }
    if (!verifiedName) {
      Alert.alert('Invalid Account', 'Please enter a valid 10-digit account number');
      return;
    }
    
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = () => {
    setShowConfirmModal(false);
    setPin('');
    setShowPinModal(true);
  };

  // AUTO-SUBMIT when PIN reaches 4 digits
  const handlePinChange = (text: string) => {
    setPin(text);
    
    // Auto-submit when 4 digits are entered
    if (text.length === 4) {
      setTimeout(() => processPaymentWithPin(text), 100);
    }
  };

  const processPaymentWithPin = async (enteredPin: string) => {
    if (!user || !user.id) {
      Alert.alert('Error', 'User not authenticated');
      setShowPinModal(false);
      return;
    }

    setSending(true);
    
    // Verify PIN
    const result = await pinService.verifyPin(user.id, enteredPin);
    
    if (!result.success) {
      Alert.alert('Invalid PIN', result.error || 'Please try again');
      setPin('');
      setSending(false);
      return;
    }

    // Process transfer
    const amountNum = parseFloat(amount);
    const reference = `TXN_${Date.now()}`;

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: balance - amountNum })
      .eq('user_id', user.id);

    if (updateError) {
      Alert.alert('Error', 'Transfer failed. Please try again.');
      setSending(false);
      setShowPinModal(false);
      return;
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'debit',
      amount: amountNum,
      description: description || 'Money Transfer',
      reference: reference,
      recipient_account: accountNumber,
      recipient_name: verifiedName,
      status: 'completed',
    });

    setSending(false);
    setShowPinModal(false);

    Alert.alert(
      'Transfer Successful',
      `₦${amountNum.toLocaleString()} sent to ${verifiedName}`,
      [{ text: 'Done', onPress: () => navigation.goBack() }]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const renderPinDots = () => (
    <View style={styles.pinDotsContainer}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={[styles.pinDot, pin[index] && styles.pinDotFilled]}>
          <Text style={styles.pinDotText}>{pin[index] ? '●' : '○'}</Text>
        </View>
      ))}
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Money</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Money</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Account Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit account number"
            keyboardType="numeric"
            value={accountNumber}
            onChangeText={handleAccountNumberChange}
            maxLength={10}
          />

          {verifiedName ? (
            <View style={styles.verifiedBox}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.verifiedName}>{verifiedName}</Text>
            </View>
          ) : accountNumber.length === 10 ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>Account not found</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="₦0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.balanceHint}>Available: {formatCurrency(balance)}</Text>

          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="What's this for?"
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={[styles.continueButton, (!verifiedName || !amount) && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!verifiedName || !amount}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text style={styles.confirmModalTitle}>Confirm Transfer</Text>
            </View>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Recipient</Text>
                <Text style={styles.confirmValue}>{verifiedName}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Account</Text>
                <Text style={styles.confirmValue}>{accountNumber}</Text>
              </View>
              <View style={styles.confirmDivider} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Amount</Text>
                <Text style={styles.confirmAmount}>{formatCurrency(parseFloat(amount))}</Text>
              </View>
              {description ? (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Note</Text>
                  <Text style={styles.confirmValue}>{description}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.confirmModalButtons}>
              <TouchableOpacity style={styles.confirmCancelButton} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.confirmCancelText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmPayButton} onPress={handleConfirmPayment}>
                <Text style={styles.confirmPayText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Modal - Auto-submit on 4 digits */}
      <Modal 
        visible={showPinModal} 
        transparent 
        animationType="fade"
        onShow={() => {
          setTimeout(() => pinInputRef.current?.focus(), 200);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => pinInputRef.current?.focus()}
        >
          <View style={styles.pinModalContent}>
            <Ionicons name="lock-closed" size={48} color="#2563eb" />
            <Text style={styles.pinModalTitle}>Enter PIN</Text>
            <Text style={styles.pinModalSubtitle}>Enter your 4-digit PIN to confirm</Text>

            {renderPinDots()}

            <TextInput
              ref={pinInputRef}
              style={styles.pinInputBox}
              maxLength={4}
              keyboardType="numeric"
              secureTextEntry
              value={pin}
              onChangeText={handlePinChange}
              placeholder="• • • •"
              placeholderTextColor="#cbd5e1"
              textAlign="center"
              autoFocus
            />

            {sending && <ActivityIndicator color="#2563eb" style={{ marginTop: 10 }} />}

            <TouchableOpacity 
              style={styles.pinCancelButton} 
              onPress={() => {
                setShowPinModal(false);
                setPin('');
              }}
              disabled={sending}
            >
              <Text style={styles.pinCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: { backgroundColor: '#2563eb', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { fontSize: 14, color: '#bfdbfe', marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  inputCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff' },
  amountInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 28, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fff' },
  verifiedBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12, backgroundColor: '#d1fae5', borderRadius: 12 },
  verifiedName: { fontSize: 14, fontWeight: '600', color: '#065f46' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 12 },
  errorText: { fontSize: 12, color: '#dc2626', flex: 1 },
  balanceHint: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  continueButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '90%' },
  confirmModalHeader: { alignItems: 'center', marginBottom: 20 },
  confirmModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 12 },
  confirmDetails: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  confirmLabel: { fontSize: 14, color: '#64748b' },
  confirmValue: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  confirmAmount: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  confirmDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  confirmModalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  confirmCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  confirmCancelText: { color: '#64748b', fontWeight: '500' },
  confirmPayButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center' },
  confirmPayText: { color: 'white', fontWeight: '600' },
  pinModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '85%', alignItems: 'center' },
  pinModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 12 },
  pinModalSubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  pinDotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
  pinDot: { width: 55, height: 55, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  pinDotFilled: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  pinDotText: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  pinInputBox: {
    width: 200,
    height: 55,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 20,
    color: '#1e293b',
  },
  pinCancelButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, backgroundColor: '#f1f5f9' },
  pinCancelText: { color: '#64748b', fontWeight: '500' },
});