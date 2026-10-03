#!/usr/bin/env python3
"""secprep-sensor — agent local pour SecPrep.

Garde-fous (non negociables) :
- Uniquement sur des reseaux/machines qui vous appartiennent ou autorises par ecrit.
- Passif uniquement : aucune interception active, aucun balayage, aucune attaque.
- Minimisation : seules des metadonnees sont envoyees ; les charges utiles sont masquees.
- Jeton chiffre au repos, revocable cote plateforme.

Zero dependance : bibliotheque standard Python uniquement.
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ------------------------------------------------------------------ config

DOSSIER = os.path.join(os.path.expanduser("~"), ".secprep-sensor")
CONFIG = os.path.join(DOSSIER, "config.json")
CLE = os.path.join(DOSSIER, "cle.key")
FILE_ATTENTE = os.path.join(DOSSIER, "file.jsonl")

BANNIERE = (
    "AVERTISSEMENT — Installe uniquement sur un reseau/une machine qui t'appartient\n"
    "ou pour lesquels tu as une AUTORISATION ECRITE. Jamais sur un reseau d'ecole,\n"
    "d'employeur ou public sans autorisation. Mode PASSIF uniquement.\n"
)

CHAMPS_AUTORISES = (
    "src_ip", "dst_ip", "src_port", "dst_port", "user", "host",
    "result", "proto", "dns", "taille", "event_id",
)


# ------------------------------------------------------------ chiffrement

def _cle() -> bytes:
    os.makedirs(DOSSIER, exist_ok=True)
    if not os.path.exists(CLE):
        k = os.urandom(32)
        with open(CLE, "wb") as f:
            f.write(k)
        try:
            os.chmod(CLE, 0o600)
        except OSError:
            pass
        return k
    with open(CLE, "rb") as f:
        return f.read()


def _keystream(cle: bytes, nonce: bytes, n: int) -> bytes:
    """Flux de chiffrement HMAC-SHA256 en mode compteur (stdlib)."""
    out = bytearray()
    compteur = 0
    while len(out) < n:
        bloc = hmac.new(cle, nonce + compteur.to_bytes(8, "big"), hashlib.sha256).digest()
        out.extend(bloc)
        compteur += 1
    return bytes(out[:n])


def chiffrer(texte: str) -> str:
    cle = _cle()
    nonce = os.urandom(16)
    data = texte.encode()
    chiffre = bytes(a ^ b for a, b in zip(data, _keystream(cle, nonce, len(data))))
    return base64.b64encode(nonce + chiffre).decode()


def dechiffrer(blob: str) -> str:
    cle = _cle()
    brut = base64.b64decode(blob)
    nonce, chiffre = brut[:16], brut[16:]
    data = bytes(a ^ b for a, b in zip(chiffre, _keystream(cle, nonce, len(chiffre))))
    return data.decode()


def charger_config() -> dict:
    if not os.path.exists(CONFIG):
        sys.exit("Aucun capteur enregistre. Lance d'abord : secprep-sensor register ...")
    with open(CONFIG, encoding="utf-8") as f:
        cfg = json.load(f)
    cfg["token"] = dechiffrer(cfg["token_chiffre"])
    return cfg


# --------------------------------------------------------------- collecte

RE_IP = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
RE_PORT = re.compile(r"\bport\s+(\d{1,5})\b", re.I)


def _resume(ligne: str) -> str:
    """Resume masque d'une ligne (jamais la charge utile complete)."""
    return ligne.strip()[:120]


def evenement_depuis_ligne(ligne: str, source: str) -> dict:
    ips = RE_IP.findall(ligne)
    champs = {}
    if ips:
        champs["src_ip"] = ips[0]
        if len(ips) > 1:
            champs["dst_ip"] = ips[1]
    port = RE_PORT.search(ligne)
    if port:
        champs["dst_port"] = int(port.group(1))
    low = ligne.lower()
    action = "echec_auth" if ("failed" in low or "echec" in low) else (
        "succes_auth" if ("accepted" in low or "success" in low) else "log"
    )
    return {
        "ts": int(time.time() * 1000),
        "source": source,
        "action": action,
        "champs": {k: v for k, v in champs.items() if k in CHAMPS_AUTORISES},
        "raw": _resume(ligne),
    }


def lire_source(source: str | None, limite: int) -> list[dict]:
    """Collecte PASSIVE : lit un fichier de journaux, ou des metadonnees systeme."""
    evs = []
    if source:
        with open(source, encoding="utf-8", errors="replace") as f:
            for ligne in f:
                if not ligne.strip():
                    continue
                evs.append(evenement_depuis_ligne(ligne, f"fichier:{os.path.basename(source)}"))
                if len(evs) >= limite:
                    break
    else:
        # Metadonnees systeme minimales (passif).
        evs.append({
            "ts": int(time.time() * 1000),
            "source": "systeme",
            "action": "heartbeat",
            "champs": {"host": socket.gethostname()},
            "raw": f"heartbeat {datetime.now(timezone.utc).isoformat()}",
        })
    return evs


