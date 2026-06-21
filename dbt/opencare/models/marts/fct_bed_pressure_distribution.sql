select
    md5(concat(occupancy.date_day::text, '||', occupancy.ward_id, '||distribution')) as pressure_distribution_key,
    occupancy.date_day,
    occupancy.ward_id,
    ward.ward_code,
    ward.ward_name as ward,
    ward.service_line as specialty,
    occupancy.occupied_beds,
    occupancy.staffed_beds,
    occupancy.available_beds,
    round(occupancy.occupancy_rate * 100, 2) as occupancy_rate_pct,
    case
        when occupancy.occupancy_rate >= 0.90 then 'Critical'
        when occupancy.occupancy_rate >= 0.75 then 'Warning'
        else 'Normal'
    end as pressure_band
from {{ ref('fct_bed_occupancy') }} as occupancy
join {{ ref('dim_ward') }} as ward
    on occupancy.ward_id = ward.ward_id
