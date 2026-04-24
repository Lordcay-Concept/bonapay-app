import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface FraudAlert {
  id: string;
  user: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

export default function AdminFraudScreen({ navigation }: any) {
  const [alerts, setAlerts] = useState<FraudAlert[]>([
    {
      id: '1',
      user: 'john.doe@example.com',
      type: 'Large Transaction',
      severity: 'high',
      description: 'Unusually large transaction of ₦500,000 detected',
      timestamp: new Date().toISOString(),
      status: 'pending',
    },
    {
      id: '2',
      user: 'jane.smith@example.com',
      type: 'Multiple Failed Logins',
      severity: 'medium',
      description: '5 failed login attempts in 2 minutes',
      timestamp: new Date().toISOString(),
      status: 'pending',
    },
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'reviewed': return '#3b82f6';
      case 'resolved': return '#10b981';
      default: return '#6b7280';
    }
  };

  const resolveAlert = (alertId: string) => {
    Alert.alert('Resolve Alert', 'Mark this alert as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', onPress: () => {
        setAlerts(alerts.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a));
        Alert.alert('Success', 'Alert resolved');
      }}
    ]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fraud Monitoring</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alerts.filter(a => a.severity === 'critical').length}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alerts.filter(a => a.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.userInfo}>
                <Ionicons name="person-circle" size={24} color="#6b7280" />
                <Text style={styles.userEmail}>{alert.user}</Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) + '20' }]}>
                <Text style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}>
                  {alert.severity.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.alertType}>{alert.type}</Text>
            <Text style={styles.alertDesc}>{alert.description}</Text>
            <View style={styles.alertFooter}>
              <Text style={styles.alertDate}>{formatDate(alert.timestamp)}</Text>
              <View style={styles.alertActions}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(alert.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(alert.status) }]}>
                    {alert.status.toUpperCase()}
                  </Text>
                </View>
                {alert.status === 'pending' && (
                  <TouchableOpacity onPress={() => resolveAlert(alert.id)}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  alertCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userEmail: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  severityText: { fontSize: 10, fontWeight: '600' },
  alertType: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  alertDesc: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  alertFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertDate: { fontSize: 10, color: '#9ca3af' },
  alertActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
});