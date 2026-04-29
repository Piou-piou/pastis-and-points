import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';
import QRCode from 'react-native-qrcode-svg';
import * as Linking from 'expo-linking';

interface TournamentSetupScreenProps {
  userId: string;
  onCreated: (id: string) => void;
  onBack: () => void;
}

export default function TournamentSetupScreen({ userId, onCreated, onBack }: TournamentSetupScreenProps) {
  const [maxTeams, setMaxTeams] = useState('8');
  const [type, setType] = useState<'bracket' | 'round_robin'>('bracket');
  const [loading, setLoading] = useState(false);
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const data = await api.createTournament(userId, parseInt(maxTeams, 10), type);
      setTournamentId(data.id);
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Erreur lors de la création du concours');
    } finally {
      setLoading(false);
    }
  };

  const joinUrl = Linking.createURL('join', {
    queryParams: { tournamentId: tournamentId },
  });

  if (tournamentId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Concours Créé !</Text>
          <Text style={styles.subtitle}>
            Mode : {type === 'bracket' ? 'Élimination directe' : 'Championnat'}
          </Text>
          <Text style={styles.subtitle}>Faites scanner ce QR Code aux participants</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={joinUrl}
              size={250}
              color="white"
              backgroundColor="transparent"
            />
          </View>

          <Text style={styles.urlText}>{joinUrl}</Text>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => onCreated(tournamentId)}
          >
            <Text style={styles.buttonText}>Voir le tableau</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Nouveau Concours</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mode de jeu</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity 
              style={[styles.typeButton, type === 'bracket' && styles.typeButtonActive]}
              onPress={() => setType('bracket')}
            >
              <Text style={[styles.typeButtonText, type === 'bracket' && styles.typeButtonTextActive]}>Mélée / Directe</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, type === 'round_robin' && styles.typeButtonActive]}
              onPress={() => setType('round_robin')}
            >
              <Text style={[styles.typeButtonText, type === 'round_robin' && styles.typeButtonTextActive]}>Championnat</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre d'équipes max</Text>
          <TextInput
            style={styles.input}
            value={maxTeams}
            onChangeText={setMaxTeams}
            keyboardType="numeric"
            placeholder="Ex: 8"
            placeholderTextColor="#666"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Créer le concours</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(26, 26, 26)',
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#BDC3C7',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    color: '#BDC3C7',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    borderColor: '#27AE60',
  },
  typeButtonText: {
    color: '#AAA',
    fontWeight: '700',
  },
  typeButtonTextActive: {
    color: '#27AE60',
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    color: '#FFF',
    fontSize: 18,
  },
  button: {
    backgroundColor: '#27AE60',
    paddingVertical: 18,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    marginBottom: 20,
  },
  urlText: {
    color: '#BDC3C7',
    fontSize: 12,
    marginBottom: 30,
    textAlign: 'center',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#BDC3C7',
    fontSize: 16,
  }
});
