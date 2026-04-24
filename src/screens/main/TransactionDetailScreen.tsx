import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface TransactionDetail {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  sender_name?: string;
  sender_account?: string;
  recipient_name?: string;
  recipient_account?: string;
  fee?: number;
  balance_after?: number;
}

export default function TransactionDetailScreen({ navigation, route }: any) {
  const { transactionId } = route.params;
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactionDetails();
  }, []);

  const loadTransactionDetails = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      Alert.alert('Error', 'Failed to load transaction details');
      navigation.goBack();
    } else {
      setTransaction(data);
    }
    setLoading(false);
  };

  const shareReceipt = async () => {
    if (!transaction) return;

    const message = `
BonaPay Transaction Receipt
━━━━━━━━━━━━━━━━━━━━━━
Transaction ID: ${transaction.reference}
Date: ${formatFullDate(transaction.created_at)}
Type: ${transaction.type.toUpperCase()}
Amount: ${formatCurrency(transaction.amount)}
Status: ${transaction.status.toUpperCase()}
Description: ${transaction.description}
${transaction.sender_name ? `From: ${transaction.sender_name}` : ''}
${transaction.recipient_name ? `To: ${transaction.recipient_name}` : ''}
━━━━━━━━━━━━━━━━━━━━━━
Thank you for using BonaPay!
    `;

    try {
      await Share.share({
        message: message,
        title: 'Transaction Receipt',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share receipt');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'failed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading transaction details...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Transaction not found</Text>
      </View>
    );
  }

  return (
        <View style={styles.container}>
          <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Transaction Details</Text>
      <TouchableOpacity onPress={shareReceipt} style={styles.shareButton}>
        <Ionicons name="share-outline" size={22} color="white" />
      </TouchableOpacity>
    </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
            <Ionicons name={getStatusIcon(transaction.status)} size={32} color={getStatusColor(transaction.status)} />
          </View>
          <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
            {transaction.status.toUpperCase()}
          </Text>
          <Text style={styles.amount}>
            {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
        </View>

        {/* Transaction Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Transaction Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transaction ID</Text>
            <Text style={styles.infoValue}>{transaction.reference}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatFullDate(transaction.created_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue}>{transaction.description}</Text>
          </View>
          
          {transaction.fee && transaction.fee > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fee</Text>
              <Text style={styles.infoValue}>{formatCurrency(transaction.fee)}</Text>
            </View>
          )}
          
          {transaction.balance_after !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Balance After</Text>
              <Text style={styles.infoValue}>{formatCurrency(transaction.balance_after)}</Text>
            </View>
          )}
        </View>

        {/* Party Information */}
        {(transaction.sender_name || transaction.recipient_name) && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Party Information</Text>
            
            {transaction.sender_name && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>From</Text>
                  <Text style={styles.infoValue}>{transaction.sender_name}</Text>
                </View>
                {transaction.sender_account && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Sender Account</Text>
                    <Text style={styles.infoValue}>{transaction.sender_account}</Text>
                  </View>
                )}
              </>
            )}
            
            {transaction.recipient_name && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>To</Text>
                  <Text style={styles.infoValue}>{transaction.recipient_name}</Text>
                </View>
                {transaction.recipient_account && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Recipient Account</Text>
                    <Text style={styles.infoValue}>{transaction.recipient_account}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineTitle}>Transaction Initiated</Text>
              <Text style={styles.timelineDate}>{formatDate(transaction.created_at)} at {formatTime(transaction.created_at)}</Text>
            </View>
          </View>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, transaction.status === 'completed' && styles.timelineDotCompleted]} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineTitle}>
                {transaction.status === 'completed' ? 'Transaction Completed' : 
                 transaction.status === 'pending' ? 'Processing' : 'Transaction Failed'}
              </Text>
              <Text style={styles.timelineDate}>
                {transaction.status === 'completed' ? 'Funds transferred successfully' :
                 transaction.status === 'pending' ? 'Awaiting confirmation' : 'Please contact support'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {transaction.status === 'pending' && (
            <TouchableOpacity style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel Transaction</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => {
              Alert.alert(
                'Report Issue',
                'Would you like to report an issue with this transaction?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Report', onPress: () => navigation.navigate('SupportTickets') }
                ]
              );
            }}
          >
            <Text style={styles.reportButtonText}>Report an Issue</Text>
          </TouchableOpacity>
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
  shareButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusText: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  amount: { fontSize: 32, fontWeight: 'bold', color: '#1f2937' },
  infoCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineLeft: { alignItems: 'center', marginRight: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#cbd5e1' },
  timelineDotCompleted: { backgroundColor: '#10b981' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginTop: 4 },
  timelineRight: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  timelineDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  actionButtons: { gap: 12, marginBottom: 40 },
  cancelButton: { backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
  reportButton: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  reportButtonText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
});