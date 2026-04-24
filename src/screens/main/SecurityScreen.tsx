import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';

export default function SecurityScreen({ navigation }: any) {
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [hasTransactionPin, setHasTransactionPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    loadSettings();
    checkBiometricSupport();
    checkTransactionPin();
  }, []);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('two_factor_enabled, biometric_enabled')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setTwoFactorEnabled(data.two_factor_enabled || false);
      setBiometricEnabled(data.biometric_enabled || false);
    }
  };

  const checkBiometricSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (compatible) {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      }
      setBiometricEnabled(enrolled);
    }
  };

  const checkTransactionPin = async () => {
    const pinExists = await SecureStore.getItemAsync('transaction_pin');
    setHasTransactionPin(!!pinExists);
  };

  const saveTransactionPin = async () => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    await SecureStore.setItemAsync('transaction_pin', pin);
    await supabase
      .from('profiles')
      .update({ has_transaction_pin: true })
      .eq('id', user?.id);

    setHasTransactionPin(true);
    setShowPinModal(false);
    setPin('');
    setConfirmPin('');
    Alert.alert('Success', 'Transaction PIN set successfully');
  };

  const handleBiometricAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to enable biometric login',
    });

    if (result.success) {
      setBiometricEnabled(true);
      await supabase
        .from('profiles')
        .update({ biometric_enabled: true })
        .eq('id', user?.id);
      Alert.alert('Success', `${biometricType} login enabled`);
    }
  };

  const toggleBiometric = async () => {
    if (!biometricEnabled) {
      await handleBiometricAuth();
    } else {
      setBiometricEnabled(false);
      await supabase
        .from('profiles')
        .update({ biometric_enabled: false })
        .eq('id', user?.id);
      Alert.alert('Success', `${biometricType} login disabled`);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      if (error) throw error;
      Alert.alert('Success', 'Password changed successfully!');
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Two-Factor Authentication */}
        <View style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
            <View>
              <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
              <Text style={styles.settingDesc}>Add an extra layer of security</Text>
            </View>
          </View>
          <Switch
            value={twoFactorEnabled}
            onValueChange={(value) => setTwoFactorEnabled(value)}
            trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
          />
        </View>

        {/* Biometric Authentication */}
        {biometricType && (
          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Ionicons name={biometricType === 'Face ID' ? 'happy-outline' : 'finger-print'} size={24} color="#2563eb" />
              <View>
                <Text style={styles.settingTitle}>{biometricType} Login</Text>
                <Text style={styles.settingDesc}>Use {biometricType} to quickly log in</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
            />
          </View>
        )}

        {/* Transaction PIN */}
        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => {
            if (hasTransactionPin) {
              Alert.alert('Transaction PIN', 'PIN is already set. You can change it in settings.');
            } else {
              setShowPinModal(true);
            }
          }}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="key" size={24} color="#2563eb" />
            <View>
              <Text style={styles.settingTitle}>Transaction PIN</Text>
              <Text style={styles.settingDesc}>
                {hasTransactionPin ? 'PIN is set' : 'Set a 4-digit PIN for transactions'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Change Password */}
        <TouchableOpacity 
          style={styles.settingCard}
          onPress={() => setShowChangePassword(!showChangePassword)}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="lock-closed" size={24} color="#2563eb" />
            <View>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingDesc}>Update your account password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Change Password Form */}
        {showChangePassword && (
          <View style={styles.passwordForm}>
            <Text style={styles.formLabel}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                secureTextEntry={!showNewPassword}
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              secureTextEntry
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
            />

            <TouchableOpacity style={styles.updateButton} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.updateButtonText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>Enter 4-digit PIN</Text>
            
            <TextInput
              style={styles.modalPinInput}
              placeholder="****"
              maxLength={4}
              keyboardType="numeric"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
              textAlign="center"
            />
            
            <Text style={styles.modalSubtitle}>Confirm PIN</Text>
            <TextInput
              style={styles.modalPinInput}
              placeholder="****"
              maxLength={4}
              keyboardType="numeric"
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
              textAlign="center"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowPinModal(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModalButton} onPress={saveTransactionPin}>
                <Text style={styles.confirmModalText}>Save PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: '#1f2937' },
  settingDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  passwordForm: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8 },
  passwordInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  updateButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  updateButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  modalPinInput: { width: 120, height: 50, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 16 },
  cancelModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});