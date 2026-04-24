import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SpendingSummary {
  total_spent: number;
  total_received: number;
  net_flow: number;
  compared_to_last_month: number;
  daily_average: number;
  weekly_average: number;
  biggest_spending_day: { day: string; amount: number };
  top_categories: Array<{ category: string; amount: number; percentage: number }>;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  type: string;
  impact: string;
  amount?: number;
  category?: string;
}

export default function InsightsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'insights' | 'analytics'>('insights');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<SpendingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;

    // Get transactions from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (transactions) {
      const spent = transactions.filter(tx => tx.type === 'debit').reduce((s, tx) => s + tx.amount, 0);
      const received = transactions.filter(tx => tx.type === 'credit').reduce((s, tx) => s + tx.amount, 0);
      
      // Calculate category spending
      const categoryMap = new Map();
      transactions.forEach(tx => {
        if (tx.type === 'debit') {
          const cat = tx.category || 'Other';
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + tx.amount);
        }
      });
      
      const topCategories = Array.from(categoryMap.entries())
        .map(([name, amount]) => ({ category: name, amount: amount as number, percentage: ((amount as number) / spent) * 100 }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4);
      
      setSummary({
        total_spent: spent,
        total_received: received,
        net_flow: received - spent,
        compared_to_last_month: -5.2,
        daily_average: spent / 30,
        weekly_average: spent / 4,
        biggest_spending_day: { day: 'Saturday', amount: 25000 },
        top_categories: topCategories,
      });
    }

    // Mock insights
    setInsights([
      {
        id: '1',
        title: 'High Dining Expenses',
        description: 'Your food and dining expenses are 35% higher than last month.',
        type: 'trend',
        impact: 'negative',
        amount: 45000,
        category: 'Food',
      },
      {
        id: '2',
        title: 'Savings Opportunity',
        description: 'You could save ₦15,000 monthly by reducing subscription services.',
        type: 'saving_opportunity',
        impact: 'positive',
        amount: 15000,
      },
    ]);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return '#10b981';
      case 'negative': return '#ef4444';
      default: return '#2563eb';
    }
  };

  const getImpactBg = (impact: string) => {
    switch (impact) {
      case 'positive': return '#d1fae5';
      case 'negative': return '#fee2e2';
      default: return '#eff6ff';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return 'trending-up';
      case 'anomaly': return 'alert-circle';
      case 'saving_opportunity': return 'bulb';
      default: return 'stats-chart';
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
        <Text style={styles.headerTitle}>Spending Insights</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
          onPress={() => setActiveTab('insights')}
        >
          <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>AI Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>Analytics</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'insights' ? (
          <View>
            {insights.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bulb-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No insights yet</Text>
                <Text style={styles.emptySubtext}>Make transactions to get personalized insights</Text>
              </View>
            ) : (
              insights.map((insight) => (
                <View key={insight.id} style={[styles.insightCard, { backgroundColor: getImpactBg(insight.impact) }]}>
                  <View style={styles.insightHeader}>
                    <Ionicons name={getInsightIcon(insight.type)} size={24} color={getImpactColor(insight.impact)} />
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <View style={[styles.impactBadge, { backgroundColor: getImpactColor(insight.impact) + '20' }]}>
                      <Text style={[styles.impactText, { color: getImpactColor(insight.impact) }]}>
                        {insight.impact.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.insightDesc}>{insight.description}</Text>
                  {insight.amount && (
                    <Text style={styles.insightAmount}>Amount: {formatCurrency(insight.amount)}</Text>
                  )}
                  {insight.category && (
                    <Text style={styles.insightCategory}>Category: {insight.category}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            {summary && (
              <>
                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Spent</Text>
                    <Text style={styles.summaryAmountRed}>{formatCurrency(summary.total_spent)}</Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Received</Text>
                    <Text style={styles.summaryAmountGreen}>{formatCurrency(summary.total_received)}</Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Net Flow</Text>
                    <Text style={[styles.summaryAmount, summary.net_flow >= 0 ? styles.green : styles.red]}>
                      {formatCurrency(summary.net_flow)}
                    </Text>
                  </View>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>vs Last Month</Text>
                    <Text style={[styles.summaryAmount, summary.compared_to_last_month <= 0 ? styles.green : styles.red]}>
                      {summary.compared_to_last_month > 0 ? '+' : ''}{summary.compared_to_last_month}%
                    </Text>
                  </View>
                </View>

                {/* Top Categories */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Spending by Category</Text>
                  {summary.top_categories.map((cat, idx) => (
                    <View key={idx} style={styles.categoryItem}>
                      <View style={styles.categoryHeader}>
                        <Text style={styles.categoryName}>{cat.category}</Text>
                        <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${cat.percentage}%`, backgroundColor: getCategoryColor(idx) }]} />
                      </View>
                      <Text style={styles.categoryPercent}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  ))}
                </View>

                {/* Daily & Weekly Averages */}
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Ionicons name="calendar" size={24} color="#2563eb" />
                    <Text style={styles.statValue}>{formatCurrency(summary.daily_average)}</Text>
                    <Text style={styles.statLabel}>Daily Average</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="bar-chart" size={24} color="#2563eb" />
                    <Text style={styles.statValue}>{formatCurrency(summary.weekly_average)}</Text>
                    <Text style={styles.statLabel}>Weekly Average</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="trending-up" size={24} color="#2563eb" />
                    <Text style={styles.statValue}>{summary.biggest_spending_day.day}</Text>
                    <Text style={styles.statLabel}>Biggest Day</Text>
                    <Text style={styles.statSubtext}>{formatCurrency(summary.biggest_spending_day.amount)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getCategoryColor = (index: number): string => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  return colors[index % colors.length];
};

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
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  emptySubtext: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  insightCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1f2937' },
  impactBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  impactText: { fontSize: 10, fontWeight: '600' },
  insightDesc: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  insightAmount: { fontSize: 12, color: '#4b5563', marginBottom: 4 },
  insightCategory: { fontSize: 12, color: '#4b5563' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, minWidth: '45%', backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  summaryAmount: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  summaryAmountRed: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
  summaryAmountGreen: { fontSize: 18, fontWeight: 'bold', color: '#10b981' },
  green: { color: '#10b981' },
  red: { color: '#ef4444' },
  sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  categoryItem: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryName: { fontSize: 14, color: '#4b5563' },
  categoryAmount: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  categoryPercent: { fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#2563eb', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  statSubtext: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
});