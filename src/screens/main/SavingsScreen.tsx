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

interface SavingsProduct {
  id: string;
  name: string;
  interest_rate: number;
  min_deposit: number;
  duration_days: number;
  description: string;
  target_amount: number;
  color: string;
}

interface UserSaving {
  id: string;
  product_id: string;
  balance: number;
  target_amount: number;
  interest_earned: number;
  start_date: string;
  maturity_date: string;
  status: 'active' | 'completed' | 'cancelled';
}

export default function SavingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [products, setProducts] = useState<SavingsProduct[]>([]);
  const [userSavings, setUserSavings] = useState<UserSaving[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SavingsProduct | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [selectedSaving, setSelectedSaving] = useState<UserSaving | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    // Load savings products
    const { data: productsData } = await supabase
      .from('savings_products')
      .select('*')
      .eq('is_active', true);
    
    setProducts(productsData || []);

    // Load user's savings
    const { data: savingsData } = await supabase
      .from('user_savings')
      .select('*')
      .eq('user_id', user.id);
    
    setUserSavings(savingsData || []);
    setLoading(false);
  };

  const handleStartSaving = () => {
    if (!selectedProduct) return;
    if (!amount || parseFloat(amount) < selectedProduct.min_deposit) {
      Alert.alert('Error', `Minimum deposit is ₦${selectedProduct.min_deposit.toLocaleString()}`);
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmStartSaving = async () => {
    const amountNum = parseFloat(amount);
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + (selectedProduct?.duration_days || 30));
    
    const { error } = await supabase
      .from('user_savings')
      .insert({
        user_id: user?.id,
        product_id: selectedProduct?.id,
        balance: amountNum,
        target_amount: selectedProduct?.target_amount || amountNum,
        interest_earned: 0,
        start_date: new Date().toISOString(),
        maturity_date: maturityDate.toISOString(),
        status: 'active',
      });

    if (error) {
      Alert.alert('Error', 'Failed to start savings plan');
    } else {
      Alert.alert('Success', 'Savings plan started successfully!');
      setShowProductModal(false);
      setSelectedProduct(null);
      setAmount('');
      loadData();
    }
    setShowConfirmModal(false);
  };

  const handleContribute = async () => {
    if (!selectedSaving) return;
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setContributing(true);
    const amountNum = parseFloat(contributionAmount);
    const newBalance = selectedSaving.balance + amountNum;

    const { error } = await supabase
      .from('user_savings')
      .update({ balance: newBalance })
      .eq('id', selectedSaving.id);

    if (error) {
      Alert.alert('Error', 'Failed to add contribution');
    } else {
      Alert.alert('Success', `₦${amountNum.toLocaleString()} added to your savings!`);
      setSelectedSaving(null);
      setContributionAmount('');
      loadData();
    }
    setContributing(false);
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

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
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
        <Text style={styles.headerTitle}>Savings</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Active Savings */}
        {userSavings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Savings Plans</Text>
            {userSavings.map((saving) => {
              const product = products.find(p => p.id === saving.product_id);
              const progress = getProgressPercentage(saving.balance, saving.target_amount);
              const daysLeft = Math.ceil((new Date(saving.maturity_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <View key={saving.id} style={styles.savingCard}>
                  <View style={styles.savingHeader}>
                    <View>
                      <Text style={styles.savingName}>{product?.name || 'Savings Plan'}</Text>
                      <Text style={styles.savingRate}>{product?.interest_rate}% p.a</Text>
                    </View>
                    <View style={[styles.statusBadge, saving.status === 'active' ? styles.statusActive : styles.statusCompleted]}>
                      <Text style={styles.statusText}>{saving.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.savingBalance}>{formatCurrency(saving.balance)}</Text>
                  <Text style={styles.savingTarget}>Target: {formatCurrency(saving.target_amount)}</Text>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{progress.toFixed(0)}% complete</Text>
                  </View>
                  
                  <View style={styles.savingFooter}>
                    <Text style={styles.savingDate}>
                      {daysLeft > 0 ? `${daysLeft} days left` : 'Matured'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.contributeButton}
                      onPress={() => {
                        setSelectedSaving(saving);
                        setContributionAmount('');
                      }}
                    >
                      <Text style={styles.contributeButtonText}>Add Funds</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Savings Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Savings Plans</Text>
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => {
                setSelectedProduct(product);
                setAmount('');
                setShowProductModal(true);
              }}
            >
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productRate}>{product.interest_rate}% p.a</Text>
              </View>
              <Text style={styles.productDesc}>{product.description}</Text>
              <View style={styles.productFooter}>
                <Text style={styles.productMin}>Min: {formatCurrency(product.min_deposit)}</Text>
                <Text style={styles.productDuration}>{product.duration_days} days</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={24} color="#f59e0b" />
          <Text style={styles.tipsTitle}>Savings Tip</Text>
          <Text style={styles.tipsText}>
            Save at least 20% of your monthly income. Start small, stay consistent!
          </Text>
        </View>
      </ScrollView>

      {/* Product Selection Modal */}
          <Modal visible={selectedProduct !== null && !showConfirmModal} transparent animationType="slide">
          <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start {selectedProduct?.name}</Text>
            <Text style={styles.modalSubtitle}>Minimum deposit: {formatCurrency(selectedProduct?.min_deposit || 0)}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            
            {selectedProduct && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Expected Returns:</Text>
                <Text style={styles.previewValue}>
                  +{formatCurrency((parseFloat(amount) * selectedProduct.interest_rate) / 100)}
                </Text>
                <Text style={styles.previewNote}>after {selectedProduct.duration_days} days</Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleStartSaving}
              >
                <Text style={styles.confirmModalText}>Start Saving</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Start Savings Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.confirmModalContent}>
            <Ionicons name="alert-circle" size={48} color="#f59e0b" />
            <Text style={styles.modalTitle}>Confirm Savings</Text>
            <Text style={styles.modalText}>
              Start saving ₦{parseFloat(amount).toLocaleString()} in {selectedProduct?.name}?
            </Text>
            <Text style={styles.modalSubtext}>
              Interest rate: {selectedProduct?.interest_rate}% p.a
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={confirmStartSaving}
              >
                <Text style={styles.confirmModalText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contribute Modal */}
      <Modal visible={!!selectedSaving} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to Savings</Text>
            <Text style={styles.modalSubtitle}>
              Current balance: {formatCurrency(selectedSaving?.balance || 0)}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount to add"
              keyboardType="numeric"
              value={contributionAmount}
              onChangeText={setContributionAmount}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setSelectedSaving(null);
                  setContributionAmount('');
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleContribute}
                disabled={contributing}
              >
                {contributing ? <ActivityIndicator color="white" /> : <Text style={styles.confirmModalText}>Add Funds</Text>}
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
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  savingCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  savingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  savingName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  savingRate: { fontSize: 12, color: '#10b981', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: '#d1fae5' },
  statusCompleted: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: '600' },
  savingBalance: { fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  savingTarget: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  progressContainer: { marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },
  progressText: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  savingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  savingDate: { fontSize: 12, color: '#6b7280' },
  contributeButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  contributeButtonText: { color: 'white', fontSize: 12, fontWeight: '500' },
  productCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  productRate: { fontSize: 14, fontWeight: '600', color: '#10b981' },
  productDesc: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  productMin: { fontSize: 12, color: '#6b7280' },
  productDuration: { fontSize: 12, color: '#6b7280' },
  tipsCard: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 40 },
  tipsTitle: { fontSize: 16, fontWeight: '600', color: '#92400e', marginTop: 8 },
  tipsText: { fontSize: 14, color: '#92400e', marginTop: 4 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%' },
  confirmModalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  modalText: { fontSize: 16, color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  modalSubtext: { fontSize: 14, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 20 },
  previewContainer: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 20 },
  previewLabel: { fontSize: 12, color: '#6b7280' },
  previewValue: { fontSize: 18, fontWeight: 'bold', color: '#10b981', marginTop: 4 },
  previewNote: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#f3f4f6' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { backgroundColor: '#2563eb' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});