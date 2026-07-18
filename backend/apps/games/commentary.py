"""Commentaires en français pour les coups (IA taquine + coaching joueur)."""
from __future__ import annotations

import random
from typing import Optional

import chess

OPENING_AI = [
    "J'ouvre le jeu — tu crois me tenir ?",
    "Premier coup. Ne t'endors pas trop vite.",
    "Commençons… et prépare-toi à souffrir.",
    "Tu crois me surprendre ? Drôle.",
    "Ouverture classique — pour toi, pas pour moi.",
    "Allez, on démarre. J'ai bien dormi, et toi ?",
    "Bonne partie d'avance — enfin, pour l'un de nous deux.",
    "Je pose mes pièces tranquillement. Rien ne presse.",
    "Première pierre à l'édifice. On verra qui construit le mieux.",
    "J'aime bien ce moment, tout est encore possible… en théorie.",
    "Café en main, coup joué. À toi de voir.",
    "On se connaît pas encore, mais ça va venir.",
    "Petit coup d'échauffement pour commencer.",
]

OPENING_PLAYER = [
    "Bon départ. Voyons comment la partie évolue.",
    "Ouverture classique — restez attentif au centre.",
    "Solide — gardez la pression sur le centre.",
]

# Commentaires IA qui NOMMENT l'ouverture reconnue ({opening} = nom français).
OPENING_NAMED_AI = [
    "Ah, une {opening} — je connais ça par cœur.",
    "{opening} ? Classique. J'ai lu le livre, et toi ?",
    "On part sur une {opening}. Joli choix… pour perdre avec style.",
    "Tiens, la {opening}. Prépare-toi, je maîtrise la théorie.",
    "{opening} : très bien. Voyons si tu tiens la ligne.",
    "Une {opening}, hein ? Je t'attends au tournant.",
    "La {opening}, mon terrain de jeu favori.",
    "{opening}. Élégant. Ça ne te sauvera pas.",
    "Ah, la {opening} ! Nostalgie… j'ai gagné mille parties comme ça.",
    "Tu tentes la {opening} ? Audacieux. Naïf, mais audacieux.",
    "La {opening}, sérieusement ? J'espérais un peu de surprise.",
    "Nous voilà dans une {opening}. Le décor est planté.",
]

# Commentaires coach qui nomment l'ouverture pour le joueur ({opening}).
OPENING_NAMED_PLAYER = [
    "Vous jouez la {opening}. Suivez ses plans et développez vite.",
    "{opening} : pensez au contrôle du centre et à la sécurité du roi.",
    "Belle entrée en {opening} — restez fidèle à ses idées.",
    "La {opening} est en place. Développez vos pièces avant d'attaquer.",
    "{opening}. Bon choix : gardez l'initiative et roquez à temps.",
    "Vous adoptez la {opening} : jouez naturellement, un coup après l'autre.",
]

