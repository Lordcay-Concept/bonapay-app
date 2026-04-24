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

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: string;
}

export default function AdminHealthScreen({ navigation }: any) {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { service: 'Database', status: 'healthy', responseTime: 45, lastChecked: new Date().toISOString() },
    { service: 'Authentication', status: 'healthy', responseTime: 78, lastChecked: new Date().toISOString() },
    { service: 'API Gateway', status: 'healthy', responseTime: 92, lastChecked: new Date().toISOString() },
    { service: 'Storage', status: 'degraded', responseTime: 234, lastChecked: new Date().toISOString() },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'checkmark-circle';
      case 'degraded': return 'alert-circle';
      case 'down': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Health</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.overallCard}>
          <Text style={styles.overallTitle}>System Status</Text>
          <View style={styles.overallStatus}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.overallText}>All Systems Operational</Text>
          </View>
        </View>

        {healthChecks.map((check, index) => (
          <View key={index} style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <Text style={styles.serviceName}>{check.service}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(check.status) + '20' }]}>
                <Ionicons name={getStatusIcon(check.status)} size={12} color={getStatusColor(check.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(check.status) }]}>
                  {check.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.healthDetails}>
              <Text style={styles.detailText}>Response Time: {check.responseTime}ms</Text>
              <Text style={styles.detailText}>Last Checked: {formatDate(check.lastChecked)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.refreshButton}>
          <TouchableOpacity 
            style={styles.refreshButtonTouch}
            onPress={() => {
              // Refresh health checks
            }}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
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
  overallCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  overallTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginBottom: 12 },
  overallStatus: { alignItems: 'center' },
  overallText: { fontSize: 18, fontWeight: '600', color: '#10b981', marginTop: 8 },
  healthCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusText: { fontSize: 10, fontWeight: '600' },
  healthDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailText: { fontSize: 12, color: '#6b7280' },
  refreshButton: { alignItems: 'center', marginBottom: 40 },
  refreshButtonTouch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, gap: 8 },
  refreshText: { color: 'white', fontSize: 14, fontWeight: '500' },
});