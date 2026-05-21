FROM apache/superset:4.1.1

USER root

# Superset's base image does not include a PostgreSQL DBAPI driver.
# Install the DBAPI driver plus runtime middleware dependencies required by
# the current OpenCare Superset configuration.
RUN pip install --no-cache-dir \
    psycopg2-binary==2.9.9 \
    Flask-Cors==5.0.0

USER superset
