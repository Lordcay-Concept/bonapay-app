import React, { useState } from 'react';
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

interface AdminTicket {
  id: string;
  user: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  timestamp: string;
}

export default function AdminSupportTicketsScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<AdminTicket[]>([
    { id: '1', user: 'john@example.com', subject: 'Login Issue', description: 'Cannot login to account', priority: 'high', status: 'open', timestamp: new Date().toISOString() },
    { id: '2', user: 'jane@example.com', subject: 'Transaction Failed', description: 'Money deducted but not received', priority: 'urgent', status: 'in_progress', timestamp: new Date().toISOString() },
  ]);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showModal, setShowModal] = useState(false);

  const updateTicketStatus = (ticketId: string, newStatus: AdminTicket['status']) => {
    setTickets(prevTickets => 
      prevTickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      )
    );
    Alert.alert('Success', `Ticket status updated to ${newStatus}`);
  };

  const sendReply = () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply message');
      return;
    }
    Alert.alert('Success', 'Reply sent to customer');
    setReplyText('');
    setShowModal(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'urgent': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Tickets</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {tickets.map((ticket) => (
          <TouchableOpacity
            key={ticket.id}
            style={styles.ticketCard}
            onPress={() => {
              setSelectedTicket(ticket);
              setShowModal(true);
            }}
          >
            <View style={styles.ticketHeader}>
              <Text style={styles.userEmail}>{ticket.user}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) + '20' }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(ticket.priority) }]}>
                  {ticket.priority.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
            <Text style={styles.ticketDesc} numberOfLines={2}>{ticket.description}</Text>
            <View style={styles.ticketFooter}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                  {ticket.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDate(ticket.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ticket Detail Modal */}
      <Modal visible={showModal && selectedTicket !== null} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ticket Details</Text>
            <Text style={styles.userEmailModal}>{selectedTicket?.user}</Text>
            <Text style={styles.ticketSubjectModal}>{selectedTicket?.subject}</Text>
            <Text style={styles.ticketDescModal}>{selectedTicket?.description}</Text>
            
            <Text style={styles.statusLabel}>Update Status</Text>
            <View style={styles.statusRow}>
              {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedTicket?.status === status && styles.statusOptionActive,
                  ]}
                  onPress={() => selectedTicket && updateTicketStatus(selectedTicket.id, status)}
                >
                  <Text style={[
                    styles.statusOptionText,
                    selectedTicket?.status === status && styles.statusOptionTextActive,
                  ]}>{status.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply..."
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.sendButton]}
                onPress={sendReply}
              >
                <Text style={styles.sendButtonText}>Send Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeModalButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeModalText}>Close</Text>
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
  ticketCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  userEmail: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 10, fontWeight: '600' },
  ticketSubject: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  ticketDesc: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  dateText: { fontSize: 10, color: '#9ca3af' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  userEmailModal: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  ticketSubjectModal: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  ticketDescModal: { fontSize: 14, color: '#4b5563', marginBottom: 16 },
  statusLabel: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
  statusOptionActive: { backgroundColor: '#2563eb' },
  statusOptionText: { fontSize: 10, color: '#6b7280' },
  statusOptionTextActive: { color: 'white' },
  replyInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginBottom: 16, minHeight: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  sendButton: { backgroundColor: '#2563eb' },
  sendButtonText: { color: 'white', fontWeight: '500' },
  closeModalButton: { backgroundColor: '#f3f4f6' },
  closeModalText: { color: '#6b7280', fontWeight: '500' },
});