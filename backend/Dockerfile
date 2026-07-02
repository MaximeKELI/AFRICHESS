FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    libpq-dev \
    gcc \
    g++ \
    cmake \
    make \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/staticfiles

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY anticheat-cpp /anticheat-cpp
RUN mkdir -p /anticheat-cpp/build \
    && cd /anticheat-cpp/build \
    && cmake .. \
    && make -j"$(nproc)" \
    && install -m 0755 africhess-fairplay /usr/local/bin/africhess-fairplay \
    && install -m 0755 libafrichess_native.so* /usr/local/lib/ \
    && install -m 0755 libafrichess_native.so* /usr/local/lib/ \
    && ldconfig

RUN SECRET_KEY="docker-build-collectstatic-placeholder-key-not-used-in-runtime-minimum-fifty" \
    EMAIL_HOST="localhost" \
    DJANGO_SETTINGS_MODULE=config.settings.production \
    python manage.py collectstatic --noinput

RUN chmod +x /app/docker-entrypoint.sh

ENV STOCKFISH_PATH=/usr/games/stockfish
ENV FAIRPLAY_BIN=/usr/local/bin/africhess-fairplay
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
