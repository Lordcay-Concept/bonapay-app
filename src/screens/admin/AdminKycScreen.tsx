import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

interface KycRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  document_type: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminKycScreen({ navigation }: any) {
  const [requests, setRequests] = useState<KycRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<KycRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKycRequests();
  }, []);

  const loadKycRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('kyc_requests')
        .select(`
          *,
          profiles!user_id (
            full_name,
            email
          )
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to match interface
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || 'Unknown',
      }));
      
      setRequests(formattedData);
    } catch (error) {
      console.error('Error loading KYC requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateKycStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('kyc_requests')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      
      if (error) throw error;
      
      Alert.alert('Success', `KYC ${status} successfully`);
      setShowModal(false);
      loadKycRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to update KYC status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{requests.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={styles.emptyText}>No pending KYC requests</Text>
          </View>
        ) : (
          requests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => {
                setSelectedRequest(request);
                setShowModal(true);
              }}
            >
              <View style={styles.requestHeader}>
                <Text style={styles.userName}>{request.full_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {request.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.userEmail}>{request.email}</Text>
              <Text style={styles.documentType}>Document: {request.document_type}</Text>
              <Text style={styles.submittedDate}>Submitted: {formatDate(request.submitted_at)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Review Modal */}
        <Modal visible={showModal && selectedRequest !== null} transparent animationType="slide">
          <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review KYC</Text>
            <Text style={styles.userNameModal}>{selectedRequest?.full_name}</Text>
            <Text style={styles.userEmailModal}>{selectedRequest?.email}</Text>
            <Text style={styles.documentLabel}>Document Type: {selectedRequest?.document_type}</Text>
            
            <View style={styles.documentPreview}>
              <Ionicons name="document-text" size={48} color="#2563eb" />
              <Text style={styles.previewText}>Document Preview</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.rejectButton]}
                onPress={() => selectedRequest && updateKycStatus(selectedRequest.id, 'rejected')}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.approveButton]}
                onPress={() => selectedRequest && updateKycStatus(selectedRequest.id, 'approved')}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
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
  content: { flex: 1, padding: 16 },
  statsRow: { marginBottom: 20 },
  statCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  requestCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  userEmail: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  documentType: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  submittedDate: { fontSize: 10, color: '#9ca3af' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  userNameModal: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  userEmailModal: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  documentLabel: { fontSize: 14, color: '#4b5563', marginBottom: 16 },
  documentPreview: { width: '100%', height: 150, backgroundColor: '#f3f4f6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  previewText: { fontSize: 12, color: '#6b7280', marginTop: 8 },
  modalButtons: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  rejectButton: { backgroundColor: '#fee2e2' },
  rejectButtonText: { color: '#ef4444', fontWeight: '500' },
  approveButton: { backgroundColor: '#d1fae5' },
  approveButtonText: { color: '#10b981', fontWeight: '500' },
  closeButton: { paddingVertical: 8, paddingHorizontal: 16 },
  closeButtonText: { color: '#6b7280' },
});