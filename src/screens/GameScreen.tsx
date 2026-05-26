import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { GameMode, Team } from '../types/game';
import { api, realtime } from '../lib/api';
import { Match } from '../types/tournament';

interface GameScreenProps {
  userId: string;
  mode: GameMode;
  onQuit: () => void;
  matchId?: string | null;
  onMatchFinish?: () => void;
}

export default function GameScreen({ userId, mode, onQuit, matchId, onMatchFinish }: GameScreenProps) {
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
  const [loading, setLoading] = useState(!!matchId);
  const [matchData, setMatchData] = useState<Match | null>(null);
  const WINNING_SCORE = 13;

  const teamNamesRef = React.useRef({ red: redTeam.name, blue: blueTeam.name });
  const matchDataRef = React.useRef(matchData);

  useEffect(() => {
    teamNamesRef.current = { red: redTeam.name, blue: blueTeam.name };
  }, [redTeam.name, blueTeam.name]);

  useEffect(() => {
    matchDataRef.current = matchData;
  }, [matchData]);

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
      
      realtime.subscribe(`tournament:${matchData?.tournament_id || ''}`, (payload) => {
        if (payload.type === 'match-updated' && payload.data.id === matchId) {
          const updatedMatch = payload.data;
          setMatchData(prev => prev ? ({ ...prev, ...updatedMatch }) : null);
          
          if (updatedMatch.team1_score !== undefined) setRedTeam(prev => ({ ...prev, totalScore: updatedMatch.team1_score }));
          if (updatedMatch.team2_score !== undefined) setBlueTeam(prev => ({ ...prev, totalScore: updatedMatch.team2_score }));
          
          if (updatedMatch.status === 'finished') {
            setIsGameOver(prev => {
              if (!prev) {
                const winnerId = updatedMatch.winner_id;
                const winnerName = winnerId === (updatedMatch.team1_id || matchDataRef.current?.team1_id) 
                  ? teamNamesRef.current.red 
                  : teamNamesRef.current.blue;
                
                Alert.alert("Partie Terminée !", `${winnerName} a gagné la partie !`, [
                  { 
                    text: matchId ? "Retour au tableau" : "Menu Principal", 
                    onPress: () => matchId ? (onMatchFinish && onMatchFinish()) : onQuit() 
                  }
                ]);
              }
              return true;
            });
          }
        }
      });

      return () => {
        realtime.unsubscribe();
      };
    }
  }, [matchId, matchData?.tournament_id]);

  const fetchMatchDetails = async () => {
    if (!matchId) return;
    try {
      const match = await api.getMatch(matchId);
      setMatchData(match);
      
      setRedTeam(prev => ({ 
        ...prev, 
        name: match.team1_name || 'Équipe 1',
        totalScore: match.team1_score 
      }));
      setBlueTeam(prev => ({ 
        ...prev, 
        name: match.team2_name || 'Équipe 2',
        totalScore: match.team2_score 
      }));

      if (match.status === 'waiting') {
        await api.updateMatch(matchId, { status: 'in_progress' });
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
      alert('Erreur lors du chargement du match');
    } finally {
      setLoading(false);
    }
  };

  const syncScores = async (redTotal: number, blueTotal: number, tournamentId?: string) => {
    if (!matchId) return;
    try {
      await api.updateMatch(matchId, {
        team1_score: redTotal,
        team2_score: blueTotal,
        tournament_id: tournamentId
      });
    } catch (error) {
      console.error('Error syncing scores:', error);
    }
  };

  const finishMatch = async (winnerId: string | null) => {
    setLoading(true);
    try {
      // winnerId is already calculated in the calling function
      await api.finishMatch(matchId!, winnerId!);
      if (onMatchFinish) onMatchFinish();
    } catch (error) {
      console.error('Error in finishMatch:', error);
      alert('Erreur lors de la validation finale du match');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreClick = (team: 'red' | 'blue') => {
    if (isGameOver) return;
    
    if (team === 'red') {
      setRedTeam(prev => ({ ...prev, roundScore: prev.roundScore + 1 }));
      setBlueTeam(prev => ({ ...prev, roundScore: 0 }));
    } else {
      setBlueTeam(prev => ({ ...prev, roundScore: prev.roundScore + 1 }));
      setRedTeam(prev => ({ ...prev, roundScore: 0 }));
    }
  };

  const undoScore = (team: 'red' | 'blue') => {
    if (team === 'red') {
      setRedTeam(prev => ({ ...prev, roundScore: Math.max(0, prev.roundScore - 1) }));
    } else {
      setBlueTeam(prev => ({ ...prev, roundScore: Math.max(0, prev.roundScore - 1) }));
    }
  };

  const decrementTotalScore = (team: 'red' | 'blue') => {
    const newRedTotal = team === 'red' ? Math.max(0, redTeam.totalScore - 1) : redTeam.totalScore;
    const newBlueTotal = team === 'blue' ? Math.max(0, blueTeam.totalScore - 1) : blueTeam.totalScore;
    
    setRedTeam(prev => ({ ...prev, totalScore: newRedTotal }));
    setBlueTeam(prev => ({ ...prev, totalScore: newBlueTotal }));
    setIsGameOver(false);
    syncScores(newRedTotal, newBlueTotal);
  };

  const validateRound = () => {
    const newRedTotal = redTeam.totalScore + redTeam.roundScore;
    const newBlueTotal = blueTeam.totalScore + blueTeam.roundScore;

    console.log('validateRound called. New scores:', { newRedTotal, newBlueTotal });

    setRedTeam(prev => ({ ...prev, totalScore: newRedTotal, roundScore: 0 }));
    setBlueTeam(prev => ({ ...prev, totalScore: newBlueTotal, roundScore: 0 }));

    const latestMatchData = matchDataRef.current;
    syncScores(newRedTotal, newBlueTotal, latestMatchData?.tournament_id);

    if (newRedTotal >= WINNING_SCORE || newBlueTotal >= WINNING_SCORE) {
      const winnerName = newRedTotal >= WINNING_SCORE ? redTeam.name : blueTeam.name;
      
      // Use ref to get the absolute latest IDs
      const latestMatchData = matchDataRef.current;
      const winnerId = newRedTotal >= WINNING_SCORE ? latestMatchData?.team1_id : latestMatchData?.team2_id;
      
      console.log('Victory detected!', { winnerName, winnerId, team1_id: latestMatchData?.team1_id, team2_id: latestMatchData?.team2_id });
      
      setIsGameOver(true);
      
      Alert.alert("Partie Terminée !", `${winnerName} a gagné la partie !`, [
        { text: "Corriger", style: 'cancel', onPress: () => setIsGameOver(false) },
        { 
          text: matchId ? "Retour au tableau" : "Menu Principal", 
          onPress: () => {
            console.log('User clicked Finish. WinnerId:', winnerId);
            if (matchId) {
              finishMatch(winnerId || null);
            } else {
              onQuit();
            }
          }
        }
      ]);
    }
  };

  const resetGame = () => {
    setRedTeam(prev => ({ ...prev, totalScore: 0, roundScore: 0 }));
    setBlueTeam(prev => ({ ...prev, totalScore: 0, roundScore: 0 }));
    setIsGameOver(false);
    syncScores(0, 0, matchDataRef.current?.tournament_id);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentCentered}>
          <ActivityIndicator size="large" color="#E63946" />
          <Text style={{ color: '#FFF', marginTop: 20 }}>Chargement du match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onQuit} style={styles.quitButton}>
          <Text style={styles.quitText}>{matchId ? 'Retour' : 'Quitter'}</Text>
        </TouchableOpacity>
        <Text style={styles.mainTitle}>{matchId ? 'Match de Concours' : 'Score Total'}</Text>
        <TouchableOpacity onPress={resetGame} style={styles.resetButton}>
          <Text style={styles.resetText}>RàZ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.totalBoard}>
          <TouchableOpacity onLongPress={() => decrementTotalScore('red')} activeOpacity={0.6}>
            <Text style={[styles.totalScore, { color: redTeam.color }]}>{redTeam.totalScore}</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>-</Text>
          <TouchableOpacity onLongPress={() => decrementTotalScore('blue')} activeOpacity={0.6}>
            <Text style={[styles.totalScore, { color: blueTeam.color }]}>{blueTeam.totalScore}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.targetScore}>Objectif: {WINNING_SCORE} (Appui long pour corriger)</Text>
      </View>

      <View style={styles.gameArea}>
        {/* RED TEAM AREA */}
        <TouchableOpacity 
          style={[styles.teamArea, { backgroundColor: redTeam.color }]} 
          onPress={() => handleScoreClick('red')}
          onLongPress={() => undoScore('red')}
          activeOpacity={0.8}
        >
          <Text style={styles.teamNameText}>
            {redTeam.name} {matchData?.team1_creator_id === userId ? '(Moi)' : ''}
          </Text>
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
          <Text style={styles.teamNameText}>
            {blueTeam.name} {matchData?.team2_creator_id === userId ? '(Moi)' : ''}
          </Text>
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
    padding: 20,
    gap: 20,
    marginTop: 10,
  },
  teamArea: {
    flex: 1,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
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
  contentCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
