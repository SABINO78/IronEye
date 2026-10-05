from flask import Blueprint, request, jsonify
import json
from anthropic import Anthropic
import os
import re

from database import get_db
from auth import token_required


scan_bp = Blueprint("scan", __name__)


client = Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)


MODEL = "claude-haiku-4-5-20251001"


LANGUAGE_MAP = {
    "pt": "Portuguese (Português)",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)"
}


def clean_json_response(text):
    # Strip markdown code fences that the model sometimes wraps the JSON in
    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    return text.strip()


BASE_LIMIT_FREE = 4
BASE_LIMIT_PRO = 20

# Maximum number of extra scans a free user can earn via ads per day.
MAX_BONUS_SCANS = 2


def get_bonus_today(user_id, conn):

    c = conn.cursor()

    c.execute(
        """
        SELECT bonus_scans_hoje, bonus_scans_data
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    result = c.fetchone()

    if not result:
        return 0

    bonus_today, bonus_date = result

    # Fetch today's date directly from PostgreSQL to avoid timezone mismatches.
    c.execute("SELECT CURRENT_DATE")

    today = c.fetchone()[0]

    # If the stored date is from a previous day, reset the bonus counter.
    if bonus_date != today:

        c.execute(
            """
            UPDATE users
            SET bonus_scans_hoje = 0,
                bonus_scans_data = %s
            WHERE id = %s
            """,
            (today, user_id)
        )

        conn.commit()

        return 0

    return bonus_today


def get_daily_limit(user_id, is_pro, conn):

    if is_pro:
        return BASE_LIMIT_PRO

    bonus_today = get_bonus_today(
        user_id,
        conn
    )

    return BASE_LIMIT_FREE + bonus_today


SYSTEM_PROMPT = """
És um personal trainer profissional e um especialista em biomecânica de
equipamentos de ginásio.

Vais receber uma imagem e uma instrução de idioma-alvo (indicada na
mensagem do utilizador, campo "idioma_alvo"). Todos os valores de texto
do JSON de resposta (machine_name, muscle_group, description, how_to_use,
tips, primary_muscle, secondary_muscles) devem ser escritos NESSE idioma.
As chaves do JSON mantêm-se sempre em inglês.

[REGRAS DE ANÁLISE]

Primeiro, verifica se existe UMA máquina de ginásio claramente visível.

Se não existir uma máquina de ginásio responde APENAS:

{"machine_found": false}

Se existir uma máquina de ginásio, identifica apenas UMA máquina e
responde APENAS com este JSON:

{
    "machine_found": true,
    "machine_name": "",
    "muscle_group": "",
    "description": "",
    "how_to_use": "",
    "tips": [],
    "confidence": 0,
    "primary_muscle": "",
    "secondary_muscles": []
}

[REGRAS DOS CAMPOS]

- machine_found: true apenas se houver uma máquina de ginásio claramente
  visível na imagem. Em caso de dúvida razoável, usa false.
- machine_name: nome da máquina, no idioma-alvo.
- muscle_group: principal grupo muscular trabalhado, no idioma-alvo.
- description: para que serve a máquina, em no máximo 3 frases.
- how_to_use: passo a passo de utilização correta, curto e prático.
- tips: exatamente 3 dicas importantes.
- confidence: número inteiro entre 0 e 100.
- primary_muscle: músculo principal trabalhado.
- secondary_muscles: lista de músculos secundários.

Não escrevas nada fora do JSON.
Não uses blocos de código markdown.
A resposta tem de ser JSON válido e nada mais.

[EXEMPLOS]

Exemplo 1:

{
    "machine_found": true,
    "machine_name": "Puxada Superior (Lat Pulldown)",
    "muscle_group": "Costas",
    "description": "Equipamento com polia alta desenhado para trabalhar a largura das costas.",
    "how_to_use": "1. Ajusta o suporte dos joelhos. 2. Agarra a barra. 3. Puxa a barra em direção ao peito. 4. Controla a subida.",
    "tips": [
        "Não uses o balanço.",
        "Mantém os ombros para baixo.",
        "Evita puxar por trás do pescoço."
    ],
    "confidence": 95,
    "primary_muscle": "Grande Dorsal",
    "secondary_muscles": [
        "Bíceps",
        "Redondo Maior"
    ]
}

Exemplo 2:

{"machine_found": false}
"""


SYSTEM_PROMPT_MANUAL = """
És um personal trainer profissional e um especialista em biomecânica de
equipamentos de ginásio.

O utilizador vai escrever o nome de uma máquina de ginásio.

Também vais receber um idioma-alvo.

Primeiro decide se o texto corresponde a uma máquina de ginásio real
e reconhecível.

Se não for uma máquina válida responde APENAS:

{"machine_found": false}

Se for uma máquina válida responde APENAS:

{
    "machine_found": true,
    "machine_name": "",
    "muscle_group": "",
    "description": "",
    "how_to_use": "",
    "tips": [],
    "confidence": 0,
    "primary_muscle": "",
    "secondary_muscles": []
}

Corrige pequenos erros de escrita.

Todos os textos devem estar no idioma-alvo.

Não escrevas nada fora do JSON.
Não uses blocos de código markdown.
"""


@scan_bp.route("/scan", methods=["POST"])
@token_required
def scan(user_id):

    data = request.json or {}

    image_base64 = data.get("imagem")

    if not image_base64:

        return jsonify({
            "erro": "No image provided"
        }), 400

    client_language = (
        request.headers
        .get("Accept-Language", "en")
        .split(",")[0]
        .split("-")[0]
        .strip()
        .lower()
    )

    target_language = LANGUAGE_MAP.get(
        client_language,
        "English"
    )

    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    user = c.fetchone()

    if not user:

        conn.close()

        return jsonify({
            "erro": "User not found"
        }), 404

    is_pro = user[0]

    daily_limit = get_daily_limit(
        user_id,
        is_pro,
        conn
    )

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_today = c.fetchone()[0]

    if scans_today >= daily_limit:

        conn.close()

        return jsonify({
            "erro": "Limite diário atingido",
            "scans_restantes": 0,
            "limite_diario": daily_limit
        }), 403

    try:

        response = client.messages.create(

            model=MODEL,

            max_tokens=800,

            system=SYSTEM_PROMPT,

            messages=[
                {
                    "role": "user",

                    "content": [

                        {
                            "type": "text",

                            "text": (
                                f'idioma_alvo: "{target_language}"'
                            )
                        },

                        {
                            "type": "image",

                            "source": {

                                "type": "base64",

                                "media_type": "image/jpeg",

                                "data": image_base64
                            }
                        }
                    ]
                }
            ]
        )

    except Exception as error:

        print(
            "ERROR COMMUNICATING WITH AI:",
            error
        )

        conn.close()

        return jsonify({
            "erro": "Error communicating with AI"
        }), 500

    try:

        response_text = response.content[0].text

        json_text = clean_json_response(
            response_text
        )

        result = json.loads(
            json_text
        )

    except Exception as error:

        print(
            "ERROR PARSING AI RESPONSE:",
            error
        )

        conn.close()

        return jsonify({
            "erro": "Invalid AI response"
        }), 500

    machine_found = result.get(
        "machine_found",
        False
    )

    # No machine detected — do not consume a scan credit.
    if not machine_found:

        conn.close()

        return jsonify({

            "machine_found": False,

            "erro": (
                "No gym machine found "
                "in the image."
            ),

            "scans_restantes": max(
                0,
                daily_limit - scans_today
            )
        }), 200

    try:

        machine_name = result["machine_name"]

        muscle_group = result["muscle_group"]

        description = result["description"]

        how_to_use = result["how_to_use"]

        tips = result["tips"]

        confidence = result["confidence"]

        primary_muscle = result["primary_muscle"]

        secondary_muscles = result[
            "secondary_muscles"
        ]

    except Exception as error:

        print(
            "ERROR READING MACHINE DATA:",
            error
        )

        conn.close()

        return jsonify({
            "erro": "Invalid machine data"
        }), 500

    c.execute(
        """
        INSERT INTO scans(
            user_id,
            machine_name,
            muscle_group,
            primary_muscle,
            secondary_muscles,
            description,
            how_to_use,
            tips,
            confidence
        )

        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,

        (
            user_id,

            machine_name,

            muscle_group,

            primary_muscle,

            json.dumps(
                secondary_muscles,
                ensure_ascii=False
            ),

            description,

            how_to_use,

            json.dumps(
                tips,
                ensure_ascii=False
            ),

            confidence
        )
    )

    scan_id = c.fetchone()[0]

    conn.commit()

    c.execute(
        """
        SELECT scanned_at
        FROM scans
        WHERE id = %s
        """,
        (scan_id,)
    )

    scan_row = c.fetchone()

    scanned_at = (
        scan_row[0]
        if scan_row
        else None
    )

    conn.close()

    scans_today += 1

    scans_remaining = max(
        0,
        daily_limit - scans_today
    )

    return jsonify({

        "machine_found": True,

        "machine_name": machine_name,

        "muscle_group": muscle_group,

        "primary_muscle": primary_muscle,

        "secondary_muscles": secondary_muscles,

        "description": description,

        "how_to_use": how_to_use,

        "tips": tips,

        "confidence": confidence,

        "scanned_at": scanned_at,

        "scans_restantes": scans_remaining,

        "limite_diario": daily_limit

    }), 200


