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
output_schema <- get_env("OUTPUT_SCHEMA", "output")
forecast_table <- get_env("FORECAST_OUTPUT_TABLE", "forecast")
forecast_model_name <- get_env("FORECAST_MODEL_NAME", "auto.arima")
forecast_lookback_days <- as.integer(get_env("FORECAST_LOOKBACK_DAYS", "14"))
forecast_horizon_days <- as.integer(get_env("FORECAST_HORIZON_DAYS", "7"))

ensure_forecast_table <- function(con) {
  expected_columns <- c(
    "ward_id",
    "forecast_date",
    "predicted_occupancy",
    "lower_ci_95",
    "upper_ci_95",
    "capacity_beds",
    "model_used",
    "run_timestamp"
  )

  DBI::dbExecute(con, sprintf("create schema if not exists %s", output_schema))
  existing_columns <- DBI::dbGetQuery(
    con,
    sprintf(
      "
      select column_name
      from information_schema.columns
      where table_schema = '%s'
        and table_name = '%s'
      order by ordinal_position
      ",
      output_schema,
      forecast_table
    )
  )$column_name

  if (length(existing_columns) > 0 && !all(expected_columns %in% existing_columns)) {
    log_info(sprintf("replacing legacy %s.%s contract", output_schema, forecast_table))
    DBI::dbExecute(con, sprintf("drop table if exists %s.%s", output_schema, forecast_table))
  }

  DBI::dbExecute(
    con,
    sprintf(
      "
      create table if not exists %s.%s (
        ward_id text not null,
        forecast_date date not null,
        predicted_occupancy numeric(5,2) not null,
        lower_ci_95 numeric(5,2),
        upper_ci_95 numeric(5,2),
        capacity_beds integer,
        model_used text not null default '%s',
        run_timestamp timestamp not null,
        primary key (ward_id, forecast_date, run_timestamp)
      )
      ",
      output_schema,
      forecast_table,
      forecast_model_name
    )
  )
}

fetch_forecast_input <- function(con) {
  query <- sprintf(
    "
    with anchor as (
      select max(date_day) as max_date
      from %s.fct_bed_occupancy
    )
    select
      ward_id,
      date_day,
      occupied_beds,
      staffed_beds
    from %s.fct_bed_occupancy
    cross join anchor
    where date_day >= anchor.max_date - integer '%s'
    order by ward_id, date_day
    ",
    analytics_schema,
    analytics_schema,
    forecast_lookback_days
  )
  DBI::dbGetQuery(con, query)
}

forecast_for_ward <- function(ward_data, run_timestamp) {
  ward_id <- unique(ward_data$ward_id)[[1]]
  capacity_beds <- max(ward_data$staffed_beds, na.rm = TRUE)
  observed <- ward_data$occupied_beds

  if (length(observed) < 3) {
    baseline <- mean(observed, na.rm = TRUE)
    spread <- stats::sd(observed, na.rm = TRUE)
    if (is.na(spread)) {
      spread <- 1
    }
    predicted <- rep(baseline, forecast_horizon_days)
    lower <- rep(baseline - (1.96 * spread), forecast_horizon_days)
    upper <- rep(baseline + (1.96 * spread), forecast_horizon_days)
    model_used <- "fallback_mean"
  } else {
    series <- stats::ts(observed, frequency = 7)
    fit <- tryCatch(
      forecast::auto.arima(series),
      error = function(error) {
        log_info(sprintf("auto.arima fallback for %s: %s", ward_id, conditionMessage(error)))
        NULL
      }
    )

    if (is.null(fit)) {
      baseline <- mean(observed, na.rm = TRUE)
      spread <- stats::sd(observed, na.rm = TRUE)
      if (is.na(spread)) {
        spread <- 1
      }
      predicted <- rep(baseline, forecast_horizon_days)
      lower <- rep(baseline - (1.96 * spread), forecast_horizon_days)
      upper <- rep(baseline + (1.96 * spread), forecast_horizon_days)
      model_used <- "fallback_mean"
    } else {
      fc <- forecast::forecast(fit, h = forecast_horizon_days, level = 95)
      predicted <- as.numeric(fc$mean)
      lower <- as.numeric(fc$lower[, 1])
      upper <- as.numeric(fc$upper[, 1])
      model_used <- forecast_model_name
    }
  }

  if (!is.finite(capacity_beds) || is.na(capacity_beds)) {
    capacity_beds <- max(predicted, na.rm = TRUE)
  }

  clamp <- function(values) {
    rounded <- round(values, 2)
    pmax(pmin(rounded, capacity_beds), 0)
  }

  data.frame(
    ward_id = ward_id,
    forecast_date = seq(max(ward_data$date_day) + 1, by = "day", length.out = forecast_horizon_days),
    predicted_occupancy = clamp(predicted),
    lower_ci_95 = clamp(lower),
    upper_ci_95 = clamp(upper),
    capacity_beds = as.integer(capacity_beds),
    model_used = model_used,
    run_timestamp = run_timestamp
  )
}