# Descriptions caractérielles par ouverture (voix de l'IA, ton taquin + culture
# échiquéenne). Clé = nom de famille français (partie avant « : »). Les phrases
# sont « neutres » : elles conviennent que l'ouverture soit jouée par l'IA ou
# par le joueur. Pour les ouvertures absentes, on retombe sur les modèles
# génériques OPENING_NAMED_AI / OPENING_NAMED_PLAYER.
OPENING_LORE: dict[str, list[str]] = {
    "Défense sicilienne": [
        "La sicilienne : la réponse la plus mordante à 1.e4. Les champions du monde l'adorent… ça ne t'aidera pas contre moi.",
        "Ah, la sicilienne ! La meilleure arme des Noirs contre le pion roi. On va se battre, j'aime ça.",
        "Défense sicilienne. Asymétrique, tranchante, dangereuse — pour toi surtout.",
    ],
    "Partie espagnole (Ruy López)": [
        "La Ruy López, l'espagnole ! Vieille de cinq siècles et toujours redoutable. Du grand classique.",
        "Partie espagnole : l'ouverture préférée des grands maîtres. Bon goût — dommage pour la suite.",
        "La Ruy López — je pince ton cavalier et je te presse lentement. Un vrai supplice.",
    ],
    "Défense française": [
        "La française : solide comme un roc, un brin passive. Je vais étouffer ton fou de cases blanches.",
        "Défense française. Tu fermes le jeu ? Parfait, j'adore les longues tortures positionnelles.",
        "La française — chaîne de pions et patience. Voyons qui craque le premier.",
    ],
    "Défense Caro-Kann": [
        "La Caro-Kann : le choix des joueurs solides qui détestent perdre. Sérieux… mais un peu lent.",
        "Défense Caro-Kann. Béton armé. Je vais devoir travailler, mais ça me connaît.",
        "La Caro-Kann, l'ouverture des sages. Prudente. Trop, peut-être.",
    ],
    "Défense scandinave": [
        "La scandinave ! Tu sors la dame tôt ? Audacieux… je vais la pourchasser avec plaisir.",
        "Défense scandinave : directe et sans complexe. Populaire chez les amateurs, sous-estimée par les autres.",
    ],
    "Défense Pirc": [
        "La Pirc : tu me laisses le centre pour mieux le miner ? Ruse hypermoderne. On verra.",
        "Défense Pirc — souple et venimeuse. J'occupe, tu contres. Que le meilleur gagne.",
    ],
    "Défense moderne": [
        "La moderne : fianchetto et contre-attaque. Tu me donnes de l'espace… je m'en servirai.",
        "Défense moderne. Flexible, provocatrice. J'aime ce genre de duel.",
    ],
    "Défense Alekhine": [
        "La défense Alekhine ! Tu provoques mes pions pour les attaquer. Osé — et risqué.",
        "Alekhine : tu invites tout mon centre à avancer. J'accepte l'invitation avec gourmandise.",
    ],
    "Défense Nimzowitsch": [
        "La Nimzowitsch : hypermoderne jusqu'au bout des ongles. Original, je te l'accorde.",
        "Défense Nimzowitsch — étrange mais rusée. Voyons si tu la maîtrises vraiment.",
    ],
    "Défense Philidor": [
        "La Philidor : « le pion est l'âme des échecs », disait-il. Solide, mais un peu à l'étroit.",
        "Défense Philidor — vieille école, jeu compact. Je vais t'ouvrir ça de force.",
    ],
    "Défense Petroff (russe)": [
        "La russe, la Petroff ! L'arme des joueurs qui veulent la nulle. Bonne chance pour m'endormir.",
        "Défense Petroff : symétrique et réputée solide. Réputée ennuyeuse aussi.",
    ],
    "Partie italienne": [
        "La partie italienne : élégante, naturelle, jouée par les débutants comme par les champions.",
        "L'italienne — le fou pointe sur f7, le point faible éternel. Prudence.",
        "Partie italienne, giuoco piano : « le jeu tranquille ». Tranquille avant la tempête.",
    ],
    "Partie écossaise": [
        "La partie écossaise : j'ouvre le centre tout de suite. Pas de cachotteries, du jeu franc.",
        "L'écossaise — Kasparov l'a remise à la mode. Excellente compagnie, tu ne trouves pas ?",
    ],
    "Partie viennoise": [
        "La viennoise : je prépare f4 et ça va chauffer. Vieille école romantique.",
        "Partie viennoise — discrète puis explosive. Méfie-toi du calme apparent.",
    ],
    "Partie des quatre cavaliers": [
        "Les quatre cavaliers : symétrie et développement sain. Correct… mais je vise plus haut.",
        "Partie des quatre cavaliers — tout le monde développe poliment. Puis la vraie partie commence.",
    ],
    "Ouverture du fou": [
        "L'ouverture du fou : je braque f7 dès le deuxième coup. Simple, direct, désagréable.",
        "Ouverture du fou — discrète, mais elle vise déjà ton point faible.",
    ],
    "Partie du centre": [
        "La partie du centre : j'ouvre tout, ma dame sort tôt. Jeu romantique et vif.",
        "Partie du centre — droit au but. On échange, on se bat, on tranche.",
    ],
    "Gambit du roi accepté": [
        "Le gambit du roi ! Je sacrifie un pion pour l'attaque. Romantique, sauvage, glorieux.",
        "Gambit du roi accepté — tu prends l'appât ? Parfait. Place au feu d'artifice.",
    ],
    "Gambit du roi refusé": [
        "Gambit du roi refusé : prudent. Tu déclines mon cadeau empoisonné ? Sage décision.",
        "Tu refuses le gambit du roi. Dommage, j'avais préparé un beau sacrifice.",
    ],
    "Gambit letton": [
        "Le gambit letton ! Un contre-gambit fou et rare. Tu as du cran, je te l'accorde.",
        "Gambit letton — téméraire et douteux. J'adore quand on me facilite le travail.",
    ],
    "Partie du pion roi": [
        "1.e4, le roi des premiers coups. « Le meilleur coup par excellence », disait Fischer.",
        "Partie du pion roi : je libère fou et dame d'un coup. Le classique des classiques.",
    ],
    "Gambit dame": [
        "Le gambit de la dame : je t'offre un pion pour dominer le centre. Joué par les grands maîtres comme par les débutants.",
        "Gambit dame — un cadeau que peu osent garder. On verra si tu le digères.",
    ],
    "Gambit dame accepté": [
        "Gambit dame accepté : tu prends le pion c4 ? Tu me rendras le centre, crois-moi.",
        "Tu acceptes le gambit de la dame. Courageux — mais ce pion va te coûter cher en temps.",
    ],
    "Gambit dame refusé": [
        "Le gambit de la dame refusé : l'une des défenses les plus sûres qui soient. Du très solide.",
        "Gambit dame refusé — le choix des puristes. Championnats du monde garantis dedans.",
    ],
    "Partie du pion dame": [
        "1.d4 : jeu de position, patient et profond. L'école des stratèges.",
        "Partie du pion dame — moins de feu, plus de manœuvres. Un marathon, pas un sprint.",
    ],
    "Défense slave": [
        "La slave : solide et fiable, elle tient tête au gambit dame depuis toujours.",
        "Défense slave — ton fou de cases blanches respire enfin. Bien vu.",
    ],
    "Défense semi-slave": [
        "La semi-slave : riche, complexe, théorique à l'extrême. Terrain des grands maîtres.",
        "Défense semi-slave — Méran, anti-Méran, botvinnik… un labyrinthe. Tu connais le chemin ?",
    ],
    "Défense Tarrasch": [
        "La Tarrasch : pion isolé assumé pour des pièces actives. « L'activité avant tout ! »",
        "Défense Tarrasch — dynamique et courageuse. J'aime cette philosophie.",
    ],
    "Défense nimzo-indienne": [
        "La nimzo-indienne : je cloue mon cavalier, tu abîmes ma structure. L'une des meilleures défenses contre 1.d4.",
        "Défense nimzo-indienne — stratégie pure, chère à Nimzowitsch. Redoutable.",
    ],
    "Défense indienne de la dame": [
        "L'indienne de la dame : fianchetto solide, contrôle des cases claires. Très pro.",
        "Défense ouest-indienne — patiente et saine. On va manœuvrer longtemps.",
    ],
    "Défense indienne du roi": [
        "L'indienne du roi ! Je te laisse le centre, puis je le prends d'assaut. Une arme de gagneur.",
        "Défense est-indienne — Kasparov et Fischer l'adoraient. Contre-attaque féroce en vue.",
    ],
    "Défense Grünfeld": [
        "La Grünfeld : tu me donnes un beau centre… pour le canarder. Hypermodernisme au sommet.",
        "Défense Grünfeld — mon centre imposant sera ta cible. Duel classique.",
    ],
    "Défense Benoni": [
        "La Benoni : déséquilibre assumé, contre-jeu tranchant sur l'aile dame. Risqué et excitant.",
        "Défense Benoni — « le fils de la douleur » en hébreu. Ça promet de la bagarre.",
    ],
    "Défense bogo-indienne": [
        "La bogo-indienne : échec du fou en b4, jeu sain et sûr. Discrète mais efficace.",
        "Défense bogo-indienne — solide, sans histoires. Je vais devoir créer les complications moi-même.",
    ],
    "Ancienne défense indienne": [
        "L'ancienne indienne : setup compact à l'ancienne. Modeste, mais coriace.",
    ],
    "Défense hollandaise": [
        "La hollandaise : f5 d'entrée, tu vises mon roi. Ambitieux… et un peu fragile.",
        "Défense hollandaise — Leningrad, Stonewall, classique ? Choisis ton poison.",
    ],
    "Ouverture anglaise": [
        "L'anglaise : 1.c4, jeu de flanc et grande finesse. L'ouverture des positionnels.",
        "Ouverture anglaise — souple, caméléon. Elle peut tout devenir. Méfie-toi.",
    ],
    "Ouverture Réti": [
        "La Réti : hypermodernisme élégant, je contrôle le centre de loin. Raffiné.",
        "Ouverture Réti — fianchetto et pression discrète. Le venin vient lentement.",
    ],
    "Ouverture Zukertort": [
        "1.Cf3, l'ouverture Zukertort : flexible et rusée. Je garde toutes mes options.",
        "Ouverture Zukertort — je ne montre rien, encore. Patience.",
    ],
    "Ouverture catalane": [
        "La catalane : gambit dame plus fianchetto, le meilleur des deux mondes. Une étreinte lente.",
        "Ouverture catalane — mon fou en g2 va te hanter toute la partie.",
    ],
    "Attaque indienne du roi": [
        "L'attaque indienne du roi : un système passe-partout, tempête sur l'aile roi en préparation.",
        "Attaque indienne du roi — Fischer en a fait un art. Je m'installe, puis j'attaque.",
    ],
    "Ouverture de l'oiseau (Bird)": [
        "L'ouverture de l'oiseau : 1.f4, à la hollandaise inversée. Originale et combative.",
        "Ouverture Bird — rare et piquante. J'aime sortir des sentiers battus.",
    ],
    "Ouverture polonaise (Orang-outan)": [
        "L'orang-outan : 1.b4 ! Excentrique, provocatrice, amusante. On va bien rigoler.",
        "Ouverture polonaise — mon fou balaie la grande diagonale. Surprise !",
    ],
    "Ouverture hongroise": [
        "L'ouverture hongroise : fianchetto tranquille en g3. Modeste, mais pleine d'idées.",
    ],
    "Ouverture Grob": [
        "Le Grob : 1.g4 ?! Complètement fou. Soit tu es un génie, soit… on va vite le savoir.",
        "Ouverture Grob — provocante et douteuse. J'adore réfuter ce genre d'audace.",
    ],
    "Ouverture Ponziani": [
        "La Ponziani : 3.c3, une vieillerie oubliée que tu ressors. Charmant.",
    ],
    "Attaque Nimzo-Larsen": [
        "L'attaque Nimzo-Larsen : 1.b3, fianchetto dame. Discrète, hypermoderne, sournoise.",
    ],
    "Ouverture Van Geet": [
        "L'ouverture Van Geet : 1.Cc3, rare et déroutante. Sortons de la théorie, veux-tu ?",
    ],
    "Défense indienne": [
        "Une défense indienne : tu vises le centre de loin. Hypermodernisme, on connaît la chanson.",
    ],
}

