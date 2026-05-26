import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { GameMode } from '../types/game';
import Logo from '../components/Logo';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
  onCreateTournament: () => void;
  onJoinTournament: (id: string) => void;
  authUser: { id: string, email: string, name?: string | null } | null;
  onOpenProfile: () => void;
  onOpenMyTournaments: () => void;
}

export default function HomeScreen({ onStartGame, onCreateTournament, onJoinTournament, authUser, onOpenProfile, onOpenMyTournaments }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {authUser ? (
          <TouchableOpacity style={styles.profileButton} onPress={onOpenProfile}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>
                {(authUser.name || authUser.email).substring(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {authUser.name || authUser.email.split('@')[0]}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Logo size={200} />
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
        {authUser && (
          <TouchableOpacity 
            style={styles.historyButton} 
            onPress={onOpenMyTournaments}
          >
            <Text style={styles.historyButtonText}>📜 Voir mes concours</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.footerText}>Version 1.2.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(26, 26, 26)',
  },
  header: {
    height: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    maxWidth: 180,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarMiniText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  profileName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 30,
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
    marginBottom: 50,
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
    paddingBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  historyButton: {
    padding: 10,
  },
  historyButtonText: {
    color: '#BDC3C7',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerText: {
    color: '#555',
    fontSize: 12,
  }
});
