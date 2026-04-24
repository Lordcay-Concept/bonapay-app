import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  tier: number;
  is_verified: boolean;
  created_at: string;
}

export default function AdminUsersScreen({ navigation }: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserTier = async (userId: string, tier: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tier })
        .eq('id', userId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'User tier updated');
      loadUsers();
      setShowModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update user tier');
    }
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update verification status');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.avatarText}>{user.full_name?.charAt(0) || 'U'}</Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.full_name || 'No Name'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userMeta}>
                  Tier {user.tier} • Joined {formatDate(user.created_at)}
                </Text>
              </View>
            </View>
            <View style={styles.userActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setSelectedUser(user);
                  setShowModal(true);
                }}
              >
                <Ionicons name="create" size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => toggleVerification(user.id, user.is_verified)}
              >
                <Ionicons 
                  name={user.is_verified ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={user.is_verified ? '#10b981' : '#ef4444'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Update User Modal */}
      <Modal visible={showModal && selectedUser !== null} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update User</Text>
            <Text style={styles.userNameModal}>{selectedUser?.full_name}</Text>
            <Text style={styles.userEmailModal}>{selectedUser?.email}</Text>
            
            <Text style={styles.tierLabel}>Account Tier</Text>
            <View style={styles.tierRow}>
              {[1, 2, 3].map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[
                    styles.tierButton,
                    selectedUser?.tier === tier && styles.tierButtonActive,
                  ]}
                  onPress={() => selectedUser && updateUserTier(selectedUser.id, tier)}
                >
                  <Text style={[
                    styles.tierButtonText,
                    selectedUser?.tier === tier && styles.tierButtonTextActive,
                  ]}>Tier {tier}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, marginBottom: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 16 },
  userCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  userDetails: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  userEmail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  userMeta: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  userActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  userNameModal: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  userEmailModal: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  tierLabel: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8, alignSelf: 'flex-start' },
  tierRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tierButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  tierButtonActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tierButtonText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  tierButtonTextActive: { color: 'white' },
  closeButton: { backgroundColor: '#f3f4f6', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  closeButtonText: { color: '#6b7280', fontWeight: '500' },
});