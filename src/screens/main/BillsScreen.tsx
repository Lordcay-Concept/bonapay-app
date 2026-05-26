import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { billService } from '../../services/bill.service';
import { pinService } from '../../services/pin.service';

interface Network {
  code: string;
  name: string;
  prefix_patterns: string[];
}

interface DataBundle {
  id: string;
  name: string;
  price: number;
  validity_days: number;
}

interface ElectricityProvider {
  code: string;
  name: string;
  region: string;
}

interface CableProvider {
  code: string;
  name: string;
}

interface CablePackage {
  id: string;
  name: string;
  price: number;
}

interface BettingPlatform {
  code: string;
  name: string;
}

const TAB_ICONS: Record<string, string> = {
  electricity: 'flash-outline',
  airtime: 'phone-portrait-outline',
  data: 'wifi-outline',
  cable: 'tv-outline',
  betting: 'game-controller-outline',
};

export default function BillsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('electricity');
  const [loading, setLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const pinInputRef = useRef<TextInput>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Airtime
  const [airtimePhone, setAirtimePhone] = useState('');
  const [airtimeNetwork, setAirtimeNetwork] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('');
  const [detectedNetwork, setDetectedNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);

  // Data
  const [dataPhone, setDataPhone] = useState('');
  const [dataNetwork, setDataNetwork] = useState('');
  const [dataBundle, setDataBundle] = useState('');
  const [dataAmount, setDataAmount] = useState(0);
  const [dataBundles, setDataBundles] = useState<DataBundle[]>([]);

  // Electricity
  const [electricityProvider, setElectricityProvider] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [electricityAmount, setElectricityAmount] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [electricityProviders, setElectricityProviders] = useState<ElectricityProvider[]>([]);

  // Cable
  const [cableProvider, setCableProvider] = useState('');
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [cablePackage, setCablePackage] = useState('');
  const [cableAmount, setCableAmount] = useState(0);
  const [cableProviders, setCableProviders] = useState<CableProvider[]>([]);
  const [cablePackages, setCablePackages] = useState<CablePackage[]>([]);

  // Betting
  const [bettingPlatform, setBettingPlatform] = useState('');
  const [bettingPhone, setBettingPhone] = useState('');
  const [bettingAmount, setBettingAmount] = useState('');
  const [bettingPlatforms, setBettingPlatforms] = useState<BettingPlatform[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (dataNetwork) loadDataBundles();
  }, [dataNetwork]);

  useEffect(() => {
    if (cableProvider) loadCablePackages();
  }, [cableProvider]);

  const loadProviders = async () => {
    try {
      const [nets, elecProviders, cableProvs, betting] = await Promise.all([
        billService.getNetworks(),
        billService.getElectricityProviders(),
        billService.getCableProviders(),
        billService.getBettingPlatforms(),
      ]);
      setNetworks(nets);
      setElectricityProviders(elecProviders);
      setCableProviders(cableProvs);
      setBettingPlatforms(betting);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const loadDataBundles = async () => {
    const bundles = await billService.getDataBundles(dataNetwork);
    setDataBundles(bundles);
  };

  const loadCablePackages = async () => {
    const packages = await billService.getCablePackages(cableProvider);
    setCablePackages(packages);
  };

  const handlePhoneNumberChange = async (phone: string) => {
    setAirtimePhone(phone);
    if (phone.length >= 4) {
      const network = await billService.detectNetwork(phone);
      if (network) {
        setDetectedNetwork(network);
        setAirtimeNetwork(network.code);
        return;
      }
    }
    setDetectedNetwork(null);
    setAirtimeNetwork('');
  };

  const verifyElectricityMeter = async () => {
    if (!meterNumber || !electricityProvider) {
      Alert.alert('Error', 'Please enter meter number and select provider');
      return;
    }
    setVerifying(true);
    try {
      const result = await billService.verifyElectricityMeter(meterNumber, electricityProvider);
      if (result.success) {
        setVerifiedName(result.customerName || 'Customer');
        Alert.alert('Success', 'Meter verified successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handlePinChange = (text: string) => {
  setEnteredPin(text);
  setPinError('');
  
  // Auto-submit when 4 digits are entered
  if (text.length === 4) {
    setTimeout(() => processPINAndPayment(text), 100);
  }
};

const processPINAndPayment = async (pinValue: string) => {
  if (!user?.id) {
    Alert.alert('Error', 'User not authenticated');
    setShowPinModal(false);
    return;
  }

  const result = await pinService.verifyPin(user.id, pinValue);
  
  if (!result.success) {
    setPinError(result.error || 'Invalid PIN');
    setEnteredPin('');
    setShowPinModal(true);
    setTimeout(() => pinInputRef.current?.focus(), 100);
  } else {
    setShowPinModal(false);
    await processPayment();
  }
};



  const handlePayment = () => {
    if (activeTab === 'electricity') {
      if (!electricityProvider || !meterNumber || !electricityAmount) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      const amount = parseFloat(electricityAmount);
      if (isNaN(amount) || amount < 100) {
        Alert.alert('Error', 'Please enter a valid amount (minimum ₦100)');
        return;
      }
      setPaymentDetails({
        type: 'electricity',
        provider: electricityProviders.find(p => p.code === electricityProvider)?.name,
        meterNumber,
        amount,
        customerName: verifiedName || 'Customer',
      });
    } else if (activeTab === 'airtime') {
      if (!airtimePhone || !airtimeNetwork || !airtimeAmount) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      const amount = parseFloat(airtimeAmount);
      if (isNaN(amount) || amount < 50) {
        Alert.alert('Error', 'Please enter a valid amount (minimum ₦50)');
        return;
      }
      if (airtimePhone.length !== 11) {
        Alert.alert('Error', 'Please enter a valid 11-digit phone number');
        return;
      }
      setPaymentDetails({
        type: 'airtime',
        phoneNumber: airtimePhone,
        network: networks.find(n => n.code === airtimeNetwork)?.name,
        amount,
      });
    } else if (activeTab === 'data') {
      if (!dataPhone || !dataNetwork || !dataBundle) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      if (dataPhone.length !== 11) {
        Alert.alert('Error', 'Please enter a valid 11-digit phone number');
        return;
      }
      const bundle = dataBundles.find(b => b.id === dataBundle);
      setPaymentDetails({
        type: 'data',
        phoneNumber: dataPhone,
        network: networks.find(n => n.code === dataNetwork)?.name,
        bundleName: bundle?.name,
        amount: dataAmount,
      });
    } else if (activeTab === 'cable') {
      if (!cableProvider || !smartCardNumber || !cablePackage) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      const pkg = cablePackages.find(p => p.id === cablePackage);
      setPaymentDetails({
        type: 'cable',
        provider: cableProviders.find(p => p.code === cableProvider)?.name,
        smartCardNumber,
        packageName: pkg?.name,
        amount: cableAmount,
      });
    } else if (activeTab === 'betting') {
      if (!bettingPlatform || !bettingPhone || !bettingAmount) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      const amount = parseFloat(bettingAmount);
      if (isNaN(amount) || amount < 100) {
        Alert.alert('Error', 'Please enter a valid amount (minimum ₦100)');
        return;
      }
      setPaymentDetails({
        type: 'betting',
        platform: bettingPlatforms.find(p => p.code === bettingPlatform)?.name,
        phoneNumber: bettingPhone,
        amount,
      });
    }
    
  setEnteredPin('');
  setPinError('');
  setShowPinModal(true);
  setTimeout(() => pinInputRef.current?.focus(), 200);
    // Focus is now handled by the Modal's onShow prop
  };

  const handlePinSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    if (!enteredPin || enteredPin.length !== 4) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }

    const result = await pinService.verifyPin(user.id, enteredPin);
    
    if (result.success) {
      setShowPinModal(false);
      await processPayment();
    } else {
      setPinError(result.error || 'Invalid PIN');
      setEnteredPin('');
    }
  };

  const processPayment = async () => {
    if (!paymentDetails || !user?.id) return;

    setLoading(true);
    try {
      let result;
      switch (paymentDetails.type) {
        case 'electricity':
          result = await billService.payElectricity(user.id, {
            meterNumber: paymentDetails.meterNumber,
            meterType: 'prepaid',
            amount: paymentDetails.amount,
            provider: paymentDetails.provider,
          });
          break;
        case 'airtime':
          result = await billService.buyAirtime(user.id, {
            phoneNumber: paymentDetails.phoneNumber,
            amount: paymentDetails.amount,
            network: paymentDetails.network?.toLowerCase(),
          });
          break;
        case 'data':
          result = await billService.buyData(user.id, {
            phoneNumber: paymentDetails.phoneNumber,
            amount: paymentDetails.amount,
            dataPlan: paymentDetails.bundleName,
            network: paymentDetails.network?.toLowerCase(),
          });
          break;
        case 'cable':
          result = await billService.payCableTV(user.id, {
            smartCardNumber: paymentDetails.smartCardNumber,
            package: paymentDetails.packageName,
            amount: paymentDetails.amount,
            provider: paymentDetails.provider?.toLowerCase(),
          });
          break;
        case 'betting':
          result = await billService.fundBettingAccount(user.id, {
            platformCode: bettingPlatform,
            phoneNumber: paymentDetails.phoneNumber,
            amount: paymentDetails.amount,
          });
          break;
      }

      if (result?.success) {
        Alert.alert('Success', 'Payment successful!', [
          { text: 'OK', onPress: () => resetForms() }
        ]);
      } else {
        Alert.alert('Error', result?.error || 'Payment failed');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setElectricityProvider('');
    setMeterNumber('');
    setElectricityAmount('');
    setVerifiedName('');
    setAirtimePhone('');
    setAirtimeNetwork('');
    setAirtimeAmount('');
    setDetectedNetwork(null);
    setDataPhone('');
    setDataNetwork('');
    setDataBundle('');
    setDataAmount(0);
    setCableProvider('');
    setSmartCardNumber('');
    setCablePackage('');
    setCableAmount(0);
    setBettingPlatform('');
    setBettingPhone('');
    setBettingAmount('');
  };

  const tabs = [
    { id: 'electricity', label: 'Electricity', icon: 'flash-outline' },
    { id: 'airtime', label: 'Airtime', icon: 'phone-portrait-outline' },
    { id: 'data', label: 'Data', icon: 'wifi-outline' },
    { id: 'cable', label: 'Cable TV', icon: 'tv-outline' },
    { id: 'betting', label: 'Betting', icon: 'game-controller-outline' },
  ];

  const renderPinDots = () => (
    <View style={styles.pinDotsContainer}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={[styles.pinDot, enteredPin[index] && styles.pinDotFilled]}>
          <Text style={styles.pinDotText}>{enteredPin[index] ? '●' : '○'}</Text>
        </View>
      ))}
    </View>
  );

  const renderElectricityForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Electricity Bill Payment</Text>
      
      <Text style={styles.label}>Provider</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
        {electricityProviders.map(provider => (
          <TouchableOpacity
            key={provider.code}
            style={[styles.providerChip, electricityProvider === provider.code && styles.providerChipActive]}
            onPress={() => setElectricityProvider(provider.code)}
          >
            <Text style={[styles.providerChipText, electricityProvider === provider.code && styles.providerChipTextActive]}>
              {provider.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Meter Number</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex1]}
          placeholder="Enter meter number"
          value={meterNumber}
          onChangeText={setMeterNumber}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.verifyButton} onPress={verifyElectricityMeter} disabled={verifying}>
          {verifying ? <ActivityIndicator size="small" color="#2563eb" /> : <Text style={styles.verifyButtonText}>Verify</Text>}
        </TouchableOpacity>
      </View>

      {verifiedName ? (
        <View style={styles.verifiedBox}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.verifiedText}>Customer: {verifiedName}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Meter Type</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.meterTypeButton, meterType === 'prepaid' && styles.meterTypeActive]}
          onPress={() => setMeterType('prepaid')}
        >
          <Text style={[styles.meterTypeText, meterType === 'prepaid' && styles.meterTypeTextActive]}>Prepaid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.meterTypeButton, meterType === 'postpaid' && styles.meterTypeActive]}
          onPress={() => setMeterType('postpaid')}
        >
          <Text style={[styles.meterTypeText, meterType === 'postpaid' && styles.meterTypeTextActive]}>Postpaid</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Amount (₦)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        value={electricityAmount}
        onChangeText={setElectricityAmount}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.payButton} onPress={handlePayment} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payButtonText}>Pay Bill</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderAirtimeForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Buy Airtime</Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="08012345678"
        value={airtimePhone}
        onChangeText={handlePhoneNumberChange}
        keyboardType="phone-pad"
        maxLength={11}
      />

      {detectedNetwork ? (
        <View style={styles.verifiedBox}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.verifiedText}>Detected: {detectedNetwork.name}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Network</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
        {networks.map(network => (
          <TouchableOpacity
            key={network.code}
            style={[styles.providerChip, airtimeNetwork === network.code && styles.providerChipActive]}
            onPress={() => setAirtimeNetwork(network.code)}
          >
            <Text style={[styles.providerChipText, airtimeNetwork === network.code && styles.providerChipTextActive]}>
              {network.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Amount (₦)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        value={airtimeAmount}
        onChangeText={setAirtimeAmount}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.payButton} onPress={handlePayment} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payButtonText}>Buy Airtime</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderDataForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Buy Data</Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="08012345678"
        value={dataPhone}
        onChangeText={setDataPhone}
        keyboardType="phone-pad"
        maxLength={11}
      />

      <Text style={styles.label}>Network</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
        {networks.map(network => (
          <TouchableOpacity
            key={network.code}
            style={[styles.providerChip, dataNetwork === network.code && styles.providerChipActive]}
            onPress={() => setDataNetwork(network.code)}
          >
            <Text style={[styles.providerChipText, dataNetwork === network.code && styles.providerChipTextActive]}>
              {network.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {dataBundles.length > 0 ? (
        <>
          <Text style={styles.label}>Data Plan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bundleScroll}>
            {dataBundles.map(bundle => (
              <TouchableOpacity
                key={bundle.id}
                style={[styles.bundleCard, dataBundle === bundle.id && styles.bundleCardActive]}
                onPress={() => {
                  setDataBundle(bundle.id);
                  setDataAmount(bundle.price);
                }}
              >
                <Text style={styles.bundleName}>{bundle.name}</Text>
                <Text style={styles.bundlePrice}>₦{bundle.price.toLocaleString()}</Text>
                <Text style={styles.bundleValidity}>{bundle.validity_days} days</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      {dataAmount > 0 ? (
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount to pay:</Text>
          <Text style={styles.amountValue}>₦{dataAmount.toLocaleString()}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.payButton} onPress={handlePayment} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payButtonText}>Buy Data</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderCableForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Cable TV Subscription</Text>

      <Text style={styles.label}>Provider</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
        {cableProviders.map(provider => (
          <TouchableOpacity
            key={provider.code}
            style={[styles.providerChip, cableProvider === provider.code && styles.providerChipActive]}
            onPress={() => setCableProvider(provider.code)}
          >
            <Text style={[styles.providerChipText, cableProvider === provider.code && styles.providerChipTextActive]}>
              {provider.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Smart Card Number (IUC)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter smart card number"
        value={smartCardNumber}
        onChangeText={setSmartCardNumber}
        keyboardType="numeric"
      />

      {cablePackages.length > 0 ? (
        <>
          <Text style={styles.label}>Package</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bundleScroll}>
            {cablePackages.map(pkg => (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.bundleCard, cablePackage === pkg.id && styles.bundleCardActive]}
                onPress={() => {
                  setCablePackage(pkg.id);
                  setCableAmount(pkg.price);
                }}
              >
                <Text style={styles.bundleName}>{pkg.name}</Text>
                <Text style={styles.bundlePrice}>₦{pkg.price.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      {cableAmount > 0 ? (
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount to pay:</Text>
          <Text style={styles.amountValue}>₦{cableAmount.toLocaleString()}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.payButton} onPress={handlePayment} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payButtonText}>Subscribe</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderBettingForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Fund Betting Account</Text>

      <Text style={styles.label}>Betting Platform</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
        {bettingPlatforms.map(platform => (
          <TouchableOpacity
            key={platform.code}
            style={[styles.providerChip, bettingPlatform === platform.code && styles.providerChipActive]}
            onPress={() => setBettingPlatform(platform.code)}
          >
            <Text style={[styles.providerChipText, bettingPlatform === platform.code && styles.providerChipTextActive]}>
              {platform.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Phone Number / User ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your registered phone number"
        value={bettingPhone}
        onChangeText={setBettingPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Amount (₦)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        value={bettingAmount}
        onChangeText={setBettingAmount}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.payButton} onPress={handlePayment} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payButtonText}>Fund Account</Text>}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Payments</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={tab.icon as any} size={20} color={activeTab === tab.id ? '#2563eb' : '#64748b'} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'electricity' && renderElectricityForm()}
        {activeTab === 'airtime' && renderAirtimeForm()}
        {activeTab === 'data' && renderDataForm()}
        {activeTab === 'cable' && renderCableForm()}
        {activeTab === 'betting' && renderBettingForm()}
      </ScrollView>

     {/* PIN Modal */}
<Modal 
  visible={showPinModal} 
  transparent 
  animationType="fade"
  onShow={() => {
    setTimeout(() => pinInputRef.current?.focus(), 200);
  }}
>
  <TouchableOpacity 
    style={styles.modalOverlay} 
    activeOpacity={1}
    onPress={() => pinInputRef.current?.focus()}
  >
    <View style={styles.pinModalContent}>
      <Ionicons name="lock-closed" size={48} color="#2563eb" />
      <Text style={styles.pinModalTitle}>Confirm Payment</Text>
      <Text style={styles.pinModalSubtitle}>Enter your PIN to complete this payment</Text>

      {/* PIN Dots */}
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.pinDot, enteredPin[index] && styles.pinDotFilled]}>
            <Text style={styles.pinDotText}>{enteredPin[index] ? '●' : '○'}</Text>
          </View>
        ))}
      </View>

      <TextInput
        ref={pinInputRef}
        style={styles.pinInputBox}
        maxLength={4}
        keyboardType="numeric"
        secureTextEntry
        value={enteredPin}
        onChangeText={handlePinChange}
        placeholder="• • • •"
        placeholderTextColor="#cbd5e1"
        textAlign="center"
        autoFocus
      />

      {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}

      <View style={styles.pinModalButtons}>
        <TouchableOpacity 
          style={styles.pinCancelButton} 
          onPress={() => setShowPinModal(false)}
        >
          <Text style={styles.pinCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
</Modal>
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
  tabBar: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 14, color: '#64748b' },
  tabTextActive: { color: '#2563eb', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  formCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  verifyButton: { backgroundColor: '#f1f5f9', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  verifyButtonText: { color: '#2563eb', fontWeight: '500' },
  verifiedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 10, backgroundColor: '#d1fae5', borderRadius: 10 },
  verifiedText: { color: '#10b981', fontSize: 12, fontWeight: '500' },
  meterTypeButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  meterTypeActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  meterTypeText: { color: '#64748b' },
  meterTypeTextActive: { color: 'white' },
  providerScroll: { flexDirection: 'row', marginBottom: 8 },
  providerChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  providerChipActive: { backgroundColor: '#2563eb' },
  providerChipText: { color: '#475569' },
  providerChipTextActive: { color: 'white' },
  bundleScroll: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  bundleCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, minWidth: 120, alignItems: 'center' },
  bundleCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  bundleName: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  bundlePrice: { fontSize: 16, fontWeight: 'bold', color: '#2563eb', marginTop: 4 },
  bundleValidity: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  amountBox: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 16 },
  amountLabel: { fontSize: 14, color: '#64748b' },
  amountValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginTop: 4 },
  payButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  payButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pinModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '85%', alignItems: 'center' },
  pinModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 12 },
  pinModalSubtitle: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center', marginBottom: 20 },
  pinDotsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
  pinDot: { width: 55, height: 55, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  pinDotFilled: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  pinDotText: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  hiddenInput: { position: 'absolute', width: '100%', height: 50, opacity: 0 }, // Optimized for focus
  pinErrorText: { color: '#ef4444', fontSize: 12, marginTop: 8, textAlign: 'center' },
  pinModalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 16 },
  pinCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  pinCancelText: { color: '#64748b', fontWeight: '500' },
  pinConfirmButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center' },
  pinConfirmDisabled: { opacity: 0.5 },
  pinConfirmText: { color: 'white', fontWeight: '500' },
 pinInputBox: {
  width: 200,
  height: 55,
  fontSize: 28,
  fontWeight: 'bold',
  textAlign: 'center',
  letterSpacing: 12,
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  marginVertical: 20,
  color: '#1e293b',
},
});