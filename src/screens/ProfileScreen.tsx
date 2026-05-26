import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { api } from '../lib/api';

interface ProfileScreenProps {
  user: { id: string, email: string, name?: string | null };
  onUpdate: (user: { id: string, email: string, name?: string | null }) => void;
  onLogout: () => void;
  onBack: () => void;
}

export default function ProfileScreen({ user, onUpdate, onLogout, onBack }: ProfileScreenProps) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'L\'email est obligatoire');
      return;
    }

    setLoading(true);
    try {
      const updates: any = { name: name.trim(), email: email.trim() };
      if (password.trim()) updates.password = password;

      const updatedUser = await api.updateProfile(user.id, updates);
      onUpdate(updatedUser);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
      setPassword('');
    } catch (error: any) {
      console.error('Update error:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButtonHeader}>
            <Text style={styles.backTextHeader}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Compte</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {(name || email).substring(0, 1).toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Votre nom ou pseudo"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nouveau mot de passe (laisser vide pour ne pas changer)</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#666"
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Enregistrer les modifications</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(26, 26, 26)',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButtonHeader: {
    padding: 5,
  },
  backTextHeader: {
    color: '#BDC3C7',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 30,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 25,
  },
  label: {
    color: '#BDC3C7',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    color: '#FFF',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#27AE60',
    paddingVertical: 18,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  logoutButton: {
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E63946',
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: '700',
  }
});
