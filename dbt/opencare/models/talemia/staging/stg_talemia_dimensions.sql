{{ config(tags=["talemia", "commercial-intelligence"]) }}

{% set clients = talemia_raw_relation('talemia_clients') %}
{% set departments = talemia_raw_relation('talemia_client_departments') %}
{% set managers = talemia_raw_relation('talemia_account_managers') %}
{% set lines = talemia_raw_relation('talemia_business_lines') %}
{% set stages = talemia_raw_relation('talemia_opportunity_stage') %}
{% set states = talemia_raw_relation('talemia_workflow_state') %}
{% set risks = talemia_raw_relation('talemia_risk_classification') %}
{% set sectors = talemia_raw_relation('talemia_sector_type') %}

select *
from (
    {% if clients %}
    select 'client'::text as dimension_type, client_id::text as dimension_id, client_name::text as dimension_name, client_type::text as attribute_1, sector::text as attribute_2, active_flag::text as active_flag from {{ clients }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
    union all
    {% if departments %}
    select 'client_department'::text as dimension_type, client_department_id::text as dimension_id, client_department::text as dimension_name, client_name::text as attribute_1, null::text as attribute_2, null::text as active_flag from {{ departments }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
    union all
    {% if managers %}
    select 'account_manager'::text as dimension_type, account_manager_id::text as dimension_id, account_manager_name::text as dimension_name, department::text as attribute_1, null::text as attribute_2, active_flag::text as active_flag from {{ managers }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
    union all
    {% if lines %}
    select 'business_line'::text as dimension_type, business_line_id::text as dimension_id, business_line_name::text as dimension_name, description::text as attribute_1, null::text as attribute_2, null::text as active_flag from {{ lines }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
    union all
    {% if stages %}
    select 'opportunity_stage'::text as dimension_type, stage_id::text as dimension_id, stage_name::text as dimension_name, stage_order::text as attribute_1, is_closed::text as attribute_2, null::text as active_flag from {{ stages }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
    union all
    {% if states %}
    select 'workflow_state'::text as dimension_type, workflow_state_id::text as dimension_id, workflow_state::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag from {{ states }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
    union all
    {% if risks %}
    select 'winning_likelihood'::text as dimension_type, risk_classification_id::text as dimension_id, winning_likelihood::text as dimension_name, risk_order::text as attribute_1, null::text as attribute_2, null::text as active_flag from {{ risks }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
    union all
    {% if sectors %}
    select 'sector_type'::text as dimension_type, sector_type_id::text as dimension_id, sector_type::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag from {{ sectors }}
    {% else %}
    select null::text as dimension_type, null::text as dimension_id, null::text as dimension_name, null::text as attribute_1, null::text as attribute_2, null::text as active_flag where false
    {% endif %}
) dimensions
