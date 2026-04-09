import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { GameMode, Team } from '../types/game';

interface GameScreenProps {
  mode: GameMode;
  onQuit: () => void;
}

export default function GameScreen({ mode, onQuit }: GameScreenProps) {
  const [redTeam, setRedTeam] = useState<Team>({
    name: mode === '1vs1' ? 'Joueur 1' : 'Équipe Rouge',
    color: '#E63946',
    totalScore: 0,
    roundScore: 0,
  });

  const [blueTeam, setBlueTeam] = useState<Team>({
    name: mode === '1vs1' ? 'Joueur 2' : 'Équipe Bleue',
    color: '#457B9D',
    totalScore: 0,
    roundScore: 0,
  });

  const [isGameOver, setIsGameOver] = useState(false);
  const WINNING_SCORE = 13;

  const handleScoreClick = (team: 'red' | 'blue') => {
    if (isGameOver) return;
    
    if (team === 'red') {
      setRedTeam(prev => ({ ...prev, roundScore: prev.roundScore + 1 }));
      setBlueTeam(prev => ({ ...prev, roundScore: 0 })); // Reset round score for the other team
    } else {
      setBlueTeam(prev => ({ ...prev, roundScore: prev.roundScore + 1 }));
      setRedTeam(prev => ({ ...prev, roundScore: 0 })); // Reset round score for the other team
    }
  };

  const undoScore = (team: 'red' | 'blue') => {
    if (team === 'red') {
      setRedTeam(prev => ({ ...prev, roundScore: Math.max(0, prev.roundScore - 1) }));
    } else {
      setBlueTeam(prev => ({ ...prev, roundScore: Math.max(0, prev.roundScore - 1) }));
    }
  };

  const validateRound = () => {
    const newRedTotal = redTeam.totalScore + redTeam.roundScore;
    const newBlueTotal = blueTeam.totalScore + blueTeam.roundScore;

    setRedTeam(prev => ({ ...prev, totalScore: newRedTotal, roundScore: 0 }));
    setBlueTeam(prev => ({ ...prev, totalScore: newBlueTotal, roundScore: 0 }));

    if (newRedTotal >= WINNING_SCORE || newBlueTotal >= WINNING_SCORE) {
      const winner = newRedTotal >= WINNING_SCORE ? redTeam.name : blueTeam.name;
      setIsGameOver(true);
      Alert.alert("Partie Terminée !", `${winner} a gagné la partie !`, [
        { text: "Ok", onPress: onQuit }
      ]);
    }
  };

  const resetGame = () => {
    setRedTeam(prev => ({ ...prev, totalScore: 0, roundScore: 0 }));
    setBlueTeam(prev => ({ ...prev, totalScore: 0, roundScore: 0 }));
    setIsGameOver(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onQuit} style={styles.quitButton}>
          <Text style={styles.quitText}>Quitter</Text>
        </TouchableOpacity>
        <Text style={styles.mainTitle}>Score Total</Text>
        <TouchableOpacity onPress={resetGame} style={styles.resetButton}>
          <Text style={styles.resetText}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.totalBoard}>
          <Text style={[styles.totalScore, { color: redTeam.color }]}>{redTeam.totalScore}</Text>
          <Text style={styles.separator}>-</Text>
          <Text style={[styles.totalScore, { color: blueTeam.color }]}>{blueTeam.totalScore}</Text>
        </View>
        <Text style={styles.targetScore}>Objectif: {WINNING_SCORE}</Text>
      </View>

      <View style={styles.gameArea}>
        {/* RED TEAM AREA */}
        <TouchableOpacity 
          style={[styles.teamArea, { backgroundColor: redTeam.color }]} 
          onPress={() => handleScoreClick('red')}
          onLongPress={() => undoScore('red')}
          activeOpacity={0.8}
        >
          <Text style={styles.teamNameText}>{redTeam.name}</Text>
          <Text style={styles.roundScoreText}>+{redTeam.roundScore}</Text>
          <Text style={styles.instructionText}>Cliquez pour ajouter une boule</Text>
          <Text style={styles.hintText}>(Appui long pour corriger)</Text>
        </TouchableOpacity>

        {/* BLUE TEAM AREA */}
        <TouchableOpacity 
          style={[styles.teamArea, { backgroundColor: blueTeam.color }]} 
          onPress={() => handleScoreClick('blue')}
          onLongPress={() => undoScore('blue')}
          activeOpacity={0.8}
        >
          <Text style={styles.teamNameText}>{blueTeam.name}</Text>
          <Text style={styles.roundScoreText}>+{blueTeam.roundScore}</Text>
          <Text style={styles.instructionText}>Cliquez pour ajouter une boule</Text>
          <Text style={styles.hintText}>(Appui long pour corriger)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.validateButton, (redTeam.roundScore === 0 && blueTeam.roundScore === 0) && styles.disabledButton]} 
          onPress={validateRound}
          disabled={redTeam.roundScore === 0 && blueTeam.roundScore === 0}
        >
          <Text style={styles.validateText}>Valider la mène</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  quitButton: {
    padding: 8,
  },
  quitText: {
    color: '#AAA',
    fontSize: 14,
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    color: '#AAA',
    fontSize: 14,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#262626',
    marginHorizontal: 20,
    borderRadius: 15,
    marginTop: 10,
  },
  totalBoard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalScore: {
    fontSize: 64,
    fontWeight: '900',
  },
  separator: {
    fontSize: 48,
    color: '#444',
    marginHorizontal: 15,
  },
  targetScore: {
    color: '#888',
    marginTop: 5,
    fontSize: 14,
  },
  gameArea: {
    flex: 1,
    flexDirection: 'row',
    padding: 15,
    gap: 15,
  },
  teamArea: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  teamNameText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  roundScoreText: {
    color: '#FFF',
    fontSize: 80,
    fontWeight: '900',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  hintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 5,
  },
  footer: {
    padding: 20,
    backgroundColor: '#1A1A1A',
  },
  validateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  validateText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
