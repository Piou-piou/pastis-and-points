import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { GameMode } from '../types/game';
import Logo from '../components/Logo';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
  onCreateTournament: () => void;
  onJoinTournament: (id: string) => void;
}

export default function HomeScreen({ onStartGame, onCreateTournament, onJoinTournament }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Logo size={220} />
        </View>
        
        <Text style={styles.title}>Pastis and Points</Text>
        <Text style={styles.subtitle}>Le compagnon de vos mènes</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => onStartGame('2vs2')}
        >
          <Text style={styles.buttonText}>Lancer la partie</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.tournamentButton]} 
          onPress={onCreateTournament}
        >
          <Text style={styles.buttonText}>Créer un concours</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 80, // Space for the footer
  },
  logoContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#BDC3C7',
    marginBottom: 60,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#27AE60',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  tournamentButton: {
    backgroundColor: '#2980B9',
    shadowColor: '#2980B9',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#555',
    fontSize: 12,
  }
});
