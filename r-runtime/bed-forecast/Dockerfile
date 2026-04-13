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

RUN R -q -e "options(repos = c(CRAN = 'https://cloud.r-project.org')); options(Ncpus = max(1L, parallel::detectCores() - 1L)); core_packages <- c('R6', 'cli', 'curl', 'fastmap', 'glue', 'httpuv', 'jsonlite', 'later', 'lifecycle', 'magrittr', 'openssl', 'otel', 'otelsdk', 'plumber', 'promises', 'RPostgres', 'rlang', 'sodium', 'swagger', 'webutils', 'DBI'); install.packages(core_packages, dependencies = TRUE)"
RUN R -q -e "required_packages <- c('DBI', 'RPostgres', 'plumber', 'jsonlite', 'otel', 'otelsdk'); installed_packages <- rownames(installed.packages()); missing_packages <- setdiff(required_packages, installed_packages); if (length(missing_packages) > 0) stop(sprintf('Missing R packages: %s', paste(missing_packages, collapse = ', ')))"

WORKDIR /app

COPY main.R plumber.R ./

EXPOSE 8000

CMD ["Rscript", "main.R"]