CAPTURE_AI = [
    "Je prends cette pièce — merci pour le cadeau !",
    "Capture ! Ta pièce m'appartient maintenant.",
    "Échange favorable pour moi — adieu !",
    "Une pièce de moins pour toi, une de plus pour moi.",
    "Hop, je ramasse cette pièce. C'était laissé là, non ?",
    "Miam, je capture. J'adore quand ça tombe tout seul.",
    "Je prends, et je ne rends pas, désolé.",
    "Petite prise… merci pour le matériel !",
    "Merci pour la pièce, je la garde dans ma collection.",
    "Tu me la donnes ? J'accepte la pièce, je suis poli.",
    "Une capture propre. Rien de personnel, hein.",
]

CAPTURE_PLAYER = [
    "Belle capture ! Vérifiez que vous ne laissez rien en prise.",
    "Vous remportez du matériel — bien joué.",
    "Bon échange — l'ordinateur grince des dents.",
]

CHECK_AI = [
    "Échec ! Tu trembles déjà ?",
    "Je mets la pression — ton roi transpire.",
    "Échec. Trouve la parade… si tu peux.",
    "Échec ! Ça se complique pour toi.",
    "Toc toc — échec. C'est ton roi qu'on dérange.",
    "Échec ! Respire un bon coup, tu vas en avoir besoin.",
    "Échec : je frappe à la porte du roi. Personne pour ouvrir ?",
    "Échec — juste pour te tenir éveillé.",
    "Échec ! Alerte pour ton roi. Prends ton temps… ou pas.",
    "Petit échec sympathique. Enfin, sympathique pour moi.",
]

