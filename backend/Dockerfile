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

ENV STOCKFISH_PATH=/usr/games/stockfish
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
