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

log_info("booting plumber API on port 8000")
pr <- plumber::plumb("plumber.R")
pr$run(host = "0.0.0.0", port = as.integer(get_env("PORT", "8000")))
