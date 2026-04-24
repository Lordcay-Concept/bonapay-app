import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Reward {
  id: string;
  name: string;
  points: number;
  description: string;
}

export default function LoyaltyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [points, setPoints] = useState(2500);
  const [transactions, setTransactions] = useState([
    { id: '1', description: 'Money Transfer', points: 50, date: '2025-04-20' },
    { id: '2', description: 'Bill Payment', points: 30, date: '2025-04-19' },
    { id: '3', description: 'Referral Bonus', points: 500, date: '2025-04-15' },
  ]);

  const rewards: Reward[] = [
    { id: '1', name: '₦500 Cashback', points: 500, description: 'Redeem for ₦500 cash' },
    { id: '2', name: '₦1,000 Cashback', points: 1000, description: 'Redeem for ₦1,000 cash' },
    { id: '3', name: 'Data Bundle (5GB)', points: 1500, description: '5GB data valid for 30 days' },
    { id: '4', name: 'Airtime (₦2,000)', points: 2000, description: 'Get ₦2,000 airtime' },
  ];

  const redeemReward = (reward: Reward) => {
    if (points >= reward.points) {
      setPoints(points - reward.points);
      // Add redemption transaction
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loyalty Points</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.pointsCard}>
          <Ionicons name="star" size={48} color="#f59e0b" />
          <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
          <Text style={styles.pointsLabel}>Total Points</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          {rewards.map((reward) => (
            <View key={reward.id} style={styles.rewardCard}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardDesc}>{reward.description}</Text>
              </View>
              <View style={styles.rewardRight}>
                <Text style={styles.rewardPoints}>{reward.points} pts</Text>
                <TouchableOpacity 
                  style={[styles.redeemButton, points < reward.points && styles.redeemDisabled]}
                  onPress={() => redeemReward(reward)}
                  disabled={points < reward.points}
                >
                  <Text style={styles.redeemText}>Redeem</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Points History</Text>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.historyCard}>
              <View>
                <Text style={styles.historyDesc}>{tx.description}</Text>
                <Text style={styles.historyDate}>{tx.date}</Text>
              </View>
              <Text style={styles.historyPoints}>+{tx.points}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Earn 1 point for every ₦100 spent. Points never expire!
          </Text>
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
  pointsCard: { backgroundColor: '#fef3c7', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  pointsValue: { fontSize: 48, fontWeight: 'bold', color: '#92400e', marginTop: 12 },
  pointsLabel: { fontSize: 14, color: '#92400e', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  rewardCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  rewardInfo: { flex: 1 },
  rewardName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  rewardDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rewardRight: { alignItems: 'flex-end', gap: 8 },
  rewardPoints: { fontSize: 14, fontWeight: '600', color: '#f59e0b' },
  redeemButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  redeemDisabled: { backgroundColor: '#9ca3af' },
  redeemText: { color: 'white', fontSize: 12, fontWeight: '500' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8 },
  historyDesc: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  historyDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  historyPoints: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, gap: 12, marginBottom: 40 },
  infoText: { flex: 1, fontSize: 14, color: '#1e40af' },
});