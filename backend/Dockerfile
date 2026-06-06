FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/staticfiles

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/docker-entrypoint.sh

ENV STOCKFISH_PATH=/usr/games/stockfish
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
