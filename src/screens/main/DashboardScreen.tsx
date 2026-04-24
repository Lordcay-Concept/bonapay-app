import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [spendingByCategory, setSpendingByCategory] = useState<any[]>([]);
  const [weeklySpending, setWeeklySpending] = useState<any[]>([]);
  const [showBalance, setShowBalance] = useState(true);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const addDemoFunds = async () => {
    if (!user) return;
    const amount = 10000;
    
    const { data: account } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    if (account) {
      const newBalance = account.balance + amount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('user_id', user.id);
      
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'credit',
        amount: amount,
        description: 'Demo Funds Added',
        reference: 'DEMO_' + Date.now(),
        status: 'completed',
      });
      
      setBalance(newBalance);
      Alert.alert('Success', `₦${amount.toLocaleString()} added to your account!`);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const { data: account } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (account) setBalance(account.balance);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (transactions && transactions.length > 0) {
        setRecentTransactions(transactions.slice(0, 5));
        
        const spent = transactions
          .filter(tx => tx.type === 'debit')
          .reduce((sum, tx) => sum + tx.amount, 0);
        const received = transactions
          .filter(tx => tx.type === 'credit')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        setTotalSpent(spent);
        setTotalReceived(received);

        const categoryMap = new Map();
        transactions.forEach(tx => {
          if (tx.type === 'debit') {
            const category = tx.category || 'Other';
            categoryMap.set(category, (categoryMap.get(category) || 0) + tx.amount);
          }
        });
        
        const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
          name,
          value,
          color: getCategoryColor(name),
          percentage: spent > 0 ? (value / spent) * 100 : 0,
        }));
        setSpendingByCategory(categoryData);

        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyMap = new Map(weekDays.map(day => [day, 0]));
        
        transactions.forEach(tx => {
          if (tx.type === 'debit') {
            const day = weekDays[new Date(tx.created_at).getDay()];
            weeklyMap.set(day, (weeklyMap.get(day) || 0) + tx.amount);
          }
        });
        
        const maxSpending = Math.max(...weeklyMap.values()) || 1;
        const weeklyData = weekDays.map(day => ({
          label: day,
          value: weeklyMap.get(day) || 0,
          height: ((weeklyMap.get(day) || 0) / maxSpending) * 60,
        }));
        setWeeklySpending(weeklyData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      Food: '#3B82F6',
      Transport: '#10B981',
      Bills: '#F59E0B',
      Shopping: '#EF4444',
      Entertainment: '#8B5CF6',
      Utilities: '#06B6D4',
      Education: '#EC4899',
      Health: '#14B8A6',
      Other: '#6B7280',
    };
    return colors[category] || colors.Other;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const goToTransactionDetail = (transactionId: string) => {
  (navigation as any).navigate('TransactionDetail', { transactionId });
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
      }
    >
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BonaPay</Text>
          <TouchableOpacity onPress={addDemoFunds} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>
              {showBalance ? formatCurrency(balance) : '••••••'}
            </Text>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.eyeButton}>
              <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={22} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.accountText}>Total Balance</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Spent</Text>
          <Text style={styles.statValueSpent}>{formatCurrency(totalSpent)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Received</Text>
          <Text style={styles.statValueReceived}>{formatCurrency(totalReceived)}</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('SendMoney' as never)}
        >
          <Ionicons name="send" size={24} color="#2563eb" />
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Cards' as never)}
        >
          <Ionicons name="card" size={24} color="#2563eb" />
          <Text style={styles.actionText}>Cards</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Bills' as never)}
        >
          <Ionicons name="flash" size={24} color="#2563eb" />
          <Text style={styles.actionText}>Bills</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('QRPayment' as never)}
        >
          <Ionicons name="qr-code" size={24} color="#2563eb" />
          <Text style={styles.actionText}>QR</Text>
        </TouchableOpacity>
      </View>

      {spendingByCategory.length > 0 && totalSpent > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          {spendingByCategory.slice(0, 5).map((category, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(category.value)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(category.percentage, 100)}%`, backgroundColor: category.color }]} />
              </View>
              <Text style={styles.categoryPercent}>{category.percentage.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      )}

      {weeklySpending.length > 0 && (
        <View style={styles.weeklySection}>
          <Text style={styles.sectionTitle}>Weekly Spending</Text>
          <View style={styles.weeklyRow}>
            {weeklySpending.map((day, index) => (
              <View key={index} style={styles.weeklyItem}>
                <View style={[styles.weeklyBar, { height: Math.max(day.height, 4) }]} />
                <Text style={styles.weeklyLabel}>{day.label}</Text>
                <Text style={styles.weeklyValue}>{formatCurrency(day.value)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions' as never)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Your transactions will appear here</Text>
          </View>
        ) : (
          recentTransactions.map((transaction) => (
            <TouchableOpacity 
                    key={transaction.id} 
                    style={styles.transactionCard}
                    onPress={() => goToTransactionDetail(transaction.id)}
                  >
              <View style={styles.transactionLeft}>
                <View style={[styles.transactionIcon, { backgroundColor: transaction.type === 'credit' ? '#d1fae5' : '#fee2e2' }]}>
                  <Ionicons 
                    name={transaction.type === 'credit' ? 'arrow-down' : 'arrow-up'} 
                    size={20} 
                    color={transaction.type === 'credit' ? '#10b981' : '#ef4444'} 
                  />
                </View>
                <View>
                  <Text style={styles.transactionTitle}>{transaction.description || (transaction.type === 'credit' ? 'Money Received' : 'Money Sent')}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                </View>
              </View>
              <Text 
                style={[
                  styles.transactionAmount,
                  transaction.type === 'credit' ? styles.amountPositive : styles.amountNegative
                ]}
              >
                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  menuButton: { padding: 8 },
  addButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  balanceContainer: { alignItems: 'center' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyeButton: { padding: 4 },
  welcomeText: { fontSize: 14, color: '#bfdbfe', marginBottom: 8 },
  balanceText: { fontSize: 36, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  accountText: { fontSize: 12, color: '#bfdbfe' },
  statsRow: { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 16, marginTop: -20, borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statCard: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValueSpent: { fontSize: 18, fontWeight: 'bold', color: '#ef4444', marginTop: 4 },
  statValueReceived: { fontSize: 18, fontWeight: 'bold', color: '#10b981', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: 16 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 24 },
  actionButton: { backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionText: { marginTop: 8, fontSize: 12, color: '#4b5563' },
  categorySection: { backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 16 },
  weeklySection: { backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  viewAllText: { fontSize: 12, color: '#2563eb' },
  categoryItem: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 14, fontWeight: '500', color: '#4b5563' },
  categoryAmount: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  categoryPercent: { fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  weeklyRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  weeklyItem: { alignItems: 'center', width: 40 },
  weeklyBar: { width: 24, backgroundColor: '#2563eb', borderRadius: 4, marginBottom: 8 },
  weeklyLabel: { fontSize: 10, color: '#6b7280' },
  weeklyValue: { fontSize: 8, color: '#9ca3af', marginTop: 2, textAlign: 'center' },
  recentSection: { marginHorizontal: 16, marginBottom: 40 },
  transactionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  transactionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  transactionTitle: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  transactionDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '600' },
  amountPositive: { color: '#10b981' },
  amountNegative: { color: '#ef4444' },
  emptyState: { backgroundColor: 'white', padding: 40, borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14, marginTop: 12 },
  emptySubtext: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
});