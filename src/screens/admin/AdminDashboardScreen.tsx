import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    totalTransactions: 0,
    pendingKyc: 0,
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();

    const admin = profile?.is_admin === true || profile?.role === 'admin' || profile?.role === 'super_admin';
    
    if (!admin) {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      return;
    }
    
    setIsAdmin(true);
    loadAdminStats();
  };

  const loadAdminStats = async () => {
    try {
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total balance
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance');
      
      const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      // Get total transactions
      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      // Get pending KYC
      const { count: pendingKyc } = await supabase
        .from('kyc_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalUsers: usersCount || 0,
        totalBalance: totalBalance,
        totalTransactions: transactionsCount || 0,
        pendingKyc: pendingKyc || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (!isAdmin && !loading) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color="#ef4444" />
        <Text style={styles.accessDeniedText}>Access Denied</Text>
        <Text style={styles.accessDeniedSubtext}>You do not have admin privileges</Text>
      </View>
    );
  }

  const menuItems = [
    { title: 'Users', icon: 'people', count: stats.totalUsers, route: 'AdminUsers', color: '#3b82f6' },
    { title: 'KYC', icon: 'shield-checkmark', count: stats.pendingKyc, route: 'AdminKyc', color: '#f59e0b' },
    { title: 'Transactions', icon: 'swap-horizontal', count: stats.totalTransactions, route: 'AdminTransactions', color: '#10b981' },
    { title: 'Fraud', icon: 'alert-circle', route: 'AdminFraud', color: '#ef4444' },
    { title: 'Audit Logs', icon: 'document-text', route: 'AdminAuditLogs', color: '#8b5cf6' },
    { title: 'Support', icon: 'chatbubbles', route: 'AdminSupport', color: '#06b6d4' },
    { title: 'Health', icon: 'heart', route: 'AdminHealth', color: '#14b8a6' },
    { title: 'Analytics', icon: 'stats-chart', route: 'AdminAnalytics', color: '#6366f1' },
    { title: 'Settings', icon: 'settings', route: 'AdminSettings', color: '#6b7280' },
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadAdminStats} colors={['#2563eb']} />
      }
    >
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutIconButton}>
            <Ionicons name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Welcome back, Admin</Text>
      </LinearGradient>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#3b82f6" />
          <Text style={styles.statNumber}>{stats.totalUsers.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={24} color="#10b981" />
          <Text style={styles.statNumber}>{formatCurrency(stats.totalBalance)}</Text>
          <Text style={styles.statLabel}>Total Balance</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="swap-horizontal" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats.totalTransactions.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="shield-checkmark" size={24} color="#ef4444" />
          <Text style={styles.statNumber}>{stats.pendingKyc}</Text>
          <Text style={styles.statLabel}>Pending KYC</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            {item.count !== undefined && item.count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  accessDeniedText: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 16 },
  accessDeniedSubtext: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: '#bfdbfe' },
  logoutIconButton: { padding: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: -20, gap: 12 },
  statCard: { width: '47%', backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 16, paddingBottom: 40, gap: 12 },
  menuItem: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  menuIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuTitle: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});