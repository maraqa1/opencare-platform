FROM rocker/r-ver:4.4.1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libcurl4-openssl-dev \
        libpq-dev \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN R -q -e "install.packages(c('DBI','RPostgres','plumber','jsonlite'), repos='https://cloud.r-project.org'); stopifnot(requireNamespace('plumber', quietly = TRUE))"

WORKDIR /app

COPY main.R plumber.R ./

EXPOSE 8000

CMD ["Rscript", "main.R"]
