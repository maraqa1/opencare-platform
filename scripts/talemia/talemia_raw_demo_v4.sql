-- Generated from talemia_raw_demo_extracted_v4.xlsx.
-- Loads TALEMIA V4 source-derived raw tables into raw_demo.
create schema if not exists raw_demo;
grant usage, create on schema raw_demo to opencare;
set search_path to raw_demo, public;

drop table if exists raw_demo."talemia_opportunities" cascade;
create table raw_demo."talemia_opportunities" (
  "opportunity_id" text,
  "source_sheet" text,
  "source_record_type" text,
  "source_row_number" text,
  "opportunity_name_en" text,
  "opportunity_name_ar" text,
  "client_name" text,
  "client_department" text,
  "account_manager_name" text,
  "business_line_name" text,
  "moe_classification" text,
  "opportunity_stage" text,
  "workflow_state" text,
  "winning_likelihood" text,
  "deal_type" text,
  "contract_value" text,
  "qualified_sales" text,
  "converted_value_2026" text,
  "awarded_value" text,
  "win_probability" text,
  "created_date" text,
  "created_date_parse_status" text,
  "submission_date" text,
  "submission_date_parse_status" text,
  "expected_award_date" text,
  "expected_award_date_parse_status" text,
  "expected_award_quarter" text,
  "award_date" text,
  "award_date_parse_status" text,
  "loss_date" text,
  "loss_date_parse_status" text,
  "close_date" text,
  "close_date_parse_status" text,
  "submission_year" text,
  "priority" text,
  "source_name" text,
  "loss_reason" text,
  "competitor" text,
  "notes" text,
  "parse_status" text,
  "match_confidence" text,
  "parser_warning" text,
  "loaded_at" text
);

