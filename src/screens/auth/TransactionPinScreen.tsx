import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

export default function TransactionPinScreen({ navigation, route }: any) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [isSettingPin, setIsSettingPin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Create refs for each input
  const pinInputs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const handlePinChange = (text: string, index: number, isConfirm: boolean) => {
    if (text.length > 1) text = text[text.length - 1];
    
    if (isConfirm) {
      const newPin = [...confirmPin];
      newPin[index] = text;
      setConfirmPin(newPin);
      
      // Move to next input if not last and value exists
      if (text && index < 3) {
        pinInputs[index + 4]?.current?.focus();
      }
    } else {
      const newPin = [...pin];
      newPin[index] = text;
      setPin(newPin);
      
      // Move to next input if not last and value exists
      if (text && index < 3) {
        pinInputs[index + 1]?.current?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    const pinString = pin.join('');
    const confirmPinString = confirmPin.join('');
    
    if (pinString.length < 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN');
      return;
    }
    
    if (isSettingPin) {
      setIsSettingPin(false);
      // Clear confirm pin inputs and focus on first confirm field
      setConfirmPin(['', '', '', '']);
      setTimeout(() => {
        pinInputs[4]?.current?.focus();
      }, 100);
    } else {
      if (pinString !== confirmPinString) {
        Alert.alert('Error', 'PINs do not match');
        setConfirmPin(['', '', '', '']);
        pinInputs[4]?.current?.focus();
        return;
      }
      
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ transaction_pin: pinString })
          .eq('id', user.id);
        
        if (error) {
          Alert.alert('Error', 'Failed to set PIN');
        } else {
          Alert.alert('Success', 'Transaction PIN set successfully!');
          navigation.goBack();
        }
      }
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <Text style={styles.title}>
          {isSettingPin ? 'Set Transaction PIN' : 'Confirm Transaction PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {isSettingPin 
            ? 'Create a 4-digit PIN for secure transactions' 
            : 'Re-enter your PIN to confirm'}
        </Text>
        
        {/* PIN Input Fields - First Row (Set PIN) */}
        {isSettingPin && (
          <View style={styles.pinContainer}>
            {[0, 1, 2, 3].map((index) => (
              <TextInput
                key={index}
                ref={pinInputs[index]}
                style={styles.pinInput}
                maxLength={1}
                keyboardType="numeric"
                secureTextEntry
                value={pin[index]}
                onChangeText={(text) => handlePinChange(text, index, false)}
                autoFocus={index === 0}
                textAlign="center"
              />
            ))}
          </View>
        )}
        
        {/* PIN Input Fields - Second Row (Confirm PIN) */}
        {!isSettingPin && (
          <View style={styles.pinContainer}>
            {[0, 1, 2, 3].map((index) => (
              <TextInput
                key={index}
                ref={pinInputs[index + 4]}
                style={styles.pinInput}
                maxLength={1}
                keyboardType="numeric"
                secureTextEntry
                value={confirmPin[index]}
                onChangeText={(text) => handlePinChange(text, index, true)}
                autoFocus={index === 0}
                textAlign="center"
              />
            ))}
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Setting PIN...' : isSettingPin ? 'Continue' : 'Confirm PIN'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 40,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  pinInput: {
    width: 60,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '600',
  },
});