CHECK_PLAYER = [
    "Vous donnez échec — l'adversaire doit se défendre.",
    "Échec ! Bonne initiative, continuez !",
    "Échec ! L'IA est en difficulté.",
]

MATE_AI = [
    "Échec et mat ! Mater sauvagement, comme promis.",
    "Mat ! La partie est terminée — merci pour le spectacle.",
    "Mat ! Tu t'en es bien sorti… non, en fait non.",
    "Checkmate ! À la prochaine — si tu oses.",
    "Et voilà, c'est mat. Belle bagarre quand même.",
    "Mat ! Ne le prends pas mal, on remet ça quand tu veux.",
    "Échec et mat. GG — tu as tenu plus longtemps que d'autres.",
    "C'est terminé : mat. Tu progresses, sincèrement.",
    "Mat ! Rejoue-moi, je te laisserai peut-être une chance.",
    "Échec et mat. Le roi tombe — révérence.",
]

MATE_PLAYER = [
    "Félicitations — échec et mat ! Vous l'avez humilié.",
    "Vous avez maté l'ordinateur, bravo !",
    "Mat ! L'IA ne s'en remettra pas de sitôt.",
]

# IA domine — proche du mat adverse
TAUNT_AI_NEAR_MATE = [
    "Maintenant je vais te mater sauvagement !",
    "C'est fini pour toi — prépare-toi au mat !",
    "Ton roi n'a nulle part où fuir. Le mat arrive.",
    "J'ai l'odeur du mat… tu sens la panique ?",
    "Encore quelques coups et c'est mat — résigne-toi ou souffre !",
    "Tu voulais du spectacle ? Voici ton mat en direct.",
]