copy raw_demo."talemia_opportunities" ("opportunity_id", "source_sheet", "source_record_type", "source_row_number", "opportunity_name_en", "opportunity_name_ar", "client_name", "client_department", "account_manager_name", "business_line_name", "moe_classification", "opportunity_stage", "workflow_state", "winning_likelihood", "deal_type", "contract_value", "qualified_sales", "converted_value_2026", "awarded_value", "win_probability", "created_date", "created_date_parse_status", "submission_date", "submission_date_parse_status", "expected_award_date", "expected_award_date_parse_status", "expected_award_quarter", "award_date", "award_date_parse_status", "loss_date", "loss_date_parse_status", "close_date", "close_date_parse_status", "submission_year", "priority", "source_name", "loss_reason", "competitor", "notes", "parse_status", "match_confidence", "parser_warning", "loaded_at") from stdin with (format csv, header true);
opportunity_id,source_sheet,source_record_type,source_row_number,opportunity_name_en,opportunity_name_ar,client_name,client_department,account_manager_name,business_line_name,moe_classification,opportunity_stage,workflow_state,winning_likelihood,deal_type,contract_value,qualified_sales,converted_value_2026,awarded_value,win_probability,created_date,created_date_parse_status,submission_date,submission_date_parse_status,expected_award_date,expected_award_date_parse_status,expected_award_quarter,award_date,award_date_parse_status,loss_date,loss_date_parse_status,close_date,close_date_parse_status,submission_year,priority,source_name,loss_reason,competitor,notes,parse_status,match_confidence,parser_warning,loaded_at
OPP-d8cffc14211d,Won,won_opportunity,1,"Employment Project for Early Childhood Female Teachers, Phase Three",albelad,وزارة التعليم,Human Resources Department,م. حسن الزهراني,Human Capital Solutions,MoE+,Awarded,Awarded,High,,1576755095,1576755095,,1576755095,1,,source_blank,2025-08-28 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-d985924366fe,Won,won_opportunity,2,Recuriting teachers from China to teach the Chinese language in public schools in the Kingdom (Phase Two),albelad,وزارة التعليم,Human resourse Department,م. حسن الزهراني,Human Capital Solutions,MoE+,Awarded,Awarded,High,,120000000,120000000,,120000000,1,,source_blank,2025-06-01 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-0f8ab265760a,Won,won_opportunity,3,Project to recruit female teachers to teach culture and arts subjects,albelad,وزارة التعليم,Human resourse Department,م. حسن الزهراني,Human Capital Solutions,MoE+,Awarded,Awarded,High,,33000000,33000000,,33000000,1,,source_blank,2025-06-01 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-e1062f5f7265,Won,won_opportunity,4,Operating the Prince Sultan Center for Special Education,no,وزارة التعليم,General department of students with special needs,أ. تركي القرشي,Operation of Special Education Centres,MoE+,Awarded,Awarded,High,,291000000,291000000,,291000000,1,,source_blank,2025-06-01 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-a685cc900d66,Won,won_opportunity,5,Hemmah Al-Qassim Centre for Special Education,no,وزارة التعليم,General department of students with special needs,أ. تركي القرشي,Operation of Special Education Centres,MoE+,Awarded,Awarded,High,,55600000,55600000,,55600000,1,,source_blank,2025-06-01 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-ae8e1bfc239a,Won,won_opportunity,6,Hemmah Al-Khobar Center for Special Education,no,وزارة التعليم,General department of students with special needs,أ. تركي القرشي,Operation of Special Education Centres,MoE+,Awarded,Awarded,High,,55600000,55600000,,55600000,1,,source_blank,2025-06-01 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-7ee99cb13160,Won,won_opportunity,7,Study on establishing specialised autism centres,no,وزارة التعليم,General department of students with special needs,أ. تركي القرشي,Operation of Special Education Centres,MoE+,Awarded,Awarded,High,,5000000,5000000,,5000000,1,,source_blank,2025-06-01 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-dac407ac940e,Won,won_opportunity,8,Comprehensive Learning Journey for Students with Disabilities,,تيتكو,TETCO to MoE,أ. سعد الأسمري,Professional Development,MoE+,Awarded,Awarded,High,,3196908,3196908,,3196908,1,,source_blank,2025-11-12 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-bb1e134129fd,Won,won_opportunity,9,Neighborhood Clubs,Delta + Deloitte,وزارة التعليم,Student ِActivity Department,م. عبدالله السبعاني,Students Activities,MoE+,Awarded,Awarded,High,,181000000,181000000,,181000000,1,,source_blank,2025-10-09 00:00:00,parsed,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,2025,High,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-b9b3048dd3bd,Won,won_opportunity,10,Professional Development Programme Initiative for Teachers and School Leaders,Yes,,Ministry of Education,,Education,MoE+,Awarded,Awarded,High,,45809,45809,,45809,1,,source_blank,,invalid_format,,invalid_format,,,invalid_format,,not_applicable,,invalid_format,,Business Lines,,,,,parsed,high,,2026-05-07 07:51:06.929000
OPP-faf73d59decf,Lose,lost_opportunity,1,Competition for Qualifying Kindergarten Teachers (Curricula + Asynchronous Training),TBD,وزارة الثقافة,Professional Development Department / Cultural Programs Department,أ. سعد الأسمري,Professional Development,Non-MoE,Lost,Lost,Low,,23832148,0,0,0,0,,source_blank,2025-10-10 00:00:00,parsed,,invalid_format,,,not_applicable,,source_blank,,source_blank,2025,Medium,,,,,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
OPP-dc3a8a6b8388,Lose,lost_opportunity,2,Operation of E-learning and Distance Education at Imam Muhammad bin Saud University,TETCO,جامعة الإمام والرفع عن طريق تيتكو,Imam University and Submission via TETCO,د. ناصر العويشق,Content and Curriculum Development,Non-MoE,Lost,Lost,Low,,30204000,0,0,0,0,,source_blank,2026-02-06 00:00:00,parsed,,invalid_format,,,not_applicable,,source_blank,,source_blank,2026,Medium,,,,,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
OPP-8c5d33601662,Lose,lost_opportunity,3,Production of 140 electronic training products at the Institute of Public Administration,TETCO,معهد الإدارة العامة,Institute of Public Administration,د. ناصر العويشق,Content and Curriculum Development,Non-MoE,Lost,Lost,Low,,10769902,0,0,0,0,,source_blank,2026-02-06 00:00:00,parsed,,invalid_format,,,not_applicable,,source_blank,,source_blank,2026,Medium,,,,,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
OPP-fde80be31113,Lose,lost_opportunity,4,Awareness and Cultural Change Programme for Parents – (Ministry of Education),,وزارة التعليم,Student guidance Department,م. عبدالله السبعاني,Students Activities,MoE+,Lost,Lost,Low,,12000000,0,0,0,0,,source_blank,2025-11-10 00:00:00,parsed,,invalid_format,,,not_applicable,,source_blank,,source_blank,2025,High,,,,,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
OPP-d616dcf3ca29,Lose,lost_opportunity,5,Media Campaigns for the Initiative to Develop the Student Code of Conduct and Mechanisms for Its Implementation,,وزارة التعليم,Student guidance Department,م. عبدالله السبعاني,Students Activities,MoE+,Lost,Lost,Low,,3000000,0,0,0,0,,source_blank,2025-07-08 00:00:00,parsed,,invalid_format,,,not_applicable,,source_blank,,source_blank,2025,Low,,,,,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_awards" cascade;
create table raw_demo."talemia_awards" (
  "award_id" text,
  "opportunity_id" text,
  "opportunity_name_en" text,
  "opportunity_name_ar" text,
  "client_name" text,
  "account_manager_name" text,
  "business_line_name" text,
  "award_date" text,
  "award_date_parse_status" text,
  "awarded_value" text,
  "source_sheet" text,
  "source_row_number" text,
  "parse_status" text,
  "match_confidence" text,
  "parser_warning" text,
  "loaded_at" text
);

