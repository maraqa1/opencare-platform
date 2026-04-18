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
  log_info("starting forecast refresh")
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
        ward_id as department_id,
        date_day,
        occupied_beds,
        staffed_beds
      from %s.fct_bed_occupancy
    ),
    ranked as (
      select
        department_id,
        date_day,
        occupied_beds,
        staffed_beds,
        row_number() over (partition by department_id order by date_day desc) as rn
      from base
    ),
    latest as (
      select
        department_id,
        date_day,
        occupied_beds,
        staffed_beds
      from ranked
      where rn <= 7
    )
    select
      department_id,
      max(date_day) + integer '1' as forecast_date,
      round(avg(occupied_beds))::integer as predicted_occupied_beds,
      max(staffed_beds)::integer as capacity_beds
    from latest
    group by department_id
  ", analytics_schema)

  ensure_forecast_table(con)
  forecast <- DBI::dbGetQuery(con, query)
  if (nrow(forecast) == 0) {
    log_info("no source rows available in analytics fct_bed_occupancy")
    return(invisible(NULL))
  }

  forecast$generated_at <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  target <- DBI::Id(schema = analytics_schema, table = forecast_table)
  staging_table <- DBI::Id(schema = analytics_schema, table = paste0(forecast_table, "_staging"))

  DBI::dbWriteTable(con, staging_table, forecast, overwrite = TRUE, temporary = FALSE)
  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", analytics_schema, forecast_table))
    DBI::dbExecute(
      con,
      sprintf("
        insert into %s.%s (
          department_id,
          forecast_date,
          predicted_occupied_beds,
          capacity_beds,
          generated_at
        )
        select
          department_id,
          forecast_date,
          predicted_occupied_beds,
          capacity_beds,
          cast(generated_at as timestamp)
        from %s.%s
      ", analytics_schema, forecast_table, analytics_schema, paste0(forecast_table, "_staging"))
    )
    DBI::dbExecute(con, sprintf("drop table if exists %s.%s", analytics_schema, paste0(forecast_table, "_staging")))
  })

  log_info(sprintf("wrote %s forecast rows to %s.%s", nrow(forecast), analytics_schema, forecast_table))
  invisible(forecast)
}

log_info("booting plumber API on port 8000")
pr <- plumber::plumb("plumber.R")
pr$run(host = "0.0.0.0", port = as.integer(get_env("PORT", "8000")))
