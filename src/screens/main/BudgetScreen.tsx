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

interface BudgetCategory {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
}

export default function BudgetScreen({ navigation }: any) {
  const [budgets, setBudgets] = useState<BudgetCategory[]>([
    { id: '1', name: 'Food & Groceries', budgeted: 100000, spent: 45000 },
    { id: '2', name: 'Transportation', budgeted: 50000, spent: 25000 },
    { id: '3', name: 'Utilities', budgeted: 60000, spent: 30000 },
    { id: '4', name: 'Entertainment', budgeted: 40000, spent: 15000 },
    { id: '5', name: 'Shopping', budgeted: 50000, spent: 20000 },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', budgeted: '' });

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudgeted - totalSpent;

  const addCategory = () => {
    if (!newCategory.name || !newCategory.budgeted) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setBudgets([
      ...budgets,
      {
        id: Date.now().toString(),
        name: newCategory.name,
        budgeted: parseFloat(newCategory.budgeted),
        spent: 0,
      },
    ]);
    setShowModal(false);
    setNewCategory({ name: '', budgeted: '' });
  };

  const deleteCategory = (id: string) => {
    setBudgets(budgets.filter(b => b.id !== id));
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget Planner</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Total Budget</Text>
              <Text style={styles.summaryValue}>₦{totalBudgeted.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Total Spent</Text>
              <Text style={styles.summaryValue}>₦{totalSpent.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>Remaining</Text>
              <Text style={[styles.summaryValue, { color: remaining >= 0 ? '#10b981' : '#ef4444' }]}>
                ₦{remaining.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(totalSpent / totalBudgeted) * 100}%` }]} />
          </View>
        </View>

        {budgets.map((budget) => {
          const percentage = (budget.spent / budget.budgeted) * 100;
          return (
            <View key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetName}>{budget.name}</Text>
                <TouchableOpacity onPress={() => deleteCategory(budget.id)}>
                  <Ionicons name="trash" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetText}>Budgeted: ₦{budget.budgeted.toLocaleString()}</Text>
                <Text style={styles.budgetText}>Spent: ₦{budget.spent.toLocaleString()}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: percentage > 80 ? '#ef4444' : '#10b981' }]} />
              </View>
              <Text style={styles.percentageText}>{percentage.toFixed(1)}% used</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Category Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Budget Category</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Category Name"
              value={newCategory.name}
              onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Budget Amount"
              keyboardType="numeric"
              value={newCategory.budgeted}
              onChangeText={(text) => setNewCategory({ ...newCategory, budgeted: text })}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={addCategory}
              >
                <Text style={styles.confirmButtonText}>Add</Text>
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
  addButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  summaryCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 4 },
  budgetCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetText: { fontSize: 14, color: '#6b7280' },
  percentageText: { fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f3f4f6' },
  cancelButtonText: { color: '#6b7280', fontWeight: '500' },
  confirmButton: { backgroundColor: '#2563eb' },
  confirmButtonText: { color: 'white', fontWeight: '500' },
});