copy raw_demo."talemia_awards" ("award_id", "opportunity_id", "opportunity_name_en", "opportunity_name_ar", "client_name", "account_manager_name", "business_line_name", "award_date", "award_date_parse_status", "awarded_value", "source_sheet", "source_row_number", "parse_status", "match_confidence", "parser_warning", "loaded_at") from stdin with (format csv, header true);
award_id,opportunity_id,opportunity_name_en,opportunity_name_ar,client_name,account_manager_name,business_line_name,award_date,award_date_parse_status,awarded_value,source_sheet,source_row_number,parse_status,match_confidence,parser_warning,loaded_at
AWD-da7b3bd5ddae,OPP-d8cffc14211d,"Employment Project for Early Childhood Female Teachers, Phase Three",albelad,وزارة التعليم,م. حسن الزهراني,Human Capital Solutions,,invalid_format,1576755095,Won,1,parsed,high,,2026-05-07 07:51:06.929000
AWD-459f404e33d5,OPP-d985924366fe,Recuriting teachers from China to teach the Chinese language in public schools in the Kingdom (Phase Two),albelad,وزارة التعليم,م. حسن الزهراني,Human Capital Solutions,,invalid_format,120000000,Won,2,parsed,high,,2026-05-07 07:51:06.929000
AWD-6f81069dafa2,OPP-0f8ab265760a,Project to recruit female teachers to teach culture and arts subjects,albelad,وزارة التعليم,م. حسن الزهراني,Human Capital Solutions,,invalid_format,33000000,Won,3,parsed,high,,2026-05-07 07:51:06.929000
AWD-ff380ccca04e,OPP-e1062f5f7265,Operating the Prince Sultan Center for Special Education,no,وزارة التعليم,أ. تركي القرشي,Operation of Special Education Centres,,invalid_format,291000000,Won,4,parsed,high,,2026-05-07 07:51:06.929000
AWD-5370dcc89476,OPP-a685cc900d66,Hemmah Al-Qassim Centre for Special Education,no,وزارة التعليم,أ. تركي القرشي,Operation of Special Education Centres,,invalid_format,55600000,Won,5,parsed,high,,2026-05-07 07:51:06.929000
AWD-46f537fd3cd3,OPP-ae8e1bfc239a,Hemmah Al-Khobar Center for Special Education,no,وزارة التعليم,أ. تركي القرشي,Operation of Special Education Centres,,invalid_format,55600000,Won,6,parsed,high,,2026-05-07 07:51:06.929000
AWD-b6a12405819b,OPP-7ee99cb13160,Study on establishing specialised autism centres,no,وزارة التعليم,أ. تركي القرشي,Operation of Special Education Centres,,invalid_format,5000000,Won,7,parsed,high,,2026-05-07 07:51:06.929000
AWD-8e5510e7aa30,OPP-dac407ac940e,Comprehensive Learning Journey for Students with Disabilities,,تيتكو,أ. سعد الأسمري,Professional Development,,invalid_format,3196908,Won,8,parsed,high,,2026-05-07 07:51:06.929000
AWD-f77eb32719e6,OPP-bb1e134129fd,Neighborhood Clubs,Delta + Deloitte,وزارة التعليم,م. عبدالله السبعاني,Students Activities,,invalid_format,181000000,Won,9,parsed,high,,2026-05-07 07:51:06.929000
AWD-31151d7dfc3a,OPP-b9b3048dd3bd,Professional Development Programme Initiative for Teachers and School Leaders,Yes,,,Education,,invalid_format,45809,Won,10,parsed,high,,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_loss_reasons" cascade;
create table raw_demo."talemia_loss_reasons" (
  "loss_id" text,
  "opportunity_id" text,
  "opportunity_name_en" text,
  "opportunity_name_ar" text,
  "client_name" text,
  "account_manager_name" text,
  "business_line_name" text,
  "loss_date" text,
  "loss_date_parse_status" text,
  "contract_value" text,
  "loss_reason" text,
  "loss_category" text,
  "competitor" text,
  "source_sheet" text,
  "source_row_number" text,
  "parse_status" text,
  "match_confidence" text,
  "parser_warning" text,
  "loaded_at" text
);

