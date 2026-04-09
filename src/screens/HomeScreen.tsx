import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { GameMode } from '../types/game';
import Logo from '../components/Logo';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
}

export default function HomeScreen({ onStartGame }: HomeScreenProps) {
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
        
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 40,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
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
  },
  buttonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerText: {
    position: 'absolute',
    bottom: 30,
    color: '#555',
    fontSize: 12,
  }
});
