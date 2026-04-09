import React, { useEffect } from 'react';
import { StyleSheet, View, Animated, Text } from 'react-native';
import Logo from '../components/Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Logo size={220} />
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>Pastis and Points</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(26, 26, 26)',
    justifyContent: 'center',
    alignItems: 'center',
    // Pour le web, on s'assure que la hauteur est bien 100% de la fenêtre
    minHeight: '100%',
    width: '100%',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: {
    position: 'absolute',
    top: '100%', // Positionné juste en dessous du logo
    marginTop: 20,
    width: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