copy raw_demo."talemia_loss_reasons" ("loss_id", "opportunity_id", "opportunity_name_en", "opportunity_name_ar", "client_name", "account_manager_name", "business_line_name", "loss_date", "loss_date_parse_status", "contract_value", "loss_reason", "loss_category", "competitor", "source_sheet", "source_row_number", "parse_status", "match_confidence", "parser_warning", "loaded_at") from stdin with (format csv, header true);
loss_id,opportunity_id,opportunity_name_en,opportunity_name_ar,client_name,account_manager_name,business_line_name,loss_date,loss_date_parse_status,contract_value,loss_reason,loss_category,competitor,source_sheet,source_row_number,parse_status,match_confidence,parser_warning,loaded_at
LOSS-0c3269b56cdb,OPP-faf73d59decf,Competition for Qualifying Kindergarten Teachers (Curricula + Asynchronous Training),TBD,وزارة الثقافة,أ. سعد الأسمري,Professional Development,,source_blank,23832148,,,,Lose,1,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
LOSS-124ddff1654d,OPP-dc3a8a6b8388,Operation of E-learning and Distance Education at Imam Muhammad bin Saud University,TETCO,جامعة الإمام والرفع عن طريق تيتكو,د. ناصر العويشق,Content and Curriculum Development,,source_blank,30204000,,,,Lose,2,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
LOSS-d51560dcffc7,OPP-8c5d33601662,Production of 140 electronic training products at the Institute of Public Administration,TETCO,معهد الإدارة العامة,د. ناصر العويشق,Content and Curriculum Development,,source_blank,10769902,,,,Lose,3,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
LOSS-2d2d1e857bb6,OPP-fde80be31113,Awareness and Cultural Change Programme for Parents – (Ministry of Education),,وزارة التعليم,م. عبدالله السبعاني,Students Activities,,source_blank,12000000,,,,Lose,4,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
LOSS-219e73d11bbb,OPP-d616dcf3ca29,Media Campaigns for the Initiative to Develop the Student Code of Conduct and Mechanisms for Its Implementation,,وزارة التعليم,م. عبدالله السبعاني,Students Activities,,source_blank,3000000,,,,Lose,5,parsed,high,loss_reason_not_found; competitor_not_found,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_opportunity_updates_long" cascade;
create table raw_demo."talemia_opportunity_updates_long" (
  "update_id" text,
  "opportunity_id" text,
  "opportunity_name_en" text,
  "opportunity_name_ar" text,
  "client_name" text,
  "week_number" text,
  "week_label" text,
  "week_period" text,
  "update_date" text,
  "update_text" text,
  "update_language" text,
  "operational_signal" text,
  "risk_flag" text,
  "match_confidence" text,
  "parser_warning" text,
  "source_sheet" text,
  "source_row_number" text,
  "loaded_at" text
);

copy raw_demo."talemia_opportunity_updates_long" ("update_id", "opportunity_id", "opportunity_name_en", "opportunity_name_ar", "client_name", "week_number", "week_label", "week_period", "update_date", "update_text", "update_language", "operational_signal", "risk_flag", "match_confidence", "parser_warning", "source_sheet", "source_row_number", "loaded_at") from stdin with (format csv, header true);
update_id,opportunity_id,opportunity_name_en,opportunity_name_ar,client_name,week_number,week_label,week_period,update_date,update_text,update_language,operational_signal,risk_flag,match_confidence,parser_warning,source_sheet,source_row_number,loaded_at
\.


