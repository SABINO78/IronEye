import anthropic, os

tool = {
    "name": "gerar_piada",
    "description": "Gera uma piada com nível de humor classificado",
    "input_schema": {
        "type": "object", # aqui diz que tem de ser JSON
        "properties": { # oq nós queremos que a AI devolva
            "piada": {"type": "string"},
            "nivel_humor": { 
                "type": "string",
                "enum": ["leve", "moderado", "absurdo"] # tem de escolher um destes
            }
        },
        "required": ["piada", "nivel_humor"] # não pode ficar em branco
    }
}

def gerar_piada_estruturada(pergunta):
    client = anthropic.Anthropic(
        api_key=os.getenv("ANTHROPIC_API_KEY")
    )

    try:
        resposta = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=840,
            system=SYSTEM_PROMPT, # se estiver assim metemos o role prompting no próprio prompt
            tools=[tool],
            tool_choice={"type": "tool", "name": "gerar_piada"},
            messages=[
                {"role": "user", "content": pergunta}
            ]
        )
        return resposta.content[0].input
    except Exception as e:
        return f"Erro ao se comunicar com a API do Claude: {str(e)}"


resultado = gerar_piada_estruturada("Qual é a diferença entre um frontend e um backend dev?")
print(resultado) # aqui vai dar o resultado em JSON, mas não é muito legível para humanos
print(resultado["piada"])    # metemos [] para ir buscar um valor de um resultado
print(resultado["nivel_humor"])


SYSTEM_PROMPT = """
Exemplo 1:
Pergunta: "Qual é a diferença entre um programador e um mágico?"
Resposta: {"piada": "Um mágico tira coelhos da cartola, enquanto um programador tira bugs do código às 3 da manhã, sem saber como.", "nivel_humor": "leve"}

Exemplo 2:
Pergunta: "Explique a inteligência artificial."
Resposta: {"piada": "A inteligência artificial é como um aprendiz de chef que observa receitas e tenta criar pratos deliciosos sozinho, aprendendo com cada tentativa.", "nivel_humor": "leve"}

Exemplo 3:
Pergunta: "O que é um bug de software?"
Resposta: {"piada": "É um convidado indesejado que se instala no código e só sai quando alguém percebe que ele nunca foi convidado.", "nivel_humor": "moderado"}

Responde sempre neste formato JSON, com os campos "piada" e "nivel_humor" ("leve", "moderado" ou "absurdo"). Não escrevas nada fora do JSON.
"""
## não faz sentido pôr em JSON como é claro, quando é para um humano ler, não quando é para a máquina ler
## o input(pergunta) é normal, direto sem graça nenhuma - só a pergunta em si
## o output(respota) é onde a característica que eu quero (humor, analogias, etc) aparece

