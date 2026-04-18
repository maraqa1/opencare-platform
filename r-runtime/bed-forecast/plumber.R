#* @apiTitle OpenCare Bed Forecast Runtime

get_env <- function(name, default = NULL) {
  value <- Sys.getenv(name, unset = default)
  if (identical(value, "")) {
    return(default)
  }
  value
}

log_info <- function(message) {
  cat(sprintf("[%s] [bed-forecast] %s\n", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), message))
  flush.console()
}

analytics_schema <- get_env("ANALYTICS_SCHEMA", "analytics")
forecast_table <- get_env("FORECAST_OUTPUT_TABLE", "forecast_bed_occupancy")

ensure_forecast_table <- function(con) {
  DBI::dbExecute(
    con,
    sprintf("
      create table if not exists %s.%s (
        department_id text not null,
        forecast_date date not null,
        predicted_occupied_beds integer not null,
        capacity_beds integer,
        generated_at timestamp not null
      )
    ", analytics_schema, forecast_table)
  )
}

run_forecast <- function() {
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
    with base as (
      select
        ward_id,
        date_day,
        occupied_beds,
        staffed_beds
      from %s.fct_bed_occupancy
    ),
    ranked as (
      select
        ward_id,
        date_day,
        occupied_beds,
        staffed_beds,
        row_number() over (partition by ward_id order by date_day desc) as rn
      from base
    ),
    latest as (
      select
        ward_id,
        date_day,
        occupied_beds,
        staffed_beds
      from ranked
      where rn <= 7
    )
    select
      ward_id as department_id,
      max(date_day) + integer '1' as forecast_date,
      round(avg(occupied_beds))::integer as predicted_occupied_beds,
      max(staffed_beds)::integer as capacity_beds
    from latest
    group by ward_id
  ", analytics_schema)

  ensure_forecast_table(con)
  forecast <- DBI::dbGetQuery(con, query)
  if (nrow(forecast) == 0) {
    log_info("no forecast rows produced")
    return(data.frame())
  }

  forecast$generated_at <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")

  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", analytics_schema, forecast_table))
    DBI::dbWriteTable(
      con,
      DBI::Id(schema = analytics_schema, table = forecast_table),
      forecast,
      append = TRUE,
      row.names = FALSE
    )
  })

  log_info(sprintf("wrote %s forecast rows", nrow(forecast)))
  forecast
}

#* Health check
#* @get /healthz
function() {
  list(status = "ok", service = "bed-forecast")
}

#* Execute latest forecast refresh
#* @post /run
function() {
  output <- run_forecast()
  list(
    status = "ok",
    rows_written = nrow(output),
    target_table = sprintf("%s.%s", analytics_schema, forecast_table)
  )
}

#* Preview current forecast rows
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

  ensure_forecast_table(con)

  query <- sprintf("
    select
      department_id,
      forecast_date,
      predicted_occupied_beds,
      capacity_beds,
      generated_at
    from %s.%s
    order by forecast_date desc, department_id
    limit 25
  ", analytics_schema, forecast_table)

  rows <- DBI::dbGetQuery(con, query)
  list(status = "ok", items = rows)
}
