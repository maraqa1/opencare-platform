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
anomaly_table <- get_env("ANOMALY_OUTPUT_TABLE", "anomaly_bed_occupancy")

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

  query <- sprintf("
    with ordered as (
      select
        department_id,
        date_day,
        occupied_beds,
        avg(occupied_beds) over (
          partition by department_id
          order by date_day
          rows between 6 preceding and 1 preceding
        ) as trailing_mean
      from %s.fact_bed_occupancy
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

  anomalies <- DBI::dbGetQuery(con, query)
  if (nrow(anomalies) == 0) {
    log_info("no anomalies detected")
    return(data.frame())
  }

  anomalies$severity <- ifelse(anomalies$deviation_ratio >= 0.25, "high", "medium")
  anomalies$generated_at <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")

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

  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", analytics_schema, anomaly_table))
    DBI::dbWriteTable(
      con,
      DBI::Id(schema = analytics_schema, table = anomaly_table),
      anomalies,
      append = TRUE,
      row.names = FALSE
    )
  })

  log_info(sprintf("wrote %s anomaly rows", nrow(anomalies)))
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
    target_table = sprintf("%s.%s", analytics_schema, anomaly_table)
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

  query <- sprintf("
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
  ", analytics_schema, anomaly_table)

  rows <- DBI::dbGetQuery(con, query)
  list(status = "ok", items = rows)
}
