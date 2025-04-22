# Use Python 3.12 with Alpine Linux
FROM python:3.12-alpine3.17

# Add build dependencies for development
ARG packages
RUN apk --update add ${packages} bash curl git build-base \
    && rm -rf /var/cache/apk/* \
    && pip3 install --upgrade pip pipenv wheel virtualenv

# Set the working directory
WORKDIR /app

# Copy all source code
COPY . /app

# Set up user permissions for security
RUN addgroup --system bracket && adduser --system bracket --ingroup bracket \
    && chown -R bracket:bracket /app

# Switch to non-root user
USER bracket

# Install dependencies without --deploy for dev flexibility
RUN set -ex \
    && pip3 install --upgrade pip pipenv wheel virtualenv \
    && pipenv install

# Expose the development port
EXPOSE 8400

# Healthcheck to verify server availability
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD wget --spider http://localhost:8400 || exit 1

# Command for development: Enable hot-reloading
CMD pipenv run uvicorn \
    project.app:app \
    --host 0.0.0.0 \
    --port 8400 \
    --reload
