FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir pipenv

WORKDIR /app

COPY Pipfile Pipfile.lock ./
RUN pipenv install --system --deploy

COPY . .

RUN addgroup --system kenmanage && \
    adduser --system --ingroup kenmanage kenmanage && \
    chown -R kenmanage:kenmanage /app
USER kenmanage

EXPOSE 8400

HEALTHCHECK --interval=5s --timeout=5s --retries=10 \
    CMD curl -sf http://127.0.0.1:8400/ping || exit 1

CMD [ \
    "gunicorn", \
    "-k", "uvicorn.workers.UvicornWorker", \
    "project.app:app", \
    "--bind", "0.0.0.0:8400", \
    "--workers", "1" \
]
