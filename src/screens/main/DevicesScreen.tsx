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

interface Device {
  id: string;
  device_type: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_current: boolean;
  is_trusted: boolean;
}

export default function DevicesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    // In production, fetch from database
    // For now, use mock data
    const mockDevices: Device[] = [
      {
        id: '1',
        device_type: 'Desktop',
        device_name: 'Chrome on Windows',
        browser: 'Chrome',
        os: 'Windows 11',
        ip_address: '192.168.1.100',
        location: 'Lagos, Nigeria',
        last_active: new Date().toISOString(),
        is_current: true,
        is_trusted: true,
      },
      {
        id: '2',
        device_type: 'Mobile',
        device_name: 'Safari on iPhone',
        browser: 'Safari',
        os: 'iOS 17',
        ip_address: '192.168.1.101',
        location: 'Lagos, Nigeria',
        last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        is_current: false,
        is_trusted: true,
      },
    ];
    setDevices(mockDevices);
    setLoading(false);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Mobile': return 'phone-portrait';
      case 'Tablet': return 'tablet-portrait';
      case 'Desktop': return 'desktop';
      default: return 'laptop';
    }
  };

  const removeDevice = (deviceId: string) => {
    Alert.alert('Remove Device', 'Are you sure you want to remove this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setDevices(devices.filter(d => d.id !== deviceId));
          Alert.alert('Success', 'Device removed successfully');
        }
      }
    ]);
  };

  const logoutAllDevices = () => {
    Alert.alert('Logout All Devices', 'This will log you out from all other devices. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout All',
        style: 'destructive',
        onPress: () => {
          setDevices(devices.filter(d => d.is_current));
          Alert.alert('Success', 'Logged out from all other devices');
        }
      }
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
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
        <Text style={styles.headerTitle}>Device Management</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {devices.map((device) => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceIcon}>
                <Ionicons name={getDeviceIcon(device.device_type)} size={24} color="#2563eb" />
              </View>
              <View style={styles.deviceDetails}>
                <View style={styles.deviceHeader}>
                  <Text style={styles.deviceName}>{device.device_name}</Text>
                  {device.is_current && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentText}>Current</Text>
                    </View>
                  )}
                  {device.is_trusted && (
                    <View style={styles.trustedBadge}>
                      <Text style={styles.trustedText}>Trusted</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.deviceSpecs}>{device.browser} • {device.os}</Text>
                <Text style={styles.deviceMeta}>IP: {device.ip_address} • {device.location}</Text>
                <Text style={styles.deviceActive}>Last active: {formatDate(device.last_active)}</Text>
              </View>
            </View>
            {!device.is_current && (
              <TouchableOpacity style={styles.removeButton} onPress={() => removeDevice(device.id)}>
                <Ionicons name="trash" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.logoutAllButton} onPress={logoutAllDevices}>
          <Text style={styles.logoutAllText}>Log Out All Other Devices</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text style={styles.infoText}>
            For security reasons, you'll need to log in again on devices you log out from.
          </Text>
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
  deviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  deviceInfo: { flexDirection: 'row', flex: 1, gap: 12 },
  deviceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  deviceDetails: { flex: 1 },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  deviceName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  currentBadge: { backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  currentText: { color: 'white', fontSize: 8, fontWeight: '600' },
  trustedBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trustedText: { color: '#2563eb', fontSize: 8, fontWeight: '600' },
  deviceSpecs: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  deviceMeta: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  deviceActive: { fontSize: 10, color: '#9ca3af' },
  removeButton: { padding: 8 },
  logoutAllButton: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 16 },
  logoutAllText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  infoBox: { flexDirection: 'row', backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, gap: 8, marginBottom: 40 },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af' },
});