drop table if exists raw_demo."talemia_clients" cascade;
create table raw_demo."talemia_clients" (
  "client_name" text,
  "client_id" text,
  "client_type" text,
  "sector" text,
  "country" text,
  "is_moe_related" text,
  "active_flag" text,
  "loaded_at" text
);

copy raw_demo."talemia_clients" ("client_name", "client_id", "client_type", "sector", "country", "is_moe_related", "active_flag", "loaded_at") from stdin with (format csv, header true);
client_name,client_id,client_type,sector,country,is_moe_related,active_flag,loaded_at
تيتكو,CLI-0001,,,,False,True,2026-05-07 07:51:06.929000
جامعة الإمام والرفع عن طريق تيتكو,CLI-0002,,,,False,True,2026-05-07 07:51:06.929000
معهد الإدارة العامة,CLI-0003,,,,False,True,2026-05-07 07:51:06.929000
وزارة التعليم,CLI-0004,,,,True,True,2026-05-07 07:51:06.929000
وزارة الثقافة,CLI-0005,,,,False,True,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_client_departments" cascade;
create table raw_demo."talemia_client_departments" (
  "client_name" text,
  "client_department" text,
  "client_department_id" text,
  "loaded_at" text
);

copy raw_demo."talemia_client_departments" ("client_name", "client_department", "client_department_id", "loaded_at") from stdin with (format csv, header true);
client_name,client_department,client_department_id,loaded_at
تيتكو,TETCO to MoE,DEP-0001,2026-05-07 07:51:06.929000
جامعة الإمام والرفع عن طريق تيتكو,Imam University and Submission via TETCO,DEP-0002,2026-05-07 07:51:06.929000
معهد الإدارة العامة,Institute of Public Administration,DEP-0003,2026-05-07 07:51:06.929000
وزارة التعليم,General department of students with special needs,DEP-0004,2026-05-07 07:51:06.929000
وزارة التعليم,Human Resources Department,DEP-0005,2026-05-07 07:51:06.929000
وزارة التعليم,Human resourse Department,DEP-0006,2026-05-07 07:51:06.929000
وزارة التعليم,Student guidance Department,DEP-0007,2026-05-07 07:51:06.929000
وزارة التعليم,Student ِActivity Department,DEP-0008,2026-05-07 07:51:06.929000
وزارة الثقافة,Professional Development Department / Cultural Programs Department,DEP-0009,2026-05-07 07:51:06.929000
,Ministry of Education,DEP-0010,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_account_managers" cascade;
create table raw_demo."talemia_account_managers" (
  "account_manager_name" text,
  "account_manager_id" text,
  "department" text,
  "active_flag" text,
  "loaded_at" text
);

copy raw_demo."talemia_account_managers" ("account_manager_name", "account_manager_id", "department", "active_flag", "loaded_at") from stdin with (format csv, header true);
account_manager_name,account_manager_id,department,active_flag,loaded_at
,AM-0001,Business Development,True,2026-05-07 07:51:06.929000
أ. تركي القرشي,AM-0002,Business Development,True,2026-05-07 07:51:06.929000
أ. سعد الأسمري,AM-0003,Business Development,True,2026-05-07 07:51:06.929000
د. ناصر العويشق,AM-0004,Business Development,True,2026-05-07 07:51:06.929000
م. حسن الزهراني,AM-0005,Business Development,True,2026-05-07 07:51:06.929000
م. عبدالله السبعاني,AM-0006,Business Development,True,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_business_lines" cascade;
create table raw_demo."talemia_business_lines" (
  "business_line_name" text,
  "business_line_id" text,
  "description" text,
  "loaded_at" text
);

copy raw_demo."talemia_business_lines" ("business_line_name", "business_line_id", "description", "loaded_at") from stdin with (format csv, header true);
business_line_name,business_line_id,description,loaded_at
Content and Curriculum Development,BL-0001,,2026-05-07 07:51:06.929000
Education,BL-0002,,2026-05-07 07:51:06.929000
Human Capital Solutions,BL-0003,,2026-05-07 07:51:06.929000
Operation of Special Education Centres,BL-0004,,2026-05-07 07:51:06.929000
Professional Development,BL-0005,,2026-05-07 07:51:06.929000
Students Activities,BL-0006,,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_opportunity_stage" cascade;
create table raw_demo."talemia_opportunity_stage" (
  "stage_name" text,
  "stage_order" text,
  "stage_id" text,
  "is_closed" text,
  "is_won" text,
  "is_lost" text,
  "loaded_at" text
);