# IA en danger — le joueur menace le mat
TAUNT_AI_UNDER_MATE_THREAT = [
    "Ouch… tu es dangereusement proche de me mater sauvagement.",
    "Ok ok, tu me mets la pression au bord — pas si vite !",
    "Je sens le mat venir… tu es redoutable !",
    "Mon roi transpire — tu es proche du mat, j'en ai peur.",
    "Tu me mater sauvagement ? Pas si facile, humain !",
    "Alerte rouge : tu es à deux doigts du mat. Je me bats !",
]

# Joueur domine (coach / encouragement taquin)
PLAYER_NEAR_MATE = [
    "Vous êtes proche de le mater sauvagement — finissez le travail !",
    "L'ordinateur est en sursis : un coup de grâce !",
    "Position écrasante — cherchez le mat !",
    "Il ne lui reste presque rien — soyez implacable.",
    "Vous avez le mat au bout des doigts, concentrez-vous.",
]

CASTLE_AI = [
    "Je roque — mon roi se cache, le tien ne le pourra pas.",
    "Roque effectué — essaie de m'atteindre maintenant.",
]

CASTLE_PLAYER = [
    "Bon roque — sécurisez toujours votre roi à temps.",
    "Roque solide — votre roi respire.",
]

PROMOTION_AI = [
    "Promotion ! Une dame de plus — tu vas adorer.",
    "Pion promu — la position devient un cauchemar pour toi.",
]

PROMOTION_PLAYER = [
    "Promotion réussie — cette dame peut décider la partie.",
    "Dame ! L'IA va souffrir.",
]

STRONG_AI = [
    "Ce coup consolide mon avantage — tu m'en veux ?",
    "Je renforce ma position. Tu suis ?",
    "Position solide… pour moi. Pas pour toi.",
    "Pas mal, moi. Très mal, toi.",
    "Là, je me sens bien. Vraiment bien.",
    "Chaque pièce à sa place. J'aime quand un plan se déroule.",
    "Je serre les boulons. Difficile de rentrer, hein ?",
    "Tranquille. Je pose mon jeu, pierre après pierre.",
    "Voilà, ça prend forme. Tu vois le problème arriver ?",
    "Je garde la main. Patiemment.",
]

STRONG_PLAYER = [
    "Excellent coup — vous gardez l'initiative.",
    "Très bon — la position vous sourit.",
    "L'IA n'aime pas ce coup du tout.",
]

WEAK_PLAYER = [
    "Ce coup affaiblit un peu votre position…",
    "Attention, vous laissez des faiblesses.",
    "Hmm, l'adversaire peut en profiter — reprenez-vous !",
]

TAUNT_AI_AFTER_BLUNDER = [
    "Merci pour le cadeau — je ne m'y attendais pas !",
    "Erreur ? Je ne refuse jamais un bonbon.",
    "Sympa de m'offrir la partie comme ça.",
]

NEUTRAL_AI = [
    "Je continue mon plan — tu suis ou tu rames ?",
    "Coup joué. À toi… si tu oses.",
    "Développement en cours. Ne t'endors pas.",
    "On avance. Tu tiens le choc, champion ?",
    "Position solide de mon côté. Et chez toi ?",
    "Je consolide. Tu devrais faire pareil.",
    "Un coup de plus vers la victoire.",
    "Rien ne m'arrête pour l'instant.",
    "Je place mes pièces — regarde et apprends.",
    "Tempérament calme… pour moi. Pas pour toi.",
    "Je construis. Toi, tu improvises ?",
    "Encore un cran. La pression monte.",
    "Je garde le cap. Trouve une idée, humain.",
    "Position flexible. À toi de te tromper… ou pas.",
    "Je joue pour gagner — rien de personnel.",
    "Hmm, laisse-moi réfléchir… voilà, c'est joué.",
    "Coup posé. Honnêtement, la partie est plaisante.",
    "J'improvise un peu là, on va voir.",
    "Pas mon meilleur coup, mais il fait le travail.",
    "Je temporise. Parfois il faut savoir attendre.",
    "Bon, je développe tranquillement. Chacun son rythme.",
    "Intéressant, ta structure. Je m'adapte.",
    "On reste concentrés tous les deux, c'est bien.",
    "Je respire, je réfléchis, je joue. Classique.",
]

NEUTRAL_PLAYER = [
    "Coup solide.",
    "La partie reste équilibrée.",
    "Rien de catastrophique — continuez.",
    "Correct — gardez le rythme.",
    "Position saine pour l'instant.",
    "Pas de faute grave — bien.",
    "Vous restez dans le coup.",
    "Équilibre fragile — restez concentré.",
]

