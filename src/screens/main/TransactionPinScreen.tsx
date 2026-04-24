import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function TransactionPinScreen({ navigation }: any) {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'change' | 'disable'>('setup');

  const handleSetupPin = async () => {
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      await SecureStore.setItemAsync('transaction_pin', pin);
      
      const { error } = await supabase
        .from('profiles')
        .update({ has_transaction_pin: true })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Transaction PIN set successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="key" size={48} color="#2563eb" />
        </View>
        
        <Text style={styles.title}>Transaction PIN</Text>
        <Text style={styles.subtitle}>
          Set a 4-digit PIN for secure transactions
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Enter PIN</Text>
          <View style={styles.pinContainer}>
            <TextInput
              style={styles.pinInput}
              placeholder="****"
              maxLength={4}
              keyboardType="numeric"
              secureTextEntry={!showPin}
              value={pin}
              onChangeText={setPin}
              textAlign="center"
            />
            <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeButton}>
              <Ionicons name={showPin ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm PIN</Text>
          <View style={styles.pinContainer}>
            <TextInput
              style={styles.pinInput}
              placeholder="****"
              maxLength={4}
              keyboardType="numeric"
              secureTextEntry={!showPin}
              value={confirmPin}
              onChangeText={setConfirmPin}
              textAlign="center"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSetupPin}
            disabled={loading || !pin || !confirmPin}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Set Transaction PIN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              Your PIN is securely encrypted. Never share it with anyone.
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#bfdbfe', textAlign: 'center', marginBottom: 32 },
  formCard: { backgroundColor: 'white', borderRadius: 16, padding: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8, marginTop: 16 },
  pinContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#f9fafb' },
  pinInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, fontSize: 18, letterSpacing: 8, textAlign: 'center' },
  eyeButton: { padding: 12 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 },
  infoText: { flex: 1, fontSize: 11, color: '#6b7280' },
});