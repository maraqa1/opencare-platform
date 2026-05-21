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
anomaly_lookback_days <- as.integer(get_env("ANOMALY_LOOKBACK_DAYS", "30"))
anomaly_recent_window_days <- as.integer(get_env("ANOMALY_RECENT_WINDOW_DAYS", "7"))
anomaly_info_z_score <- as.numeric(get_env("ANOMALY_INFO_Z_SCORE", "1.5"))
anomaly_warning_z_score <- as.numeric(get_env("ANOMALY_WARNING_Z_SCORE", "2.0"))
anomaly_critical_z_score <- as.numeric(get_env("ANOMALY_CRITICAL_Z_SCORE", "2.5"))
anomaly_info_occupancy_rate <- as.numeric(get_env("ANOMALY_INFO_OCCUPANCY_RATE", "75"))
anomaly_warning_occupancy_rate <- as.numeric(get_env("ANOMALY_WARNING_OCCUPANCY_RATE", "85"))
anomaly_critical_occupancy_rate <- as.numeric(get_env("ANOMALY_CRITICAL_OCCUPANCY_RATE", "95"))
anomaly_max_alerts <- as.integer(get_env("ANOMALY_MAX_ALERTS", "3"))

ensure_anomaly_table <- function(con) {
  expected_columns <- c(
    "ward_id",
    "anomaly_date",
    "occupancy_rate",
    "anomaly_type",
    "severity",
    "z_score",
    "threshold_breached",
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
      anomaly_table
    )
  )$column_name

  if (length(existing_columns) > 0 && !all(expected_columns %in% existing_columns)) {
    log_info(sprintf("replacing legacy %s.%s contract", output_schema, anomaly_table))
    DBI::dbExecute(con, sprintf("drop table if exists %s.%s", output_schema, anomaly_table))
  }

  DBI::dbExecute(
    con,
    sprintf(
      "
      create table if not exists %s.%s (
        ward_id text not null,
        anomaly_date date not null,
        occupancy_rate numeric(5,2) not null,
        anomaly_type text,
        severity text not null,
        z_score numeric(6,3),
        threshold_breached text,
        run_timestamp timestamp not null,
        primary key (ward_id, anomaly_date, anomaly_type, run_timestamp)
      )
      ",
      output_schema,
      anomaly_table
    )
  )
}

fetch_anomaly_input <- function(con) {
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
      staffed_beds,
      round(occupancy_rate::numeric * 100.0, 2) as occupancy_rate
    from %s.fct_bed_occupancy
    cross join anchor
    where date_day >= anchor.max_date - integer '%s'
    order by ward_id, date_day
    ",
    analytics_schema,
    analytics_schema,
    anomaly_lookback_days + anomaly_recent_window_days
  )
  DBI::dbGetQuery(con, query)
}

build_threshold_text <- function(z_score, occupancy_rate, severity) {
  thresholds <- c()
  if (severity == "critical") {
    if (!is.na(z_score) && z_score >= anomaly_critical_z_score) {
      thresholds <- c(thresholds, sprintf("z_score>=%.1f", anomaly_critical_z_score))
    }
    if (occupancy_rate >= anomaly_critical_occupancy_rate) {
      thresholds <- c(thresholds, sprintf("occupancy_rate>=%.0f", anomaly_critical_occupancy_rate))
    }
  } else if (severity == "warning") {
    if (!is.na(z_score) && z_score >= anomaly_warning_z_score) {
      thresholds <- c(thresholds, sprintf("z_score>=%.1f", anomaly_warning_z_score))
    }
    if (occupancy_rate >= anomaly_warning_occupancy_rate) {
      thresholds <- c(thresholds, sprintf("occupancy_rate>=%.0f", anomaly_warning_occupancy_rate))
    }
  } else {
    if (!is.na(z_score) && z_score >= anomaly_info_z_score) {
      thresholds <- c(thresholds, sprintf("z_score>=%.1f", anomaly_info_z_score))
    }
    if (occupancy_rate >= anomaly_info_occupancy_rate) {
      thresholds <- c(thresholds, sprintf("occupancy_rate>=%.0f", anomaly_info_occupancy_rate))
    }
  }

  paste(thresholds, collapse = "; ")
}

classify_anomaly <- function(occupancy_rate, z_score) {
  severity <- NA_character_
  if ((!is.na(z_score) && z_score >= anomaly_critical_z_score) || occupancy_rate >= anomaly_critical_occupancy_rate) {
    severity <- "critical"
  } else if ((!is.na(z_score) && z_score >= anomaly_warning_z_score) || occupancy_rate >= anomaly_warning_occupancy_rate) {
    severity <- "warning"
  } else if ((!is.na(z_score) && z_score >= anomaly_info_z_score) || occupancy_rate >= anomaly_info_occupancy_rate) {
    severity <- "info"
  }

  if (is.na(severity)) {
    return(NULL)
  }

  anomaly_type <- if (occupancy_rate >= anomaly_warning_occupancy_rate) {
    "high_occupancy"
  } else if (!is.na(z_score) && z_score >= anomaly_warning_z_score) {
    "spike"
  } else {
    "trend_break"
  }

  list(
    severity = severity,
    anomaly_type = anomaly_type,
    threshold_breached = build_threshold_text(z_score, occupancy_rate, severity)
  )
}

