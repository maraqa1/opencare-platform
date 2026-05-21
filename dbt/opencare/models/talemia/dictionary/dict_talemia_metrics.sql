{{ config(tags=["talemia", "commercial-intelligence"], schema="dictionary") }}

select *
from (
    values
        ('YTD Opportunities', 'count(*) from fct_talemia_opportunity', 'analytics.fct_talemia_opportunity', 'raw_demo.talemia_opportunities', 'Executive'),
        ('Pipeline Opportunities', 'count active opportunities where workflow_state is not awarded/lost', 'analytics.fct_talemia_pipeline', 'raw_demo.talemia_opportunities', 'Executive'),
        ('Pipeline Value', 'sum(contract_value)', 'analytics.fct_talemia_pipeline', 'raw_demo.talemia_opportunities', 'Executive'),
        ('Qualified Pipeline', 'sum(qualified_sales)', 'analytics.fct_talemia_pipeline', 'raw_demo.talemia_opportunities', 'Executive'),
        ('Wins Value', 'sum(awarded_value) for awarded opportunities', 'analytics.fct_talemia_win_loss', 'raw_demo.talemia_awards', 'Executive'),
        ('YTD Wins', 'count awarded opportunities', 'analytics.fct_talemia_win_loss', 'raw_demo.talemia_awards', 'Executive'),
        ('Win Rate', 'wins / closed opportunities', 'analytics.fct_talemia_win_loss', 'raw_demo.talemia_opportunities', 'Executive'),
        ('Hit Rate', 'wins / all opportunities', 'analytics.fct_talemia_kpi_performance', 'raw_demo.talemia_opportunities', 'Executive'),
        ('Converted Value 2026', 'sum(converted_value_2026)', 'analytics.fct_talemia_pipeline_forecast', 'raw_demo.talemia_opportunities', 'Financial'),
        ('Average Sales Cycle Days', 'average close_date - created_date where dates are valid', 'analytics.fct_talemia_sales_cycle', 'raw_demo.talemia_opportunities', 'Commercial')
) as metrics(kpi_name, formula, source_mart, raw_lineage, metric_category)
