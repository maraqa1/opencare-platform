#* @apiTitle OpenCare Anomaly Runtime

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
    log_info(sprintf("no anomalies detected; cleared %s.%s", output_schema, anomaly_table))
    return(data.frame())
  }

  anomalies$severity <- ifelse(anomalies$deviation_ratio >= 0.25, "high", "medium")
  anomalies$generated_at <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")

  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", output_schema, anomaly_table))
    DBI::dbWriteTable(
      con,
      DBI::Id(schema = output_schema, table = anomaly_table),
      anomalies,
      append = TRUE,
      row.names = FALSE
    )
  })

  log_info(sprintf("wrote %s anomaly rows to %s.%s", nrow(anomalies), output_schema, anomaly_table))
  anomalies
}

#* Health check
#* @get /healthz
function() {
  list(status = "ok", service = "anomaly")
}

#* Execute latest anomaly refresh
#* @post /run
function() {
  output <- run_anomaly_detection()
  list(
    status = "ok",
    rows_written = nrow(output),
    target_table = sprintf("%s.%s", output_schema, anomaly_table)
  )
}

#* Preview current anomaly rows
#* @get /latest
function() {
  con <- DBI::dbConnect(
    RPostgres::Postgres(),
    host = get_env("POSTGRES_HOST", "postgres"),
    port = as.integer(get_env("POSTGRES_PORT", "5432")),
    dbname = get_env("POSTGRES_DB", "opencare"),
    user = get_env("POSTGRES_USER", "opencare"),
    password = get_env("POSTGRES_PASSWORD", "")
  )
  on.exit(DBI::dbDisconnect(con), add = TRUE)

  ensure_anomaly_table(con)

  query <- sprintf(
    "
    select
      department_id,
      event_date,
      occupied_beds,
      trailing_mean,
      deviation_ratio,
      severity,
      generated_at
    from %s.%s
    order by event_date desc, department_id
    limit 25
    ",
    output_schema,
    anomaly_table
  )

  rows <- DBI::dbGetQuery(con, query)
  list(status = "ok", items = rows)
}
