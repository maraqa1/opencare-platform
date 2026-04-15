select
    'occupied_beds' as metric_id,
    'Occupied Beds' as metric_name,
    'Daily occupied bed count captured from the midnight census event.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
union all
select
    'available_beds' as metric_id,
    'Available Beds' as metric_name,
    'Remaining staffed beds available after subtracting the midnight census occupied beds.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
union all
select
    'occupancy_rate' as metric_id,
    'Occupancy Rate' as metric_name,
    'Ratio of occupied beds to staffed beds for a ward-day.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
union all
select
    'pressure_flag' as metric_id,
    'Pressure Flag' as metric_name,
    'Boolean flag indicating that ward occupancy reached or exceeded 90 percent of staffed beds.' as metric_description,
    'analytics.fct_bed_occupancy' as metric_schema