run_anomaly_detection <- function() {
  log_info(
    sprintf(
      paste(
        "starting anomaly refresh",
        "(lookback_days=%s recent_window_days=%s info_z=%s warning_z=%s critical_z=%s",
        "info_occ=%s warning_occ=%s critical_occ=%s max_alerts=%s input=%s.fct_bed_occupancy output=%s.%s)"
      ),
      anomaly_lookback_days,
      anomaly_recent_window_days,
      anomaly_info_z_score,
      anomaly_warning_z_score,
      anomaly_critical_z_score,
      anomaly_info_occupancy_rate,
      anomaly_warning_occupancy_rate,
      anomaly_critical_occupancy_rate,
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

  ensure_anomaly_table(con)
  ward_history <- fetch_anomaly_input(con)
  if (nrow(ward_history) == 0) {
    stop(sprintf("No anomaly input rows available in %s.fct_bed_occupancy", analytics_schema))
  }

  ward_groups <- split(ward_history, ward_history$ward_id)
  run_timestamp <- format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  anomalies <- list()

  for (ward_id in names(ward_groups)) {
    ward_data <- ward_groups[[ward_id]]
    if (nrow(ward_data) <= anomaly_recent_window_days) {
      next
    }

    recent_rows <- tail(ward_data, anomaly_recent_window_days)
    baseline_rows <- head(ward_data, nrow(ward_data) - anomaly_recent_window_days)
    baseline_mean <- mean(baseline_rows$occupancy_rate, na.rm = TRUE)
    baseline_sd <- stats::sd(baseline_rows$occupancy_rate, na.rm = TRUE)

    if (!is.finite(baseline_sd) || is.na(baseline_sd) || baseline_sd == 0) {
      baseline_sd <- 0
    }

    for (index in seq_len(nrow(recent_rows))) {
      row <- recent_rows[index, ]
      z_score <- if (baseline_sd > 0) {
        round((row$occupancy_rate - baseline_mean) / baseline_sd, 3)
      } else {
        0
      }

      classification <- classify_anomaly(row$occupancy_rate, z_score)
      if (is.null(classification)) {
        next
      }

      anomalies[[length(anomalies) + 1]] <- data.frame(
        ward_id = row$ward_id,
        anomaly_date = row$date_day,
        occupancy_rate = round(row$occupancy_rate, 2),
        anomaly_type = classification$anomaly_type,
        severity = classification$severity,
        z_score = z_score,
        threshold_breached = classification$threshold_breached,
        run_timestamp = run_timestamp
      )
    }
  }

  if (length(anomalies) == 0) {
    DBI::dbWithTransaction(con, {
      DBI::dbExecute(con, sprintf("truncate table %s.%s", output_schema, anomaly_table))
    })
    log_info(sprintf("no anomaly rows produced; cleared %s.%s", output_schema, anomaly_table))
    return(data.frame())
  }

  anomalies_df <- do.call(rbind, anomalies)
  severity_rank <- c("critical" = 1, "warning" = 2, "info" = 3)
  anomalies_df$severity_rank <- severity_rank[anomalies_df$severity]
  anomalies_df <- anomalies_df[order(anomalies_df$severity_rank, -anomalies_df$z_score, -as.numeric(anomalies_df$anomaly_date)), ]
  anomalies_df <- head(anomalies_df, anomaly_max_alerts)
  anomalies_df$severity_rank <- NULL

  staging_table <- paste0(anomaly_table, "_staging")
  DBI::dbWriteTable(
    con,
    DBI::Id(schema = output_schema, table = staging_table),
    anomalies_df,
    overwrite = TRUE,
    row.names = FALSE
  )

  DBI::dbWithTransaction(con, {
    DBI::dbExecute(con, sprintf("truncate table %s.%s", output_schema, anomaly_table))
    DBI::dbExecute(
      con,
      sprintf(
        "
        insert into %s.%s (
          ward_id,
          anomaly_date,
          occupancy_rate,
          anomaly_type,
          severity,
          z_score,
          threshold_breached,
          run_timestamp
        )
        select
          ward_id,
          anomaly_date,
          occupancy_rate,
          anomaly_type,
          severity,
          z_score,
          threshold_breached,
          cast(run_timestamp as timestamp)
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

  log_info(sprintf("wrote %s anomaly rows to %s.%s", nrow(anomalies_df), output_schema, anomaly_table))
  anomalies_df
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

  rows <- DBI::dbGetQuery(
    con,
    sprintf(
      "
      select
        ward_id,
        anomaly_date,
        occupancy_rate,
        anomaly_type,
        severity,
        z_score,
        threshold_breached,
        run_timestamp
      from %s.%s
      order by
        case severity when 'critical' then 0 when 'warning' then 1 else 2 end,
        anomaly_date desc,
        ward_id
      limit 50
      ",
      output_schema,
      anomaly_table
    )
  )

  list(status = "ok", items = rows)
}
