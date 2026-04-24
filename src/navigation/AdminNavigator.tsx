import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminKycScreen from '../screens/admin/AdminKycScreen';
import AdminTransactionsScreen from '../screens/admin/AdminTransactionsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminHealthScreen from '../screens/admin/AdminHealthScreen';
import AdminFraudScreen from '../screens/admin/AdminFraudScreen';
import AdminAuditLogsScreen from '../screens/admin/AdminAuditLogsScreen';
import AdminSupportTicketsScreen from '../screens/admin/AdminSupportTicketsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

const Stack = createStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminKyc" component={AdminKycScreen} />
      <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
      <Stack.Screen name="AdminHealth" component={AdminHealthScreen} />
      <Stack.Screen name="AdminFraud" component={AdminFraudScreen} />
      <Stack.Screen name="AdminAuditLogs" component={AdminAuditLogsScreen} />
      <Stack.Screen name="AdminSupport" component={AdminSupportTicketsScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
    </Stack.Navigator>
  );
}