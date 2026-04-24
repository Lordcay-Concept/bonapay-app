import React, { useState, useEffect } from 'react';
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
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { billService } from '../../services/bill.service';

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
  size_mb: number;
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
  channels?: number;
}

interface BettingPlatform {
  code: string;
  name: string;
  min_deposit: number;
}

export default function BillsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('electricity');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Airtime state
  const [airtimePhone, setAirtimePhone] = useState('');
  const [airtimeNetwork, setAirtimeNetwork] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('');
  const [detectedNetwork, setDetectedNetwork] = useState<Network | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);

  // Data state
  const [dataPhone, setDataPhone] = useState('');
  const [dataNetwork, setDataNetwork] = useState('');
  const [dataBundle, setDataBundle] = useState('');
  const [dataAmount, setDataAmount] = useState(0);
  const [dataBundles, setDataBundles] = useState<DataBundle[]>([]);

  // Electricity state
  const [electricityProvider, setElectricityProvider] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [electricityAmount, setElectricityAmount] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [electricityProviders, setElectricityProviders] = useState<ElectricityProvider[]>([]);

  // Cable TV state
  const [cableProvider, setCableProvider] = useState('');
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [cablePackage, setCablePackage] = useState('');
  const [cableAmount, setCableAmount] = useState(0);
  const [cableProviders, setCableProviders] = useState<CableProvider[]>([]);
  const [cablePackages, setCablePackages] = useState<CablePackage[]>([]);

  // Betting state
  const [bettingPlatform, setBettingPlatform] = useState('');
  const [bettingPhone, setBettingPhone] = useState('');
  const [bettingAmount, setBettingAmount] = useState('');
  const [bettingPlatforms, setBettingPlatforms] = useState<BettingPlatform[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (dataNetwork) {
      loadDataBundles();
    }
  }, [dataNetwork]);

  useEffect(() => {
    if (cableProvider) {
      loadCablePackages();
    }
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
      } else {
        setDetectedNetwork(null);
        setAirtimeNetwork('');
      }
    } else {
      setDetectedNetwork(null);
      setAirtimeNetwork('');
    }
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
      } else {
        Alert.alert('Error', result.error || 'Verification failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleElectricityPayment = () => {
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
      meterType,
      amount,
      customerName: verifiedName || 'Customer',
    });
    setShowConfirm(true);
  };

  const handleAirtimePayment = () => {
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
    setShowConfirm(true);
  };

  const handleDataPayment = () => {
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
    setShowConfirm(true);
  };

  const handleCablePayment = () => {
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
    setShowConfirm(true);
  };

  const handleBettingPayment = () => {
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
    setShowConfirm(true);
  };

  const verifyAndConfirmPayment = async () => {
    if (!paymentDetails || !user) return;

    const storedPin = await SecureStore.getItemAsync('transaction_pin');
    
    if (!storedPin) {
      Alert.alert('Setup Required', 'Please set up your transaction PIN first', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set Up PIN', onPress: () => navigation.navigate('Security') }
      ]);
      return;
    }

    setShowConfirm(false);
    setEnteredPin('');
    setShowPinModal(true);
  };

  const handlePinSubmit = async () => {
    if (!enteredPin || enteredPin.length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit PIN');
      return;
    }

    const storedPin = await SecureStore.getItemAsync('transaction_pin');
    
    if (enteredPin !== storedPin) {
      Alert.alert('Error', 'Invalid PIN. Please try again.');
      setEnteredPin('');
      return;
    }

    setShowPinModal(false);
    await processPayment();
  };

  const processPayment = async () => {
    if (!paymentDetails || !user) return;

    setLoading(true);
    try {
      let result;
      switch (paymentDetails.type) {
        case 'electricity':
          result = await billService.payElectricity(user.id, {
            meterNumber: paymentDetails.meterNumber,
            meterType: paymentDetails.meterType,
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
          { text: 'OK', onPress: () => {
            setShowConfirm(false);
            resetForms();
          }}
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bill Payments</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.tabWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? '#2563eb' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'electricity' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Electricity Bill Payment</Text>
            <Text style={styles.label}>Provider</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {electricityProviders.map(provider => (
                  <TouchableOpacity
                    key={provider.code}
                    style={[styles.pickerOption, electricityProvider === provider.code && styles.pickerOptionActive]}
                    onPress={() => setElectricityProvider(provider.code)}
                  >
                    <Text style={[styles.pickerOptionText, electricityProvider === provider.code && styles.pickerOptionTextActive]}>
                      {provider.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.label}>Meter Number</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter meter number"
                value={meterNumber}
                onChangeText={setMeterNumber}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.verifyButton} onPress={verifyElectricityMeter} disabled={verifying}>
                {verifying ? <ActivityIndicator size="small" color="#2563eb" /> : <Text style={styles.verifyButtonText}>Verify</Text>}
              </TouchableOpacity>
            </View>
            {verifiedName !== '' && (
              <View style={styles.verifiedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.verifiedText}>Customer: {verifiedName}</Text>
              </View>
            )}
            <Text style={styles.label}>Meter Type</Text>
            <View style={styles.meterTypeRow}>
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
            <TouchableOpacity style={styles.payButton} onPress={handleElectricityPayment}>
              <Text style={styles.payButtonText}>Pay Electricity Bill</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'airtime' && (
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
            {detectedNetwork && airtimePhone.length >= 4 && (
              <View style={styles.verifiedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.verifiedText}>Detected: {detectedNetwork.name}</Text>
              </View>
            )}
            <Text style={styles.label}>Network</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {networks.map(network => (
                  <TouchableOpacity
                    key={network.code}
                    style={[styles.pickerOption, airtimeNetwork === network.code && styles.pickerOptionActive]}
                    onPress={() => setAirtimeNetwork(network.code)}
                  >
                    <Text style={[styles.pickerOptionText, airtimeNetwork === network.code && styles.pickerOptionTextActive]}>
                      {network.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.label}>Amount (₦)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={airtimeAmount}
              onChangeText={setAirtimeAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.payButton} onPress={handleAirtimePayment}>
              <Text style={styles.payButtonText}>Buy Airtime</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'data' && (
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
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {networks.map(network => (
                  <TouchableOpacity
                    key={network.code}
                    style={[styles.pickerOption, dataNetwork === network.code && styles.pickerOptionActive]}
                    onPress={() => setDataNetwork(network.code)}
                  >
                    <Text style={[styles.pickerOptionText, dataNetwork === network.code && styles.pickerOptionTextActive]}>
                      {network.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {dataNetwork !== '' && dataBundles.length > 0 && (
              <>
                <Text style={styles.label}>Data Bundle</Text>
                <View style={styles.bundlesContainer}>
                  {dataBundles.map(bundle => (
                    <TouchableOpacity
                      key={bundle.id}
                      style={[styles.bundleOption, dataBundle === bundle.id && styles.bundleOptionActive]}
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
                </View>
              </>
            )}
            {dataAmount > 0 && (
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Amount to pay:</Text>
                <Text style={styles.amountValue}>₦{dataAmount.toLocaleString()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.payButton} onPress={handleDataPayment}>
              <Text style={styles.payButtonText}>Buy Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'cable' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Cable TV Subscription</Text>
            <Text style={styles.label}>Provider</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cableProviders.map(provider => (
                  <TouchableOpacity
                    key={provider.code}
                    style={[styles.pickerOption, cableProvider === provider.code && styles.pickerOptionActive]}
                    onPress={() => setCableProvider(provider.code)}
                  >
                    <Text style={[styles.pickerOptionText, cableProvider === provider.code && styles.pickerOptionTextActive]}>
                      {provider.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.label}>Smart Card Number (IUC)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter smart card number"
              value={smartCardNumber}
              onChangeText={setSmartCardNumber}
              keyboardType="numeric"
            />
            {cableProvider !== '' && cablePackages.length > 0 && (
              <>
                <Text style={styles.label}>Package</Text>
                <View style={styles.bundlesContainer}>
                  {cablePackages.map(pkg => (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.bundleOption, cablePackage === pkg.id && styles.bundleOptionActive]}
                      onPress={() => {
                        setCablePackage(pkg.id);
                        setCableAmount(pkg.price);
                      }}
                    >
                      <Text style={styles.bundleName}>{pkg.name}</Text>
                      <Text style={styles.bundlePrice}>₦{pkg.price.toLocaleString()}</Text>
                      {pkg.channels && <Text style={styles.bundleValidity}>{pkg.channels} channels</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {cableAmount > 0 && (
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Amount to pay:</Text>
                <Text style={styles.amountValue}>₦{cableAmount.toLocaleString()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.payButton} onPress={handleCablePayment}>
              <Text style={styles.payButtonText}>Pay Cable TV</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'betting' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Fund Betting Account</Text>
            <Text style={styles.label}>Betting Platform</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {bettingPlatforms.map(platform => (
                  <TouchableOpacity
                    key={platform.code}
                    style={[styles.pickerOption, bettingPlatform === platform.code && styles.pickerOptionActive]}
                    onPress={() => setBettingPlatform(platform.code)}
                  >
                    <Text style={[styles.pickerOptionText, bettingPlatform === platform.code && styles.pickerOptionTextActive]}>
                      {platform.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
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
            <Text style={styles.minText}>Minimum: ₦100</Text>
            <TouchableOpacity style={styles.payButton} onPress={handleBettingPayment}>
              <Text style={styles.payButtonText}>Fund Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={48} color="#f59e0b" />
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            {paymentDetails && (
              <View style={styles.modalDetails}>
                {paymentDetails.type === 'electricity' && (
                  <>
                    <Text style={styles.modalText}>Provider: {paymentDetails.provider}</Text>
                    <Text style={styles.modalText}>Meter: {paymentDetails.meterNumber}</Text>
                    <Text style={styles.modalText}>Customer: {paymentDetails.customerName}</Text>
                    <Text style={styles.modalText}>Amount: ₦{paymentDetails.amount.toLocaleString()}</Text>
                  </>
                )}
                {paymentDetails.type === 'airtime' && (
                  <>
                    <Text style={styles.modalText}>Phone: {paymentDetails.phoneNumber}</Text>
                    <Text style={styles.modalText}>Network: {paymentDetails.network}</Text>
                    <Text style={styles.modalText}>Amount: ₦{paymentDetails.amount.toLocaleString()}</Text>
                  </>
                )}
                {paymentDetails.type === 'data' && (
                  <>
                    <Text style={styles.modalText}>Phone: {paymentDetails.phoneNumber}</Text>
                    <Text style={styles.modalText}>Network: {paymentDetails.network}</Text>
                    <Text style={styles.modalText}>Plan: {paymentDetails.bundleName}</Text>
                    <Text style={styles.modalText}>Amount: ₦{paymentDetails.amount.toLocaleString()}</Text>
                  </>
                )}
                {paymentDetails.type === 'cable' && (
                  <>
                    <Text style={styles.modalText}>Provider: {paymentDetails.provider}</Text>
                    <Text style={styles.modalText}>Smart Card: {paymentDetails.smartCardNumber}</Text>
                    <Text style={styles.modalText}>Package: {paymentDetails.packageName}</Text>
                    <Text style={styles.modalText}>Amount: ₦{paymentDetails.amount.toLocaleString()}</Text>
                  </>
                )}
                {paymentDetails.type === 'betting' && (
                  <>
                    <Text style={styles.modalText}>Platform: {paymentDetails.platform}</Text>
                    <Text style={styles.modalText}>Phone: {paymentDetails.phoneNumber}</Text>
                    <Text style={styles.modalText}>Amount: ₦{paymentDetails.amount.toLocaleString()}</Text>
                  </>
                )}
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowConfirm(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModalButton} onPress={verifyAndConfirmPayment} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmModalText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Input Modal */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.pinModalContent}>
            <Ionicons name="lock-closed" size={48} color="#2563eb" />
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>Enter your 4-digit PIN to complete this payment</Text>
            
            <View style={styles.pinInputContainer}>
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  style={styles.pinInputBox}
                  maxLength={1}
                  keyboardType="numeric"
                  secureTextEntry
                  value={enteredPin[index] || ''}
                  onChangeText={(text) => {
                    const newPin = enteredPin.split('');
                    newPin[index] = text;
                    setEnteredPin(newPin.join(''));
                  }}
                  textAlign="center"
                />
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowPinModal(false);
                  setEnteredPin('');
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handlePinSubmit}
              >
                <Text style={styles.confirmModalText}>Submit</Text>
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
    backgroundColor: '#2563eb',
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  tabWrapper: {
    backgroundColor: 'white',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: { fontSize: 14, color: '#6b7280' },
  tabTextActive: { color: '#2563eb', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  formCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff' },
  inputRow: { flexDirection: 'row', gap: 12 },
  verifyButton: { backgroundColor: '#f3f4f6', paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  verifyButtonText: { color: '#2563eb', fontWeight: '500' },
  verifiedContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, backgroundColor: '#d1fae5', borderRadius: 8 },
  verifiedText: { color: '#10b981', fontSize: 12 },
  meterTypeRow: { flexDirection: 'row', gap: 12 },
  meterTypeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  meterTypeActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  meterTypeText: { color: '#6b7280' },
  meterTypeTextActive: { color: 'white' },
  pickerContainer: { flexDirection: 'row', marginBottom: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  pickerOptionActive: { backgroundColor: '#2563eb' },
  pickerOptionText: { color: '#4b5563' },
  pickerOptionTextActive: { color: 'white' },
  bundlesContainer: { gap: 12 },
  bundleOption: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bundleOptionActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  bundleName: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  bundlePrice: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  bundleValidity: { fontSize: 12, color: '#6b7280' },
  amountContainer: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 16 },
  amountLabel: { fontSize: 14, color: '#6b7280' },
  amountValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  minText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  payButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  payButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  pinModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  modalSubtitle: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  modalDetails: { width: '100%', marginBottom: 20 },
  modalText: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#f3f4f6' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { backgroundColor: '#2563eb' },
  confirmModalText: { color: 'white', fontWeight: '500' },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 20,
  },
  pinInputBox: {
    width: 55,
    height: 55,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
  },
});