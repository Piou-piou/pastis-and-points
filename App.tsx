import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import { GameMode } from './src/types/game';

type Screen = 'splash' | 'home' | 'game';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('1vs1');

  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentScreen('game');
  };

  const handleQuitGame = () => {
    setCurrentScreen('home');
  };

  const handleSplashFinish = () => {
    setCurrentScreen('home');
  };

  return (
    <View style={styles.container}>
      <StatusBar style={currentScreen === 'splash' ? 'light' : 'auto'} />
      {currentScreen === 'splash' && <SplashScreen onFinish={handleSplashFinish} />}
      {currentScreen === 'home' && <HomeScreen onStartGame={handleStartGame} />}
      {currentScreen === 'game' && <GameScreen mode={gameMode} onQuit={handleQuitGame} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