@scan_bp.route("/scan/manual", methods=["POST"])
@token_required
def scan_manual(user_id):

    data = request.json or {}

    machine_name_input = (
        data.get("machine_name") or ""
    ).strip()

    if not machine_name_input:

        return jsonify({
            "erro": "No machine name provided"
        }), 400

    client_language = (
        request.headers
        .get("Accept-Language", "en")
        .split(",")[0]
        .split("-")[0]
        .strip()
        .lower()
    )

    target_language = LANGUAGE_MAP.get(
        client_language,
        "English"
    )

    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    user = c.fetchone()

    if not user:

        conn.close()

        return jsonify({
            "erro": "User not found"
        }), 404

    is_pro = user[0]

    daily_limit = get_daily_limit(
        user_id,
        is_pro,
        conn
    )

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_today = c.fetchone()[0]

    if scans_today >= daily_limit:

        conn.close()

        return jsonify({

            "erro": "Limite diário atingido",

            "scans_restantes": 0,

            "limite_diario": daily_limit

        }), 403

    try:

        response = client.messages.create(

            model=MODEL,

            max_tokens=800,

            system=SYSTEM_PROMPT_MANUAL,

            messages=[

                {
                    "role": "user",

                    "content": [

                        {
                            "type": "text",

                            "text": (
                                f'idioma_alvo: "{target_language}"\n'
                                f'nome_escrito_pelo_utilizador: '
                                f'"{machine_name_input}"'
                            )
                        }
                    ]
                }
            ]
        )

    except Exception as error:

        print(
            "ERROR COMMUNICATING WITH AI:",
            error
        )

        conn.close()

        return jsonify({
            "erro": "Error communicating with AI"
        }), 500

    try:

        response_text = response.content[0].text

        json_text = clean_json_response(
            response_text
        )

        result = json.loads(
            json_text
        )

    except Exception as error:

        print(
            "ERROR PARSING AI RESPONSE:",
            error
        )

        conn.close()

        return jsonify({
            "erro": "Invalid AI response"
        }), 500

    machine_found = result.get(
        "machine_found",
        False
    )

    # Unrecognised machine name — do not consume a scan credit.
    if not machine_found:

        conn.close()

        return jsonify({

            "machine_found": False,

            "erro": (
                "Could not recognize "
                "this machine."
            ),

            "scans_restantes": max(
                0,
                daily_limit - scans_today
            )

        }), 200

    try:

        machine_name = result["machine_name"]

        muscle_group = result["muscle_group"]

        description = result["description"]

        how_to_use = result["how_to_use"]

        tips = result["tips"]

        confidence = result["confidence"]

        primary_muscle = result[
            "primary_muscle"
        ]

        secondary_muscles = result[
            "secondary_muscles"
        ]

    except Exception as error:

        print(
            "ERROR READING MACHINE DATA:",
            error
        )

        conn.close()

        return jsonify({
            "erro": "Invalid machine data"
        }), 500

    c.execute(
        """
        INSERT INTO scans(
            user_id,
            machine_name,
            muscle_group,
            primary_muscle,
            secondary_muscles,
            description,
            how_to_use,
            tips,
            confidence
        )

        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,

        (
            user_id,

            machine_name,

            muscle_group,

            primary_muscle,

            json.dumps(
                secondary_muscles,
                ensure_ascii=False
            ),

            description,

            how_to_use,

            json.dumps(
                tips,
                ensure_ascii=False
            ),

            confidence
        )
    )

    scan_id = c.fetchone()[0]

    conn.commit()

    c.execute(
        """
        SELECT scanned_at
        FROM scans
        WHERE id = %s
        """,
        (scan_id,)
    )

    scan_row = c.fetchone()

    scanned_at = (
        scan_row[0]
        if scan_row
        else None
    )

    conn.close()

    scans_today += 1

    scans_remaining = max(
        0,
        daily_limit - scans_today
    )

    return jsonify({

        "machine_found": True,

        "machine_name": machine_name,

        "muscle_group": muscle_group,

        "primary_muscle": primary_muscle,

        "secondary_muscles": secondary_muscles,

        "description": description,

        "how_to_use": how_to_use,

        "tips": tips,

        "confidence": confidence,

        "scanned_at": scanned_at,

        "scans_restantes": scans_remaining,

        "limite_diario": daily_limit

    }), 200


@scan_bp.route("/scan/bonus", methods=["POST"])
@token_required
def scan_bonus(user_id):

    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    user = c.fetchone()

    if not user:

        conn.close()

        return jsonify({
            "erro": "User not found"
        }), 404

    is_pro = user[0]

    # Pro accounts already have a high daily limit and don't need ad bonuses.
    if is_pro:

        conn.close()

        return jsonify({
            "erro": "Pro accounts already have 20 scans per day"
        }), 400

    bonus_today = get_bonus_today(
        user_id,
        conn
    )

    if bonus_today >= MAX_BONUS_SCANS:

        conn.close()

        return jsonify({

            "erro": (
                "You have already used today's 2 bonus scans"
            ),

            "bonus_scans_hoje": bonus_today,

            "limite_diario": (
                BASE_LIMIT_FREE +
                MAX_BONUS_SCANS
            )

        }), 403

    new_bonus = bonus_today + 1

    c.execute(
        """
        UPDATE users
        SET bonus_scans_hoje = %s,
            bonus_scans_data = CURRENT_DATE
        WHERE id = %s
        """,
        (
            new_bonus,
            user_id
        )
    )

    conn.commit()

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_today = c.fetchone()[0]

    conn.close()

    daily_limit = (
        BASE_LIMIT_FREE +
        new_bonus
    )

    scans_remaining = max(
        0,
        daily_limit - scans_today
    )

    return jsonify({

        "sucesso": True,

        "bonus_scans_hoje": new_bonus,

        "limite_diario": daily_limit,

        "scans_restantes": scans_remaining

    }), 200


@scan_bp.route("/dashboard", methods=["GET"])
@token_required
def dashboard(user_id):

    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        SELECT is_pro
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    user = c.fetchone()

    if not user:

        conn.close()

        return jsonify({
            "erro": "User not found"
        }), 404

    is_pro = user[0]

    daily_limit = get_daily_limit(
        user_id,
        is_pro,
        conn
    )

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at::date = CURRENT_DATE
        """,
        (user_id,)
    )

    scans_today = c.fetchone()[0]

    c.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = %s
        AND scanned_at >= NOW() - INTERVAL '7 days'
        """,
        (user_id,)
    )

    scans_week = c.fetchone()[0]

    bonus_today = 0

    if not is_pro:

        bonus_today = get_bonus_today(
            user_id,
            conn
        )

    conn.close()

    return jsonify({

        "scans_restantes": max(
            0,
            daily_limit - scans_today
        ),

        "scans_hoje": scans_today,

        "scans_semana": scans_week,

        "limite_diario": daily_limit,

        "bonus_scans_hoje": bonus_today,

        "bonus_scans_restantes": max(
            0,
            MAX_BONUS_SCANS - bonus_today
        ),

        "is_pro": bool(is_pro)

    }), 200