# ----------------------------------------------------------------- envoi

def poster(url: str, token: str, evenements: list[dict]) -> tuple[bool, str]:
    corps = json.dumps({"evenements": evenements}).encode()
    req = urllib.request.Request(
        url.rstrip("/") + "/api/ingest",
        data=corps,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return True, r.read().decode()
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:200]}"
    except Exception as e:  # noqa: BLE001
        return False, str(e)


def file_ajouter(evenements: list[dict]) -> None:
    with open(FILE_ATTENTE, "a", encoding="utf-8") as f:
        for e in evenements:
            f.write(json.dumps(e) + "\n")


def file_vider() -> list[dict]:
    if not os.path.exists(FILE_ATTENTE):
        return []
    with open(FILE_ATTENTE, encoding="utf-8") as f:
        evs = [json.loads(l) for l in f if l.strip()]
    os.remove(FILE_ATTENTE)
    return evs


# -------------------------------------------------------------- commandes

def cmd_register(args: argparse.Namespace) -> None:
    print(BANNIERE)
    if not args.consentement:
        rep = input("Confirmes-tu l'autorisation (reseau/machine) ? [oui/non] ").strip().lower()
        if rep not in ("oui", "o", "yes", "y"):
            sys.exit("Enregistrement annule : consentement requis.")
    os.makedirs(DOSSIER, exist_ok=True)
    cfg = {
        "url": args.url.rstrip("/"),
        "nom": args.nom or socket.gethostname(),
        "token_chiffre": chiffrer(args.token),
        "consentement": True,
        "enregistre_le": datetime.now(timezone.utc).isoformat(),
    }
    with open(CONFIG, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    try:
        os.chmod(CONFIG, 0o600)
    except OSError:
        pass
    print(f"Capteur enregistre ({cfg['nom']}). Jeton chiffre au repos dans {CONFIG}.")


def cmd_status(_args: argparse.Namespace) -> None:
    cfg = charger_config()
    masque = cfg["token"][:6] + "…" + cfg["token"][-4:]
    print(f"URL        : {cfg['url']}")
    print(f"Nom        : {cfg['nom']}")
    print(f"Jeton      : {masque} (chiffre au repos)")
    print(f"Enregistre : {cfg.get('enregistre_le')}")


def cmd_export(args: argparse.Namespace) -> None:
    print(BANNIERE)
    evs = lire_source(args.source, args.limite)
    with open(args.out, "w", encoding="utf-8") as f:
        for e in evs:
            f.write(json.dumps(e) + "\n")
    print(f"Mode EXPORT (aucun envoi) : {len(evs)} evenement(s) ecrit(s) dans {args.out}.")


def cmd_send(args: argparse.Namespace) -> None:
    print(BANNIERE)
    cfg = charger_config()
    evs = file_vider() + lire_source(args.source, args.limite)
    if not evs:
        print("Rien a envoyer.")
        return
    total = 0
    for i in range(0, len(evs), args.batch):
        lot = evs[i : i + args.batch]
        ok, msg = poster(cfg["url"], cfg["token"], lot)
        if ok:
            total += len(lot)
            print(f"Lot envoye : {len(lot)} ({msg.strip()[:80]})")
        else:
            print(f"Echec d'envoi, mise en file locale : {msg}")
            file_ajouter(evs[i:])
            break
        time.sleep(args.pause)  # limitation de debit
    print(f"Termine : {total} evenement(s) envoye(s).")


def main() -> None:
    p = argparse.ArgumentParser(prog="secprep-sensor", description="Agent local SecPrep (passif).")
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("register", help="Enregistre le capteur (consentement requis).")
    r.add_argument("--token", required=True)
    r.add_argument("--url", required=True)
    r.add_argument("--nom")
    r.add_argument("--consentement", action="store_true", help="Donne le consentement sans invite.")
    r.set_defaults(func=cmd_register)

    s = sub.add_parser("status", help="Affiche la configuration.")
    s.set_defaults(func=cmd_status)

    e = sub.add_parser("export", help="Mode export : ecrit en .jsonl local, sans rien envoyer.")
    e.add_argument("--source", help="Fichier de journaux a lire (sinon metadonnees systeme).")
    e.add_argument("--out", default="secprep-export.jsonl")
    e.add_argument("--limite", type=int, default=10000)
    e.set_defaults(func=cmd_export)

    v = sub.add_parser("send", help="Envoie les evenements vers la plateforme (HTTPS, jeton).")
    v.add_argument("--source", help="Fichier de journaux a lire (sinon metadonnees systeme).")
    v.add_argument("--limite", type=int, default=10000)
    v.add_argument("--batch", type=int, default=100)
    v.add_argument("--pause", type=float, default=1.0, help="Pause (s) entre lots (debit).")
    v.set_defaults(func=cmd_send)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
