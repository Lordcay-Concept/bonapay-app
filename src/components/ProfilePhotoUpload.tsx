// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   Alert,
//   ActivityIndicator,
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { Ionicons } from '@expo/vector-icons';
// import { supabase } from '../services/supabase';
// import { useAuth } from '../contexts/AuthContext';

// export default function ProfilePhotoUpload() {
//   const { user, profile, refreshProfile } = useAuth();
//   const [uploading, setUploading] = useState(false);

//   const pickImage = async (useCamera: boolean) => {
//   const permission = useCamera
//     ? await ImagePicker.requestCameraPermissionsAsync()
//     : await ImagePicker.requestMediaLibraryPermissionsAsync();
  
//   if (!permission.granted) {
//     Alert.alert('Permission needed', 'Please grant camera or gallery access');
//     return;
//   }

//   const result = useCamera
//     ? await ImagePicker.launchCameraAsync({
//         allowsEditing: true,
//         aspect: [1, 1],
//         quality: 0.8,
//       })
//     : await ImagePicker.launchImageLibraryAsync({
//         allowsEditing: true,
//         aspect: [1, 1],
//         quality: 0.8,
//       });

//   if (!result.canceled && result.assets[0]) {
//     uploadImage(result.assets[0].uri);
//   }
// };

//   // Rest of the code remains the same...
//   const uploadImage = async (uri: string) => {
//     if (!user) return;
//     setUploading(true);

//     try {
//       const response = await fetch(uri);
//       const blob = await response.blob();
//       const fileExt = uri.split('.').pop();
//       const fileName = `${user.id}-${Date.now()}.${fileExt}`;
//       const filePath = `avatars/${fileName}`;

//       const { error: uploadError } = await supabase.storage
//         .from('avatars')
//         .upload(filePath, blob);

//       if (uploadError) throw uploadError;

//       const { data: { publicUrl } } = supabase.storage
//         .from('avatars')
//         .getPublicUrl(filePath);

//       const { error: updateError } = await supabase
//         .from('profiles')
//         .update({ avatar_url: publicUrl })
//         .eq('id', user.id);

//       if (updateError) throw updateError;

//       await refreshProfile();
//       Alert.alert('Success', 'Profile photo updated!');
//     } catch (error) {
//       Alert.alert('Error', 'Failed to upload image');
//     } finally {
//       setUploading(false);
//     }
//   };

//   const showOptions = () => {
//     Alert.alert(
//       'Profile Photo',
//       'Choose an option',
//       [
//         { text: 'Take a Selfie', onPress: () => pickImage(true) },
//         { text: 'Choose from Gallery', onPress: () => pickImage(false) },
//         { text: 'Cancel', style: 'cancel' },
//       ]
//     );
//   };

//   const avatarUrl = profile?.avatar_url;

//   return (
//     <TouchableOpacity style={styles.container} onPress={showOptions} disabled={uploading}>
//       {uploading ? (
//         <ActivityIndicator size="large" color="#2563eb" />
//       ) : avatarUrl ? (
//         <Image source={{ uri: avatarUrl }} style={styles.avatar} />
//       ) : (
//         <View style={styles.avatarPlaceholder}>
//           <Ionicons name="camera" size={32} color="#2563eb" />
//           <Text style={styles.placeholderText}>Add Photo</Text>
//         </View>
//       )}
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   container: { alignItems: 'center', justifyContent: 'center' },
//   avatar: { width: 100, height: 100, borderRadius: 50 },
//   avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
//   placeholderText: { fontSize: 12, color: '#2563eb', marginTop: 8 },
// });