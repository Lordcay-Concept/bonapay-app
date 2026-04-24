import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text, View, StyleSheet, ScrollView, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Import screens for Bottom Tabs
import DashboardScreen from '../screens/main/DashboardScreen';
import LoyaltyScreen from '../screens/main/LoyaltyScreen';
import CardsScreen from '../screens/main/CardsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Import all other screens for Drawer
import SendMoneyScreen from '../screens/main/SendMoneyScreen';
import QRPaymentsScreen from '../screens/main/QRPaymentsScreen';
import ScheduledTransfersScreen from '../screens/main/ScheduledTransfersScreen';
import BatchTransferScreen from '../screens/main/BatchTransferScreen';
import BeneficiariesScreen from '../screens/main/BeneficiariesScreen';
import StatementsScreen from '../screens/main/StatementsScreen';
import BillsScreen from '../screens/main/BillsScreen';
import SavingsScreen from '../screens/main/SavingsScreen';
import InvestmentsScreen from '../screens/main/InvestmentsScreen';
import BudgetScreen from '../screens/main/BudgetScreen';
import InsightsScreen from '../screens/main/InsightsScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import ReferralScreen from '../screens/main/ReferralScreen';
import SecurityScreen from '../screens/main/SecurityScreen';
import SupportTicketsScreen from '../screens/main/SupportTicketsScreen';
import LiveChatScreen from '../screens/main/LiveChatScreen';
import TransactionDetailScreen from '../screens/main/TransactionDetailScreen';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Rewards') iconName = focused ? 'gift' : 'gift-outline';
          else if (route.name === 'Cards') iconName = focused ? 'card' : 'card-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Rewards" component={LoyaltyScreen} />
      <Tab.Screen name="Cards" component={CardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Custom Drawer Content
function CustomDrawerContent({ navigation }: any) {
  const { signOut, user, profile } = useAuth();

  const menuItems = [
    { name: 'Home', icon: 'home-outline', screen: 'Home' },
    { name: 'Send Money', icon: 'send-outline', screen: 'SendMoney' },
    { name: 'QR Payment', icon: 'qr-code-outline', screen: 'QRPayment' },
    { name: 'Scheduled', icon: 'calendar-outline', screen: 'Scheduled' },
    { name: 'Batch Transfer', icon: 'copy-outline', screen: 'BatchTransfer' },
    { name: 'Beneficiaries', icon: 'people-outline', screen: 'Beneficiaries' },
    { name: 'Statements', icon: 'document-text-outline', screen: 'Statements' },
    { name: 'Bills', icon: 'flash-outline', screen: 'Bills' },
    { name: 'Savings', icon: 'trending-up-outline', screen: 'Savings' },
    { name: 'Investments', icon: 'bar-chart-outline', screen: 'Investments' },
    { name: 'Budget', icon: 'wallet-outline', screen: 'Budget' },
    { name: 'Insights', icon: 'stats-chart-outline', screen: 'Insights' },
    { name: 'Transactions', icon: 'list-outline', screen: 'Transactions' },
    { name: 'Refer & Earn', icon: 'gift-outline', screen: 'Referral' },
    { name: 'Security', icon: 'shield-outline', screen: 'Security' },
    { name: 'Support', icon: 'chatbubbles-outline', screen: 'SupportTickets' },
    { name: 'Live Chat', icon: 'chatbox-outline', screen: 'LiveChat' },
  ];

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const avatarUrl = profile?.avatar_url;

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={styles.drawerItem}
            onPress={() => {
              navigation.navigate(item.screen);
              navigation.closeDrawer();
            }}
          >
            <Ionicons name={item.icon as any} size={22} color="#4b5563" />
            <Text style={styles.drawerItemText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: '#fff' },
  drawerHeader: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center' },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 70, height: 70, borderRadius: 35 },
  avatarPlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#2563eb' },
  userName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  userEmail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, gap: 12 },
  drawerItemText: { fontSize: 15, color: '#4b5563' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  logoutText: { fontSize: 15, color: '#ef4444' },
});

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: '80%' },
      }}
    >
      <Drawer.Screen name="HomeDrawer" component={BottomTabNavigator} />
      <Drawer.Screen name="SendMoney" component={SendMoneyScreen} />
      <Drawer.Screen name="QRPayment" component={QRPaymentsScreen} />
      <Drawer.Screen name="Scheduled" component={ScheduledTransfersScreen} />
      <Drawer.Screen name="BatchTransfer" component={BatchTransferScreen} />
      <Drawer.Screen name="Beneficiaries" component={BeneficiariesScreen} />
      <Drawer.Screen name="Statements" component={StatementsScreen} />
      <Drawer.Screen name="Bills" component={BillsScreen} />
      <Drawer.Screen name="Savings" component={SavingsScreen} />
      <Drawer.Screen name="Investments" component={InvestmentsScreen} />
      <Drawer.Screen name="Budget" component={BudgetScreen} />
      <Drawer.Screen name="Insights" component={InsightsScreen} />
      <Drawer.Screen name="Transactions" component={TransactionsScreen} />
      <Drawer.Screen name="Referral" component={ReferralScreen} />
      <Drawer.Screen name="Security" component={SecurityScreen} />
      <Drawer.Screen name="SupportTickets" component={SupportTicketsScreen} />
      <Drawer.Screen name="LiveChat" component={LiveChatScreen} />
      <Drawer.Screen name="TransactionDetail" component={TransactionDetailScreen} />

    </Drawer.Navigator>
  );
}