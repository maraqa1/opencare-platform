select
    'occupied_beds' as metric_id,
    'Occupied Beds' as metric_name,
    'Daily occupied bed count captured from the midnight census event.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
union all
select
    'available_beds' as metric_id,
    'Available Beds' as metric_name,
    'Remaining staffed beds available after subtracting occupied beds.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
union all
select
    'occupancy_rate' as metric_id,
    'Occupancy Rate' as metric_name,
    'Percentage of staffed beds occupied for a ward-day.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
union all
select
    'pressure_flag' as metric_id,
    'Pressure Flag' as metric_name,
    'Boolean indicator showing occupancy at or above 90 percent of staffed beds.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
union all
select
    'admissions_today' as metric_id,
    'Admissions Today' as metric_name,
    'Count of admission events recorded for the latest operational day.' as metric_description,
    'staging.stg_bed_events' as metric_schema
union all
select
    'discharges_today' as metric_id,
    'Discharges Today' as metric_name,
    'Count of discharge events recorded for the latest operational day.' as metric_description,
    'staging.stg_bed_events' as metric_schema
union all
select
    'predicted_occupancy' as metric_id,
    'Predicted Occupancy' as metric_name,
    'Forecasted occupied bed count produced by the runtime model.' as metric_description,
    'output.forecast' as metric_schema
union all
select
    'lower_ci_95' as metric_id,
    'Lower Confidence Bound' as metric_name,
    'Lower 95 percent confidence bound for the occupancy forecast.' as metric_description,
    'output.forecast' as metric_schema
union all
select
    'upper_ci_95' as metric_id,
    'Upper Confidence Bound' as metric_name,
    'Upper 95 percent confidence bound for the occupancy forecast.' as metric_description,
    'output.forecast' as metric_schema
union all
select
    'breach_risk' as metric_id,
    'Breach Risk' as metric_name,
    'Indicator showing the forecast crosses the 90 percent occupancy threshold.' as metric_description,
    'output.forecast' as metric_schema
union all
select
    'z_score' as metric_id,
    'Anomaly Z-Score' as metric_name,
    'Standard deviations from the expected occupancy baseline for anomaly detection.' as metric_description,
    'output.anomaly' as metric_schema
