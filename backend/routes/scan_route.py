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


# Haiku 4.5 é obrigatório para este endpoint.
MODEL = "claude-haiku-4-5-20251001"


# Mapeamento simples código -> nome completo da língua
MAPA_LINGUAS = {
    "pt": "Portuguese (Português)",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)"
}


def limpar_resposta_json(texto):
    """
    Remove ```json ... ``` caso o modelo devolva
    o JSON dentro de um bloco Markdown.
    """
    texto = texto.strip()

    if texto.startswith("```"):
        texto = re.sub(r"^```(?:json)?\s*", "", texto)
        texto = re.sub(r"\s*```$", "", texto)

    return texto.strip()


# ======================================================
# SYSTEM PROMPT
#
# A instrução de idioma vai na mensagem do user (campo
# idioma_alvo), não aqui — mantém o system genérico e
# reutilizável independentemente da língua do utilizador.
# ======================================================
SYSTEM_PROMPT = """
És um personal trainer profissional e um especialista em biomecânica de
equipamentos de ginásio.

Vais receber uma imagem e uma instrução de idioma-alvo (indicada na
mensagem do utilizador, campo "idioma_alvo"). Todos os valores de texto
do JSON de resposta (machine_name, muscle_group, description, how_to_use,
tips, primary_muscle, secondary_muscles) devem ser escritos NESSE idioma.
As chaves do JSON mantêm-se sempre em inglês, como definido abaixo.

[REGRAS DE ANÁLISE]

Primeiro, verifica se existe UMA máquina de ginásio claramente visível.

Se não existir uma máquina de ginásio (por exemplo: mesa, teclado,
garrafa, parede, pessoa, chão, lápis, telemóvel, ou qualquer objeto que
não seja equipamento de ginásio), responde APENAS:

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
- description: para que serve a máquina, em no máximo 3 frases, no
  idioma-alvo.
- how_to_use: passo a passo de utilização correta, curto e prático, no
  idioma-alvo.
- tips: exatamente 3 dicas importantes para evitar erros comuns, no
  idioma-alvo.
- confidence: número inteiro entre 0 e 100.
- primary_muscle: músculo principal trabalhado, no idioma-alvo.
- secondary_muscles: lista de músculos secundários, no idioma-alvo.

Não escrevas nada fora do JSON. Não uses blocos de código markdown
(nada de ```json). A resposta tem de ser JSON válido e nada mais.

[EXEMPLOS - FEW-SHOT]
(Estes exemplos estão em português só para tua aprendizagem. O teu
output real deve seguir sempre o idioma-alvo indicado pelo utilizador.)

Exemplo 1 (máquina encontrada):
{
    "machine_found": true,
    "machine_name": "Puxada Superior (Lat Pulldown)",
    "muscle_group": "Costas",
    "description": "Equipamento com polia alta desenhado para trabalhar a largura das costas. Utiliza um cabo conectado a pesos selecionáveis.",
    "how_to_use": "1. Ajusta o suporte dos joelhos. 2. Agarra a barra. 3. Puxa a barra em direção ao peito. 4. Controla a subida.",
    "tips": ["Não uses o balanço.", "Mantém os ombros para baixo.", "Evita puxar por trás do pescoço."],
    "confidence": 95,
    "primary_muscle": "Grande Dorsal",
    "secondary_muscles": ["Bíceps", "Redondo Maior"]
}

Exemplo 2 (objeto que não é máquina de ginásio):
{"machine_found": false}
"""


# ======================================================
# SYSTEM PROMPT - MODO MANUAL
#
# Aqui a IA não deteta nada em imagem. Recebe um nome
# escrito pelo utilizador e tem de validar se é uma
# máquina de ginásio real e reconhecível, gerando a
# mesma estrutura de JSON usada no /scan normal.
# ======================================================
SYSTEM_PROMPT_MANUAL = """
És um personal trainer profissional e um especialista em biomecânica de
equipamentos de ginásio.

O utilizador vai escrever o nome de uma máquina de ginásio (texto livre,
pode ter erros de escrita ou ser em qualquer idioma). Vais também receber
um idioma-alvo (campo "idioma_alvo" na mensagem do utilizador).

[REGRAS DE VALIDAÇÃO]

Primeiro, decide se o texto escrito corresponde a uma máquina de ginásio
real e reconhecível (mesmo com pequenos erros de escrita, ex: "lat pull
down" ou "puxador costas" devem ser reconhecidos).

Se o texto NÃO for uma máquina de ginásio real, ou for demasiado vago
("máquina", "aparelho"), ou não fizer sentido nenhum, responde APENAS:

{"machine_found": false}

Se for uma máquina de ginásio válida, responde APENAS com este JSON,
com todos os valores de texto no idioma-alvo:

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

- machine_name: nome correto e normalizado da máquina, no idioma-alvo
  (corrige eventuais erros de escrita do utilizador).
- muscle_group, description, how_to_use, tips, primary_muscle,
  secondary_muscles: mesmas regras do modo de deteção por imagem.
- confidence: aqui reflete a tua confiança de que o utilizador se
  referia mesmo a essa máquina (não confiança visual, confiança de
  interpretação de texto).

Não escrevas nada fora do JSON. Não uses blocos de código markdown.
"""


