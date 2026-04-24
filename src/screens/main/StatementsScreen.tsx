import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function StatementsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [toDate, setToDate] = useState(new Date());
  const [generating, setGenerating] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())
      .order('created_at', { ascending: false });
    
    setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, [fromDate, toDate]);

  const generateStatement = async () => {
    if (transactions.length === 0) {
      Alert.alert('No Transactions', 'There are no transactions in the selected date range.');
      return;
    }

    setGenerating(true);
    
    try {
      // Calculate summary
      const totalSpent = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
      const totalReceived = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      const netMovement = totalReceived - totalSpent;
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>BonaPay Account Statement</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica', Arial, sans-serif;
              padding: 40px;
              color: #333;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 2px;
            }
            .title {
              font-size: 18px;
              color: #666;
              margin-top: 8px;
            }
            .info-section {
              margin-bottom: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 12px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              padding: 4px 0;
            }
            .info-label {
              font-weight: 600;
              color: #555;
              font-size: 14px;
            }
            .info-value {
              color: #333;
              font-size: 14px;
            }
            h3 {
              font-size: 18px;
              margin-bottom: 15px;
              color: #2563eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 12px;
            }
            th {
              background-color: #2563eb;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              border-bottom: 1px solid #e5e7eb;
              padding: 10px;
            }
            .amount-positive {
              color: #10b981;
              font-weight: 600;
            }
            .amount-negative {
              color: #ef4444;
              font-weight: 600;
            }
            .summary {
              margin-top: 30px;
              padding: 20px;
              background: #f0fdf4;
              border-radius: 12px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 12px;
              padding: 4px 0;
            }
            .summary-label {
              font-weight: 600;
              color: #555;
            }
            .summary-value {
              font-weight: 700;
              font-size: 16px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 10px;
              color: #999;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">BonaPay</div>
            <div class="title">Account Statement</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Account Holder:</span>
              <span class="info-value">${user?.email || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Statement Period:</span>
              <span class="info-value">${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Generated On:</span>
              <span class="info-value">${new Date().toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Total Transactions:</span>
              <span class="info-value">${transactions.length}</span>
            </div>
          </div>
          
          <h3>Transaction History</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(tx => `
                <tr>
                  <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                  <td>${tx.description || '-'}</td>
                  <td>${tx.reference?.slice(0, 12) || '-'}</td>
                  <td>${tx.type === 'credit' ? 'Credit' : 'Debit'}</td>
                  <td class="${tx.type === 'credit' ? 'amount-positive' : 'amount-negative'}">
                    ${tx.type === 'credit' ? '+' : '-'}₦${tx.amount.toLocaleString()}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">Total Credits (Money In):</span>
              <span class="summary-value amount-positive">+₦${totalReceived.toLocaleString()}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Debits (Money Out):</span>
              <span class="summary-value amount-negative">-₦${totalSpent.toLocaleString()}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Net Movement:</span>
              <span class="summary-value ${netMovement >= 0 ? 'amount-positive' : 'amount-negative'}">
                ${netMovement >= 0 ? '+' : ''}₦${netMovement.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div class="footer">
            <p>This is a computer-generated statement. No signature is required.</p>
            <p>For any queries, please contact support@bonapay.com</p>
            <p>&copy; ${new Date().getFullYear()} BonaPay Digital Services Limited</p>
          </div>
        </body>
        </html>
      `;
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      
      // Share PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Account Statement',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
      
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate statement PDF');
    } finally {
      setGenerating(false);
    }
  };

  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    setFromDate(date);
    setToDate(new Date());
  };

  const setQuickMonth = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    setFromDate(date);
    setToDate(new Date());
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
        <Text style={styles.headerTitle}>Account Statements</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Date Range Selector */}
        <View style={styles.dateCard}>
          <Text style={styles.dateTitle}>Select Date Range</Text>
          
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              Alert.alert('Select Date Range', 'Choose a period', [
                { text: 'Last 7 days', onPress: () => setQuickDate(7) },
                { text: 'Last 30 days', onPress: () => setQuickDate(30) },
                { text: 'Last 3 months', onPress: () => setQuickMonth(3) },
                { text: 'Last 6 months', onPress: () => setQuickMonth(6) },
                { text: 'Custom Range', onPress: () => Alert.alert('Coming Soon', 'Custom date picker coming soon') },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
          >
            <Ionicons name="calendar" size={20} color="#2563eb" />
            <Text style={styles.dateText}>
              {fromDate.toLocaleDateString()} - {toDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickButton} onPress={() => setQuickDate(7)}>
            <Text style={styles.quickButtonText}>Last 7 days</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton} onPress={() => setQuickDate(30)}>
            <Text style={styles.quickButtonText}>Last 30 days</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton} onPress={() => setQuickMonth(3)}>
            <Text style={styles.quickButtonText}>Last 3 months</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickButton} onPress={() => setQuickMonth(6)}>
            <Text style={styles.quickButtonText}>Last 6 months</Text>
          </TouchableOpacity>
        </View>

        {/* Generate Button */}
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={generateStatement}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="white" />
              <Text style={styles.generateButtonText}>Generate PDF Statement</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Transaction Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Transaction Preview</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : transactions.length === 0 ? (
            <View style={styles.noTransactionsContainer}>
              <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
              <Text style={styles.noTransactions}>No transactions in this period</Text>
            </View>
          ) : (
            <>
              <Text style={styles.previewCount}>{transactions.length} transactions found</Text>
              {transactions.slice(0, 10).map((tx) => (
                <View key={tx.id} style={styles.previewItem}>
                  <View>
                    <Text style={styles.previewDesc}>{tx.description || 'Transaction'}</Text>
                    <Text style={styles.previewDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.previewAmount, tx.type === 'credit' ? styles.credit : styles.debit]}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                </View>
              ))}
              {transactions.length > 10 && (
                <Text style={styles.moreText}>+ {transactions.length - 10} more transactions in full statement</Text>
              )}
            </>
          )}
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
  dateCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16 },
  dateTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16 },
  dateText: { fontSize: 14, color: '#1f2937' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickButton: { backgroundColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  quickButtonText: { fontSize: 12, color: '#4b5563' },
  generateButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  generateButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  previewCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 40 },
  previewTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  previewCount: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  noTransactionsContainer: { alignItems: 'center', paddingVertical: 30 },
  noTransactions: { textAlign: 'center', color: '#9ca3af', marginTop: 12 },
  previewItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  previewDesc: { fontSize: 14, color: '#1f2937' },
  previewDate: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  previewAmount: { fontSize: 14, fontWeight: '600' },
  credit: { color: '#10b981' },
  debit: { color: '#ef4444' },
  moreText: { fontSize: 12, color: '#2563eb', textAlign: 'center', marginTop: 12 },
});