copy raw_demo."talemia_opportunity_stage" ("stage_name", "stage_order", "stage_id", "is_closed", "is_won", "is_lost", "loaded_at") from stdin with (format csv, header true);
stage_name,stage_order,stage_id,is_closed,is_won,is_lost,loaded_at
Awarded,9,STG-001,True,True,False,2026-05-07 07:51:06.929000
Lost,99,STG-002,True,False,True,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_workflow_state" cascade;
create table raw_demo."talemia_workflow_state" (
  "workflow_state" text,
  "workflow_state_id" text,
  "loaded_at" text
);

copy raw_demo."talemia_workflow_state" ("workflow_state", "workflow_state_id", "loaded_at") from stdin with (format csv, header true);
workflow_state,workflow_state_id,loaded_at
Awarded,WF-001,2026-05-07 07:51:06.929000
Lost,WF-002,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_risk_classification" cascade;
create table raw_demo."talemia_risk_classification" (
  "winning_likelihood" text,
  "risk_classification_id" text,
  "risk_order" text,
  "loaded_at" text
);

copy raw_demo."talemia_risk_classification" ("winning_likelihood", "risk_classification_id", "risk_order", "loaded_at") from stdin with (format csv, header true);
winning_likelihood,risk_classification_id,risk_order,loaded_at
High,RISK-001,1,2026-05-07 07:51:06.929000
Low,RISK-002,3,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_sector_type" cascade;
create table raw_demo."talemia_sector_type" (
  "sector_type" text,
  "sector_type_id" text,
  "loaded_at" text
);

copy raw_demo."talemia_sector_type" ("sector_type", "sector_type_id", "loaded_at") from stdin with (format csv, header true);
sector_type,sector_type_id,loaded_at
MoE+,SEC-001,2026-05-07 07:51:06.929000
Non-MoE,SEC-002,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_business_terms" cascade;
create table raw_demo."talemia_business_terms" (
  "term_id" text,
  "term_name" text,
  "term_definition" text,
  "source_sheet" text,
  "source_row_number" text,
  "parse_status" text,
  "match_confidence" text,
  "parser_warning" text,
  "loaded_at" text
);

