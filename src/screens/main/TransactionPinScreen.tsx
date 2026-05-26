import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Step = 'verify_old' | 'enter_new' | 'confirm_new' | 'verify_only';

export default function TransactionPinScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const mode = route.params?.mode || 'setup'; // 'setup', 'verify', 'change'

  // State
  const [input, setInput] = useState('');
  const [savedPin, setSavedPin] = useState(''); // Stores first entry during setup/change
  const [step, setStep] = useState<Step>('verify_only');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef<TextInput>(null);

  // Initialize flow based on mode
  useEffect(() => {
    if (mode === 'setup') setStep('enter_new');
    else if (mode === 'change') setStep('verify_old');
    else setStep('verify_only');

    setTimeout(() => inputRef.current?.focus(), 300);
  }, [mode]);

  const hashPin = (val: string) => {
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
      hash = ((hash << 5) - hash) + val.charCodeAt(i);
    }
    return Math.abs(hash).toString();
  };

  const handleComplete = async (finalPin: string) => {
    if (!user?.id) return setError('User not found');
    setLoading(true);
    setError('');

    try {
      if (step === 'verify_only' || step === 'verify_old') {
        // --- VERIFICATION LOGIC ---
        const { data } = await supabase.from('profiles').select('transaction_pin').eq('id', user.id).single();
        
        if (hashPin(finalPin) === data?.transaction_pin) {
          if (step === 'verify_old') {
            setStep('enter_new');
            setInput('');
          } else {
            navigation.goBack(); // Success for standard verification
          }
        } else {
          setError(step === 'verify_old' ? 'Current PIN incorrect' : 'Invalid PIN');
          setInput('');
        }
      } 
      else if (step === 'enter_new') {
        // --- SETUP/CHANGE FIRST STEP ---
        setSavedPin(finalPin);
        setStep('confirm_new');
        setInput('');
      } 
      else if (step === 'confirm_new') {
        // --- FINAL CONFIRMATION ---
        if (finalPin !== savedPin) {
          setError('PINs do not match');
          setStep('enter_new');
          setInput('');
        } else {
          const { error: dbError } = await supabase.from('profiles').update({
            transaction_pin: hashPin(finalPin),
            transaction_pin_enabled: true
          }).eq('id', user.id);

          if (dbError) throw dbError;
          Alert.alert('Success', 'PIN updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeText = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setInput(numericText);
    if (numericText.length === 4) {
      handleComplete(numericText);
    }
  };

  const getLabels = () => {
    switch (step) {
      case 'verify_old': return { t: 'Current PIN', s: 'Enter your current PIN' };
      case 'enter_new': return { t: 'New PIN', s: 'Create a 4-digit PIN' };
      case 'confirm_new': return { t: 'Confirm PIN', s: 'Re-enter your new PIN' };
      default: return { t: 'Verify PIN', s: 'Enter PIN to continue' };
    }
  };

  const labels = getLabels();

  return (
    <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons name="lock-closed" size={48} color="white" style={{ marginBottom: 20 }} />
        <Text style={styles.title}>{labels.t}</Text>
        <Text style={styles.subtitle}>{labels.s}</Text>

        <View style={styles.circlesContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.circle, input.length > i && styles.circleFilled]}>
               {input.length > i && <View style={styles.dot} />}
            </View>
          ))}
        </View>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          maxLength={4}
          keyboardType="number-pad"
          value={input}
          onChangeText={handleChangeText}
          autoFocus
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading && <ActivityIndicator style={{ marginTop: 20 }} color="white" />}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { position: 'absolute', top: 50, left: 20, padding: 10, zIndex: 5 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#bfdbfe', marginBottom: 40 },
  circlesContainer: { flexDirection: 'row', gap: 15 },
  circle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  circleFilled: { backgroundColor: 'white' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1e40af' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },
  errorText: { color: '#ffcfcf', marginTop: 20, fontWeight: '600' }
});