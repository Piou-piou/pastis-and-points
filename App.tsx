import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import TournamentSetupScreen from './src/screens/TournamentSetupScreen';
import TournamentJoinScreen from './src/screens/TournamentJoinScreen';
import TournamentBracketScreen from './src/screens/TournamentBracketScreen';
import { GameMode } from './src/types/game';
import * as Linking from 'expo-linking';

type Screen = 'splash' | 'home' | 'game' | 'tournament_setup' | 'tournament_join' | 'tournament_bracket';
const TOURNAMENT_ID_KEY = '@pastis_tournament_id';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('1vs1');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  useEffect(() => {
    loadTournament();
    
    const handleDeepLink = (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url);
      if (queryParams?.tournamentId) {
        saveTournament(queryParams.tournamentId as string);
        setCurrentScreen('tournament_join');
      }
    };

    const getInitialURL = async () => {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        handleDeepLink({ url: initialURL });
      }
    };

    getInitialURL();
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const loadTournament = async () => {
    try {
      const savedId = await AsyncStorage.getItem(TOURNAMENT_ID_KEY);
      if (savedId) {
        setTournamentId(savedId);
      }
    } catch (e) {
      console.error('Failed to load tournament ID', e);
    }
  };

  const saveTournament = async (id: string | null) => {
    try {
      if (id) {
        await AsyncStorage.setItem(TOURNAMENT_ID_KEY, id);
      } else {
        await AsyncStorage.removeItem(TOURNAMENT_ID_KEY);
      }
      setTournamentId(id);
    } catch (e) {
      console.error('Failed to save tournament ID', e);
    }
  };

  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentScreen('game');
    setCurrentMatchId(null);
  };

  const handleQuitGame = () => {
    if (tournamentId) {
      setCurrentScreen('tournament_bracket');
    } else {
      setCurrentScreen('home');
    }
    setCurrentMatchId(null);
  };

  const handleSplashFinish = () => {
    if (tournamentId) {
      setCurrentScreen('tournament_bracket');
    } else {
      setCurrentScreen('home');
    }
  };

  const handleCreateTournament = () => {
    setCurrentScreen('tournament_setup');
  };

  const handleTournamentCreated = (id: string) => {
    saveTournament(id);
    setCurrentScreen('tournament_bracket');
  };

  const handleJoinTournament = (id: string) => {
    saveTournament(id);
    setCurrentScreen('tournament_join');
  };

  const handleTournamentJoined = (id: string) => {
    saveTournament(id);
    setCurrentScreen('tournament_bracket');
  };

  const handleQuitTournament = () => {
    saveTournament(null);
    setCurrentScreen('home');
  };

  const handleLaunchMatch = (matchId: string) => {
    setCurrentMatchId(matchId);
    setGameMode('2vs2'); // Default tournament mode
    setCurrentScreen('game');
  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgb(26, 26, 26)' }]}>
      <StatusBar style="light" />
      {currentScreen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
      {currentScreen === 'home' && (
        <HomeScreen 
          onStartGame={handleStartGame} 
          onCreateTournament={handleCreateTournament}
          onJoinTournament={(id) => handleJoinTournament(id)}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen 
          mode={gameMode} 
          onQuit={handleQuitGame} 
          matchId={currentMatchId}
          onMatchFinish={() => setCurrentScreen('tournament_bracket')}
        />
      )}
      {currentScreen === 'tournament_setup' && (
        <TournamentSetupScreen 
          onCreated={handleTournamentCreated}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'tournament_join' && (
        <TournamentJoinScreen 
          tournamentId={tournamentId!}
          onJoined={handleTournamentJoined}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'tournament_bracket' && (
        <TournamentBracketScreen 
          tournamentId={tournamentId!}
          onLaunchMatch={handleLaunchMatch}
          onBack={handleQuitTournament}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
