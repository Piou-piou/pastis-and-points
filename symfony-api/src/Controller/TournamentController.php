<?php

namespace App\Controller;

use App\Entity\Team;
use App\Entity\Tournament;
use App\Entity\TournamentMatch;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

class TournamentController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private HubInterface $hub;

    public function __construct(EntityManagerInterface $entityManager, HubInterface $hub)
    {
        $this->entityManager = $entityManager;
        $this->hub = $hub;
    }

    private function notify(string $topic, array $data): void
    {
        $update = new Update(
            $topic,
            json_encode($data)
        );
        $this->hub->publish($update);
    }

    #[Route('/tournaments', name: 'create_tournament', methods: ['POST'])]
    public function createTournament(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        $tournament = new Tournament();
        $tournament->setId(Uuid::v4()->toRfc4122());
        $tournament->setOrganizerId($data['organizer_id']);
        $tournament->setMaxTeams($data['max_teams'] ?? 8);
        $tournament->setType($data['type'] ?? 'bracket');
        
        $this->entityManager->persist($tournament);
        $this->entityManager->flush();

        return $this->json([
            'id' => $tournament->getId(),
            'organizer_id' => $tournament->getOrganizerId(),
            'max_teams' => $tournament->getMaxTeams(),
            'type' => $tournament->getType(),
            'status' => $tournament->getStatus(),
            'created_at' => $tournament->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], Response::HTTP_CREATED);
    }

    #[Route('/tournaments/{id}', name: 'get_tournament', methods: ['GET'])]
    public function getTournament(string $id): JsonResponse
    {
        $tournament = $this->entityManager->getRepository(Tournament::class)->find($id);

        if (!$tournament) {
            return $this->json(['error' => 'Tournament not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id' => $tournament->getId(),
            'organizer_id' => $tournament->getOrganizerId(),
            'max_teams' => $tournament->getMaxTeams(),
            'type' => $tournament->getType(),
            'status' => $tournament->getStatus(),
            'created_at' => $tournament->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('/tournaments/{id}', name: 'update_tournament', methods: ['PATCH'])]
    public function updateTournament(string $id, Request $request): JsonResponse
    {
        $tournament = $this->entityManager->getRepository(Tournament::class)->find($id);
        if (!$tournament) return $this->json(['error' => 'Not found'], 404);

        $data = json_decode($request->getContent(), true);
        if (isset($data['status'])) $tournament->setStatus($data['status']);
        if (isset($data['max_teams'])) $tournament->setMaxTeams($data['max_teams']);
        if (isset($data['type'])) $tournament->setType($data['type']);

        $this->entityManager->flush();

        $this->notify("tournament:$id", [
            'type' => 'tournament-patch',
            'data' => ['status' => $tournament->getStatus()]
        ]);

        return $this->json(['id' => $tournament->getId(), 'status' => $tournament->getStatus()]);
    }

    #[Route('/teams', name: 'get_teams', methods: ['GET'])]
    public function getTeams(Request $request): JsonResponse
    {
        $tournamentId = $request->query->get('tournament_id');
        $teams = $this->entityManager->getRepository(Team::class)->findBy(['tournament' => $tournamentId]);

        $result = [];
        foreach ($teams as $team) {
            $result[] = [
                'id' => $team->getId(),
                'name' => $team->getName(),
                'creator_id' => $team->getCreatorId(),
                'tournament_id' => $team->getTournament()->getId(),
                'created_at' => $team->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json($result);
    }

    #[Route('/teams', name: 'add_team', methods: ['POST'])]
    public function addTeam(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $tournament = $this->entityManager->getRepository(Tournament::class)->find($data['tournament_id']);
        
        if (!$tournament) return $this->json(['error' => 'Tournament not found'], 404);

        $team = new Team();
        $team->setId(Uuid::v4()->toRfc4122());
        $team->setName($data['name']);
        $team->setCreatorId($data['creator_id']);
        $team->setTournament($tournament);

        $this->entityManager->persist($team);
        $this->entityManager->flush();

        $teamData = [
            'id' => $team->getId(),
            'name' => $team->getName(),
            'creator_id' => $team->getCreatorId(),
            'tournament_id' => $tournament->getId(),
            'created_at' => $team->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];

        $this->notify("tournament:".$tournament->getId(), [
            'type' => 'team-added',
            'data' => $teamData
        ]);

        return $this->json($teamData, Response::HTTP_CREATED);
    }

    #[Route('/teams/{id}', name: 'update_team', methods: ['PATCH'])]
    public function updateTeam(string $id, Request $request): JsonResponse
    {
        $team = $this->entityManager->getRepository(Team::class)->find($id);
        if (!$team) return $this->json(['error' => 'Not found'], 404);

        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $team->setName($data['name']);

        $this->entityManager->flush();

        $this->notify("tournament:".$team->getTournament()->getId(), [
            'type' => 'team-updated',
            'data' => ['id' => $team->getId(), 'name' => $team->getName()]
        ]);

        return $this->json(['id' => $team->getId(), 'name' => $team->getName()]);
    }

    #[Route('/teams/{id}', name: 'delete_team', methods: ['DELETE'])]
    public function deleteTeam(string $id): JsonResponse
    {
        $team = $this->entityManager->getRepository(Team::class)->find($id);
        if (!$team) return $this->json(['error' => 'Not found'], 404);

        $tournamentId = $team->getTournament()->getId();
        $this->entityManager->remove($team);
        $this->entityManager->flush();

        $this->notify("tournament:$tournamentId", [
            'type' => 'team-removed',
            'data' => ['id' => $id]
        ]);

        return $this->json(['success' => true]);
    }

    #[Route('/matches', name: 'get_matches', methods: ['GET'])]
    public function getMatches(Request $request): JsonResponse
    {
        $tournamentId = $request->query->get('tournament_id');
        $matches = $this->entityManager->getRepository(TournamentMatch::class)->findBy(['tournament' => $tournamentId]);

        $result = [];
        foreach ($matches as $match) {
            $result[] = [
                'id' => $match->getId(),
                'round' => $match->getRound(),
                'match_index' => $match->getMatchIndex(),
                'team1_id' => $match->getTeam1()?->getId(),
                'team2_id' => $match->getTeam2()?->getId(),
                'team1_score' => $match->getTeam1Score(),
                'team2_score' => $match->getTeam2Score(),
                'winner_id' => $match->getWinner()?->getId(),
                'status' => $match->getStatus(),
                'created_at' => $match->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json($result);
    }

    #[Route('/matches', name: 'clear_matches', methods: ['DELETE'])]
    public function clearMatches(Request $request): JsonResponse
    {
        $tournamentId = $request->query->get('tournament_id');
        $matches = $this->entityManager->getRepository(TournamentMatch::class)->findBy(['tournament' => $tournamentId]);

        foreach ($matches as $match) {
            $this->entityManager->remove($match);
        }

        $this->entityManager->flush();

        $this->notify("tournament:$tournamentId", [
            'type' => 'matches-created',
            'data' => []
        ]);

        return $this->json(['success' => true]);
    }

    #[Route('/matches/{id}', name: 'update_match', methods: ['PATCH'])]
    public function updateMatch(string $id, Request $request): JsonResponse
    {
        $match = $this->entityManager->getRepository(TournamentMatch::class)->find($id);
        if (!$match) return $this->json(['error' => 'Not found'], 404);

        $data = json_decode($request->getContent(), true);
        
        if (isset($data['team1_id'])) {
            $team1 = $this->entityManager->getRepository(Team::class)->find($data['team1_id']);
            $match->setTeam1($team1);
        }
        if (isset($data['team2_id'])) {
            $team2 = $this->entityManager->getRepository(Team::class)->find($data['team2_id']);
            $match->setTeam2($team2);
        }

        if (isset($data['team1_score'])) $match->setTeam1Score($data['team1_score']);
        if (isset($data['team2_score'])) $match->setTeam2Score($data['team2_score']);
        
        if (isset($data['winner_id'])) {
            $winner = $this->entityManager->getRepository(Team::class)->find($data['winner_id']);
            $match->setWinner($winner);
        }
        if (isset($data['status'])) $match->setStatus($data['status']);

        $this->entityManager->flush();

        $this->notify("tournament:".$match->getTournament()->getId(), [
            'type' => 'match-updated',
            'data' => array_merge(['id' => $match->getId()], $data)
        ]);

        return $this->json(['id' => $match->getId(), 'status' => $match->getStatus()]);
    }

    #[Route('/tournaments/{id}/generate', name: 'generate_bracket', methods: ['POST'])]
    public function generateBracket(string $id): JsonResponse
    {
        $tournament = $this->entityManager->getRepository(Tournament::class)->find($id);
        if (!$tournament) return $this->json(['error' => 'Tournament not found'], 404);

        $teams = $this->entityManager->getRepository(Team::class)->findBy(['tournament' => $tournament]);
        if (count($teams) < 2) {
            return $this->json(['error' => 'At least 2 teams are required'], 400);
        }

        // Clear existing matches
        $existingMatches = $this->entityManager->getRepository(TournamentMatch::class)->findBy(['tournament' => $tournament]);
        foreach ($existingMatches as $m) $this->entityManager->remove($m);
        $this->entityManager->flush();

        shuffle($teams);
        
        if ($tournament->getType() === 'round_robin') {
            $matchIndex = 0;
            for ($i = 0; $i < count($teams); $i++) {
                for ($j = $i + 1; $j < count($teams); $j++) {
                    $match = new TournamentMatch();
                    $match->setId(Uuid::v4()->toRfc4122());
                    $match->setTournament($tournament);
                    $match->setRound(0);
                    $match->setMatchIndex($matchIndex++);
                    $match->setTeam1($teams[$i]);
                    $match->setTeam2($teams[$j]);
                    $match->setStatus('waiting');
                    $this->entityManager->persist($match);
                }
            }
        } else {
            $actualTeamCount = count($teams);
            $bracketSize = pow(2, ceil(log($actualTeamCount, 2)));
            $numRounds = log($bracketSize, 2);

            $allMatches = [];
            for ($r = 0; $r < $numRounds; $r++) {
                $numMatchesInRound = pow(2, $numRounds - $r - 1);
                for ($i = 0; $i < $numMatchesInRound; $i++) {
                    $match = new TournamentMatch();
                    $match->setId(Uuid::v4()->toRfc4122());
                    $match->setTournament($tournament);
                    $match->setRound($r);
                    $match->setMatchIndex($i);
                    $match->setStatus('waiting');
                    $this->entityManager->persist($match);
                    $allMatches[] = $match;
                }
            }

            $firstRoundMatches = array_filter($allMatches, fn($m) => $m->getRound() === 0);
            usort($firstRoundMatches, fn($a, $b) => $a->getMatchIndex() <=> $b->getMatchIndex());

            for ($i = 0; $i < count($firstRoundMatches); $i++) {
                $match = $firstRoundMatches[$i];
                $team1 = $teams[$i * 2] ?? null;
                $team2 = $teams[$i * 2 + 1] ?? null;

                if ($team1 && !$team2) {
                    $match->setTeam1($team1);
                    $match->setWinner($team1);
                    $match->setStatus('finished');

                    $nextMatchIndex = floor($match->getMatchIndex() / 2);
                    $isTeam1Slot = $match->getMatchIndex() % 2 === 0;
                    foreach ($allMatches as $m) {
                        if ($m->getRound() === 1 && $m->getMatchIndex() == $nextMatchIndex) {
                            if ($isTeam1Slot) $m->setTeam1($team1);
                            else $m->setTeam2($team1);
                            break;
                        }
                    }
                } else {
                    $match->setTeam1($team1);
                    $match->setTeam2($team2);
                }
            }
        }

        $tournament->setStatus('in_progress');
        $this->entityManager->flush();

        $this->notify("tournament:$id", [
            'type' => 'matches-created',
            'data' => []
        ]);

        return $this->json(['success' => true]);
    }

    #[Route('/matches/{id}/finish', name: 'finish_match', methods: ['POST'])]
    public function finishMatch(string $id, Request $request): JsonResponse
    {
        $match = $this->entityManager->getRepository(TournamentMatch::class)->find($id);
        if (!$match) return $this->json(['error' => 'Match not found'], 404);

        $data = json_decode($request->getContent(), true);
        $winnerId = $data['winner_id'];
        $tournament = $match->getTournament();

        $winner = $this->entityManager->getRepository(Team::class)->find($winnerId);
        if (!$winner) return $this->json(['error' => 'Winner not found'], 404);

        $match->setWinner($winner);
        $match->setStatus('finished');
        $match->setTeam1Score($winnerId === $match->getTeam1()?->getId() ? 13 : 0);
        $match->setTeam2Score($winnerId === $match->getTeam2()?->getId() ? 13 : 0);

        if ($tournament->getType() === 'bracket') {
            $nextRound = $match->getRound() + 1;
            $nextMatchIndex = floor($match->getMatchIndex() / 2);
            $isTeam1Slot = $match->getMatchIndex() % 2 === 0;

            $nextMatch = $this->entityManager->getRepository(TournamentMatch::class)->findOneBy([
                'tournament' => $tournament,
                'round' => $nextRound,
                'matchIndex' => $nextMatchIndex
            ]);

            if ($nextMatch) {
                if ($isTeam1Slot) $nextMatch->setTeam1($winner);
                else $nextMatch->setTeam2($winner);
            } else {
                $allMatches = $this->entityManager->getRepository(TournamentMatch::class)->findBy(['tournament' => $tournament]);
                $maxRound = 0;
                foreach ($allMatches as $m) if ($m->getRound() > $maxRound) $maxRound = $m->getRound();
                if ($match->getRound() === $maxRound) $tournament->setStatus('finished');
            }
        } else {
            $allMatches = $this->entityManager->getRepository(TournamentMatch::class)->findBy(['tournament' => $tournament]);
            $allFinished = true;
            foreach ($allMatches as $m) {
                if ($m->getId() !== $id && $m->getStatus() !== 'finished') {
                    $allFinished = false;
                    break;
                }
            }
            if ($allFinished) $tournament->setStatus('finished');
        }

        $this->entityManager->flush();

        $this->notify("tournament:".$tournament->getId(), [
            'type' => 'match-updated',
            'data' => ['id' => $match->getId(), 'status' => 'finished', 'winner_id' => $winnerId]
        ]);

        return $this->json(['success' => true]);
    }
}