@scan_bp.route("/scan", methods=["POST"])
@token_required
def scan(user_id):

    dados = request.json or {}
    imagem_base64 = dados.get("imagem")

    if not imagem_base64:
        return jsonify({"erro": "Nenhuma imagem enviada"}), 400

    # Deteta a língua enviada pela app (Accept-Language), com fallback en
    idioma_cliente = (
        request.headers
        .get("Accept-Language", "en")
        .split(",")[0]
        .split("-")[0]
        .strip()
        .lower()
    )
    lingua_final = MAPA_LINGUAS.get(idioma_cliente, "English")

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT is_pro FROM users WHERE id = ?", (user_id,))
    utilizador = c.fetchone()

    if not utilizador:
        conn.close()
        return jsonify({"erro": "Utilizador não encontrado"}), 404

    is_pro = utilizador[0]
    limite_diario = 20 if is_pro else 4

    # ------------------------------------------------------
    # Verifica o limite ANTES de chamar a IA e ANTES de
    # gravar nada. Isto garante que uma foto sem máquina
    # (ex: um lápis) nunca consome um scan, porque só
    # incrementamos scans_hoje mais abaixo, depois de
    # confirmarmos machine_found == True.
    # ------------------------------------------------------
    c.execute("""
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = ?
        AND date(scanned_at) = date('now')
    """, (user_id,))
    scans_hoje = c.fetchone()[0]

    if scans_hoje >= limite_diario:
        conn.close()
        return jsonify({
            "erro": "Limite diário atingido",
            "scans_restantes": 0
        }), 403

    try:
        resposta = client.messages.create(
            model=MODEL,
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f'idioma_alvo: "{lingua_final}"'
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": imagem_base64
                            }
                        }
                    ]
                }
            ]
        )

    except Exception as erro:
        print("ERRO AO COMUNICAR COM A IA:", erro)
        conn.close()
        return jsonify({"erro": "Erro ao comunicar com a IA"}), 500

    try:
        texto_resposta = resposta.content[0].text
        texto_json = limpar_resposta_json(texto_resposta)
        resultado = json.loads(texto_json)

    except Exception as erro:
        print("ERRO AO LER A RESPOSTA DA IA:", erro)
        conn.close()
        return jsonify({"erro": "Resposta inválida da IA"}), 500

    machine_found = resultado.get("machine_found", False)

    # --------------------------------------------------
    # NÃO ENCONTROU MÁQUINA -> não grava, não consome scan
    # --------------------------------------------------
    if not machine_found:
        conn.close()
        return jsonify({
            "machine_found": False,
            "erro": "Nenhuma máquina de ginásio encontrada na imagem",
            "scans_restantes": max(0, limite_diario - scans_hoje)
        }), 200

    # --------------------------------------------------
    # ENCONTROU MÁQUINA
    # --------------------------------------------------
    try:
        machine_name = resultado["machine_name"]
        muscle_group = resultado["muscle_group"]
        description = resultado["description"]
        how_to_use = resultado["how_to_use"]
        tips = resultado["tips"]
        confidence = resultado["confidence"]
        primary_muscle = resultado["primary_muscle"]
        secondary_muscles = resultado["secondary_muscles"]

    except Exception as erro:
        print("ERRO AO LER OS DADOS DA MÁQUINA:", erro)
        conn.close()
        return jsonify({"erro": "Dados da máquina inválidos"}), 500

    c.execute("""
        INSERT INTO scans(
            user_id, machine_name, muscle_group, primary_muscle,
            secondary_muscles, description, how_to_use, tips, confidence
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, machine_name, muscle_group, primary_muscle,
        json.dumps(secondary_muscles), description, how_to_use,
        json.dumps(tips), confidence
    ))

    conn.commit()

    scan_id = c.lastrowid
    c.execute("SELECT scanned_at FROM scans WHERE id = ?", (scan_id,))
    scan_row = c.fetchone()
    scanned_at = scan_row[0] if scan_row else None

    conn.close()

    scans_hoje += 1
    scans_restantes = max(0, limite_diario - scans_hoje)

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
        "scans_restantes": scans_restantes
    }), 200


@scan_bp.route("/scan/manual", methods=["POST"])
@token_required
def scan_manual(user_id):

    dados = request.json or {}
    machine_name_input = (dados.get("machine_name") or "").strip()

    if not machine_name_input:
        return jsonify({"erro": "Nenhum nome de máquina enviado"}), 400

    idioma_cliente = (
        request.headers
        .get("Accept-Language", "en")
        .split(",")[0]
        .split("-")[0]
        .strip()
        .lower()
    )
    lingua_final = MAPA_LINGUAS.get(idioma_cliente, "English")

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT is_pro FROM users WHERE id = ?", (user_id,))
    utilizador = c.fetchone()

    if not utilizador:
        conn.close()
        return jsonify({"erro": "Utilizador não encontrado"}), 404

    is_pro = utilizador[0]
    limite_diario = 20 if is_pro else 4

    # ------------------------------------------------------
    # Mesma regra do /scan: verifica o limite ANTES de
    # chamar a IA. Só conta como scan se a IA validar o
    # nome e conseguir gerar a informação (machine_found).
    # ------------------------------------------------------
    c.execute("""
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = ?
        AND date(scanned_at) = date('now')
    """, (user_id,))
    scans_hoje = c.fetchone()[0]

    if scans_hoje >= limite_diario:
        conn.close()
        return jsonify({
            "erro": "Limite diário atingido",
            "scans_restantes": 0
        }), 403

    try:
        resposta = client.messages.create(
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
                                f'idioma_alvo: "{lingua_final}"\n'
                                f'nome_escrito_pelo_utilizador: "{machine_name_input}"'
                            )
                        }
                    ]
                }
            ]
        )

    except Exception as erro:
        print("ERRO AO COMUNICAR COM A IA:", erro)
        conn.close()
        return jsonify({"erro": "Erro ao comunicar com a IA"}), 500

    try:
        texto_resposta = resposta.content[0].text
        texto_json = limpar_resposta_json(texto_resposta)
        resultado = json.loads(texto_json)

    except Exception as erro:
        print("ERRO AO LER A RESPOSTA DA IA:", erro)
        conn.close()
        return jsonify({"erro": "Resposta inválida da IA"}), 500

    machine_found = resultado.get("machine_found", False)

    # --------------------------------------------------
    # Nome inválido/irreconhecível -> não grava, não
    # consome scan. É a tua regra: só conta se a IA
    # conseguir mesmo gerar a informação.
    # --------------------------------------------------
    if not machine_found:
        conn.close()
        return jsonify({
            "machine_found": False,
            "erro": "Não foi possível reconhecer essa máquina",
            "scans_restantes": max(0, limite_diario - scans_hoje)
        }), 200

    try:
        machine_name = resultado["machine_name"]
        muscle_group = resultado["muscle_group"]
        description = resultado["description"]
        how_to_use = resultado["how_to_use"]
        tips = resultado["tips"]
        confidence = resultado["confidence"]
        primary_muscle = resultado["primary_muscle"]
        secondary_muscles = resultado["secondary_muscles"]

    except Exception as erro:
        print("ERRO AO LER OS DADOS DA MÁQUINA:", erro)
        conn.close()
        return jsonify({"erro": "Dados da máquina inválidos"}), 500

    # NOTA: se quiseres distinguir no histórico scans feitos
    # por foto vs manuais, adiciona uma coluna "origem" à
    # tabela scans (ALTER TABLE scans ADD COLUMN origem TEXT)
    # e inclui-a neste INSERT com valor "manual".
    c.execute("""
        INSERT INTO scans(
            user_id, machine_name, muscle_group, primary_muscle,
            secondary_muscles, description, how_to_use, tips, confidence
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, machine_name, muscle_group, primary_muscle,
        json.dumps(secondary_muscles), description, how_to_use,
        json.dumps(tips), confidence
    ))

    conn.commit()

    scan_id = c.lastrowid
    c.execute("SELECT scanned_at FROM scans WHERE id = ?", (scan_id,))
    scan_row = c.fetchone()
    scanned_at = scan_row[0] if scan_row else None

    conn.close()

    scans_hoje += 1
    scans_restantes = max(0, limite_diario - scans_hoje)

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
        "scans_restantes": scans_restantes
    }), 200


@scan_bp.route("/dashboard", methods=["GET"])
@token_required
def dashboard(user_id):
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT is_pro FROM users WHERE id = ?", (user_id,))
    utilizador = c.fetchone()

    if not utilizador:
        conn.close()
        return jsonify({"erro": "Utilizador não encontrado"}), 404

    is_pro = utilizador[0]
    limite_diario = 20 if is_pro else 4

    c.execute("""
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = ?
        AND date(scanned_at) = date('now')
    """, (user_id,))
    scans_hoje = c.fetchone()[0]

    c.execute("""
        SELECT COUNT(*)
        FROM scans
        WHERE user_id = ?
        AND scanned_at >= datetime('now', '-7 days')
    """, (user_id,))
    scans_semana = c.fetchone()[0]

    conn.close()

    return jsonify({
        "scans_restantes": max(0, limite_diario - scans_hoje),
        "scans_hoje": scans_hoje,
        "scans_semana": scans_semana,
        "limite_diario": limite_diario,
        "is_pro": bool(is_pro)
    }), 200