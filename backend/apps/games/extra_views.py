"""Vues simultanées et vote chess."""

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.social.models import Club

from .models import Game, GameVote, SimulBoard, SimulSession, VoteGame
from .serializers import GameSerializer
from .services import GameService


class SimulListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = SimulSession.objects.filter(status=SimulSession.Status.OPEN).select_related("host")[:20]
        data = [
            {
                "id": s.id,
                "title": s.title or f"Simul de {s.host.display_name}",
                "host": s.host.username,
                "host_id": s.host_id,
                "max_boards": s.max_boards,
                "boards": s.boards.count(),
            }
            for s in qs
        ]
        return Response(data)

    def post(self, request):
        title = (request.data.get("title") or "").strip()[:120]
        max_boards = min(int(request.data.get("max_boards", 10)), 20)
        session = SimulSession.objects.create(
            host=request.user,
            title=title,
            max_boards=max_boards,
        )
        return Response({"id": session.id, "title": session.title}, status=201)


class SimulJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = SimulSession.objects.get(pk=session_id, status=SimulSession.Status.OPEN)
        except SimulSession.DoesNotExist:
            return Response({"error": "Simultanée introuvable"}, status=404)
        if session.host_id == request.user.id:
            return Response({"error": "Vous êtes l'hôte"}, status=400)
        if session.boards.count() >= session.max_boards:
            return Response({"error": "Complet"}, status=400)
        if SimulBoard.objects.filter(session=session, opponent=request.user).exists():
            return Response({"error": "Déjà inscrit"}, status=400)

        board_no = session.boards.count() + 1
        game = GameService().create_friend_game(
            white=session.host,
            black=request.user,
            mode="rapid",
            is_rated=False,
        )
        SimulBoard.objects.create(
            session=session,
            game=game,
            opponent=request.user,
            board_number=board_no,
        )
        if session.boards.count() >= 2:
            session.status = SimulSession.Status.ACTIVE
            session.save(update_fields=["status"])
        return Response(GameSerializer(game).data, status=201)


class VoteGameCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        club_white_slug = request.data.get("club_white")
        club_black_slug = request.data.get("club_black")
        mode = request.data.get("mode", "rapid")
        try:
            club_white = Club.objects.get(slug=club_white_slug)
            club_black = Club.objects.get(slug=club_black_slug)
        except Club.DoesNotExist:
            return Response({"error": "Club introuvable"}, status=404)

        if not club_white.members.filter(pk=request.user.pk).exists():
            return Response({"error": "Vous devez être membre du club blanc"}, status=403)

        if club_white.id == club_black.id:
            return Response({"error": "Les clubs doivent être différents"}, status=400)

        white_rep = club_white.owner
        black_rep = club_black.owner
        if white_rep.id == black_rep.id:
            alt = club_black.members.exclude(pk=white_rep.pk).order_by("id").first()
            if not alt:
                return Response(
                    {"error": "Impossible : aucun représentant distinct pour le club noir"},
                    status=400,
                )
            black_rep = alt

        game = GameService().create_friend_game(
            white=white_rep,
            black=black_rep,
            mode=mode,
            is_rated=False,
        )
        game.is_vote_chess = True
        game.save(update_fields=["is_vote_chess"])
        VoteGame.objects.create(game=game, club_white=club_white, club_black=club_black)
        return Response(GameSerializer(game).data, status=201)


def _vote_san_labels(game: Game, tally: dict[str, int]) -> dict[str, str]:
    import chess

    try:
        board = chess.Board(game.fen or chess.STARTING_FEN)
    except Exception:
        return {uci: uci for uci in tally}
    labels: dict[str, str] = {}
    for uci in tally:
        try:
            move = board.parse_uci(uci)
            if move in board.legal_moves:
                labels[uci] = board.san(move)
            else:
                labels[uci] = uci
        except Exception:
            labels[uci] = uci
    return labels


def _vote_tally(game: Game, user=None) -> dict:
    try:
        meta = game.vote_meta
    except VoteGame.DoesNotExist:
        meta = None
    ply = game.move_count
    votes = GameVote.objects.filter(game=game, ply=ply)
    tally: dict[str, int] = {}
    for v in votes:
        tally[v.move_uci] = tally.get(v.move_uci, 0) + 1
    my_vote = None
    if user and user.is_authenticated:
        row = votes.filter(user=user).first()
        my_vote = row.move_uci if row else None
    return {
        "tally": tally,
        "tally_san": _vote_san_labels(game, tally),
        "ply": ply,
        "votes": votes.count(),
        "my_vote": my_vote,
        "my_vote_san": _vote_san_labels(game, {my_vote: 1}).get(my_vote) if my_vote else None,
        "club_white": meta.club_white.name if meta else None,
        "club_black": meta.club_black.name if meta else None,
    }


class VoteStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, game_id):
        try:
            game = Game.objects.get(pk=game_id, is_vote_chess=True)
        except Game.DoesNotExist:
            return Response({"error": "Partie introuvable"}, status=404)
        return Response(_vote_tally(game, request.user))


class CastVoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.select_related("vote_meta").get(pk=game_id, is_vote_chess=True)
        except Game.DoesNotExist:
            return Response({"error": "Partie introuvable"}, status=404)

        meta = game.vote_meta
        club_ids = [c.id for c in [meta.club_white, meta.club_black] if c]
        if not Club.objects.filter(pk__in=club_ids, members=request.user).exists():
            return Response({"error": "Non membre des clubs"}, status=403)

        move_uci = (request.data.get("move_uci") or "").strip()[:10]
        if not move_uci:
            return Response({"error": "Coup requis"}, status=400)

        ply = game.move_count
        GameVote.objects.update_or_create(
            game=game,
            user=request.user,
            ply=ply,
            defaults={"move_uci": move_uci},
        )
        return Response(_vote_tally(game, request.user))


class ApplyVoteMoveView(APIView):
    """Applique le coup le plus voté (capitaine ou auto après votes)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(pk=game_id, is_vote_chess=True, status=Game.Status.ACTIVE)
        except Game.DoesNotExist:
            return Response({"error": "Partie introuvable"}, status=404)

        ply = game.move_count
        votes = list(GameVote.objects.filter(game=game, ply=ply))
        if not votes:
            return Response({"error": "Aucun vote"}, status=400)

        tally: dict[str, int] = {}
        for v in votes:
            tally[v.move_uci] = tally.get(v.move_uci, 0) + 1
        winning = max(tally.items(), key=lambda x: x[1])[0]

        result = GameService().make_move(game, request.user, winning)
        if result.get("error"):
            return Response(result, status=400)
        GameVote.objects.filter(game=game, ply=ply).delete()
        game.refresh_from_db()
        from .ws_notify import notify_move_made

        notify_move_made(game, result)
        return Response(GameSerializer(game).data)


class SimulDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = SimulSession.objects.select_related("host").get(pk=session_id)
        except SimulSession.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        boards = []
        for b in session.boards.select_related("game", "opponent").order_by("board_number"):
            boards.append(
                {
                    "board_number": b.board_number,
                    "game_id": str(b.game_id),
                    "opponent": b.opponent.username,
                    "status": b.game.status,
                    "result": b.game.result or "",
                    "fen": b.game.fen,
                }
            )
        return Response(
            {
                "id": session.id,
                "title": session.title or f"Simul de {session.host.display_name}",
                "host": session.host.username,
                "host_id": session.host_id,
                "status": session.status,
                "max_boards": session.max_boards,
                "boards": boards,
            }
        )
