import React, { useState, useEffect } from 'react';
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

interface ScheduledTransfer {
  id: string;
  recipient_name: string;
  recipient_account: string;
  recipient_bank: string;
  amount: number;
  description: string;
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly';
  next_execution: string;
  last_execution: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

const FREQUENCIES = [
  { value: 'one-time', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function ScheduledTransfersScreen({ navigation }: any) {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_account: '',
    recipient_bank: '',
    amount: '',
    description: '',
    frequency: 'one-time',
    next_execution: '',
  });

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    if (!user) return;
    // Mock data for now
    setTransfers([]);
    setLoading(false);
  };

  const createTransfer = async () => {
    if (!formData.recipient_name || !formData.recipient_account || !formData.amount) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setCreating(true);
    setTimeout(() => {
      Alert.alert('Success', 'Scheduled transfer created successfully');
      setShowCreateModal(false);
      setFormData({
        recipient_name: '',
        recipient_account: '',
        recipient_bank: '',
        amount: '',
        description: '',
        frequency: 'one-time',
        next_execution: '',
      });
      setCreating(false);
    }, 1000);
  };

  const updateStatus = (id: string, newStatus: string) => {
    Alert.alert('Update Status', `Mark this transfer as ${newStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          setTransfers(transfers.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
          Alert.alert('Success', `Transfer ${newStatus} successfully`);
        }
      }
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFrequencyLabel = (frequency: string) => {
    return FREQUENCIES.find(f => f.value === frequency)?.label || frequency;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scheduled Transfers</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {transfers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No scheduled transfers</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.createButtonText}>Schedule Transfer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          transfers.map((transfer) => (
            <View key={transfer.id} style={styles.transferCard}>
              <View style={styles.transferHeader}>
                <Text style={styles.recipientName}>{transfer.recipient_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transfer.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(transfer.status) }]}>
                    {transfer.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.recipientDetails}>
                {transfer.recipient_bank} • {transfer.recipient_account}
              </Text>
              <Text style={styles.transferDesc}>{transfer.description}</Text>
              <Text style={styles.transferAmount}>{formatCurrency(transfer.amount)}</Text>
              <View style={styles.transferFooter}>
                <Text style={styles.transferMeta}>{getFrequencyLabel(transfer.frequency)}</Text>
                <Text style={styles.transferMeta}>Next: {formatDate(transfer.next_execution)}</Text>
              </View>
              <View style={styles.transferActions}>
                {transfer.status === 'active' ? (
                  <TouchableOpacity style={styles.pauseButton} onPress={() => updateStatus(transfer.id, 'paused')}>
                    <Text style={styles.pauseButtonText}>Pause</Text>
                  </TouchableOpacity>
                ) : transfer.status === 'paused' ? (
                  <TouchableOpacity style={styles.resumeButton} onPress={() => updateStatus(transfer.id, 'active')}>
                    <Text style={styles.resumeButtonText}>Resume</Text>
                  </TouchableOpacity>
                ) : null}
                {transfer.status !== 'completed' && transfer.status !== 'cancelled' && (
                  <TouchableOpacity style={styles.cancelButton} onPress={() => updateStatus(transfer.id, 'cancelled')}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Transfer Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Transfer</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Recipient Name"
              value={formData.recipient_name}
              onChangeText={(text) => setFormData({ ...formData, recipient_name: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Account Number"
              keyboardType="numeric"
              value={formData.recipient_account}
              onChangeText={(text) => setFormData({ ...formData, recipient_account: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Bank Name"
              value={formData.recipient_bank}
              onChangeText={(text) => setFormData({ ...formData, recipient_bank: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Amount"
              keyboardType="numeric"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
            
            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {FREQUENCIES.map(freq => (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.freqButton,
                    formData.frequency === freq.value && styles.freqButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, frequency: freq.value })}
                >
                  <Text style={[
                    styles.freqText,
                    formData.frequency === freq.value && styles.freqTextActive
                  ]}>
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.modalLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateButton}>
              <Ionicons name="calendar" size={20} color="#6b7280" />
              <Text style={styles.dateText}>Select Date</Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModalButton} onPress={createTransfer} disabled={creating}>
                {creating ? <ActivityIndicator color="white" /> : <Text style={styles.confirmModalText}>Schedule</Text>}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  createButton: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  createButtonText: { color: 'white', fontWeight: '600' },
  transferCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  transferHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recipientName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  recipientDetails: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  transferDesc: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  transferAmount: { fontSize: 18, fontWeight: 'bold', color: '#2563eb', marginBottom: 8 },
  transferFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  transferMeta: { fontSize: 12, color: '#6b7280' },
  transferActions: { flexDirection: 'row', gap: 12 },
  pauseButton: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  pauseButtonText: { color: '#6b7280', fontWeight: '500' },
  resumeButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  resumeButtonText: { color: 'white', fontWeight: '500' },
  cancelButton: { backgroundColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cancelButtonText: { color: '#ef4444', fontWeight: '500' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8 },
  frequencyRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  freqButton: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  freqButtonActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  freqText: { fontSize: 12, color: '#6b7280' },
  freqTextActive: { color: 'white' },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dateText: { fontSize: 14, color: '#1f2937' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelModalButton: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});