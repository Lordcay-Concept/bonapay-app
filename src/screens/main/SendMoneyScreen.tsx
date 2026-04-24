import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { transferService } from '../../services/transfer.service';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../services/supabase';

export default function SendMoneyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifiedBank, setVerifiedBank] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<'verify' | 'confirm'>('verify');
  const [hasPin, setHasPin] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    checkPinAndBalance();
  }, []);

  const checkPinAndBalance = async () => {
    const storedPin = await SecureStore.getItemAsync('transaction_pin');
    setHasPin(!!storedPin);
    
    if (user) {
      const { data: account } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (account) setBalance(account.balance);
    }
  };

  const handleVerifyAccount = async () => {
    if (!accountNumber || accountNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit account number');
      return;
    }

    setVerifying(true);
    try {
      const result = await transferService.verifyAccount(accountNumber);
      
      if (result.success && result.accountName) {
        setVerifiedName(result.accountName);
        setVerifiedBank(result.bankName || 'BonaPay');
        setStep('confirm');
      } else {
        Alert.alert('Account Not Found', result.error || 'The account number you entered does not exist.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to verify account. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const validateAmount = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }
    if (amountNum > balance) {
      Alert.alert('Error', 'Insufficient funds');
      return false;
    }
    return true;
  };

  const handleProceedToConfirm = () => {
    if (!validateAmount()) return;
    
    if (!hasPin) {
      Alert.alert('Setup Required', 'Please set up your transaction PIN first', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set Up PIN', onPress: () => navigation.navigate('Security') }
      ]);
      return;
    }
    
    setShowConfirmModal(true);
  };

  const handleSendMoney = async () => {
    if (!pin || pin.length !== 4) {
      Alert.alert('Error', 'Please enter your 4-digit transaction PIN');
      return;
    }
    
    const storedPin = await SecureStore.getItemAsync('transaction_pin');
    if (!storedPin) {
      Alert.alert('Setup Required', 'Please set up your transaction PIN first', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set Up PIN', onPress: () => navigation.navigate('Security') }
      ]);
      return;
    }
    
    if (pin !== storedPin) {
      Alert.alert('Error', 'Invalid PIN. Please try again.');
      setPin('');
      return;
    }

    setSending(true);
    try {
      const amountNum = parseFloat(amount);
      const newBalance = balance - amountNum;
      const reference = `TXN_${Date.now()}`;
      
      // Update the user's account balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          type: 'debit',
          amount: amountNum,
          description: description || 'Money Transfer',
          reference: reference,
          recipient_account: accountNumber,
          recipient_name: verifiedName,
          status: 'completed',
        });

      if (transactionError) throw transactionError;

      // Update local balance state
      setBalance(newBalance);

      Alert.alert('Success', `₦${amountNum.toLocaleString()} sent to ${verifiedName} successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Transfer failed. Please try again.');
    } finally {
      setSending(false);
      setShowConfirmModal(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (step === 'verify') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Money</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView style={styles.content}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit account number"
              keyboardType="numeric"
              value={accountNumber}
              onChangeText={setAccountNumber}
              maxLength={10}
            />

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifyAccount}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => setStep('verify')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Transfer</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientAvatarText}>{verifiedName?.charAt(0)}</Text>
          </View>
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{verifiedName}</Text>
            <Text style={styles.recipientAccount}>{accountNumber}</Text>
            <Text style={styles.recipientBank}>{verifiedBank}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="₦0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          {amount && parseFloat(amount) > balance && (
            <Text style={styles.insufficientText}>Insufficient funds</Text>
          )}

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="What's this for?"
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleProceedToConfirm}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* PIN Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="lock-closed" size={48} color="#2563eb" />
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>
              You are about to send ₦{parseFloat(amount).toLocaleString()} to {verifiedName}
            </Text>
            
            <TextInput
              style={styles.pinInput}
              placeholder="Enter 4-digit PIN"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={setPin}
              textAlign="center"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowConfirmModal(false);
                  setPin('');
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleSendMoney}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmModalText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
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
  balanceCard: { backgroundColor: '#2563eb', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { fontSize: 14, color: '#bfdbfe', marginBottom: 8 },
  balanceAmount: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  formCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20 },
  recipientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20, gap: 15 },
  recipientAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  recipientAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  recipientInfo: { flex: 1 },
  recipientName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  recipientAccount: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  recipientBank: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  label: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff' },
  amountInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 28, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fff' },
  insufficientText: { color: '#ef4444', fontSize: 12, marginTop: 4, textAlign: 'center' },
  verifyButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  verifyButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  continueButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  continueButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  modalSubtitle: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  pinInput: { width: 120, height: 50, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fff', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#f3f4f6' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { backgroundColor: '#2563eb' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});