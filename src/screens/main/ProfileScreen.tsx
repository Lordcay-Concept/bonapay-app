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
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '' });
  const [kycStatus, setKycStatus] = useState('pending');
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [showKycModal, setShowKycModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(data);
    setEditData({
      fullName: data?.full_name || '',
      phone: data?.phone || '',
    });
    setKycStatus(data?.kyc_status || 'pending');
    setBvn(data?.bvn || '');
    setNin(data?.nin || '');
    setLoading(false);
  };

  const updateProfile = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editData.fullName,
        phone: editData.phone,
      })
      .eq('id', user.id);
    
    if (error) {
      Alert.alert('Error', 'Failed to update profile');
    } else {
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      loadProfile();
    }
  };

  const submitKyc = async () => {
    if (!bvn || !nin) {
      Alert.alert('Error', 'Please enter both BVN and NIN');
      return;
    }
    
    if (bvn.length !== 11 || nin.length !== 11) {
      Alert.alert('Error', 'BVN and NIN must be 11 digits');
      return;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({
        bvn: bvn,
        nin: nin,
        kyc_status: 'pending',
      })
      .eq('id', user?.id);
    
    if (error) {
      Alert.alert('Error', 'Failed to submit KYC');
    } else {
      Alert.alert('Success', 'KYC submitted for verification');
      setShowKycModal(false);
      loadProfile();
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut }
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </Text>
          </View>
          {!isEditing ? (
            <TouchableOpacity style={styles.editIcon} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={20} color="white" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.kycBadge}>
            <Text style={styles.kycText}>
              KYC: {kycStatus === 'verified' ? 'Verified' : kycStatus === 'pending' ? 'Pending' : 'Not Started'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Edit Profile Form */}
      {isEditing && (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Edit Profile</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={editData.fullName}
            onChangeText={(text) => setEditData({ ...editData, fullName: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={editData.phone}
            onChangeText={(text) => setEditData({ ...editData, phone: text })}
          />
          <View style={styles.editButtons}>
            <TouchableOpacity style={styles.cancelEditButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveEditButton} onPress={updateProfile}>
              <Text style={styles.saveEditText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* KYC Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Identity Verification</Text>
        <Text style={styles.sectionDesc}>Verify your identity to increase limits</Text>
        
        <View style={styles.kycStatusRow}>
          <Text style={styles.kycStatusLabel}>Status:</Text>
          <Text style={[styles.kycStatusValue, { color: kycStatus === 'verified' ? '#10b981' : '#f59e0b' }]}>
            {kycStatus === 'verified' ? 'Verified' : kycStatus === 'pending' ? 'Pending Review' : 'Not Verified'}
          </Text>
        </View>
        
        {kycStatus !== 'verified' && (
          <TouchableOpacity style={styles.kycButton} onPress={() => setShowKycModal(true)}>
            <Text style={styles.kycButtonText}>Complete KYC</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account Info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Tier</Text>
          <Text style={styles.infoValue}>Tier {profile?.tier || 1}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Referral Code</Text>
          <Text style={styles.infoValue}>{profile?.referral_code || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Security')}>
          <Ionicons name="shield-outline" size={22} color="#4b5563" />
          <Text style={styles.menuText}>Security</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Beneficiaries')}>
          <Ionicons name="people-outline" size={22} color="#4b5563" />
          <Text style={styles.menuText}>Beneficiaries</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Statements')}>
          <Ionicons name="document-text-outline" size={22} color="#4b5563" />
          <Text style={styles.menuText}>Account Statements</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Referral')}>
          <Ionicons name="gift-outline" size={22} color="#4b5563" />
          <Text style={styles.menuText}>Refer & Earn</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SupportTickets')}>
          <Ionicons name="chatbubbles-outline" size={22} color="#4b5563" />
          <Text style={styles.menuText}>Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>

      {/* KYC Modal */}
      <Modal visible={showKycModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Identity Verification</Text>
            <Text style={styles.modalSubtitle}>Enter your BVN and NIN</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="BVN (11 digits)"
              keyboardType="numeric"
              maxLength={11}
              value={bvn}
              onChangeText={setBvn}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="NIN (11 digits)"
              keyboardType="numeric"
              maxLength={11}
              value={nin}
              onChangeText={setNin}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowKycModal(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModalButton} onPress={submitKyc}>
                <Text style={styles.confirmModalText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
  profileInfo: { alignItems: 'center', position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#2563eb' },
  editIcon: { position: 'absolute', top: 60, right: -40 },
  userName: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#bfdbfe', marginBottom: 8 },
  kycBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  kycText: { fontSize: 12, color: 'white' },
  editCard: { backgroundColor: 'white', marginHorizontal: 16, marginTop: -20, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  editTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  editButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelEditButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelEditText: { color: '#6b7280', fontWeight: '500' },
  saveEditButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  saveEditText: { color: 'white', fontWeight: '500' },
  sectionCard: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  kycStatusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  kycStatusLabel: { fontSize: 14, color: '#4b5563', flex: 1 },
  kycStatusValue: { fontSize: 14, fontWeight: '500' },
  kycButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  kycButtonText: { color: 'white', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  menuSection: { marginHorizontal: 16, marginTop: 16, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  menuText: { flex: 1, fontSize: 15, color: '#1f2937', marginLeft: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', marginHorizontal: 16, marginTop: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
  logoutText: { fontSize: 16, color: '#ef4444', fontWeight: '500' },
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 20, marginBottom: 40 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});