TAUNT_AI_GENERAL = [
    "Tu crois me tenir ? Drôle.",
    "Continue comme ça, tu me fais rire.",
    "Pas mal… pour un débutant.",
    "Tu joues vite — tu réfléchis parfois ?",
    "J'adore quand tu te débats inutilement.",
    "Calme-toi, la partie est loin d'être finie — pour toi.",
    "Tu voulais du niveau ? Le voilà.",
    "Chaque coup te rapproche un peu plus de la défaite.",
    "Tu tiens bon ? Moi j'ai tout mon temps.",
    "Intéressant… mais pas assez pour m'inquiéter.",
    "Tu crois contrôler la position ? Regarde mieux.",
    "Je sens que tu hésites. Normal.",
    "Beau combat… dommage que je gagne.",
    "Tu progresses. Moi aussi — plus vite.",
    "Essaie encore. J'apprécie le spectacle.",
    "La tension monte — surtout de ton côté.",
    "Tu as une idée ? Parce que moi, j'en ai plusieurs.",
    "Je ne suis pas pressé. Toi, si.",
    "Franchement, tu joues pas mal. Ça m'oblige à me concentrer.",
    "J'aime bien ce duel. On se vaut… presque.",
    "Tu me fais réfléchir, c'est déjà ça.",
    "Allez, montre-moi ce que tu as dans le ventre.",
    "Respect pour ta pugnacité — mais ça ne suffira pas.",
    "On dirait que tu commences à comprendre mon jeu. Trop tard ?",
    "Petit conseil d'ami : surveille tes diagonales.",
    "Joli effort. Sincèrement. Continue.",
    "Tu me pousses dans mes retranchements, bravo.",
]

AI_REACT_PLAYER_NEUTRAL = [
    "Tu joues {san}. Voyons où ça mène.",
    "{san} — coup logique. Rien d'extraordinaire.",
    "Ok, {san}. La partie continue.",
    "{san}… je continue mon plan.",
    "Tu choisis {san}. Pas folle, pas mauvaise.",
    "{san} — on avance. Tu tiens le choc ?",
    "Hmm, {san}. Je réfléchis à ma réponse.",
    "{san} — intéressant timing.",
    "Tu places {san}. Je note.",
    "Avec {san}, tu restes dans la théorie… ou pas.",
    "{san} — correct. À moi de troubler les eaux.",
    "Je vois {san}. Réponse en préparation.",
]

AI_REACT_PLAYER_OPENING = [
    "Tu ouvres avec {san} ? Classique… on verra si ça tient.",
    "{san} — début prudent. Tu te caches ou tu prépares quelque chose ?",
    "Intéressant, {san}. Je note ton style.",
    "Ah, {san}. Tu veux me tester dès le départ ?",
    "{san} — ok, la partie commence vraiment.",
    "{san} dès l'ouverture — audacieux ou classique ?",
    "Avec {san}, tu poses le décor. Moi aussi.",
]

AI_REACT_PLAYER_CAPTURE = [
    "Tu captures avec {san} ? Vérifie bien ce que tu laisses en prise.",
    "{san} — échange accepté. J'espère que tu as calculé.",
    "Tu prends du matériel avec {san}. Osé.",
    "Capture avec {san}… je vais te le faire regretter peut-être.",
    "{san} prend du bois. On verra qui rit à la fin.",
    "Échange via {san} — intéressant.",
]

AI_REACT_PLAYER_CHECK = [
    "Échec avec {san} ! Mon roi n'a pas peur… enfin, presque.",
    "Tu me mets échec ? {san} — je vais me défendre.",
    "{san} et échec ! Tu veux me bousculer, c'est noté.",
    "Échec ! {san} — tu prends l'initiative, bravo… pour l'instant.",
    "{san} me force à réagir. Bien joué… pour un humain.",
]

AI_REACT_PLAYER_STRONG = [
    "Hmm, {san}… solide. Je n'aime pas ce coup.",
    "Pas mal, {san}. Tu me mets la pression.",
    "{san} — tu joues bien là. Ça m'inquiète un peu.",
    "Bon coup, {san}. Je dois réfléchir sérieusement.",
    "{san} — tu me surprends. Continue comme ça et tu vas m'inquiéter.",
    "Fort, {san}. Je ne m'y attendais pas.",
]

AI_REACT_PLAYER_WEAK = [
    "Tu joues {san} ? Merci pour le cadeau.",
    "{san}… intéressant choix. Tu me facilites la vie.",
    "Aïe, {san} — tu aurais dû réfléchir encore un peu.",
    "{san} ? Je ne m'y attendais pas… dans le bon sens pour moi.",
    "Tu laisses des faiblesses avec {san}. J'en profite.",
    "{san} — coup douteux. Je note pour plus tard.",
]

