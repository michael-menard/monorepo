# pgtap-enabled PostgreSQL 16
#
# Extends the official postgres:16 image with the pgtap extension
# installed via the official Debian PostgreSQL apt repository.
#
# pgtap provides TAP-compliant unit testing directly inside PostgreSQL.
# Tests are run via the pg_prove CLI (part of libtap-parser-sourcehandler-pgtap-perl).
#
# Build:
#   docker build -t pgtap-postgres ./infra/pgtap
#
# Usage (via docker-compose.pgtap.yml):
#   docker compose -f docker-compose.pgtap.yml up -d

FROM postgres:16

# Install pgtap and pg_prove in one layer to keep image small
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       postgresql-16-pgtap \
       libtap-parser-sourcehandler-pgtap-perl \
  && rm -rf /var/lib/apt/lists/*
