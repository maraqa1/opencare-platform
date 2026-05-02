select
    date_day,
    day_of_week,
    week_of_year,
    month_of_year,
    quarter_of_year,
    year_number
from {{ ref('dim_date') }}
