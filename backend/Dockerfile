FROM python:3.11-slim

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    dos2unix \
    libpq-dev \
    gcc \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /code

# Instala dependências Python
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r /code/requirements.txt

# Copia todo o código-fonte E arquivos opcionais
COPY . .

# Corrige quebras de linha e permissões do entrypoint
RUN dos2unix /code/entrypoint.sh
RUN chmod +x /code/entrypoint.sh

# Expõe a porta
EXPOSE 8000

# Define o ponto de entrada e o comando padrão
ENTRYPOINT ["/code/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]