import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import TournamentSetupScreen from './src/screens/TournamentSetupScreen';
import TournamentJoinScreen from './src/screens/TournamentJoinScreen';
import TournamentBracketScreen from './src/screens/TournamentBracketScreen';
import { GameMode } from './src/types/game';
import * as Linking from 'expo-linking';

type Screen = 'splash' | 'home' | 'game' | 'tournament_setup' | 'tournament_join' | 'tournament_bracket';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('1vs1');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url);
      if (queryParams?.tournamentId) {
        setTournamentId(queryParams.tournamentId as string);
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

  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentScreen('game');
    setTournamentId(null);
    setCurrentMatchId(null);
  };

  const handleQuitGame = () => {
    setCurrentScreen('home');
    setTournamentId(null);
    setCurrentMatchId(null);
  };

  const handleSplashFinish = () => {
    setCurrentScreen('home');
  };

  const handleCreateTournament = () => {
    setCurrentScreen('tournament_setup');
  };

  const handleTournamentCreated = (id: string) => {
    setTournamentId(id);
    setCurrentScreen('tournament_bracket');
  };

  const handleJoinTournament = (id: string) => {
    setTournamentId(id);
    setCurrentScreen('tournament_join');
  };

  const handleTournamentJoined = (id: string) => {
    setTournamentId(id);
    setCurrentScreen('tournament_bracket');
  };

  const handleLaunchMatch = (matchId: string) => {
    setCurrentMatchId(matchId);
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
          onBack={() => setCurrentScreen('home')}
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