run_forecast <- function() {
  log_info(
    sprintf(
      "starting forecast refresh (lookback_days=%s horizon_days=%s model=%s input=%s.fct_bed_occupancy output=%s.%s)",
      forecast_lookback_days,
      forecast_horizon_days,
      forecast_model_name,
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
  ward_history <- fetch_forecast_input(con)

  if (nrow(ward_history) == 0) {
    stop(sprintf("No forecast input rows available in %s.fct_bed_occupancy", analytics_schema))
  }

  ward_groups <- split(ward_history, ward_history$ward_id)
  run_timestamp <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  forecast_rows <- do.call(
    rbind,
    lapply(ward_groups, forecast_for_ward, run_timestamp = run_timestamp)
  )

  ward_count <- length(ward_groups)
  expected_rows <- ward_count * forecast_horizon_days
  if (nrow(forecast_rows) != expected_rows) {
    stop(sprintf("Forecast row count mismatch: expected %s rows for %s wards across %s days, got %s", expected_rows, ward_count, forecast_horizon_days, nrow(forecast_rows)))
  }

  staging_table <- paste0(forecast_table, "_staging")
  DBI::dbWriteTable(
    con,
    DBI::Id(schema = output_schema, table = staging_table),
    forecast_rows,
    overwrite = TRUE,
    row.names = FALSE
  )

  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", output_schema, forecast_table))
    DBI::dbExecute(
      con,
      sprintf(
        "
        insert into %s.%s (
          ward_id,
          forecast_date,
          predicted_occupancy,
          lower_ci_95,
          upper_ci_95,
          capacity_beds,
          model_used,
          run_timestamp
        )
        select
          ward_id,
          forecast_date,
          predicted_occupancy,
          lower_ci_95,
          upper_ci_95,
          capacity_beds,
          model_used,
          cast(run_timestamp as timestamp)
        from %s.%s
        ",
        output_schema,
        forecast_table,
        output_schema,
        staging_table
      )
    )
    DBI::dbExecute(con, sprintf("drop table if exists %s.%s", output_schema, staging_table))
  })

  log_info(sprintf("wrote %s forecast rows for %s wards into %s.%s", nrow(forecast_rows), ward_count, output_schema, forecast_table))
  forecast_rows
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
    target_table = sprintf("%s.%s", output_schema, forecast_table),
    horizon_days = forecast_horizon_days,
    model_used = unique(output$model_used)
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

  rows <- DBI::dbGetQuery(
    con,
    sprintf(
      "
      select
        ward_id,
        forecast_date,
        predicted_occupancy,
        lower_ci_95,
        upper_ci_95,
        capacity_beds,
        model_used,
        run_timestamp
      from %s.%s
      order by forecast_date, ward_id
      limit 200
      ",
      output_schema,
      forecast_table
    )
  )

  list(status = "ok", items = rows)
}
