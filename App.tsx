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
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MyTournamentsScreen from './src/screens/MyTournamentsScreen';
import { GameMode } from './src/types/game';
import * as Linking from 'expo-linking';

type Screen = 'splash' | 'home' | 'game' | 'tournament_setup' | 'tournament_join' | 'tournament_bracket' | 'auth' | 'profile' | 'my_tournaments';
const TOURNAMENT_ID_KEY = '@pastis_tournament_id';
const USER_ID_KEY = '@pastis_user_id';
const AUTH_USER_KEY = '@pastis_auth_user';
const CURRENT_SCREEN_KEY = '@pastis_current_screen';
const MATCH_ID_KEY = '@pastis_match_id';

export default function App() {
  const [currentScreen, _setCurrentScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('1vs1');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [currentMatchId, _setCurrentMatchId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [authUser, setAuthUser] = useState<{ id: string, email: string, name?: string | null } | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Wrapper to persist screen state
  const setCurrentScreen = async (screen: Screen) => {
    _setCurrentScreen(screen);
    try {
      await AsyncStorage.setItem(CURRENT_SCREEN_KEY, screen);
    } catch (e) {}
  };

  // Wrapper to persist match ID
  const setCurrentMatchId = async (id: string | null) => {
    _setCurrentMatchId(id);
    try {
      if (id) await AsyncStorage.setItem(MATCH_ID_KEY, id);
      else await AsyncStorage.removeItem(MATCH_ID_KEY);
    } catch (e) {}
  };

  useEffect(() => {
    const init = async () => {
      const [savedId, savedScreen, savedMatchId, savedAuthUser] = await Promise.all([
        AsyncStorage.getItem(TOURNAMENT_ID_KEY),
        AsyncStorage.getItem(CURRENT_SCREEN_KEY),
        AsyncStorage.getItem(MATCH_ID_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY)
      ]);

      if (savedAuthUser) {
        try {
          setAuthUser(JSON.parse(savedAuthUser));
        } catch (e) {}
      }

      const initialURL = await Linking.getInitialURL();
      let startScreen: Screen = (savedScreen as Screen) || 'home';
      let idToUse = savedId;

      if (initialURL) {
        const { queryParams } = Linking.parse(initialURL);
        if (queryParams?.tournamentId) {
          idToUse = queryParams.tournamentId as string;
          startScreen = 'tournament_join';
          await AsyncStorage.setItem(TOURNAMENT_ID_KEY, idToUse);
        }
      }

      if (!initialURL && idToUse && (!savedScreen || savedScreen === 'home')) {
        startScreen = 'tournament_bracket';
      }

      setTournamentId(idToUse);
      _setCurrentMatchId(savedMatchId);
      await initUserId();
      
      setInitializing(false);
      if (startScreen !== 'splash') {
        setCurrentScreen(startScreen);
      }
    };
    init();
    
    const handleDeepLink = (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url);
      if (queryParams?.tournamentId) {
        saveTournament(queryParams.tournamentId as string);
        setCurrentScreen('tournament_join');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const initUserId = async () => {
    try {
      let id = await AsyncStorage.getItem(USER_ID_KEY);

      if (!id) {
        id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem(USER_ID_KEY, id);
      }
      setUserId(id);
    } catch (e) {
      console.error('Failed to handle userId', e);
    }
  };

  const handleAuthSuccess = async (user: { id: string, email: string, name?: string | null }) => {
    setAuthUser(user);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    if (currentScreen === 'auth') {
      setCurrentScreen('tournament_setup');
    }
  };

  const handleProfileUpdate = async (user: { id: string, email: string, name?: string | null }) => {
    setAuthUser(user);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  };

  const handleLogout = async () => {
    setAuthUser(null);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    setCurrentScreen('home');
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
    if (currentScreen !== 'splash') return;

    if (tournamentId) {
      setCurrentScreen('tournament_bracket');
    } else {
      setCurrentScreen('home');
    }
  };

  const handleCreateTournament = () => {
    if (authUser) {
      setCurrentScreen('tournament_setup');
    } else {
      setCurrentScreen('auth');
    }
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

  const handleSelectTournament = (id: string) => {
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

  if (initializing) {
    return (
      <View style={[styles.container, { backgroundColor: 'rgb(26, 26, 26)' }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'rgb(26, 26, 26)' }]}>
      <StatusBar style="light" />
      {currentScreen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
      {currentScreen === 'home' && (
        <HomeScreen 
          onStartGame={handleStartGame} 
          onCreateTournament={handleCreateTournament}
          onJoinTournament={(id) => handleJoinTournament(id)}
          authUser={authUser}
          onOpenProfile={() => setCurrentScreen('profile')}
          onOpenMyTournaments={() => {
            if (authUser) setCurrentScreen('my_tournaments');
            else setCurrentScreen('auth');
          }}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen 
          userId={authUser?.id || userId}
          mode={gameMode} 
          onQuit={handleQuitGame} 
          matchId={currentMatchId}
          onMatchFinish={() => setCurrentScreen('tournament_bracket')}
        />
      )}
      {currentScreen === 'tournament_setup' && (
        <TournamentSetupScreen 
          userId={authUser?.id || userId}
          onCreated={handleTournamentCreated}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'auth' && (
        <AuthScreen 
          onAuthSuccess={handleAuthSuccess}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'profile' && authUser && (
        <ProfileScreen 
          user={authUser}
          onUpdate={handleProfileUpdate}
          onLogout={handleLogout}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'my_tournaments' && authUser && (
        <MyTournamentsScreen 
          userId={authUser.id}
          onSelectTournament={handleSelectTournament}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'tournament_join' && (
        <TournamentJoinScreen 
          userId={authUser?.id || userId}
          tournamentId={tournamentId!}
          onJoined={handleTournamentJoined}
          onBack={handleQuitTournament}
        />
      )}
      {currentScreen === 'tournament_bracket' && (
        <TournamentBracketScreen 
          userId={authUser?.id || userId}
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
