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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { batchTransferService } from '../../services/batch.service';

interface Recipient {
  id: string;
  account_number: string;
  bank_name: string;
  amount: number;
  note: string;
}

export default function BatchTransferScreen({ navigation }: any) {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    account_number: '',
    bank_name: '',
    amount: '',
    note: '',
  });
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [csvText, setCsvText] = useState('');

  const banks = ['GTBank', 'Zenith Bank', 'Access Bank', 'First Bank', 'UBA', 'FCMB', 'Stanbic IBTC'];

  const addRecipient = () => {
    if (!newRecipient.account_number || !newRecipient.amount) {
      Alert.alert('Error', 'Please fill account number and amount');
      return;
    }

    setRecipients([
      ...recipients,
      {
        id: Date.now().toString(),
        account_number: newRecipient.account_number,
        bank_name: newRecipient.bank_name || 'GTBank',
        amount: parseFloat(newRecipient.amount),
        note: newRecipient.note,
      },
    ]);
    setNewRecipient({ account_number: '', bank_name: '', amount: '', note: '' });
    setShowForm(false);
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const parseCSV = () => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const parsed: Recipient[] = [];
    
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 2) {
        parsed.push({
          id: Date.now().toString() + Math.random(),
          account_number: parts[0].trim(),
          bank_name: parts[1].trim() || 'GTBank',
          amount: parseFloat(parts[2]) || 0,
          note: parts[3]?.trim() || '',
        });
      }
    }
    
    if (parsed.length > 0) {
      setRecipients([...recipients, ...parsed]);
      Alert.alert('Success', `${parsed.length} recipients loaded from CSV`);
      setCsvText('');
    } else {
      Alert.alert('Error', 'Invalid CSV format');
    }
  };

  const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);

  const processBatchTransfer = async () => {
  if (recipients.length === 0) {
    Alert.alert('Error', 'No recipients added');
    return;
  }

  // Map recipients to include bank_code
  const batchRecipients = recipients.map(r => ({
    account_number: r.account_number,
    bank_code: r.bank_name,
    amount: r.amount,
    note: r.note,
  }));

  setProcessing(true);
  try {
    const result = await batchTransferService.createBatchTransfer(user!.id, batchRecipients);
    if (result.success) {
      Alert.alert('Success', 'Batch transfer initiated!', [
        { text: 'OK', onPress: () => {
          setRecipients([]);
          setShowConfirm(false);
          navigation.goBack();
        }}
      ]);
    } else {
      Alert.alert('Error', result.error || 'Batch transfer failed');
    }
  } catch (error) {
    Alert.alert('Error', 'An error occurred');
  } finally {
    setProcessing(false);
  }
};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Transfer</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* CSV Upload Section */}
        <View style={styles.csvCard}>
          <Text style={styles.csvTitle}>Bulk Upload via CSV</Text>
          <TextInput
            style={styles.csvInput}
            placeholder="Paste CSV data here...&#10;Format: Account Number, Bank, Amount, Note"
            multiline
            numberOfLines={4}
            value={csvText}
            onChangeText={setCsvText}
          />
          <TouchableOpacity style={styles.csvButton} onPress={parseCSV}>
            <Ionicons name="cloud-upload" size={20} color="white" />
            <Text style={styles.csvButtonText}>Upload CSV</Text>
          </TouchableOpacity>
          <Text style={styles.csvHint}>
            Format: 0123456789, GTBank, 5000, Rent payment
          </Text>
        </View>

        {/* Recipients List */}
        {recipients.length > 0 && (
          <View style={styles.recipientsCard}>
            <Text style={styles.recipientsTitle}>
              Recipients ({recipients.length}) - Total: {formatCurrency(totalAmount)}
            </Text>
            {recipients.map((recipient) => (
              <View key={recipient.id} style={styles.recipientItem}>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientAccount}>{recipient.account_number}</Text>
                  <Text style={styles.recipientBank}>{recipient.bank_name}</Text>
                  {recipient.note ? <Text style={styles.recipientNote}>{recipient.note}</Text> : null}
                </View>
                <View style={styles.recipientRight}>
                  <Text style={styles.recipientAmount}>{formatCurrency(recipient.amount)}</Text>
                  <TouchableOpacity onPress={() => removeRecipient(recipient.id)}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            <TouchableOpacity 
              style={styles.processButton}
              onPress={() => setShowConfirm(true)}
            >
              <Text style={styles.processButtonText}>
                Process Batch Transfer ({formatCurrency(totalAmount)})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Recipient Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Recipient</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Account Number"
              keyboardType="numeric"
              value={newRecipient.account_number}
              onChangeText={(text) => setNewRecipient({ ...newRecipient, account_number: text })}
            />
            
            <View style={styles.bankPicker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {banks.map(bank => (
                  <TouchableOpacity
                    key={bank}
                    style={[
                      styles.bankOption,
                      newRecipient.bank_name === bank && styles.bankOptionActive
                    ]}
                    onPress={() => setNewRecipient({ ...newRecipient, bank_name: bank })}
                  >
                    <Text style={[
                      styles.bankOptionText,
                      newRecipient.bank_name === bank && styles.bankOptionTextActive
                    ]}>
                      {bank}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Amount"
              keyboardType="numeric"
              value={newRecipient.amount}
              onChangeText={(text) => setNewRecipient({ ...newRecipient, amount: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Note (Optional)"
              value={newRecipient.note}
              onChangeText={(text) => setNewRecipient({ ...newRecipient, note: text })}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={addRecipient}
              >
                <Text style={styles.confirmModalText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Batch Transfer Modal */}
      <Modal visible={showConfirm} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.confirmModalContent}>
            <Ionicons name="alert-circle" size={48} color="#f59e0b" />
            <Text style={styles.modalTitle}>Confirm Batch Transfer</Text>
            <Text style={styles.modalSubtitle}>
              You are about to send to {recipients.length} recipients
            </Text>
            
            <View style={styles.confirmDetails}>
              <Text style={styles.confirmText}>Total Amount: {formatCurrency(totalAmount)}</Text>
              <Text style={styles.confirmText}>Number of transfers: {recipients.length}</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={processBatchTransfer}
                disabled={processing}
              >
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.confirmModalText}>Confirm</Text>}
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
  addButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  csvCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20 },
  csvTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  csvInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 12 },
  csvButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  csvButtonText: { color: 'white', fontWeight: '600' },
  csvHint: { fontSize: 10, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
  recipientsCard: { backgroundColor: 'white', borderRadius: 16, padding: 16 },
  recipientsTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  recipientItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  recipientInfo: { flex: 1 },
  recipientAccount: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  recipientBank: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  recipientNote: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  recipientRight: { alignItems: 'flex-end', gap: 8 },
  recipientAmount: { fontSize: 16, fontWeight: '600', color: '#2563eb' },
  processButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  processButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '90%' },
  confirmModalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  bankPicker: { marginBottom: 16 },
  bankOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  bankOptionActive: { backgroundColor: '#2563eb' },
  bankOptionText: { color: '#4b5563' },
  bankOptionTextActive: { color: 'white' },
  confirmDetails: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 },
  confirmText: { fontSize: 14, color: '#1f2937', marginBottom: 4 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#f3f4f6' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { backgroundColor: '#2563eb' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});