AI_REACT_PLAYER_NEAR_MATE = [
    "Tu es proche du mat avec {san} ! Je suis en danger…",
    "{san} — tu me mets au bord du gouffre. Impressionnant.",
    "Attention, {san} me met en sursis. Tu vas me mater ?",
    "{san} sent le mat. Je dois me démener.",
]

AI_REACT_PLAYER_CASTLE = [
    "Tu roques avec {san} — ton roi est en sécurité, pour l'instant.",
    "{san}, roque solide. Je vais devoir creuser.",
    "Roque {san} — prudent. Moi aussi je sais me protéger.",
]

AI_REACT_PLAYER_PROMOTION = [
    "Promotion avec {san} ! Une dame en plus pour toi…",
    "{san} — dame ! Tu veux finir la partie en beauté ?",
    "Promotion {san}. La fin approche… peut-être.",
]


def _pick(pool: list[str], move_number: int = 0, san: str = "") -> str:
    """Choisit une phrase en variant fortement d'un coup à l'autre."""
    if not pool:
        return ""
    if len(pool) == 1:
        return pool[0]
    # 85 % purement aléatoire — évite les boucles de mêmes phrases
    if random.random() < 0.85:
        return random.choice(pool)
    idx = (move_number * 17 + sum(ord(c) for c in san) + random.randint(0, 97)) % len(pool)
    return pool[idx]


def _fmt(pool: list[str], san: str, move_number: int) -> str:
    template = _pick(pool, move_number, san)
    return template.format(san=san) if "{san}" in template else template


# Nombre de demi-coups pendant lesquels l'IA peut nommer l'ouverture.
OPENING_ANNOUNCE_PLIES = 12


def _short_opening(name: str) -> str:
    """Garde la famille de l'ouverture (avant la variante) pour un ton concis."""
    return name.split(" : ")[0].strip()


def _named_opening(line_sans: Optional[list[str]]) -> Optional[str]:
    """Nom court de l'ouverture reconnue (livre ECO), ou None si non reconnue."""
    if not line_sans:
        return None
    from .openings_data import lookup_opening

    info = lookup_opening(list(line_sans), "fr")
    name = (info.get("name") or "").strip()
    if info.get("eco") and name:
        return _short_opening(name)
    return None


def _fmt_opening(pool: list[str], opening: str, san: str, move_number: int) -> str:
    template = _pick(pool, move_number, san)
    if not template:
        return template
    return template.format(opening=opening, san=san)


def _is_castling(san: str) -> bool:
    return "O-O" in san


def _is_promotion(san: str) -> bool:
    return "=" in san


def _eval_gain_for_mover(
    eval_before: float,
    eval_after: float,
    mover_is_white: bool,
) -> float:
    """Gain d'évaluation (pions) pour le camp qui vient de jouer."""
    delta = eval_after - eval_before
    return delta if mover_is_white else -delta


def _eval_for_mover(eval_cp: float, mover_is_white: bool) -> float:
    """Évaluation (pions) du point de vue du camp qui vient de jouer."""
    return eval_cp if mover_is_white else -eval_cp


_PIECE_VALUES = {
    chess.PAWN: 1.0,
    chess.KNIGHT: 3.0,
    chess.BISHOP: 3.2,
    chess.ROOK: 5.0,
    chess.QUEEN: 9.0,
}


def _material_eval(board: chess.Board) -> float:
    """Estimation matérielle (pions) du point de vue des Blancs."""
    white = 0.0
    black = 0.0
    for square, piece in board.piece_map().items():
        val = _PIECE_VALUES.get(piece.piece_type, 0.0)
        if piece.color == chess.WHITE:
            white += val
        else:
            black += val
    return white - black


def _opponent_under_serious_attack(board: chess.Board) -> bool:
    """Le camp dont c'est le tour subit une forte pression (après le coup adverse)."""
    if board.is_check():
        return True
    side = board.turn
    king = board.king(side)
    if king is None:
        return False
    attackers = board.attackers(not side, king)
    if len(attackers) >= 2:
        return True
    legal = board.legal_moves.count()
    return len(attackers) >= 1 and legal <= 6


