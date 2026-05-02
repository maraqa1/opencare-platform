with source_data as (
    select distinct
        cast(ward_id as text) as ward_id,
        trim(cast(ward_code as text)) as ward_code,
        trim(cast(ward_name as text)) as ward_name,
        trim(cast(service_line as text)) as service_line,
        cast(licensed_beds as integer) as licensed_beds,
        cast(staffed_beds_baseline as integer) as staffed_beds_baseline
    from {{ source('raw', 'wards') }}
)

select
    ward_id,
    ward_code,
    ward_name,
    service_line,
    licensed_beds,
    staffed_beds_baseline
from source_data
