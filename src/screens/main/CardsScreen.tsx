import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Card {
  id: string;
  last4: string;
  brand: 'visa' | 'mastercard' | 'verve';
  expiry: string;
  isFrozen: boolean;
  isPhysical: boolean;
  cardholderName: string;
}

export default function CardsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [virtualCards, setVirtualCards] = useState<Card[]>([]);
  const [physicalCard, setPhysicalCard] = useState<Card | null>(null);
  const [showCardDetails, setShowCardDetails] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    if (!user) return;

    // Load virtual cards
    const { data: virtualData } = await supabase
      .from('virtual_cards')
      .select('*')
      .eq('user_id', user.id);
    
    setVirtualCards(virtualData || []);

    // Check if user has a physical card
    const { data: physicalData } = await supabase
      .from('physical_cards')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    setPhysicalCard(physicalData || null);
    setLoading(false);
  };

  const toggleFreeze = async (cardId: string, isFrozen: boolean, isPhysical: boolean) => {
    const table = isPhysical ? 'physical_cards' : 'virtual_cards';
    const { error } = await supabase
      .from(table)
      .update({ is_frozen: !isFrozen })
      .eq('id', cardId);

    if (!error) {
      if (isPhysical) {
        setPhysicalCard(prev => prev ? { ...prev, isFrozen: !isFrozen } : null);
      } else {
        setVirtualCards(prev => prev.map(card => 
          card.id === cardId ? { ...card, isFrozen: !isFrozen } : card
        ));
      }
      Alert.alert('Success', `Card ${!isFrozen ? 'frozen' : 'unfrozen'} successfully`);
    }
  };

  const deleteCard = async (cardId: string, isPhysical: boolean) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const table = isPhysical ? 'physical_cards' : 'virtual_cards';
            const { error } = await supabase
              .from(table)
              .delete()
              .eq('id', cardId);
            
            if (!error) {
              if (isPhysical) {
                setPhysicalCard(null);
              } else {
                setVirtualCards(prev => prev.filter(card => card.id !== cardId));
              }
              Alert.alert('Success', 'Card deleted successfully');
            }
          }
        }
      ]
    );
  };

  const createVirtualCard = async () => {
    const newCard = {
      user_id: user?.id,
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      brand: ['visa', 'mastercard', 'verve'][Math.floor(Math.random() * 3)],
      expiry: '12/28',
      is_frozen: false,
      is_physical: false,
      cardholder_name: user?.email?.split('@')[0] || 'User',
    };

    const { data, error } = await supabase
      .from('virtual_cards')
      .insert(newCard)
      .select()
      .single();

    if (!error && data) {
      setVirtualCards([...virtualCards, data]);
      Alert.alert('Success', 'Virtual card created successfully');
    } else {
      Alert.alert('Error', 'Failed to create virtual card');
    }
  };

  const orderPhysicalCard = async () => {
    const newCard = {
      user_id: user?.id,
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      brand: 'visa',
      expiry: '12/28',
      is_frozen: false,
      is_physical: true,
      cardholder_name: user?.email?.split('@')[0] || 'User',
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('physical_cards')
      .insert(newCard)
      .select()
      .single();

    if (!error && data) {
      setPhysicalCard(data);
      setShowOrderModal(false);
      Alert.alert('Success', 'Physical card ordered! Delivery in 5-7 business days');
    } else {
      Alert.alert('Error', 'Failed to order physical card');
    }
  };

  const getCardColors = (brand: string): [string, string] => {
    switch (brand) {
      case 'visa':
        return ['#1a1a2e', '#16213e'];
      case 'mastercard':
        return ['#f5b042', '#f59e0b'];
      default:
        return ['#0891b2', '#06b6d4'];
    }
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
        <Text>Loading cards...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cards</Text>
        <TouchableOpacity onPress={createVirtualCard} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Physical Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Card</Text>
          {physicalCard ? (
            <TouchableOpacity
              style={styles.cardContainer}
              onPress={() => setShowCardDetails(physicalCard.id)}
            >
              <LinearGradient
                colors={getCardColors(physicalCard.brand)}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="card" size={40} color="white" />
                  <View style={styles.cardChip}>
                    <Ionicons name="card-outline" size={24} color="rgba(255,255,255,0.5)" />
                  </View>
                </View>
                <Text style={styles.cardNumber}>**** **** **** {physicalCard.last4}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardHolder}>{physicalCard.cardholderName}</Text>
                  <Text style={styles.cardExpiry}>Expires {physicalCard.expiry}</Text>
                </View>
                {physicalCard.isFrozen && (
                  <View style={styles.frozenBadge}>
                    <Text style={styles.frozenText}>FROZEN</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.orderCardButton} onPress={() => setShowOrderModal(true)}>
              <Ionicons name="card-outline" size={32} color="#2563eb" />
              <Text style={styles.orderCardText}>Order Physical Card</Text>
              <Text style={styles.orderCardSubtext}>Get a physical debit card delivered to you</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Virtual Cards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Virtual Cards</Text>
          {virtualCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No virtual cards yet</Text>
              <TouchableOpacity style={styles.createCardButton} onPress={createVirtualCard}>
                <Text style={styles.createCardButtonText}>Create Virtual Card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            virtualCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.cardContainer}
                onPress={() => setShowCardDetails(card.id)}
              >
                <LinearGradient
                  colors={getCardColors(card.brand)}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="card" size={40} color="white" />
                    <View style={styles.cardChip}>
                      <Ionicons name="card-outline" size={24} color="rgba(255,255,255,0.5)" />
                    </View>
                  </View>
                  <Text style={styles.cardNumber}>**** **** **** {card.last4}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardHolder}>{card.cardholderName}</Text>
                    <Text style={styles.cardExpiry}>Expires {card.expiry}</Text>
                  </View>
                  {card.isFrozen && (
                    <View style={styles.frozenBadge}>
                      <Text style={styles.frozenText}>FROZEN</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Card Actions Modal */}
      <Modal visible={!!showCardDetails} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Card Actions</Text>
            
            {[...virtualCards, physicalCard].filter(c => c?.id === showCardDetails).map((card) => (
              <View key={card?.id} style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => card && toggleFreeze(card.id, card.isFrozen, card.isPhysical)}
                >
                  <Ionicons name={card?.isFrozen ? 'snow' : 'thermometer'} size={24} color="#4b5563" />
                  <Text style={styles.actionText}>{card?.isFrozen ? 'Unfreeze Card' : 'Freeze Card'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => Alert.alert('CVV', 'CVV: 123')}
                >
                  <Ionicons name="key" size={24} color="#4b5563" />
                  <Text style={styles.actionText}>Show CVV</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => card && deleteCard(card.id, card.isPhysical)}
                >
                  <Ionicons name="trash" size={24} color="#ef4444" />
                  <Text style={[styles.actionText, styles.deleteText]}>Delete Card</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowCardDetails(null)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Order Physical Card Modal */}
      <Modal visible={showOrderModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.orderModalContent}>
            <Ionicons name="card" size={48} color="#2563eb" />
            <Text style={styles.modalTitle}>Order Physical Card</Text>
            <Text style={styles.modalSubtitle}>Get your physical BonaPay debit card</Text>
            
            <View style={styles.orderDetails}>
              <Text style={styles.orderText}>• Free delivery to your address</Text>
              <Text style={styles.orderText}>• 5-7 business days delivery time</Text>
              <Text style={styles.orderText}>• ₦2,500 issuance fee</Text>
              <Text style={styles.orderText}>• ATM withdrawal limit: ₦500,000 daily</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowOrderModal(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={orderPhysicalCard}
              >
                <Text style={styles.confirmModalText}>Order Now</Text>
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
  addButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  cardContainer: { marginBottom: 16 },
  card: { borderRadius: 16, padding: 20, height: 200, position: 'relative' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardChip: { opacity: 0.5 },
  cardNumber: { fontSize: 20, color: 'white', marginTop: 30, letterSpacing: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 },
  cardHolder: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  cardExpiry: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  frozenBadge: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  frozenText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  orderCardButton: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  orderCardText: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginTop: 12 },
  orderCardSubtext: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyState: { backgroundColor: 'white', borderRadius: 16, padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },
  createCardButton: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  createCardButtonText: { color: 'white', fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%' },
  orderModalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  actionItem: { alignItems: 'center', gap: 8 },
  actionText: { fontSize: 12, color: '#4b5563', marginTop: 4 },
  deleteText: { color: '#ef4444' },
  orderDetails: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 },
  orderText: { fontSize: 12, color: '#4b5563', marginBottom: 8 },
  closeModalButton: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8 },
  closeModalText: { color: '#6b7280' },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#f3f4f6' },
  cancelModalText: { color: '#6b7280', fontWeight: '500' },
  confirmModalButton: { backgroundColor: '#2563eb' },
  confirmModalText: { color: 'white', fontWeight: '500' },
});