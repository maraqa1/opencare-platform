get_env <- function(name, default = NULL) {
  value <- Sys.getenv(name, unset = default)
  if (identical(value, "")) {
    return(default)
  }
  value
}

log_info <- function(message) {
  cat(sprintf("[%s] [anomaly] %s\n", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), message))
  flush.console()
}

analytics_schema <- get_env("ANALYTICS_SCHEMA", "analytics")
anomaly_table <- get_env("ANOMALY_OUTPUT_TABLE", "anomaly_bed_occupancy")

ensure_anomaly_table <- function(con) {
  DBI::dbExecute(
    con,
    sprintf("
      create table if not exists %s.%s (
        department_id text not null,
        event_date date not null,
        occupied_beds integer not null,
        trailing_mean numeric,
        deviation_ratio numeric not null,
        severity text not null,
        generated_at timestamp not null
      )
    ", analytics_schema, anomaly_table)
  )
}

run_anomaly_detection <- function() {
  log_info("starting anomaly refresh")
  con <- DBI::dbConnect(
    RPostgres::Postgres(),
    host = get_env("POSTGRES_HOST", "postgres"),
    port = as.integer(get_env("POSTGRES_PORT", "5432")),
    dbname = get_env("POSTGRES_DB", "opencare"),
    user = get_env("POSTGRES_USER", "opencare"),
    password = get_env("POSTGRES_PASSWORD", "")
  )
  on.exit(DBI::dbDisconnect(con), add = TRUE)

  query <- sprintf("
    with ordered as (
      select
        ward_id as department_id,
        date_day,
        occupied_beds,
        avg(occupied_beds) over (
          partition by ward_id
          order by date_day
          rows between 6 preceding and 1 preceding
        ) as trailing_mean
      from %s.fct_bed_occupancy
    )
    select
      department_id,
      date_day as event_date,
      occupied_beds,
      trailing_mean,
      case
        when trailing_mean is null or trailing_mean = 0 then 0
        else round((occupied_beds - trailing_mean) / trailing_mean, 4)
      end as deviation_ratio
    from ordered
    where trailing_mean is not null
      and occupied_beds > trailing_mean * 1.15
  ", analytics_schema)

  ensure_anomaly_table(con)
  anomalies <- DBI::dbGetQuery(con, query)
  if (nrow(anomalies) == 0) {
    log_info("no anomaly rows produced")
    return(invisible(NULL))
  }

  anomalies$severity <- ifelse(anomalies$deviation_ratio >= 0.25, "high", "medium")
  anomalies$generated_at <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")

  staging_table <- paste0(anomaly_table, "_staging")
  DBI::dbWriteTable(
    con,
    DBI::Id(schema = analytics_schema, table = staging_table),
    anomalies,
    overwrite = TRUE,
    temporary = FALSE
  )

  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", analytics_schema, anomaly_table))
    DBI::dbExecute(
      con,
      sprintf("
        insert into %s.%s (
          department_id,
          event_date,
          occupied_beds,
          trailing_mean,
          deviation_ratio,
          severity,
          generated_at
        )
        select
          department_id,
          event_date,
          occupied_beds,
          trailing_mean,
          deviation_ratio,
          severity,
          cast(generated_at as timestamp)
        from %s.%s
      ", analytics_schema, anomaly_table, analytics_schema, staging_table)
    )
    DBI::dbExecute(con, sprintf("drop table if exists %s.%s", analytics_schema, staging_table))
  })

  log_info(sprintf("wrote %s anomaly rows to %s.%s", nrow(anomalies), analytics_schema, anomaly_table))
  invisible(anomalies)
}

log_info("booting plumber API on port 8000")
pr <- plumber::plumb("plumber.R")
pr$run(host = "0.0.0.0", port = as.integer(get_env("PORT", "8000")))
