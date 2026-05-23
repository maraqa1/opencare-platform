{% macro talemia_raw_relation(identifier) -%}
    {{ return(adapter.get_relation(
        database=target.database,
        schema=env_var('DBT_SOURCE_SCHEMA', env_var('RAW_SCHEMA', 'raw_demo')),
        identifier=identifier
    )) }}
{%- endmacro %}
