import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  timestamp: string;
  ip: string;
}

export default function AdminAuditLogsScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [logs] = useState<AuditLog[]>([
    { id: '1', user: 'admin@bonapay.com', action: 'USER_APPROVED', entity: 'User: john@example.com', timestamp: new Date().toISOString(), ip: '192.168.1.1' },
    { id: '2', user: 'admin@bonapay.com', action: 'KYC_VERIFIED', entity: 'User: jane@example.com', timestamp: new Date().toISOString(), ip: '192.168.1.1' },
    { id: '3', user: 'admin@bonapay.com', action: 'TRANSACTION_FLAGGED', entity: 'Transaction: TXN123456', timestamp: new Date().toISOString(), ip: '192.168.1.1' },
  ]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('VERIFIED')) return '#10b981';
    if (action.includes('FLAGGED') || action.includes('REJECTED')) return '#ef4444';
    return '#3b82f6';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audit Logs</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content}>
        {logs.map((log) => (
          <View key={log.id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.userEmail}>{log.user}</Text>
              <Text style={[styles.actionBadge, { backgroundColor: getActionColor(log.action) + '20', color: getActionColor(log.action) }]}>
                {log.action}
              </Text>
            </View>
            <Text style={styles.entityText}>{log.entity}</Text>
            <View style={styles.logFooter}>
              <Text style={styles.ipText}>IP: {log.ip}</Text>
              <Text style={styles.dateText}>{formatDate(log.timestamp)}</Text>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, marginBottom: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 16 },
  logCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  userEmail: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '600', overflow: 'hidden' },
  entityText: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  ipText: { fontSize: 10, color: '#9ca3af' },
  dateText: { fontSize: 10, color: '#9ca3af' },
});