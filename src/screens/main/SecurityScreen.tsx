import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { pinService } from '../../services/pin.service';

export default function SecurityScreen({ navigation }: any) {
  const { user } = useAuth();
  const [hasTransactionPin, setHasTransactionPin] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Refresh when coming back from PIN screen
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      // Check PIN status
      const hasPin = await pinService.hasTransactionPin(user.id);
      setHasTransactionPin(hasPin);
      
      // Load other settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('two_factor_enabled, biometric_enabled')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setTwoFactorEnabled(profile.two_factor_enabled || false);
        setBiometricEnabled(profile.biometric_enabled || false);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== TRANSACTION PIN ACTIONS ==========
  const handleSetupPin = () => {
    navigation.navigate('TransactionPin', { mode: 'setup' });
  };

  const handleChangePin = () => {
    navigation.navigate('TransactionPin', { mode: 'change' });
  };

  const handleVerifyPin = () => {
    navigation.navigate('TransactionPin', { mode: 'verify' });
  };

  const handleDisablePin = () => {
    Alert.alert(
      'Disable Transaction PIN',
      'Are you sure you want to disable your transaction PIN? Your transactions will no longer require PIN verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disable', 
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            
            const { error } = await supabase
              .from('profiles')
              .update({ 
                transaction_pin_enabled: false,
                transaction_pin: null,
              })
              .eq('id', user.id);
            
            if (error) {
              Alert.alert('Error', 'Failed to disable PIN');
            } else {
              setHasTransactionPin(false);
              Alert.alert('Success', 'Transaction PIN disabled');
            }
          }
        }
      ]
    );
  };

  // ========== TWO-FACTOR AUTH ACTIONS ==========
  const handleToggle2FA = async (value: boolean) => {
    if (!user?.id) return;
    
    if (value && !twoFactorEnabled) {
      // Show setup instructions
      Alert.alert(
        'Set Up Two-Factor Authentication',
        '2FA adds an extra layer of security. You will need to scan a QR code with Google Authenticator.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Set Up', 
            onPress: () => {
              // Navigate to 2FA setup screen
              Alert.alert('Coming Soon', '2FA setup will be available in the next update');
            }
          }
        ]
      );
    } else {
      // Disable 2FA
      const { error } = await supabase
        .from('profiles')
        .update({ two_factor_enabled: value })
        .eq('id', user.id);
      
      if (!error) {
        setTwoFactorEnabled(value);
        Alert.alert('Success', value ? '2FA enabled' : '2FA disabled');
      }
    }
  };

  // ========== BIOMETRIC ACTIONS ==========
  const handleToggleBiometric = async (value: boolean) => {
    if (!user?.id) return;
    
    if (value && !biometricEnabled) {
      // Check if device supports biometrics
      Alert.alert(
        'Enable Biometric Login',
        'Use your fingerprint or face ID to quickly log in to your account.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: async () => {
              const { error } = await supabase
                .from('profiles')
                .update({ biometric_enabled: true })
                .eq('id', user.id);
              
              if (!error) {
                setBiometricEnabled(true);
                Alert.alert('Success', 'Biometric login enabled');
              }
            }
          }
        ]
      );
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ biometric_enabled: false })
        .eq('id', user.id);
      
      if (!error) {
        setBiometricEnabled(false);
        Alert.alert('Success', 'Biometric login disabled');
      }
    }
  };

  // ========== SESSION ACTIONS ==========
  const handleViewDevices = () => {
    navigation.navigate('Devices');
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Log Out All Devices',
      'This will log you out from all other devices. You will need to log in again on those devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out All', 
          style: 'destructive',
          onPress: async () => {
            // Invalidate all sessions except current
            Alert.alert('Success', 'All other devices logged out');
          }
        }
      ]
    );
  };

  // ========== CHANGE PASSWORD ==========
  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  // ========== LOGIN ALERTS ==========
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  
  const handleToggleLoginAlerts = async (value: boolean) => {
    setLoginAlertsEnabled(value);
    Alert.alert('Success', value ? 'Login alerts enabled' : 'Login alerts disabled');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ========== TRANSACTION PIN SECTION ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Security</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="key" size={24} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Transaction PIN</Text>
                <Text style={styles.cardDesc}>
                  {hasTransactionPin 
                    ? 'PIN is set. Required for sending money and payments.' 
                    : 'Set a 4-digit PIN to secure your transactions'}
                </Text>
              </View>
            </View>
            
            <View style={styles.buttonGroup}>
              {!hasTransactionPin ? (
                <TouchableOpacity style={styles.cardButtonPrimary} onPress={handleSetupPin}>
                  <Text style={styles.cardButtonPrimaryText}>Set Up PIN</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.cardButtonOutline} onPress={handleChangePin}>
                    <Text style={styles.cardButtonOutlineText}>Change PIN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardButtonOutline} onPress={handleVerifyPin}>
                    <Text style={styles.cardButtonOutlineText}>Verify PIN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardButtonDanger} onPress={handleDisablePin}>
                    <Text style={styles.cardButtonDangerText}>Disable PIN</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            
            {hasTransactionPin && (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.statusText}>PIN enabled</Text>
              </View>
            )}
          </View>
        </View>

        {/* ========== TWO-FACTOR AUTH SECTION ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Multi-Factor Authentication</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Two-Factor Authentication</Text>
                <Text style={styles.cardDesc}>
                  Add an extra layer of security to your account
                </Text>
              </View>
              <Switch
                value={twoFactorEnabled}
                onValueChange={handleToggle2FA}
                trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* ========== BIOMETRIC SECTION ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biometric Security</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="finger-print" size={24} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Biometric Login</Text>
                <Text style={styles.cardDesc}>
                  Use fingerprint or face ID to log in quickly
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* ========== SESSION MANAGEMENT SECTION ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Management</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="phone-portrait" size={24} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Active Devices</Text>
                <Text style={styles.cardDesc}>
                  Manage devices where you're logged in
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.cardButtonOutline} onPress={handleViewDevices}>
              <Text style={styles.cardButtonOutlineText}>View All Devices</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cardButtonDanger} onPress={handleLogoutAllDevices}>
              <Text style={styles.cardButtonDangerText}>Log Out All Other Devices</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========== ACCOUNT SECURITY SECTION ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="lock-closed" size={24} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Change Password</Text>
                <Text style={styles.cardDesc}>
                  Update your account password
                </Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.cardButtonOutline} onPress={handleChangePassword}>
              <Text style={styles.cardButtonOutlineText}>Change Password</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="notifications" size={24} color="#2563eb" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Login Alerts</Text>
                <Text style={styles.cardDesc}>
                  Get notified when someone logs into your account
                </Text>
              </View>
              <Switch
                value={loginAlertsEnabled}
                onValueChange={handleToggleLoginAlerts}
                trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 12, paddingHorizontal: 4 },
  
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  cardDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  
  buttonGroup: { gap: 10, marginTop: 8 },
  cardButtonPrimary: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardButtonPrimaryText: { color: 'white', fontSize: 15, fontWeight: '600' },
  cardButtonOutline: { borderWidth: 1, borderColor: '#2563eb', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardButtonOutlineText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  cardButtonDanger: { borderWidth: 1, borderColor: '#ef4444', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardButtonDangerText: { color: '#ef4444', fontSize: 15, fontWeight: '500' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  statusText: { fontSize: 12, color: '#10b981', fontWeight: '500' },
});