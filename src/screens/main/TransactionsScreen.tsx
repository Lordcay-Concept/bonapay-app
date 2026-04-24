import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  recipient_name?: string;
  recipient_account?: string;
  category?: string;
}

export default function TransactionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filter, searchQuery, selectedCategory]);

  const loadTransactions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    setTransactions(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filter !== 'all') {
      filtered = filtered.filter(tx => tx.type === filter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query) ||
        tx.recipient_name?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tx => tx.category === selectedCategory);
    }

    setFilteredTransactions(filtered);
  };

  // Calculate stats for analytics
  const totalSpent = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalReceived = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  
  // Calculate category spending
  const categoryMap = new Map();
  transactions.forEach(tx => {
    if (tx.type === 'debit') {
      const cat = tx.category || 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + tx.amount);
    }
  });
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount, percentage: (amount as number / totalSpent) * 100 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
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
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const categories = ['all', 'transfer', 'bill_payment', 'airtime', 'data', 'cable_tv', 'betting', 'savings', 'investment'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={() => setShowAnalytics(true)} style={styles.analyticsButton}>
          <Ionicons name="stats-chart" size={22} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by description or reference"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'credit' && styles.filterTabActive]}
          onPress={() => setFilter('credit')}
        >
          <Text style={[styles.filterText, filter === 'credit' && styles.filterTextActive]}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'debit' && styles.filterTabActive]}
          onPress={() => setFilter('debit')}
        >
          <Text style={[styles.filterText, filter === 'debit' && styles.filterTextActive]}>Expenses</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
              {cat === 'all' ? 'All' : cat.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transactions List - Takes most of the screen */}
      <ScrollView
        style={styles.transactionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>Your transactions will appear here</Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              style={styles.transactionCard}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
            >
              <View style={styles.transactionLeft}>
                <View style={[styles.transactionIcon, { backgroundColor: transaction.type === 'credit' ? '#d1fae5' : '#fee2e2' }]}>
                  <Ionicons
                    name={transaction.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={transaction.type === 'credit' ? '#10b981' : '#ef4444'}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionTitle}>
                    {transaction.description || (transaction.type === 'credit' ? 'Money Received' : 'Money Sent')}
                  </Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                  <View style={styles.referenceContainer}>
                    <Text style={styles.referenceText}>Ref: {transaction.reference?.slice(0, 8)}...</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                        {transaction.status?.toUpperCase() || 'COMPLETED'}
                      </Text>
                    </View>
                  </View>
                  {transaction.recipient_name && (
                    <Text style={styles.recipientText}>To: {transaction.recipient_name}</Text>
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'credit' ? styles.creditAmount : styles.debitAmount,
                ]}
              >
                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Analytics Modal - Charts in a separate modal */}
      <Modal visible={showAnalytics} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Spending Analytics</Text>
              <TouchableOpacity onPress={() => setShowAnalytics(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Summary Cards */}
              <View style={styles.analyticsSummary}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Spent</Text>
                  <Text style={styles.summaryAmountRed}>{formatCurrency(totalSpent)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Received</Text>
                  <Text style={styles.summaryAmountGreen}>{formatCurrency(totalReceived)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Net Flow</Text>
                  <Text style={[styles.summaryAmount, totalReceived >= totalSpent ? styles.green : styles.red]}>
                    {formatCurrency(totalReceived - totalSpent)}
                  </Text>
                </View>
              </View>

              {/* Spending by Category */}
              {categoryData.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={styles.sectionTitle}>Spending by Category</Text>
                  {categoryData.map((cat, idx) => (
                    <View key={idx} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>{cat.name}</Text>
                        <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${cat.percentage}%` }]} />
                      </View>
                      <Text style={styles.categoryPercent}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.analyticsInfo}>
                <Ionicons name="information-circle" size={20} color="#2563eb" />
                <Text style={styles.analyticsInfoText}>
                  Based on your transaction history from the last 30 days
                </Text>
              </View>
            </ScrollView>
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
  analyticsButton: { padding: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 },
  filterTabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  filterTabActive: { backgroundColor: '#2563eb' },
  filterText: { fontSize: 14, color: '#6b7280' },
  filterTextActive: { color: 'white' },
  categoryTabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  categoryTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 8 },
  categoryTabActive: { backgroundColor: '#2563eb' },
  categoryText: { fontSize: 12, color: '#6b7280' },
  categoryTextActive: { color: 'white' },
  transactionsList: { flex: 1, paddingHorizontal: 16 },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  transactionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  transactionDetails: { flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: '500', color: '#1f2937', marginBottom: 2 },
  transactionDate: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  referenceContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  referenceText: { fontSize: 10, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '600' },
  recipientText: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '600' },
  creditAmount: { color: '#10b981' },
  debitAmount: { color: '#ef4444' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '500', color: '#4b5563', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  analyticsSummary: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: '#6b7280', marginBottom: 4 },
  summaryAmount: { fontSize: 14, fontWeight: 'bold' },
  summaryAmountRed: { fontSize: 14, fontWeight: 'bold', color: '#ef4444' },
  summaryAmountGreen: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
  green: { color: '#10b981' },
  red: { color: '#ef4444' },
  categorySection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  categoryItem: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryName: { fontSize: 14, color: '#4b5563' },
  categoryAmount: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 4 },
  categoryPercent: { fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  analyticsInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, marginBottom: 20 },
  analyticsInfoText: { flex: 1, fontSize: 12, color: '#1e40af' },
});