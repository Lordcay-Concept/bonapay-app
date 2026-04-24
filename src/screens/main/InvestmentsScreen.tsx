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

interface InvestmentProduct {
  id: string;
  name: string;
  expected_return: number;
  min_investment: number;
  max_investment: number;
  duration_days: number;
  risk_level: 'low' | 'medium' | 'high';
  description: string;
}

interface UserInvestment {
  id: string;
  product_id: string;
  product_name: string;
  amount: number;
  expected_return_amount: number;
  start_date: string;
  maturity_date: string;
  status: 'active' | 'matured' | 'withdrawn';
}

export default function InvestmentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'portfolio'>('products');
  const [products, setProducts] = useState<InvestmentProduct[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<InvestmentProduct | null>(null);
  const [amount, setAmount] = useState('');
  const [investing, setInvesting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    // Load products
    const { data: productsData } = await supabase
      .from('investment_products')
      .select('*')
      .eq('is_active', true);
    
    setProducts(productsData || []);

    // Load user's investments
    const { data: investmentsData } = await supabase
      .from('user_investments')
      .select('*, investment_products(name)')
      .eq('user_id', user.id);
    
    const formatted = (investmentsData || []).map((inv: any) => ({
      ...inv,
      product_name: inv.investment_products?.name,
    }));
    setInvestments(formatted);
    setLoading(false);
  };

  const handleInvest = async () => {
    if (!selectedProduct) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < selectedProduct.min_investment) {
      Alert.alert('Error', `Minimum investment is ₦${selectedProduct.min_investment.toLocaleString()}`);
      return;
    }
    if (amountNum > selectedProduct.max_investment) {
      Alert.alert('Error', `Maximum investment is ₦${selectedProduct.max_investment.toLocaleString()}`);
      return;
    }

    setInvesting(true);
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + selectedProduct.duration_days);
    
    const { error } = await supabase
      .from('user_investments')
      .insert({
        user_id: user?.id,
        product_id: selectedProduct.id,
        amount: amountNum,
        expected_return_amount: (amountNum * selectedProduct.expected_return) / 100,
        start_date: new Date().toISOString(),
        maturity_date: maturityDate.toISOString(),
        status: 'active',
      });

    if (error) {
      Alert.alert('Error', 'Failed to create investment');
    } else {
      Alert.alert('Success', 'Investment created successfully!');
      setSelectedProduct(null);
      setAmount('');
      loadData();
    }
    setInvesting(false);
  };

  const handleWithdraw = async (investmentId: string) => {
    Alert.alert('Withdraw', 'Are you sure you want to withdraw?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('user_investments')
            .update({ status: 'withdrawn' })
            .eq('id', investmentId);
          
          if (!error) {
            Alert.alert('Success', 'Investment withdrawn');
            loadData();
          }
        }
      }
    ]);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
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
        <Text style={styles.headerTitle}>Investments</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'portfolio' && styles.tabActive]}
          onPress={() => setActiveTab('portfolio')}
        >
          <Text style={[styles.tabText, activeTab === 'portfolio' && styles.tabTextActive]}>Portfolio</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'products' ? (
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <View style={[styles.riskBadge, { backgroundColor: getRiskColor(product.risk_level) + '20' }]}>
                    <Text style={[styles.riskText, { color: getRiskColor(product.risk_level) }]}>
                      {product.risk_level.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.productReturn}>{product.expected_return}% expected return</Text>
                <Text style={styles.productDesc}>{product.description}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productMin}>Min: {formatCurrency(product.min_investment)}</Text>
                  <Text style={styles.productDuration}>{product.duration_days} days</Text>
                </View>
                <TouchableOpacity 
                  style={styles.investButton}
                  onPress={() => {
                    setSelectedProduct(product);
                    setAmount('');
                  }}
                >
                  <Text style={styles.investButtonText}>Invest Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View>
            {investments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No investments yet</Text>
                <TouchableOpacity 
                  style={styles.exploreButton}
                  onPress={() => setActiveTab('products')}
                >
                  <Text style={styles.exploreButtonText}>Explore Plans</Text>
                </TouchableOpacity>
              </View>
            ) : (
              investments.map((investment) => (
                <View key={investment.id} style={styles.investmentCard}>
                  <View style={styles.investmentHeader}>
                    <Text style={styles.investmentName}>{investment.product_name}</Text>
                    <View style={[styles.statusBadge, investment.status === 'active' ? styles.statusActive : styles.statusMatured]}>
                      <Text style={styles.statusText}>{investment.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.investmentAmount}>{formatCurrency(investment.amount)}</Text>
                  <View style={styles.investmentDetails}>
                    <Text style={styles.detailText}>Expected: {formatCurrency(investment.expected_return_amount)}</Text>
                    <Text style={styles.detailText}>Matures: {formatDate(investment.maturity_date)}</Text>
                  </View>
                  {investment.status === 'active' && new Date(investment.maturity_date) <= new Date() && (
                    <TouchableOpacity 
                      style={styles.withdrawButton}
                      onPress={() => handleWithdraw(investment.id)}
                    >
                      <Text style={styles.withdrawButtonText}>Withdraw</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Investment Modal */}
      <Modal visible={!!selectedProduct} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invest in {selectedProduct?.name}</Text>
            <Text style={styles.modalSubtitle}>Min: {formatCurrency(selectedProduct?.min_investment || 0)}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            
            {amount && selectedProduct && (
              <View style={styles.returnsPreview}>
                <Text style={styles.returnsLabel}>Expected Returns:</Text>
                <Text style={styles.returnsValue}>
                  +{formatCurrency((parseFloat(amount) * selectedProduct.expected_return) / 100)}
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setSelectedProduct(null)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleInvest}
                disabled={investing}
              >
                {investing ? <ActivityIndicator color="white" /> : <Text style={styles.confirmModalText}>Invest</Text>}
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
  tabBar: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { paddingVertical: 12, paddingHorizontal: 20, marginRight: 16 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 14, color: '#6b7280' },
  tabTextActive: { color: '#2563eb', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  productsGrid: { gap: 16 },
  productCard: { backgroundColor: 'white', borderRadius: 16, padding: 16 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 10, fontWeight: '600' },
  productReturn: { fontSize: 14, fontWeight: '600', color: '#10b981', marginBottom: 8 },
  productDesc: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  productMin: { fontSize: 12, color: '#6b7280' },
  productDuration: { fontSize: 12, color: '#6b7280' },
  investButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  investButtonText: { color: 'white', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  exploreButton: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  exploreButtonText: { color: 'white', fontWeight: '600' },
  investmentCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  investmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  investmentName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: '#d1fae5' },
  statusMatured: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 10, fontWeight: '600' },
  investmentAmount: { fontSize: 20, fontWeight: 'bold', color: '#2563eb', marginBottom: 8 },
  investmentDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailText: { fontSize: 12, color: '#6b7280' },
  withdrawButton: { backgroundColor: '#fee2e2', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  withdrawButtonText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  returnsPreview: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  returnsLabel: { fontSize: 12, color: '#6b7280' },
  returnsValue: { fontSize: 16, fontWeight: 'bold', color: '#10b981', marginTop: 4 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#f3f4f6' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { backgroundColor: '#2563eb' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});