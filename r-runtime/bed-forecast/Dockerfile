FROM rocker/r-ver:4.4.1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libcurl4-openssl-dev \
        libpq-dev \
        libsodium-dev \
        libssl-dev \
        libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN R -q -e "install.packages(c('DBI', 'RPostgres', 'plumber', 'jsonlite'), repos='https://cloud.r-project.org', dependencies=TRUE)"
RUN R -q -e "required_packages <- c('DBI', 'RPostgres', 'plumber', 'jsonlite'); missing_packages <- required_packages[!vapply(required_packages, requireNamespace, logical(1), quietly = TRUE)]; if (length(missing_packages) > 0) stop(sprintf('Missing R packages: %s', paste(missing_packages, collapse = ', ')))"

WORKDIR /app

COPY main.R plumber.R ./

EXPOSE 8000

CMD ["Rscript", "main.R"]
