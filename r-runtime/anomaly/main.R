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
output_schema <- get_env("OUTPUT_SCHEMA", "output")
anomaly_table <- get_env("ANOMALY_OUTPUT_TABLE", "anomaly")
anomaly_lookback_days <- as.integer(get_env("ANOMALY_LOOKBACK_DAYS", "14"))
anomaly_recent_window_days <- as.integer(get_env("ANOMALY_RECENT_WINDOW_DAYS", "7"))
anomaly_min_deviation_ratio <- as.numeric(get_env("ANOMALY_MIN_DEVIATION_RATIO", "0.15"))
anomaly_min_abs_delta <- as.integer(get_env("ANOMALY_MIN_ABS_DELTA", "2"))
anomaly_max_alerts <- as.integer(get_env("ANOMALY_MAX_ALERTS", "3"))

ensure_anomaly_table <- function(con) {
  DBI::dbExecute(con, sprintf("create schema if not exists %s", output_schema))
  DBI::dbExecute(
    con,
    sprintf(
      "
      create table if not exists %s.%s (
        department_id text not null,
        event_date date not null,
        occupied_beds integer not null,
        trailing_mean numeric,
        deviation_ratio numeric not null,
        severity text not null,
        generated_at timestamp not null
      )
      ",
      output_schema,
      anomaly_table
    )
  )
}

run_anomaly_detection <- function() {
  log_info(
    sprintf(
      "starting anomaly refresh (lookback_days=%s recent_window_days=%s min_ratio=%s min_abs_delta=%s max_alerts=%s input=%s.fct_bed_occupancy output=%s.%s)",
      anomaly_lookback_days,
      anomaly_recent_window_days,
      anomaly_min_deviation_ratio,
      anomaly_min_abs_delta,
      anomaly_max_alerts,
      analytics_schema,
      output_schema,
      anomaly_table
    )
  )
  con <- DBI::dbConnect(
    RPostgres::Postgres(),
    host = get_env("POSTGRES_HOST", "postgres"),
    port = as.integer(get_env("POSTGRES_PORT", "5432")),
    dbname = get_env("POSTGRES_DB", "opencare"),
    user = get_env("POSTGRES_USER", "opencare"),
    password = get_env("POSTGRES_PASSWORD", "")
  )
  on.exit(DBI::dbDisconnect(con), add = TRUE)

  query <- sprintf(
    "
    with anchor as (
      select max(date_day) as max_date
      from %s.fct_bed_occupancy
    ),
    recent_window as (
      select
        ward_id,
        date_day,
        occupied_beds
      from %s.fct_bed_occupancy
      cross join anchor
      where date_day >= anchor.max_date - integer '%s'
    ),
    ordered as (
      select
        ward_id,
        date_day,
        occupied_beds,
        avg(occupied_beds) over (
          partition by ward_id
          order by date_day
          rows between %s preceding and 1 preceding
        ) as trailing_mean
      from recent_window
    ),
    candidates as (
      select
        ward_id as department_id,
        date_day as event_date,
        occupied_beds,
        trailing_mean,
        case
          when trailing_mean is null or trailing_mean = 0 then 0
          else round((occupied_beds - trailing_mean) / trailing_mean, 4)
        end as deviation_ratio
      from ordered
      where trailing_mean is not null
        and occupied_beds - trailing_mean >= %s
        and (
          case
            when trailing_mean is null or trailing_mean = 0 then 0
            else round((occupied_beds - trailing_mean) / trailing_mean, 4)
          end
        ) >= %s
    )
    select
      department_id,
      event_date,
      occupied_beds,
      trailing_mean,
      deviation_ratio
    from candidates
    order by deviation_ratio desc, event_date desc, department_id
    limit %s
    ",
    analytics_schema,
    analytics_schema,
    anomaly_recent_window_days,
    anomaly_lookback_days,
    anomaly_min_abs_delta,
    anomaly_min_deviation_ratio,
    anomaly_max_alerts
  )

  ensure_anomaly_table(con)
  anomalies <- DBI::dbGetQuery(con, query)
  if (nrow(anomalies) == 0) {
    DBI::dbWithTransaction(con, {
      DBI::dbExecute(con, sprintf("truncate table %s.%s", output_schema, anomaly_table))
    })
    log_info(sprintf("no anomaly rows produced; cleared %s.%s", output_schema, anomaly_table))
    return(data.frame())
  }

  anomalies$severity <- ifelse(anomalies$deviation_ratio >= 0.25, "high", "medium")
  anomalies$generated_at <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")

  staging_table <- paste0(anomaly_table, "_staging")
  DBI::dbWriteTable(
    con,
    DBI::Id(schema = output_schema, table = staging_table),
    anomalies,
    overwrite = TRUE,
    temporary = FALSE
  )

  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", output_schema, anomaly_table))
    DBI::dbExecute(
      con,
      sprintf(
        "
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
        ",
        output_schema,
        anomaly_table,
        output_schema,
        staging_table
      )
    )
    DBI::dbExecute(con, sprintf("drop table if exists %s.%s", output_schema, staging_table))
  })

  log_info(sprintf("wrote %s anomaly rows to %s.%s", nrow(anomalies), output_schema, anomaly_table))
  invisible(anomalies)
}

log_info("booting plumber API on port 8000")
pr <- plumber::plumb("plumber.R")
pr$run(host = "0.0.0.0", port = as.integer(get_env("PORT", "8000")))