copy raw_demo."talemia_business_terms" ("term_id", "term_name", "term_definition", "source_sheet", "source_row_number", "parse_status", "match_confidence", "parser_warning", "loaded_at") from stdin with (format csv, header true);
term_id,term_name,term_definition,source_sheet,source_row_number,parse_status,match_confidence,parser_warning,loaded_at
TERM-0001,Opportunity Name,The official title or description of the project,3. Definition,1,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0002,Client Name,The name of the organisation or entity that is the potential customer for the opportunity.,3. Definition,2,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0003,Source of Opportunity,"The origin or channel through which the opportunity was identified (e.g., BD Team, Holding, Group Companies, Direct Contact).",3. Definition,3,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0004,Client Department,,3. Definition,4,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0005,Horizon,"The Three Horizons strategic framework is used to categorise and group opportunities across three horizons, balancing short-term gains with long-term innovation and strategic growth.",3. Definition,5,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0006,Priority,"The level of importance or urgency assigned to the opportunity (e.g., High, Medium, Low).",3. Definition,6,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0007,Sector,The industry or market segment to which the opportunity belongs,3. Definition,7,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0008,Business Line,The specific division within the organisation responsible for the opportunity.,3. Definition,8,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0009,Business Line Owner,The individual accountable for the business line related to the opportunity.,3. Definition,9,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0010,Sub-Services,"A more detailed categorisation of the service provided within the broader service category, specifying the exact nature or focus of the work.",3. Definition,10,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0011,BD Owner,The Business Development professional responsible for managing and progressing the opportunity.,3. Definition,11,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0012,Current vs New Client,"Indicates whether the opportunity is with an existing client (""Current"") or a prospective new client (""New"").",3. Definition,12,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0013,Go / No-Go,"A decision status indicating whether to proceed (""Go""), not proceed (""No-Go""), or if the decision is still pending.",3. Definition,13,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0014,Period (Years),"The expected duration or contract length of the opportunity, expressed in years.",3. Definition,14,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0015,Opportunity Stage,"The current phase of the opportunity within the sales or commercial lifecycle (e.g., BD strategy & Planning, Market Engagement, Qualification & Bid, Delivery & Fulfilment, Performance Monitoring & Relationship Management).",3. Definition,15,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0016,CheckPoint,"Specific milestones or review points within or between gates where particular deliverables, assessments, or client interactions occur.",3. Definition,16,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0017,Expected Award Date,The anticipated date when the opportunity is expected to be won or contract awarded.,3. Definition,17,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0018,Submission Date,The date on which the proposal or bid was formally submitted to the client.,3. Definition,18,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0019,Contract Value,The financial value or income of the opportunity if won.,3. Definition,19,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0020,Winning Likelihood,"The assessed probability or chance of successfully securing the opportunity, expressed as a percentage.",3. Definition,20,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0021,Win/Lose,"The final outcome status of the opportunity, indicating whether it was won or lost.",3. Definition,21,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0022,Weekly Update,"A brief summary or note on the latest progress or developments related to the opportunity, updated weekly.",3. Definition,22,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0023,Clarifications,The Reason of loss opportunities,3. Definition,23,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0024,Update Date,The date when the most recent update or status change was recorded.,3. Definition,24,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0025,Tier,Priority based on opportunity complexity and impact.,3. Definition,25,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0026,Gate,"Gates are formal decision points at key stages of the project life cycle—Pre-Initiation, Initiation, Planning, Execution, and Closing—where project progress is reviewed and approval is required to move to the next phase",3. Definition,26,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0027,Qualified Pipeline,Sales opportunities with a high likelihood of winning.,3. Definition,27,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0028,% of 'Go' Opportunities,The percentage of opportunities or projects in the pipeline that have received approval to proceed to the next stage or have been given a positive go-ahead decision at a gate.,3. Definition,28,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0029,Sales Cycle (Days),"The average duration, measured in days, from the initial identification of an opportunity to its closure (win or loss).",3. Definition,29,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0030,Customer Engagement,The level and quality of interaction and communication with the customer throughout the pipeline stages,3. Definition,30,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0031,Escalations,The act of reporting or raising important issues or risks,3. Definition,31,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0032,Pipeline Forecast Per Business Line,States that if an opportunity is in pipeline or active,3. Definition,32,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0033,Deal Type,,3. Definition,33,parsed,medium,,2026-05-07 07:51:06.929000
TERM-0034,Coverted Value 2026,the value of contract over each year,3. Definition,34,parsed,medium,,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_dashboard_targets" cascade;
create table raw_demo."talemia_dashboard_targets" (
  "dashboard_name" text,
  "kpi_name" text,
  "filter_context" text,
  "visible_value" text,
  "source_screenshot" text,
  "parse_status" text,
  "match_confidence" text,
  "parser_warning" text,
  "loaded_at" text
);

copy raw_demo."talemia_dashboard_targets" ("dashboard_name", "kpi_name", "filter_context", "visible_value", "source_screenshot", "parse_status", "match_confidence", "parser_warning", "loaded_at") from stdin with (format csv, header true);
dashboard_name,kpi_name,filter_context,visible_value,source_screenshot,parse_status,match_confidence,parser_warning,loaded_at
BD Executive Dashboard,YTD Opportunities,Year=2025,39,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
BD Executive Dashboard,Pipeline Opportunities,Year=2025,35,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
BD Executive Dashboard,Pipeline Value,Year=2025,14.5bn,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
BD Executive Dashboard,Qualified Pipeline,Year=2025,13.4bn,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
BD Executive Dashboard,Hit Rate,Year=2025,92%,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
Account Manager Dashboard,Account Managers,All,8,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
Account Manager Dashboard,Total Clients Managed,All,12,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
Commercial Dashboard,Average Sales Cycle Days,All,9,target_pdf_or_screenshot,manual_target_seed,low,dashboard_target_requires_reconciliation,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_field_mapping_report" cascade;
create table raw_demo."talemia_field_mapping_report" (
  "target_table" text,
  "target_column" text,
  "source_sheet" text,
  "source_column_detected" text,
  "mapping_method" text,
  "confidence" text,
  "notes" text
);

