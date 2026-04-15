FROM rocker/r-ver:4.4.1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        zlib1g-dev \
        libcurl4-openssl-dev \
        libpq-dev \
        libsodium-dev \
        libssl-dev \
        libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN R -q -e "options(repos = c(CRAN = 'https://cloud.r-project.org'), Ncpus = max(1L, parallel::detectCores() - 1L)); required_packages <- c('DBI', 'RPostgres', 'plumber', 'jsonlite'); if (!requireNamespace('pak', quietly = TRUE)) install.packages('pak'); if (requireNamespace('pak', quietly = TRUE)) { pak::pkg_install(required_packages, dependencies = c('Depends', 'Imports', 'LinkingTo')) } else { install.packages(required_packages, dependencies = c('Depends', 'Imports', 'LinkingTo')) }"
RUN R -q -e "required_packages <- c('DBI', 'RPostgres', 'plumber', 'jsonlite'); installed_packages <- rownames(installed.packages()); missing_packages <- setdiff(required_packages, installed_packages); if (length(missing_packages) > 0) stop(sprintf('Missing R packages: %s', paste(missing_packages, collapse = ', ')))"

WORKDIR /app

COPY main.R plumber.R ./

EXPOSE 8000

CMD ["Rscript", "main.R"]
