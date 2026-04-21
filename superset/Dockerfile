FROM apache/superset:4.1.1

USER root

# Superset's base image does not include a PostgreSQL DBAPI driver.
# Install one so dashboard sync can register the OpenCare analytics database.
RUN pip install --no-cache-dir psycopg2-binary==2.9.9

USER superset
