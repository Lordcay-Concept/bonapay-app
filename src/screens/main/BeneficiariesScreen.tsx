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

interface Beneficiary {
  id: string;
  account_number: string;
  bank_name: string;
  account_name: string;
  nickname: string;
  is_favorite: boolean;
  transaction_count: number;
}

const BANKS = [
  { code: '001', name: 'GTBank' },
  { code: '002', name: 'Zenith Bank' },
  { code: '003', name: 'Access Bank' },
  { code: '004', name: 'First Bank' },
  { code: '005', name: 'UBA' },
];

export default function BeneficiariesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    account_number: '',
    bank_name: '',
    account_name: '',
    nickname: '',
  });
  const [verifying, setVerifying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('user_id', user.id)
      .order('is_favorite', { ascending: false });
    
    setBeneficiaries(data || []);
    setLoading(false);
  };

  const verifyAccount = async () => {
    if (!formData.account_number || !formData.bank_name) {
      Alert.alert('Error', 'Please enter account number and select bank');
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      setVerifiedName('John Doe');
      setFormData({ ...formData, account_name: 'John Doe' });
      Alert.alert('Success', 'Account verified successfully');
      setVerifying(false);
    }, 1000);
  };

  const addBeneficiary = async () => {
    if (!formData.account_number || !formData.bank_name || !formData.account_name) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from('beneficiaries')
      .insert({
        user_id: user?.id,
        account_number: formData.account_number,
        bank_name: formData.bank_name,
        account_name: formData.account_name,
        nickname: formData.nickname || formData.account_name,
        is_favorite: false,
      });

    if (error) {
      Alert.alert('Error', 'Failed to add beneficiary');
    } else {
      Alert.alert('Success', 'Beneficiary added successfully');
      setShowAddModal(false);
      setFormData({ account_number: '', bank_name: '', account_name: '', nickname: '' });
      setVerifiedName('');
      loadBeneficiaries();
    }
    setAdding(false);
  };

  const toggleFavorite = async (beneficiary: Beneficiary) => {
    const { error } = await supabase
      .from('beneficiaries')
      .update({ is_favorite: !beneficiary.is_favorite })
      .eq('id', beneficiary.id);
    
    if (!error) loadBeneficiaries();
  };

  const deleteBeneficiary = async (beneficiary: Beneficiary) => {
    Alert.alert('Delete', `Remove ${beneficiary.nickname} from beneficiaries?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('beneficiaries')
            .delete()
            .eq('id', beneficiary.id);
          if (!error) loadBeneficiaries();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const favorites = beneficiaries.filter(b => b.is_favorite);
  const others = beneficiaries.filter(b => !b.is_favorite);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Beneficiaries</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {beneficiaries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No beneficiaries added</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowAddModal(true)}>
              <Text style={styles.createButtonText}>Add Beneficiary</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {favorites.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Favorites</Text>
                {favorites.map((beneficiary) => (
                  <BeneficiaryCard
                    key={beneficiary.id}
                    beneficiary={beneficiary}
                    onToggleFavorite={() => toggleFavorite(beneficiary)}
                    onDelete={() => deleteBeneficiary(beneficiary)}
                    onPress={() => navigation.navigate('SendMoney', { accountNumber: beneficiary.account_number })}
                  />
                ))}
              </View>
            )}
            {others.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All Beneficiaries</Text>
                {others.map((beneficiary) => (
                  <BeneficiaryCard
                    key={beneficiary.id}
                    beneficiary={beneficiary}
                    onToggleFavorite={() => toggleFavorite(beneficiary)}
                    onDelete={() => deleteBeneficiary(beneficiary)}
                    onPress={() => navigation.navigate('SendMoney', { accountNumber: beneficiary.account_number })}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Beneficiary Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Beneficiary</Text>
            
            <Text style={styles.modalLabel}>Bank</Text>
            <View style={styles.bankPicker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {BANKS.map(bank => (
                  <TouchableOpacity
                    key={bank.code}
                    style={[
                      styles.bankOption,
                      formData.bank_name === bank.name && styles.bankOptionActive
                    ]}
                    onPress={() => setFormData({ ...formData, bank_name: bank.name })}
                  >
                    <Text style={[
                      styles.bankOptionText,
                      formData.bank_name === bank.name && styles.bankOptionTextActive
                    ]}>
                      {bank.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <Text style={styles.modalLabel}>Account Number</Text>
            <View style={styles.verifyRow}>
              <TextInput
                style={[styles.modalInput, styles.verifyInput]}
                placeholder="Enter account number"
                keyboardType="numeric"
                value={formData.account_number}
                onChangeText={(text) => setFormData({ ...formData, account_number: text })}
              />
              <TouchableOpacity style={styles.verifyButton} onPress={verifyAccount} disabled={verifying}>
                {verifying ? <ActivityIndicator size="small" color="#2563eb" /> : <Text style={styles.verifyButtonText}>Verify</Text>}
              </TouchableOpacity>
            </View>
            
            {verifiedName !== '' && (
              <View style={styles.verifiedBox}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.verifiedText}>Account Name: {verifiedName}</Text>
              </View>
            )}
            
            <Text style={styles.modalLabel}>Nickname (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Mom, John, Rent"
              value={formData.nickname}
              onChangeText={(text) => setFormData({ ...formData, nickname: text })}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModalButton} onPress={addBeneficiary} disabled={adding}>
                {adding ? <ActivityIndicator color="white" /> : <Text style={styles.confirmModalText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BeneficiaryCard({ beneficiary, onToggleFavorite, onDelete, onPress }: any) {
  return (
    <TouchableOpacity style={styles.beneficiaryCard} onPress={onPress}>
      <View style={styles.beneficiaryInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{beneficiary.nickname?.charAt(0) || beneficiary.account_name?.charAt(0)}</Text>
        </View>
        <View>
          <Text style={styles.beneficiaryName}>{beneficiary.nickname || beneficiary.account_name}</Text>
          <Text style={styles.beneficiaryDetails}>{beneficiary.account_name}</Text>
          <Text style={styles.beneficiaryMeta}>{beneficiary.bank_name} • {beneficiary.account_number}</Text>
          {beneficiary.transaction_count > 0 && (
            <Text style={styles.beneficiaryTransfers}>{beneficiary.transaction_count} transfers</Text>
          )}
        </View>
      </View>
      <View style={styles.beneficiaryActions}>
        <TouchableOpacity onPress={onToggleFavorite}>
          <Ionicons name={beneficiary.is_favorite ? 'star' : 'star-outline'} size={22} color={beneficiary.is_favorite ? '#f59e0b' : '#9ca3af'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  beneficiaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  beneficiaryInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  beneficiaryName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  beneficiaryDetails: { fontSize: 12, color: '#6b7280' },
  beneficiaryMeta: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  beneficiaryTransfers: { fontSize: 10, color: '#10b981', marginTop: 2 },
  beneficiaryActions: { flexDirection: 'row', gap: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8, marginTop: 16 },
  bankPicker: { marginBottom: 8 },
  bankOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  bankOptionActive: { backgroundColor: '#2563eb' },
  bankOptionText: { color: '#4b5563' },
  bankOptionTextActive: { color: 'white' },
  verifyRow: { flexDirection: 'row', gap: 12 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, flex: 1 },
  verifyInput: { flex: 1 },
  verifyButton: { backgroundColor: '#f3f4f6', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  verifyButtonText: { color: '#2563eb', fontWeight: '500' },
  verifiedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#d1fae5', padding: 12, borderRadius: 8, marginTop: 8 },
  verifiedText: { color: '#10b981', fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});