import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';

export default function ReferralScreen({ navigation }: any) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single();
    
    setReferralCode(profile?.referral_code || generateReferralCode());
    
    // Get referral count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', user.id);
    
    setReferralCount(count || 0);
    setTotalEarned((count || 0) * 1000);
  };

  const generateReferralCode = () => {
    const code = user?.email?.slice(0, 5).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase();
    return code;
  };

  const copyReferralCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    Alert.alert('Copied', 'Referral code copied to clipboard');
  };

  const shareReferral = async () => {
    try {
      await Share.share({
        message: `Join BonaPay using my referral code: ${referralCode} and get ₦1,000 bonus! Download BonaPay app today.`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.bannerCard}>
          <Ionicons name="gift" size={48} color="#f59e0b" />
          <Text style={styles.bannerTitle}>Invite Friends, Earn ₦1,000</Text>
          <Text style={styles.bannerText}>
            Each friend you invite gets ₦1,000 bonus and you get ₦1,000 when they sign up!
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referralCount}</Text>
            <Text style={styles.statLabel}>Referrals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₦{totalEarned.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeValue}>{referralCode}</Text>
            <TouchableOpacity onPress={copyReferralCode} style={styles.copyButton}>
              <Ionicons name="copy" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={shareReferral}>
          <Ionicons name="share-social" size={24} color="white" />
          <Text style={styles.shareButtonText}>Invite Friends</Text>
        </TouchableOpacity>

        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>How It Works</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share Your Code</Text>
              <Text style={styles.stepDesc}>Share your unique referral code with friends</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Friend Signs Up</Text>
              <Text style={styles.stepDesc}>They enter your code when creating account</Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Both Get Rewarded</Text>
              <Text style={styles.stepDesc}>You both receive ₦1,000 bonus instantly</Text>
            </View>
          </View>
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
  bannerCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#92400e', marginTop: 12, marginBottom: 8 },
  bannerText: { fontSize: 14, color: '#92400e', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  codeCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20 },
  codeLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeValue: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', letterSpacing: 2 },
  copyButton: { padding: 8 },
  shareButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  shareButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  howItWorks: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 40 },
  howTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  step: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumberText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  stepDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});