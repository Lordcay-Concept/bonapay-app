import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';
import AdminNavigator from './AdminNavigator';
import { supabase } from '../services/supabase';
import TransactionDetailScreen from '../screens/main/TransactionDetailScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { session, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!session?.user) {
        setCheckingRole(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', session.user.id)
        .single();

      const admin = profile?.is_admin === true || profile?.role === 'admin' || profile?.role === 'super_admin';
      setIsAdmin(admin);
      setCheckingRole(false);
    };

    checkAdminRole();
  }, [session]);

  if (isLoading || checkingRole) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isAdmin ? (
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="Main" component={DrawerNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}