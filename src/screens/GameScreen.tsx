import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { GameMode, Team } from '../types/game';
import { supabase } from '../lib/supabase';
import { Match } from '../types/tournament';

interface GameScreenProps {
  mode: GameMode;
  onQuit: () => void;
  matchId?: string | null;
  onMatchFinish?: () => void;
}

export default function GameScreen({ mode, onQuit, matchId, onMatchFinish }: GameScreenProps) {
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

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
      
      const matchSub = supabase
        .channel(`match-${matchId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => {
          const updatedMatch = payload.new as Match;
          setMatchData(updatedMatch);
          setRedTeam(prev => ({ ...prev, totalScore: updatedMatch.team1_score }));
          setBlueTeam(prev => ({ ...prev, totalScore: updatedMatch.team2_score }));
          if (updatedMatch.status === 'finished') {
            setIsGameOver(true);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(matchSub);
      };
    }
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*, team1:teams!team1_id(name), team2:teams!team2_id(name)')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      setMatchData(match);
      
      setRedTeam(prev => ({ 
        ...prev, 
        name: (match as any).team1?.name || 'Équipe 1',
        totalScore: match.team1_score 
      }));
      setBlueTeam(prev => ({ 
        ...prev, 
        name: (match as any).team2?.name || 'Équipe 2',
        totalScore: match.team2_score 
      }));

      if (match.status === 'waiting') {
        await supabase.from('matches').update({ status: 'in_progress' }).eq('id', matchId);
      }
    } catch (error) {
      console.error('Error fetching match details:', error);
      alert('Erreur lors du chargement du match');
    } finally {
      setLoading(false);
    }
  };

  const syncScores = async (redTotal: number, blueTotal: number) => {
    if (!matchId) return;
    try {
      await supabase.from('matches').update({
        team1_score: redTotal,
        team2_score: blueTotal
      }).eq('id', matchId);
    } catch (error) {
      console.error('Error syncing scores:', error);
    }
  };

  const finishMatch = async (winnerId: string | null) => {
    if (!matchId || !matchData) return;
    try {
      const { error } = await supabase.from('matches').update({
        status: 'finished',
        winner_id: winnerId
      }).eq('id', matchId);

      if (error) throw error;

      const nextRound = matchData.round + 1;
      const nextMatchIndex = Math.floor(matchData.match_index / 2);
      const isTeam1 = matchData.match_index % 2 === 0;

      const { data: nextMatch } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', matchData.tournament_id)
        .eq('round', nextRound)
        .eq('match_index', nextMatchIndex)
        .single();

      if (nextMatch) {
        await supabase.from('matches').update({
          [isTeam1 ? 'team1_id' : 'team2_id']: winnerId
        }).eq('id', nextMatch.id);
      } else {
        // This was the final match
        await supabase.from('tournaments').update({ status: 'finished' }).eq('id', matchData.tournament_id);
      }

      if (onMatchFinish) onMatchFinish();
    } catch (error) {
      console.error('Error finishing match:', error);
      alert('Erreur lors de la validation du match');
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

    setRedTeam(prev => ({ ...prev, totalScore: newRedTotal, roundScore: 0 }));
    setBlueTeam(prev => ({ ...prev, totalScore: newBlueTotal, roundScore: 0 }));

    syncScores(newRedTotal, newBlueTotal);

    if (newRedTotal >= WINNING_SCORE || newBlueTotal >= WINNING_SCORE) {
      const winnerName = newRedTotal >= WINNING_SCORE ? redTeam.name : blueTeam.name;
      const winnerId = newRedTotal >= WINNING_SCORE ? matchData?.team1_id : matchData?.team2_id;
      setIsGameOver(true);
      
      Alert.alert("Partie Terminée !", `${winnerName} a gagné la partie !`, [
        { text: "Corriger", style: 'cancel' },
        { 
          text: matchId ? "Retour au tableau" : "Menu Principal", 
          onPress: () => matchId ? finishMatch(winnerId || null) : onQuit() 
        }
      ]);
    }
  };

  const resetGame = () => {
    setRedTeam(prev => ({ ...prev, totalScore: 0, roundScore: 0 }));
    setBlueTeam(prev => ({ ...prev, totalScore: 0, roundScore: 0 }));
    setIsGameOver(false);
    syncScores(0, 0);
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
