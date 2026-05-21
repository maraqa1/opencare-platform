FROM rocker/r-ver:4.4.1

RUN set -eux; \
    sed -i 's|http://archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g; s|http://security.ubuntu.com/ubuntu|https://security.ubuntu.com/ubuntu|g' /etc/apt/sources.list; \
    for i in 1 2 3 4 5; do \
        apt-get -o Acquire::Retries=5 -o Acquire::ForceIPv4=true update && \
        apt-get -o Acquire::Retries=5 -o Acquire::ForceIPv4=true install -y --no-install-recommends --fix-missing \
            build-essential \
            pkg-config \
            zlib1g-dev \
            libcurl4-openssl-dev \
            libpq-dev \
            libsodium-dev \
            libssl-dev \
            libxml2-dev && break; \
        rm -rf /var/lib/apt/lists/*; \
        sleep 20; \
    done; \
    apt-get -o Acquire::Retries=5 -o Acquire::ForceIPv4=true install -y --no-install-recommends --fix-missing \
        build-essential \
        pkg-config \
        zlib1g-dev \
        libcurl4-openssl-dev \
        libpq-dev \
        libsodium-dev \
        libssl-dev \
        libxml2-dev; \
    rm -rf /var/lib/apt/lists/*

RUN R -q -e "options(repos = c(CRAN = 'https://cloud.r-project.org'), Ncpus = max(1L, parallel::detectCores() - 1L)); required_packages <- c('DBI', 'RPostgres', 'plumber', 'jsonlite', 'forecast'); if (!requireNamespace('pak', quietly = TRUE)) install.packages('pak'); if (requireNamespace('pak', quietly = TRUE)) { pak::pkg_install(required_packages, dependencies = c('Depends', 'Imports', 'LinkingTo')) } else { install.packages(required_packages, dependencies = c('Depends', 'Imports', 'LinkingTo')) }"
RUN R -q -e "required_packages <- c('DBI', 'RPostgres', 'plumber', 'jsonlite', 'forecast'); installed_packages <- rownames(installed.packages()); missing_packages <- setdiff(required_packages, installed_packages); if (length(missing_packages) > 0) stop(sprintf('Missing R packages: %s', paste(missing_packages, collapse = ', ')))"

WORKDIR /app

COPY main.R plumber.R ./

EXPOSE 8000

CMD ["Rscript", "main.R"]