copy raw_demo."talemia_field_mapping_report" ("target_table", "target_column", "source_sheet", "source_column_detected", "mapping_method", "confidence", "notes") from stdin with (format csv, header true);
target_table,target_column,source_sheet,source_column_detected,mapping_method,confidence,notes
raw_demo.talemia_opportunities,opportunity_name_en,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,opportunity_name_ar,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,client_name,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,client_department,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,account_manager_name,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,business_line_name,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,opportunity_stage,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,workflow_state,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,contract_value,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,qualified_sales,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,converted_value_2026,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,win_probability,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,winning_likelihood,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,created_date,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,submission_date,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,expected_award_date,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,close_date,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,deal_type,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,priority,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,source_name,1. Main Page,,regex_column_detection,low,
raw_demo.talemia_opportunities,notes,1. Main Page,,regex_column_detection,low,
\.


drop table if exists raw_demo."extraction_quality_report" cascade;
create table raw_demo."extraction_quality_report" (
  "check_name" text,
  "check_value" text,
  "severity" text,
  "extracted_at" text
);

copy raw_demo."extraction_quality_report" ("check_name", "check_value", "severity", "extracted_at") from stdin with (format csv, header true);
check_name,check_value,severity,extracted_at
opportunities_total,15,info,2026-05-07 07:51:06.929000
active_pipeline_rows_count,0,info,2026-05-07 07:51:06.929000
awarded_rows_count,10,info,2026-05-07 07:51:06.929000
lost_rows_count,5,info,2026-05-07 07:51:06.929000
missing_stage_count,0,warning,2026-05-07 07:51:06.929000
invalid_business_line_count,0,error,2026-05-07 07:51:06.929000
missing_expected_award_date_count,15,warning,2026-05-07 07:51:06.929000
parsed_expected_award_date_count,0,info,2026-05-07 07:51:06.929000
weekly_updates_count,0,info,2026-05-07 07:51:06.929000
weekly_updates_missing_opportunity_name_count,0,warning,2026-05-07 07:51:06.929000
weekly_updates_unmatched_count,0,warning,2026-05-07 07:51:06.929000
loss_reason_populated_count,0,info,2026-05-07 07:51:06.929000
competitor_populated_count,0,info,2026-05-07 07:51:06.929000
duplicate_opportunity_ids_count,0,error,2026-05-07 07:51:06.929000
missing_client_name_count,1,warning,2026-05-07 07:51:06.929000
missing_contract_value_count,0,warning,2026-05-07 07:51:06.929000
missing_account_manager_count,0,warning,2026-05-07 07:51:06.929000
missing_business_line_count,0,warning,2026-05-07 07:51:06.929000
\.


drop table if exists raw_demo."talemia_load_summary" cascade;
create table raw_demo."talemia_load_summary" (
  "raw_table" text,
  "rows" text,
  "columns" text,
  "extracted_at" text
);

copy raw_demo."talemia_load_summary" ("raw_table", "rows", "columns", "extracted_at") from stdin with (format csv, header true);
raw_table,rows,columns,extracted_at
raw_demo.talemia_opportunities,15,43,2026-05-07 07:51:06.929000
raw_demo.talemia_opportunity_identity_bridge,15,10,2026-05-07 07:51:06.929000
raw_demo.talemia_awards,10,16,2026-05-07 07:51:06.929000
raw_demo.talemia_loss_reasons,5,19,2026-05-07 07:51:06.929000
raw_demo.talemia_opportunity_updates_long,0,18,2026-05-07 07:51:06.929000
raw_demo.talemia_clients,5,8,2026-05-07 07:51:06.929000
raw_demo.talemia_client_departments,10,4,2026-05-07 07:51:06.929000
raw_demo.talemia_account_managers,6,5,2026-05-07 07:51:06.929000
raw_demo.talemia_business_lines,6,4,2026-05-07 07:51:06.929000
raw_demo.talemia_opportunity_stage,2,7,2026-05-07 07:51:06.929000
raw_demo.talemia_workflow_state,2,3,2026-05-07 07:51:06.929000
raw_demo.talemia_risk_classification,2,4,2026-05-07 07:51:06.929000
raw_demo.talemia_sector_type,2,3,2026-05-07 07:51:06.929000
raw_demo.talemia_deal_type,0,3,2026-05-07 07:51:06.929000
raw_demo.talemia_business_terms,34,9,2026-05-07 07:51:06.929000
raw_demo.talemia_dashboard_targets,8,9,2026-05-07 07:51:06.929000
raw_demo.talemia_field_mapping_report,21,7,2026-05-07 07:51:06.929000
raw_demo.extraction_quality_report,18,4,2026-05-07 07:51:06.929000
\.
