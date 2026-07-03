"""Test approfondi de bout en bout : le scénario EXACT qui échouait.

Reproduit le cas du "demandeur" :
  1. le challenger défie, l'adversaire accepte (API réelle) ;
  2. le challenger connecte son WS notifications APRÈS l'acceptation
     -> le match_found doit arriver dans le SNAPSHOT (pas en temps réel),
        avec game_id : c'est ce que le frontend utilise pour rediriger ;
  3. les deux joueurs rejoignent le WS de la partie ;
  4. les blancs jouent -> les noirs reçoivent le coup diffusé (vraie couche Redis) ;
  5. le chrono est resynchronisé quand les deux sont connectés.

N'override PAS CHANNEL_LAYERS : on exerce la vraie config Redis (celle qui figeait
le plateau quand l'auth échouait).
"""

from __future__ import annotations

from asgiref.sync import async_to_sync, sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.games.models import Game, GameChallenge
from apps.notifications.models import Notification

User = get_user_model()


def _redis_channel_ok() -> bool:
    try:
        layer = get_channel_layer()

        async def _probe():
            await layer.group_add("probe_deep", "probe_chan")
            await layer.group_send("probe_deep", {"type": "x"})
            return True

        return bool(async_to_sync(_probe)())
    except Exception:
        return False


async def _drain_join(ws):
    await ws.receive_json_from()
    await ws.receive_json_from()


@override_settings(WS_ALLOW_QUERY_TOKEN=True)
class ChallengeDeepE2ETests(TransactionTestCase):
    def test_full_challenge_flow_with_real_redis(self):
        if not _redis_channel_ok():
            self.skipTest("Couche Redis indisponible")
        async_to_sync(self._flow)()

    async def _flow(self):
        from config.asgi import application

        challenger = await User.objects.acreate(username="deep_ch", password="x")
        opponent = await User.objects.acreate(username="deep_op", password="x")

        # 1) Défi + acceptation via l'API réelle.
        @sync_to_async
        def create_and_accept():
            c = APIClient()
            c.force_authenticate(challenger)
            res = c.post(
                "/api/games/challenge/",
                {"username": opponent.username, "mode": "blitz", "is_rated": False},
                format="json",
            )
            assert res.status_code == 201, res.data
            challenge_id = res.data["id"]
            c.force_authenticate(opponent)
            acc = c.post(
                f"/api/games/challenges/{challenge_id}/accept/", {}, format="json"
            )
            assert acc.status_code == 200, acc.data
            return challenge_id, acc.data["game"]["id"]

        challenge_id, game_id = await create_and_accept()

        # 2) DEMANDEUR : connecte son WS notifications APRÈS l'acceptation.
        #    Le match_found doit être présent dans le snapshot initial.
        ch_token = str(AccessToken.for_user(challenger))
        notif_ws = WebsocketCommunicator(
            application, f"/ws/notifications/?token={ch_token}"
        )
        self.assertTrue((await notif_ws.connect())[0])
        snapshot = await notif_ws.receive_json_from()
        self.assertEqual(snapshot["event"], "notifications")
        match_found = [
            n
            for n in snapshot["data"]
            if n["type"] == "match_found" and n["data"].get("game_id") == str(game_id)
        ]
        self.assertEqual(
            len(match_found),
            1,
            f"Le demandeur doit recevoir match_found+game_id dans le snapshot : {snapshot['data']}",
        )
        self.assertFalse(match_found[0]["is_read"], "Notif non lue -> déclenche la redirection")
        await notif_ws.disconnect()

        # 3) Les deux rejoignent la partie.
        b_token = str(AccessToken.for_user(opponent))
        white_ws = WebsocketCommunicator(application, f"/ws/game/{game_id}/?token={ch_token}")
        black_ws = WebsocketCommunicator(application, f"/ws/game/{game_id}/?token={b_token}")
        self.assertTrue((await white_ws.connect())[0])
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join(white_ws)
        await _drain_join(black_ws)

        # 5) Chrono resynchronisé quand les deux sont connectés (avant tout coup).
        game = await Game.objects.aget(id=game_id)
        self.assertIsNotNone(game.turn_started_at)
        self.assertEqual(game.white_time_ms, 180_000)
        self.assertEqual(game.black_time_ms, 180_000)

        # 4) Blanc joue -> Noir reçoit le coup diffusé (vraie couche Redis).
        await white_ws.send_json_to({"event": "jouer_coup", "uci": "e2e4"})
        white_echo = await white_ws.receive_json_from()
        black_msg = await black_ws.receive_json_from()
        self.assertEqual(white_echo["event"], "recevoir_coup")
        self.assertEqual(black_msg["event"], "recevoir_coup")
        self.assertIn("4P3", black_msg["data"]["game"]["fen"])

        # Noir répond -> Blanc reçoit.
        await black_ws.send_json_to({"event": "jouer_coup", "uci": "e7e5"})
        await black_ws.receive_json_from()
        white_recv = await white_ws.receive_json_from()
        self.assertEqual(white_recv["event"], "recevoir_coup")

        game = await Game.objects.aget(id=game_id)
        self.assertEqual(game.status, Game.Status.ACTIVE)
        self.assertEqual(game.move_count, 2)

        await white_ws.disconnect()
        await black_ws.disconnect()

        # Les deux joueurs ont bien reçu un match_found (redirection des deux côtés).
        both = await sync_to_async(
            lambda: Notification.objects.filter(
                type=Notification.Type.MATCH_FOUND, data__game_id=str(game_id)
            ).count()
        )()
        self.assertEqual(both, 2)

        # Le défi est bien lié à la partie créée.
        ch = await GameChallenge.objects.aget(id=challenge_id)
        self.assertEqual(str(ch.game_id), str(game_id))
        self.assertEqual(ch.status, GameChallenge.Status.ACCEPTED)
