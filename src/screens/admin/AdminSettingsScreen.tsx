import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AdminSettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    requireKyc: true,
    maxDailyTransfer: '5000000',
    minTransferAmount: '100',
    referralBonus: '1000',
    savingsInterest: '15',
  });

  const updateSetting = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const saveSettings = () => {
    Alert.alert('Success', 'Settings saved successfully');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Settings</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.settingCard}>
          <Text style={styles.settingTitle}>System Configuration</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Maintenance Mode</Text>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={(val) => updateSetting('maintenanceMode', val)}
              trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Require KYC Verification</Text>
            <Switch
              value={settings.requireKyc}
              onValueChange={(val) => updateSetting('requireKyc', val)}
              trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
            />
          </View>
        </View>

        <View style={styles.settingCard}>
          <Text style={styles.settingTitle}>Transaction Limits</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Max Daily Transfer (₦)</Text>
            <TextInput
              style={styles.input}
              value={settings.maxDailyTransfer}
              onChangeText={(val) => updateSetting('maxDailyTransfer', val)}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Min Transfer Amount (₦)</Text>
            <TextInput
              style={styles.input}
              value={settings.minTransferAmount}
              onChangeText={(val) => updateSetting('minTransferAmount', val)}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.settingCard}>
          <Text style={styles.settingTitle}>Rewards Settings</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Referral Bonus (₦)</Text>
            <TextInput
              style={styles.input}
              value={settings.referralBonus}
              onChangeText={(val) => updateSetting('referralBonus', val)}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Savings Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={settings.savingsInterest}
              onChangeText={(val) => updateSetting('savingsInterest', val)}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
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
  settingCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 20 },
  settingTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  settingLabel: { fontSize: 14, color: '#4b5563' },
  inputRow: { marginBottom: 16 },
  inputLabel: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  saveButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 40 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});