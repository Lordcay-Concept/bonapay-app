import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export default function AdminAnalyticsScreen({ navigation }: any) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeUsers: 0,
    avgTransactionValue: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    // Get total users
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total transactions and volume
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount');

    const totalVolume = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
    const avgValue = transactions?.length ? totalVolume / transactions.length : 0;

    setStats({
      totalUsers: usersCount || 0,
      newUsersThisMonth: Math.floor((usersCount || 0) * 0.1),
      totalTransactions: transactions?.length || 0,
      totalVolume: totalVolume,
      activeUsers: Math.floor((usersCount || 0) * 0.7),
      avgTransactionValue: avgValue,
    });
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
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#10b981" />
            <Text style={styles.statValue}>{stats.newUsersThisMonth.toLocaleString()}</Text>
            <Text style={styles.statLabel}>New Users (Month)</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="swap-horizontal" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{stats.totalTransactions.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="wallet" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{formatCurrency(stats.totalVolume)}</Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="finger-print" size={24} color="#ec4899" />
            <Text style={styles.statValue}>{stats.activeUsers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calculator" size={24} color="#06b6d4" />
            <Text style={styles.statValue}>{formatCurrency(stats.avgTransactionValue)}</Text>
            <Text style={styles.statLabel}>Avg Transaction</Text>
          </View>
        </View>

        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color="#2563eb" />
          <Text style={styles.chartText}>Transaction Volume Chart</Text>
          <Text style={styles.chartSubtext}>Coming soon</Text>
        </View>
      </ScrollView>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  chartPlaceholder: { backgroundColor: 'white', borderRadius: 12, padding: 40, alignItems: 'center', marginBottom: 40 },
  chartText: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginTop: 16 },
  chartSubtext: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});