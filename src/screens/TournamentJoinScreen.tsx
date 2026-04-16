import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Tournament } from '../types/tournament';

interface TournamentJoinScreenProps {
  tournamentId: string;
  onJoined: (id: string) => void;
  onBack: () => void;
}

export default function TournamentJoinScreen({ tournamentId, onJoined, onBack }: TournamentJoinScreenProps) {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      alert('Concours introuvable');
      onBack();
    } finally {
      setFetching(false);
    }
  };

  const handleJoin = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

      if (countError) throw countError;
      if (count !== null && tournament && count >= tournament.max_teams) {
        alert('Le concours est complet');
        return;
      }

      const { error } = await supabase
        .from('teams')
        .insert([
          { 
            tournament_id: tournamentId, 
            name: teamName.trim() 
          }
        ]);

      if (error) throw error;
      onJoined(tournamentId);
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#27AE60" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rejoindre le Concours</Text>
        <Text style={styles.subtitle}>Inscrivez votre équipe</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de l'équipe</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Ex: Les Boulomanes"
            placeholderTextColor="#666"
            autoFocus
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, (!teamName.trim() || loading) && styles.buttonDisabled]} 
          onPress={handleJoin}
          disabled={!teamName.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Annuler</Text>
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
    marginBottom: 40,
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
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#BDC3C7',
    fontSize: 16,
  }
});
