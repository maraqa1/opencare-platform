with distinct_dates as (
    select distinct
        event_date as date_day
    from {{ ref('stg_bed_events') }}
    where event_type = 'midnight_census'
      and event_date is not null
)

select
    date_day,
    extract(isodow from date_day) as day_of_week,
    extract(week from date_day) as week_of_year,
    extract(month from date_day) as month_of_year,
    extract(quarter from date_day) as quarter_of_year,
    extract(year from date_day) as year_number
from distinct_dates