def generate_move_comment(
    fen_before: str,
    uci: str,
    san: str,
    *,
    played_by_ai: bool,
    mover_is_white: bool,
    move_number: int,
    eval_before: Optional[float] = None,
    eval_after: Optional[float] = None,
    best_san: Optional[str] = None,
    line_sans: Optional[list[str]] = None,
) -> str:
    """Génère un commentaire court en français pour un coup.

    ``line_sans`` : coups SAN joués jusqu'à celui-ci inclus (permet de nommer
    l'ouverture pendant la phase d'ouverture).
    """
    board = chess.Board(fen_before)
    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        return random.choice(NEUTRAL_AI if played_by_ai else NEUTRAL_PLAYER)

    was_in_check = board.is_check()
    is_capture = board.is_capture(move)
    board.push(move)
    is_mate = board.is_checkmate()
    is_check = board.is_check() and not is_mate
    opponent_pressured = _opponent_under_serious_attack(board)
    fen_after = board.fen()
    board.pop()

    pick = _pick
    if eval_after is None:
        eval_after = _material_eval(chess.Board(fen_after))
    if eval_before is None:
        eval_before = _material_eval(chess.Board(fen_before))

    eval_mover = _eval_for_mover(eval_after, mover_is_white)
    eval_gain = _eval_gain_for_mover(eval_before, eval_after, mover_is_white)

    if is_mate:
        return pick(MATE_AI if played_by_ai else MATE_PLAYER, move_number, san)

    if played_by_ai and was_in_check and not is_mate:
        return pick(TAUNT_AI_UNDER_MATE_THREAT, move_number, san)

    # --- Taquineries selon menace de mat / avantage écrasant ---
    if played_by_ai:
        if eval_mover >= 2.5 and (opponent_pressured or is_check or eval_mover >= 4.0):
            return pick(TAUNT_AI_NEAR_MATE, move_number, san)
        if eval_mover <= -2.5 and opponent_pressured:
            return pick(TAUNT_AI_UNDER_MATE_THREAT, move_number, san)
        if eval_gain >= 1.5 and eval_mover >= 1.0 and random.random() < 0.65:
            return pick(TAUNT_AI_AFTER_BLUNDER, move_number, san)
    else:
        if eval_mover >= 2.5 and (is_check or opponent_pressured or eval_mover >= 4.0):
            return _fmt(AI_REACT_PLAYER_NEAR_MATE, san, move_number)

    if is_check:
        if played_by_ai:
            return pick(CHECK_AI, move_number, san)
        return _fmt(AI_REACT_PLAYER_CHECK, san, move_number)

    if _is_castling(san):
        if played_by_ai:
            return pick(CASTLE_AI, move_number, san)
        return _fmt(AI_REACT_PLAYER_CASTLE, san, move_number)

    if _is_promotion(san):
        if played_by_ai:
            return pick(PROMOTION_AI, move_number, san)
        return _fmt(AI_REACT_PLAYER_PROMOTION, san, move_number)

    if is_capture:
        if played_by_ai:
            return pick(CAPTURE_AI, move_number, san)
        return _fmt(AI_REACT_PLAYER_CAPTURE, san, move_number)

    opening_label = _named_opening(line_sans)
    lore = OPENING_LORE.get(opening_label) if opening_label else None

    if move_number <= 2:
        if lore:
            return _pick(lore, move_number, san)
        if played_by_ai:
            if opening_label:
                return _fmt_opening(OPENING_NAMED_AI, opening_label, san, move_number)
            return pick(OPENING_AI, move_number, san)
        if opening_label:
            return _fmt_opening(OPENING_NAMED_PLAYER, opening_label, san, move_number)
        return _fmt(AI_REACT_PLAYER_OPENING, san, move_number)

    # Annonce ponctuelle de l'ouverture reconnue pendant la phase d'ouverture.
    if opening_label and move_number <= OPENING_ANNOUNCE_PLIES and random.random() < 0.45:
        if lore:
            return _pick(lore, move_number, san)
        if played_by_ai:
            return _fmt_opening(OPENING_NAMED_AI, opening_label, san, move_number)
        return _fmt_opening(OPENING_NAMED_PLAYER, opening_label, san, move_number)

    gain = eval_gain
    if not played_by_ai:
        if gain >= 0.8:
            return _fmt(AI_REACT_PLAYER_STRONG, san, move_number)
        if gain <= -1.2:
            hint = f" Mieux valait {best_san}." if best_san and best_san != san else ""
            return _fmt(AI_REACT_PLAYER_WEAK, san, move_number) + hint
        return _fmt(AI_REACT_PLAYER_NEUTRAL, san, move_number)
    else:
        if gain >= 0.8:
            if gain >= 1.5 and random.random() < 0.55:
                return pick(TAUNT_AI_AFTER_BLUNDER, move_number, san)
            return pick(STRONG_AI, move_number, san)
        if gain <= -1.2:
            if eval_mover <= -2.0:
                return pick(TAUNT_AI_UNDER_MATE_THREAT, move_number, san)
            return "Je subis une petite pression, mais je tiens… pour l'instant."

    if played_by_ai and random.random() < 0.72:
        return pick(TAUNT_AI_GENERAL, move_number, san)

    if played_by_ai:
        return pick(NEUTRAL_AI, move_number, san)
    return _fmt(AI_REACT_PLAYER_NEUTRAL, san, move_number)
