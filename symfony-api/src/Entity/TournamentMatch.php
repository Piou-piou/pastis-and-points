<?php

namespace App\Entity;

use App\Repository\MatchRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: \App\Repository\MatchRepository::class)]
#[ORM\Table(name: 'matches')]
class TournamentMatch
{
    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 36)]
    private ?string $id = null;

    #[ORM\ManyToOne(targetEntity: Tournament::class, inversedBy: 'matches')]
    #[ORM\JoinColumn(name: 'tournament_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    private ?Tournament $tournament = null;

    #[ORM\Column]
    private ?int $round = null;

    #[ORM\Column]
    private ?int $matchIndex = null;

    #[ORM\ManyToOne(targetEntity: Team::class)]
    #[ORM\JoinColumn(name: 'team1_id', referencedColumnName: 'id', onDelete: 'SET NULL')]
    private ?Team $team1 = null;

    #[ORM\ManyToOne(targetEntity: Team::class)]
    #[ORM\JoinColumn(name: 'team2_id', referencedColumnName: 'id', onDelete: 'SET NULL')]
    private ?Team $team2 = null;

    #[ORM\Column]
    private ?int $team1Score = 0;

    #[ORM\Column]
    private ?int $team2Score = 0;

    #[ORM\ManyToOne(targetEntity: Team::class)]
    #[ORM\JoinColumn(name: 'winner_id', referencedColumnName: 'id', onDelete: 'SET NULL')]
    private ?Team $winner = null;

    #[ORM\Column(length: 50)]
    private ?string $status = 'waiting';

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?string
    {
        return $this->id;
    }

    public function setId(string $id): self
    {
        $this->id = $id;
        return $this;
    }

    public function getTournament(): ?Tournament
    {
        return $this->tournament;
    }

    public function setTournament(?Tournament $tournament): self
    {
        $this->tournament = $tournament;
        return $this;
    }

    public function getRound(): ?int
    {
        return $this->round;
    }

    public function setRound(int $round): self
    {
        $this->round = $round;
        return $this;
    }

    public function getMatchIndex(): ?int
    {
        return $this->matchIndex;
    }

    public function setMatchIndex(int $matchIndex): self
    {
        $this->matchIndex = $matchIndex;
        return $this;
    }

    public function getTeam1(): ?Team
    {
        return $this->team1;
    }

    public function setTeam1(?Team $team1): self
    {
        $this->team1 = $team1;
        return $this;
    }

    public function getTeam2(): ?Team
    {
        return $this->team2;
    }

    public function setTeam2(?Team $team2): self
    {
        $this->team2 = $team2;
        return $this;
    }

    public function getTeam1Score(): ?int
    {
        return $this->team1Score;
    }

    public function setTeam1Score(int $team1Score): self
    {
        $this->team1Score = $team1Score;
        return $this;
    }

    public function getTeam2Score(): ?int
    {
        return $this->team2Score;
    }

    public function setTeam2Score(int $team2Score): self
    {
        $this->team2Score = $team2Score;
        return $this;
    }

    public function getWinner(): ?Team
    {
        return $this->winner;
    }

    public function setWinner(?Team $winner): self
    {
        $this->winner = $winner;
        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }
}
