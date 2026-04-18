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
output_schema <- get_env("OUTPUT_SCHEMA", "output")
forecast_table <- get_env("FORECAST_OUTPUT_TABLE", "forecast")
forecast_lookback_days <- as.integer(get_env("FORECAST_LOOKBACK_DAYS", "14"))
forecast_horizon_days <- as.integer(get_env("FORECAST_HORIZON_DAYS", "7"))

ensure_forecast_table <- function(con) {
  DBI::dbExecute(con, sprintf("create schema if not exists %s", output_schema))
  DBI::dbExecute(
    con,
    sprintf(
      "
      create table if not exists %s.%s (
        department_id text not null,
        forecast_date date not null,
        predicted_occupied_beds integer not null,
        capacity_beds integer,
        generated_at timestamp not null
      )
      ",
      output_schema,
      forecast_table
    )
  )
}

run_forecast <- function() {
  log_info(
    sprintf(
      "starting forecast refresh (lookback_days=%s horizon_days=%s input=%s.fct_bed_occupancy output=%s.%s)",
      forecast_lookback_days,
      forecast_horizon_days,
      analytics_schema,
      output_schema,
      forecast_table
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

  ensure_forecast_table(con)

  ward_count <- DBI::dbGetQuery(
    con,
    sprintf("select count(distinct ward_id) as ward_count from %s.fct_bed_occupancy", analytics_schema)
  )$ward_count[[1]]

  if (is.na(ward_count) || ward_count == 0) {
    stop(sprintf("No ward rows available in %s.fct_bed_occupancy", analytics_schema))
  }

  query <- sprintf(
    "
    with ranked as (
      select
        ward_id,
        date_day,
        occupied_beds,
        staffed_beds,
        row_number() over (partition by ward_id order by date_day desc) as recency_rank
      from %s.fct_bed_occupancy
    ),
    recent as (
      select
        ward_id,
        date_day,
        occupied_beds,
        staffed_beds,
        recency_rank
      from ranked
      where recency_rank <= %s
    ),
    ward_summary as (
      select
        ward_id,
        max(date_day) as last_observed_date,
        round(avg(occupied_beds))::integer as baseline_occupied_beds,
        max(staffed_beds)::integer as capacity_beds,
        coalesce(
          round(
            avg(case when recency_rank <= 3 then occupied_beds end)
            - avg(case when recency_rank between 4 and least(%s, 7) then occupied_beds end)
          )::integer,
          0
        ) as recent_trend
      from recent
      group by ward_id
    ),
    offsets as (
      select generate_series(1, %s) as horizon_offset
    )
    select
      ward_summary.ward_id as department_id,
      ward_summary.last_observed_date + offsets.horizon_offset as forecast_date,
      greatest(
        least(
          ward_summary.baseline_occupied_beds + (offsets.horizon_offset * ward_summary.recent_trend),
          ward_summary.capacity_beds
        ),
        0
      )::integer as predicted_occupied_beds,
      ward_summary.capacity_beds
    from ward_summary
    cross join offsets
    order by ward_summary.ward_id, forecast_date
    ",
    analytics_schema,
    forecast_lookback_days,
    forecast_lookback_days,
    forecast_horizon_days
  )

  forecast <- DBI::dbGetQuery(con, query)
  expected_rows <- ward_count * forecast_horizon_days

  if (nrow(forecast) == 0) {
    stop(sprintf("Forecast query returned zero rows from %s.fct_bed_occupancy", analytics_schema))
  }

  if (nrow(forecast) != expected_rows) {
    stop(sprintf("Forecast row count mismatch: expected %s rows for %s wards across %s days, got %s", expected_rows, ward_count, forecast_horizon_days, nrow(forecast)))
  }

  forecast$generated_at <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  staging_table <- DBI::Id(schema = output_schema, table = paste0(forecast_table, "_staging"))

  DBI::dbWriteTable(con, staging_table, forecast, overwrite = TRUE, temporary = FALSE)
  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", output_schema, forecast_table))
    DBI::dbExecute(
      con,
      sprintf(
        "
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
        ",
        output_schema,
        forecast_table,
        output_schema,
        paste0(forecast_table, "_staging")
      )
    )
    DBI::dbExecute(con, sprintf("drop table if exists %s.%s", output_schema, paste0(forecast_table, "_staging")))
  })

  log_info(sprintf("wrote %s forecast rows for %s wards into %s.%s", nrow(forecast), ward_count, output_schema, forecast_table))
  invisible(forecast)
}

log_info("booting plumber API on port 8000")
pr <- plumber::plumb("plumber.R")
pr$run(host = "0.0.0.0", port = as.integer(get_env("PORT", "8000")))
