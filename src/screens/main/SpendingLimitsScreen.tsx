import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SpendingLimits {
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  daily_spent: number;
  weekly_spent: number;
  monthly_spent: number;
}

export default function SpendingLimitsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [limits, setLimits] = useState<SpendingLimits>({
    daily_limit: 1000000,
    weekly_limit: 5000000,
    monthly_limit: 20000000,
    daily_spent: 0,
    weekly_spent: 0,
    monthly_spent: 0,
  });
  const [editing, setEditing] = useState(false);
  const [newLimits, setNewLimits] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    if (!user) return;
    
    const { data: account } = await supabase
      .from('accounts')
      .select('daily_transaction_limit, weekly_transaction_limit, monthly_transaction_limit, daily_spent, weekly_spent, monthly_spent')
      .eq('user_id', user.id)
      .single();

    if (account) {
      setLimits({
        daily_limit: account.daily_transaction_limit || 1000000,
        weekly_limit: account.weekly_transaction_limit || 5000000,
        monthly_limit: account.monthly_transaction_limit || 20000000,
        daily_spent: account.daily_spent || 0,
        weekly_spent: account.weekly_spent || 0,
        monthly_spent: account.monthly_spent || 0,
      });
      setNewLimits({
        daily: account.daily_transaction_limit || 1000000,
        weekly: account.weekly_transaction_limit || 5000000,
        monthly: account.monthly_transaction_limit || 20000000,
      });
    }
    setLoading(false);
  };

  const updateLimits = async () => {
    const { error } = await supabase
      .from('accounts')
      .update({
        daily_transaction_limit: newLimits.daily,
        weekly_transaction_limit: newLimits.weekly,
        monthly_transaction_limit: newLimits.monthly,
      })
      .eq('user_id', user?.id);

    if (error) {
      Alert.alert('Error', 'Failed to update limits');
    } else {
      Alert.alert('Success', 'Spending limits updated');
      setEditing(false);
      loadLimits();
    }
  };

  const getProgressColor = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spending Limits</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Daily Limit */}
        <View style={styles.limitCard}>
          <View style={styles.limitHeader}>
            <Ionicons name="today" size={24} color="#3b82f6" />
            <Text style={styles.limitTitle}>Daily Limit</Text>
            <Text style={styles.limitSpent}>{formatCurrency(limits.daily_spent)} spent today</Text>
          </View>
          <Text style={styles.limitValue}>{formatCurrency(limits.daily_limit)}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(limits.daily_spent / limits.daily_limit) * 100}%`, backgroundColor: getProgressColor(limits.daily_spent, limits.daily_limit) }]} />
            </View>
            <Text style={styles.progressText}>{((limits.daily_spent / limits.daily_limit) * 100).toFixed(1)}% used</Text>
          </View>
          {limits.daily_spent > limits.daily_limit && (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.warningText}>You've exceeded your daily limit by {formatCurrency(limits.daily_spent - limits.daily_limit)}</Text>
            </View>
          )}
        </View>

        {/* Weekly Limit */}
        <View style={styles.limitCard}>
          <View style={styles.limitHeader}>
            <Ionicons name="calendar" size={24} color="#10b981" />
            <Text style={styles.limitTitle}>Weekly Limit</Text>
            <Text style={styles.limitSpent}>{formatCurrency(limits.weekly_spent)} spent this week</Text>
          </View>
          <Text style={styles.limitValue}>{formatCurrency(limits.weekly_limit)}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(limits.weekly_spent / limits.weekly_limit) * 100}%`, backgroundColor: getProgressColor(limits.weekly_spent, limits.weekly_limit) }]} />
            </View>
            <Text style={styles.progressText}>{((limits.weekly_spent / limits.weekly_limit) * 100).toFixed(1)}% used</Text>
          </View>
        </View>

        {/* Monthly Limit */}
        <View style={styles.limitCard}>
          <View style={styles.limitHeader}>
            <Ionicons name="calendar-number" size={24} color="#f59e0b" />
            <Text style={styles.limitTitle}>Monthly Limit</Text>
            <Text style={styles.limitSpent}>{formatCurrency(limits.monthly_spent)} spent this month</Text>
          </View>
          <Text style={styles.limitValue}>{formatCurrency(limits.monthly_limit)}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(limits.monthly_spent / limits.monthly_limit) * 100}%`, backgroundColor: getProgressColor(limits.monthly_spent, limits.monthly_limit) }]} />
            </View>
            <Text style={styles.progressText}>{((limits.monthly_spent / limits.monthly_limit) * 100).toFixed(1)}% used</Text>
          </View>
        </View>

        {/* Edit Limits Card */}
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Customize Your Limits</Text>
          <Text style={styles.editSubtitle}>Set limits that work for your budget</Text>
          
          {!editing ? (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit Limits</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Daily Limit (₦)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newLimits.daily.toString()}
                  onChangeText={(text) => setNewLimits({ ...newLimits, daily: parseFloat(text) || 0 })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weekly Limit (₦)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newLimits.weekly.toString()}
                  onChangeText={(text) => setNewLimits({ ...newLimits, weekly: parseFloat(text) || 0 })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Monthly Limit (₦)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newLimits.monthly.toString()}
                  onChangeText={(text) => setNewLimits({ ...newLimits, monthly: parseFloat(text) || 0 })}
                />
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelEditButton} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveEditButton} onPress={updateLimits}>
                  <Text style={styles.saveEditText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
  limitCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16 },
  limitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  limitTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1f2937' },
  limitSpent: { fontSize: 12, color: '#6b7280' },
  limitValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginBottom: 12 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBar: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#6b7280' },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginTop: 12 },
  warningText: { flex: 1, fontSize: 12, color: '#ef4444' },
  editCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 40 },
  editTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  editSubtitle: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
  editButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  editButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelEditButton: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelEditText: { color: '#6b7280', fontWeight: '500' },
  saveEditButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveEditText: { color: 'white', fontWeight: '500' },
});