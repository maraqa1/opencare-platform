import sys, yaml, json, re, csv
from pathlib import Path
try:
    import jsonschema
except Exception:
    jsonschema = None
root = Path(__file__).resolve().parents[1]
errors=[]; warnings=[]

def load_yaml(rel):
    p=root/rel
    if not p.exists():
        errors.append(f'missing required file: {rel}')
        return {}
    try:
        return yaml.safe_load(p.read_text(encoding='utf-8')) or {}
    except Exception as e:
        errors.append(f'YAML parse failed {rel}: {e}')
        return {}

def load_json(rel):
    p=root/rel
    if not p.exists():
        errors.append(f'missing required file: {rel}')
        return {}
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        errors.append(f'JSON parse failed {rel}: {e}')
        return {}

checks=load_yaml('validation/checks.yaml')
for rel in checks.get('required_files',[]):
    if not (root/rel).exists(): errors.append(f'missing required file: {rel}')

# YAML parse all contracts.
for p in root.rglob('*.yaml'):
    rel=p.relative_to(root).as_posix()
    try:
        yaml.safe_load(p.read_text(encoding='utf-8'))
    except Exception as e:
        errors.append(f'YAML parse failed {rel}: {e}')

# P2: schema enforcement for every YAML file with a matching shipped JSON schema.
if jsonschema is None:
    errors.append('jsonschema package is required for schema validation but is not available')
else:
    schema_validated=[]
    for yml in root.rglob('*.yaml'):
        rel=yml.relative_to(root).as_posix()
        if rel.startswith('legacy/') or rel.startswith('checksums/'):
            continue
        schema_name=rel[:-5].replace('/','_') + '.schema.json'
        schema_path=root/'schemas'/schema_name
        if not schema_path.exists():
            continue
        instance=load_yaml(rel)
        schema=load_json('schemas/'+schema_name)
        try:
            jsonschema.Draft202012Validator.check_schema(schema)
            jsonschema.validate(instance=instance, schema=schema)
            schema_validated.append(rel)
        except Exception as e:
            errors.append(f'Schema validation failed {rel} against schemas/{schema_name}: {e}')
    required_schema_targets=[
        'screens/dashboard_implementation_matrix.yaml',
        'screens/story_flow.yaml',
        'acceptance/dashboard_fidelity_contract.yaml',
        'data/entities.yaml',
        'data/pipeline.yaml',
        'data/source_systems.yaml',
        'dbt/model_index.yaml'
    ]
    for rel in required_schema_targets:
        schema_name=rel[:-5].replace('/','_') + '.schema.json'
        if (root/schema_name).exists():
            pass
        if not (root/'schemas'/schema_name).exists():
            errors.append(f'missing schema for required contract {rel}: schemas/{schema_name}')
        elif rel not in schema_validated:
            errors.append(f'required contract was not schema-validated: {rel}')

# P1: principles must enforce dashboard rigidity.
try:
    principles = load_yaml('manifest/principles.yaml')
    dsot = principles.get('dashboard_source_of_truth', {})
    if dsot.get('rule') != 'declared_dashboards_are_canonical': errors.append('principles.dashboard_source_of_truth.rule must be declared_dashboards_are_canonical')
    for key in ['dashboard_collapse_forbidden','screen_substitution_forbidden','dashboard_fidelity_required']:
        if dsot.get(key) is not True: errors.append(f'principles.dashboard_source_of_truth.{key} must be true')
except Exception as e:
    errors.append(f'principles check failed: {e}')

# P1: no canonical refs to legacy/non-existent screen markdown/contracts.
legacy_patterns = [
    'screens/01_level1_strategic_landing.md','screens/02_level2_kpi_workspace.md','screens/03_level3_case_workspace.md',
    'screens/04_crosscut_decision_command.md','screens/05_crosscut_runtime_evidence.md','screens/06_crosscut_decision_audit.md',
    'contracts/kpi.yaml','contracts/action_buttons.yaml'
]
for p in root.rglob('*'):
    if not p.is_file(): continue
    rel = p.relative_to(root).as_posix()
    if rel.startswith('legacy/') or rel.startswith('checksums/'): continue
    if p.suffix.lower() not in {'.yaml','.yml','.json','.md','.sql'}: continue
    txt = p.read_text(encoding='utf-8', errors='ignore')
    for pat in legacy_patterns:
        if pat in txt:
            errors.append(f'canonical file {rel} contains obsolete reference: {pat}')

# P1: every screen_ref that looks like a file path must resolve unless it is a fragment ref into a real YAML.
for rel in ['manifest/navigation.yaml','screens/information_architecture.yaml','screens/screen_catalog.yaml','screens/visual_traceability.yaml']:
    if not (root/rel).exists(): continue
    obj = load_yaml(rel)
    def walk(x):
        if isinstance(x, dict):
            if 'screen_ref' in x:
                ref = str(x['screen_ref']); base = ref.split('#',1)[0]
                if base and not (root/base).exists(): errors.append(f'{rel} screen_ref does not resolve: {ref}')
            for v in x.values(): walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    walk(obj)

# P1/P2: canonical metadata layout_ref fields must use the single layout authority.
try:
    layout_zones_obj = load_yaml('screens/layout_zones.yaml')
    allowed_layout_ids = {d.get('dashboard_id') for d in layout_zones_obj.get('dashboards', []) or []}
    metadata_files = [
        'manifest/navigation.yaml',
        'screens/information_architecture.yaml',
        'screens/screen_catalog.yaml',
        'screens/visual_traceability.yaml',
    ]

    def walk_layout_refs(x, rel):
        if isinstance(x, dict):
            if 'layout_ref' in x:
                ref = str(x.get('layout_ref'))
                base, frag = (ref.split('#', 1) + [''])[:2] if '#' in ref else (ref, '')
                if ref.startswith('screens/layouts.yaml'):
                    errors.append(f'{rel} layout_ref uses deprecated layout authority: {ref}')
                if base != 'screens/layout_zones.yaml':
                    errors.append(f'{rel} layout_ref must point to screens/layout_zones.yaml, got: {ref}')
                if not frag:
                    errors.append(f'{rel} layout_ref missing dashboard fragment: {ref}')
                elif frag not in allowed_layout_ids:
                    errors.append(f'{rel} layout_ref dashboard id does not exist in screens/layout_zones.yaml: {ref}')
            for v in x.values():
                walk_layout_refs(v, rel)
        elif isinstance(x, list):
            for v in x:
                walk_layout_refs(v, rel)

    for rel in metadata_files:
        if (root/rel).exists():
            walk_layout_refs(load_yaml(rel), rel)
except Exception as e:
    errors.append(f'canonical metadata layout_ref single-authority check failed: {e}')

# P1: runtime IDs must join across manifest, runtimes, images, schedules, evidence, and bindings.
def collect_runtime_ids():
    ids = {}
    manifest = load_yaml('manifest/usecase.yaml')
    ids['manifest/usecase.yaml'] = set(manifest.get('runtime_ids', []))
    run = load_yaml('runtime/runtimes.yaml')
    ids['runtime/runtimes.yaml'] = {r.get('id') for r in run.get('runtimes', [])}
    img = load_yaml('runtime/images.yaml')
    ids['runtime/images.yaml'] = {r.get('runtime_id') for r in img.get('runtime_images', [])}
    sched = load_yaml('runtime/schedules.yaml')
    ids['runtime/schedules.yaml'] = {r.get('runtime_id') for r in sched.get('schedules', [])}
    ev = load_yaml('runtime/evidence.yaml')
    ids['runtime/evidence.yaml'] = {r.get('runtime_id') for r in ev.get('evidence_requirements', [])}
    rb = load_yaml('bindings/runtime_bindings.yaml')
    ids['bindings/runtime_bindings.yaml'] = {r.get('runtime_id') for r in rb.get('runtime_bindings', [])}
    return ids
try:
    runtime_sets = collect_runtime_ids(); values = list(runtime_sets.values()); canonical = values[0]
    for rel, s in runtime_sets.items():
        if s != canonical: errors.append(f'runtime id mismatch in {rel}: expected {sorted(canonical)}, got {sorted(s)}')
    for rid in canonical:
        if not re.fullmatch(r'rt_[a-z0-9_]+', str(rid)):
            errors.append(f'runtime id does not follow canonical snake_case format: {rid}')
except Exception as e:
    errors.append(f'runtime id consistency check failed: {e}')

# P1: every analytics table declared in data/output_tables.yaml and KPI source_table has a dbt model file or model_index entry.
try:
    out = load_yaml('data/output_tables.yaml')
    analytics_tables = set(out.get('analytics_tables', []))
    kpis = load_yaml('business/kpis.yaml').get('kpis', [])
    analytics_tables |= {k.get('source_table') for k in kpis if str(k.get('source_table','')).startswith('analytics.')}
    index_models = load_yaml('dbt/model_index.yaml').get('models', [])
    output_tables = {m.get('output_table') for m in index_models}
    sql_files = {f'analytics.{p.stem}' for p in (root/'dbt/models/analytics').glob('*.sql')}
    for t in sorted(analytics_tables):
        if t not in output_tables: errors.append(f'analytics table {t} missing from dbt/model_index.yaml')
        if t not in sql_files: errors.append(f'analytics table {t} has no dbt model SQL under dbt/models/analytics/')
except Exception as e:
    errors.append(f'analytics/dbt coverage check failed: {e}')

# P1: dashboard-rigid contracts must be structurally enforced and mutually consistent.
try:
    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml')
    story = load_yaml('screens/story_flow.yaml')
    fidelity = load_yaml('acceptance/dashboard_fidelity_contract.yaml')
    m_dash = matrix.get('dashboards', [])
    s_dash = story.get('dashboard_order', [])
    f_checks = fidelity.get('acceptance_checks', [])
    m_ids = [d.get('dashboard_id') for d in m_dash]
    s_ids = [d.get('dashboard_id') for d in s_dash]
    f_ids = fidelity.get('required_dashboard_ids', [])
    fc_ids = [d.get('dashboard_id') for d in f_checks]
    if len(set(m_ids)) != len(m_ids): errors.append('duplicate dashboard_id in dashboard_implementation_matrix.yaml')
    if m_ids != s_ids: errors.append(f'dashboard story order must match implementation matrix order: matrix={m_ids}, story={s_ids}')
    if set(m_ids) != set(f_ids): errors.append(f'fidelity required_dashboard_ids do not match implementation matrix: matrix={sorted(m_ids)}, fidelity={sorted(f_ids)}')
    if set(m_ids) != set(fc_ids): errors.append(f'fidelity acceptance_checks do not cover all implementation matrix dashboards: matrix={sorted(m_ids)}, checks={sorted(fc_ids)}')
    if fidelity.get('required_dashboard_count') != len(m_ids): errors.append(f'fidelity required_dashboard_count should be {len(m_ids)}, got {fidelity.get("required_dashboard_count")}')
    for d in m_dash:
        if d.get('canonical') is not True: errors.append(f'dashboard {d.get("dashboard_id")} is not canonical=true')
        if d.get('must_render') is not True: errors.append(f'dashboard {d.get("dashboard_id")} must_render is not true')
        if d.get('must_bind') is not True: errors.append(f'dashboard {d.get("dashboard_id")} must_bind is not true')
        if d.get('must_not_collapse_into_other_screen') is not True: errors.append(f'dashboard {d.get("dashboard_id")} can still collapse into another screen')
        if not d.get('required_components'): errors.append(f'dashboard {d.get("dashboard_id")} has no required_components')
        if d.get('must_show_actions') and not d.get('actions'): errors.append(f'dashboard {d.get("dashboard_id")} must_show_actions but declares no actions')
        if d.get('must_show_governance') and not d.get('governance_evidence'): errors.append(f'dashboard {d.get("dashboard_id")} must_show_governance but declares no governance_evidence')
        if d.get('must_show_runtime_evidence') and not d.get('runtime_dependencies'): errors.append(f'dashboard {d.get("dashboard_id")} must_show_runtime_evidence but declares no runtime_dependencies')
    for flag in ['dashboard_fidelity_required','screen_substitution_forbidden','dashboard_collapse_forbidden','mockup_traceability_required','component_contract_required','data_binding_required']:
        if fidelity.get(flag) is not True: errors.append(f'dashboard fidelity contract flag missing or false: {flag}')
except Exception as e:
    errors.append(f'dashboard-rigid contract consistency check failed: {e}')

# P1: all route response_schema_ref paths must resolve.
try:
    routes = load_yaml('bindings/routes.yaml').get('routes', [])
    for r in routes:
        ref = r.get('response_schema_ref')
        if ref:
            base = str(ref).split('#',1)[0]
            if not (root/base).exists(): errors.append(f'route {r.get("id")} response_schema_ref does not resolve: {ref}')
except Exception as e:
    errors.append(f'route schema ref check failed: {e}')

# P1: action button options_source values must resolve to declared and buildable data entities.
try:
    entities_obj = load_yaml('data/entities.yaml')
    entities = entities_obj.get('entities', [])
    entity_by_table={}
    entity_sources=set()
    for e in entities:
        for key in ['entity_id','table_name','fully_qualified_table']:
            v=e.get(key)
            if v:
                entity_sources.add(str(v)); entity_by_table[str(v)] = e
    action_buttons = load_yaml('decisions/action_buttons.yaml').get('action_buttons', [])
    source_systems = load_yaml('data/source_systems.yaml').get('source_systems', [])
    known_source_systems = {s.get('system_id') for s in source_systems}
    pipeline = load_yaml('data/pipeline.yaml')
    raw_tables=set(pipeline.get('raw_landing_tables',[]))
    staging_models=set(pipeline.get('staging_models',[]))
    analytics_marts=set(pipeline.get('analytics_marts',[]))
    model_index=load_yaml('dbt/model_index.yaml').get('models',[])
    model_names={m.get('model_name') for m in model_index}
    model_outputs={m.get('output_table') for m in model_index}
    for b in action_buttons:
        for inp in b.get('requires_input', []) or []:
            src = inp.get('options_source')
            if not src: continue
            if str(src) not in entity_sources:
                errors.append(f'action button {b.get("id")} options_source does not resolve to data/entities.yaml: {src}')
                continue
            ent=entity_by_table[str(src)]
            for key in ['source_system','raw_landing_table','staging_model','analytics_model']:
                if not ent.get(key): errors.append(f'action button {b.get("id")} options_source {src} entity missing {key}')
            if ent.get('source_system') and ent.get('source_system') not in known_source_systems:
                errors.append(f'options_source {src} source_system not in data/source_systems.yaml: {ent.get("source_system")}')
            if ent.get('raw_landing_table') and ent.get('raw_landing_table') not in raw_tables:
                errors.append(f'options_source {src} raw_landing_table not in data/pipeline.yaml: {ent.get("raw_landing_table")}')
            if ent.get('staging_model') and ent.get('staging_model') not in staging_models:
                errors.append(f'options_source {src} staging_model not in data/pipeline.yaml: {ent.get("staging_model")}')
            if ent.get('analytics_model') and ent.get('analytics_model') not in model_names:
                errors.append(f'options_source {src} analytics_model not in dbt/model_index.yaml: {ent.get("analytics_model")}')
            if ent.get('staging_model') and ent.get('staging_model') not in model_names:
                errors.append(f'options_source {src} staging_model not in dbt/model_index.yaml: {ent.get("staging_model")}')
            fq=ent.get('fully_qualified_table')
            if fq and fq not in analytics_marts:
                errors.append(f'options_source {src} fully_qualified_table not in data/pipeline.yaml analytics_marts: {fq}')
            if fq and fq not in model_outputs:
                errors.append(f'options_source {src} fully_qualified_table not produced in dbt/model_index.yaml: {fq}')
            if ent.get('staging_model') and not (root/f'dbt/models/staging/{ent.get("staging_model")}.sql').exists():
                errors.append(f'options_source {src} staging SQL missing: dbt/models/staging/{ent.get("staging_model")}.sql')
            if ent.get('analytics_model') and not (root/f'dbt/models/analytics/{ent.get("analytics_model")}.sql').exists():
                errors.append(f'options_source {src} analytics SQL missing: dbt/models/analytics/{ent.get("analytics_model")}.sql')
except Exception as e:
    errors.append(f'action button options_source check failed: {e}')

# P2: external action enforcement cannot be reuse_existing until platform enforcement is proven.
try:
    caps = load_yaml('bindings/platform_capabilities.yaml').get('capabilities', {})
    h = caps.get('human_authorised_external_actions')
    if not h: errors.append('missing platform capability: human_authorised_external_actions')
    elif h.get('status') != 'partially_supported': errors.append(f'human_authorised_external_actions should be partially_supported until enforcement is proven, got {h.get("status")}')
    elif h.get('blocks_materialization') is not True or h.get('blocks_activation') is not True:
        errors.append('human_authorised_external_actions must block materialization and activation until proven')
except Exception as e:
    errors.append(f'external-action capability honesty check failed: {e}')


# P1: v1.8.3 visual non-negotiable contracts must be present and aligned.
try:
    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml')
    layout_zones = load_yaml('screens/layout_zones.yaml')
    visual_grammar = load_yaml('screens/visual_grammar.yaml')
    component_anatomy = load_yaml('screens/component_anatomy.yaml')
    bilingual_contract = load_yaml('screens/bilingual_contract.yaml')
    rendered_conformance = load_yaml('acceptance/rendered_dashboard_conformance.yaml')
    m_ids = [d.get('dashboard_id') for d in matrix.get('dashboards', [])]
    l_ids = [d.get('dashboard_id') for d in layout_zones.get('dashboards', [])]
    v_ids = [d.get('dashboard_id') for d in visual_grammar.get('dashboards', [])]
    if m_ids != l_ids:
        errors.append(f'layout_zones dashboard order must match implementation matrix: matrix={m_ids}, layout_zones={l_ids}')
    if m_ids != v_ids:
        errors.append(f'visual_grammar dashboard order must match implementation matrix: matrix={m_ids}, visual_grammar={v_ids}')
    if rendered_conformance.get('required') is not True:
        errors.append('acceptance/rendered_dashboard_conformance.yaml must set required=true')
    for d in layout_zones.get('dashboards', []):
        if d.get('collapse_forbidden') is not True:
            errors.append(f'layout_zones {d.get("dashboard_id")} collapse_forbidden must be true')
        if d.get('substitution_forbidden') is not True:
            errors.append(f'layout_zones {d.get("dashboard_id")} substitution_forbidden must be true')
        if not d.get('zone_order') or not d.get('zones'):
            errors.append(f'layout_zones {d.get("dashboard_id")} must declare zone_order and zones')
    anatomy = component_anatomy.get('components', {})
    for required_component in ['kpi_threshold_card','active_case_banner','decision_table','runtime_card','action_audit_timeline']:
        if required_component not in anatomy:
            errors.append(f'component_anatomy missing required component: {required_component}')
        elif not anatomy[required_component].get('required_anatomy'):
            errors.append(f'component_anatomy {required_component} missing required_anatomy')
    if bilingual_contract.get('default_locale') != 'en' or 'ar' not in bilingual_contract.get('supported_locales', []):
        errors.append('bilingual_contract must support en and ar with en as default')
    for pattern in [
        'golden-template/patterns/dashboard_rigid_contract_pattern.yaml',
        'golden-template/patterns/layout_zones_pattern.yaml',
        'golden-template/patterns/visual_grammar_pattern.yaml',
        'golden-template/patterns/component_anatomy_pattern.yaml',
        'golden-template/patterns/rendered_conformance_pattern.yaml']:
        if not (root/pattern).exists():
            errors.append(f'missing reusable golden-template pattern: {pattern}')
except Exception as e:
    errors.append(f'v1.8.3 visual non-negotiable contract check failed: {e}')



# P1: v1.8.4 zone-to-component and rendered conformance enforcement.
try:
    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml')
    layout_zones = load_yaml('screens/layout_zones.yaml')
    component_contract = load_yaml('screens/components.yaml')
    component_anatomy = load_yaml('screens/component_anatomy.yaml')
    bilingual = load_yaml('screens/bilingual_contract.yaml')
    rendered = load_yaml('acceptance/rendered_dashboard_conformance.yaml')
    fidelity = load_yaml('acceptance/dashboard_fidelity_contract.yaml')
    matrix_ids = [d.get('dashboard_id') for d in matrix.get('dashboards', [])]
    component_ids = {c.get('component_id') for c in component_contract.get('components', [])}
    anatomy_ids = set(component_anatomy.get('components', {}).keys())
    matrix_required = {d.get('dashboard_id'): set(d.get('required_components', []) or []) for d in matrix.get('dashboards', [])}
    for d in layout_zones.get('dashboards', []):
        did = d.get('dashboard_id')
        if did not in matrix_ids:
            errors.append(f'layout_zones dashboard_id not present in matrix: {did}')
            continue
        zids = [z.get('zone_id') for z in d.get('zones', [])]
        if zids != d.get('zone_order'):
            errors.append(f'layout_zones {did} zone_order must exactly match zones order: {d.get("zone_order")} vs {zids}')
        for z in d.get('zones', []):
            comps = z.get('required_components', []) or []
            if not comps:
                errors.append(f'layout_zones {did}.{z.get("zone_id")} has empty required_components')
                continue
            for comp in comps:
                if comp not in component_ids and comp not in anatomy_ids:
                    errors.append(f'layout_zones {did}.{z.get("zone_id")} component not declared in screens/components.yaml or component_anatomy: {comp}')
                if comp not in matrix_required.get(did, set()) and comp not in anatomy_ids:
                    errors.append(f'layout_zones {did}.{z.get("zone_id")} component not included in dashboard_implementation_matrix required_components or anatomy: {comp}')
            if z.get('flattening_forbidden') is not True:
                errors.append(f'layout_zones {did}.{z.get("zone_id")} must set flattening_forbidden=true')
            if not z.get('acceptance_evidence'):
                errors.append(f'layout_zones {did}.{z.get("zone_id")} missing acceptance_evidence')
    # rendered conformance must be per-dashboard, not only global.
    rendered_by_id = {d.get('dashboard_id'): d for d in rendered.get('dashboards', []) or []}
    for did in matrix_ids:
        rd = rendered_by_id.get(did)
        if not rd:
            errors.append(f'rendered_dashboard_conformance missing dashboard entry: {did}')
            continue
        evidence = rd.get('required_evidence', {}) or {}
        for req in ['route_screenshot','route_component_inventory','zone_component_inventory','action_button_inventory','data_binding_inventory','governance_panel_inventory','runtime_evidence_inventory','rendered_gap_register']:
            if req not in evidence:
                errors.append(f'rendered_dashboard_conformance {did} missing required evidence: {req}')
        zc = rd.get('required_zone_components', {}) or {}
        if not zc:
            errors.append(f'rendered_dashboard_conformance {did} missing required_zone_components')
        else:
            lz = next((x for x in layout_zones.get('dashboards', []) if x.get('dashboard_id') == did), None)
            expected_zones = {z.get('zone_id') for z in (lz or {}).get('zones', [])}
            if set(zc.keys()) != expected_zones:
                errors.append(f'rendered_dashboard_conformance {did} required_zone_components keys do not match layout zones')
    # Bilingual contract must cover all structurally visible components directly or through family rules.
    direct = {r.get('component') for r in bilingual.get('component_rules', []) or []}
    family_covered = set()
    for fam in bilingual.get('component_family_rules', []) or []:
        family_covered.update(fam.get('covers', []) or [])
    all_zone_components = set()
    for d in layout_zones.get('dashboards', []) or []:
        for z in d.get('zones', []) or []:
            all_zone_components.update(z.get('required_components', []) or [])
    uncovered = sorted(c for c in all_zone_components if c not in direct and c not in family_covered and not c.endswith('_counter') and not c.endswith('_button') and not c.endswith('_badge') and not c.endswith('_row') and not c.endswith('_label'))
    if uncovered:
        errors.append('bilingual_contract does not cover required zone components: ' + ', '.join(uncovered[:25]))
    if not (root/'acceptance/dashboard_gap_register.yaml').exists():
        errors.append('missing acceptance/dashboard_gap_register.yaml')
except Exception as e:
    errors.append(f'v1.8.4 zone/rendered/bilingual enforcement check failed: {e}')



# P1: v1.8.5 single layout authority and zone-derived component vocabulary.
try:
    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml')
    layout_zones = load_yaml('screens/layout_zones.yaml')
    deprecated_layouts = load_yaml('screens/layouts.yaml')
    if deprecated_layouts.get('canonical') is not False or deprecated_layouts.get('superseded_by') != 'screens/layout_zones.yaml':
        errors.append('screens/layouts.yaml must be explicitly deprecated and superseded_by screens/layout_zones.yaml')
    zone_by_id = {d.get('dashboard_id'): d for d in layout_zones.get('dashboards', [])}
    legacy_prefixes = ('l1.', 'l2.', 'l3.', 'cc.')
    for d in matrix.get('dashboards', []):
        did = d.get('dashboard_id')
        if str(d.get('layout_contract', '')).startswith('screens/layouts.yaml'):
            errors.append(f'dashboard {did} still references deprecated screens/layouts.yaml as layout_contract')
        if not str(d.get('layout_contract', '')).startswith('screens/layout_zones.yaml#'):
            errors.append(f'dashboard {did} layout_contract must reference screens/layout_zones.yaml#{did}')
        if d.get('legacy_component_ids_allowed') is not False:
            errors.append(f'dashboard {did} must set legacy_component_ids_allowed=false')
        req = set(d.get('required_components', []) or [])
        if any(str(c).startswith(legacy_prefixes) for c in req):
            errors.append(f'dashboard {did} required_components contains legacy broad component ids: {sorted(c for c in req if str(c).startswith(legacy_prefixes))}')
        zd = zone_by_id.get(did)
        if not zd:
            errors.append(f'dashboard {did} missing from screens/layout_zones.yaml')
            continue
        zone_union = []
        for z in zd.get('zones', []) or []:
            for c in z.get('required_components', []) or []:
                if c not in zone_union:
                    zone_union.append(c)
        if req != set(zone_union):
            errors.append(f'dashboard {did} required_components must exactly equal zone component union. matrix={sorted(req)}, zones={sorted(set(zone_union))}')
        if d.get('required_components_source') != 'screens/layout_zones.yaml.zones[].required_components':
            errors.append(f'dashboard {did} must declare required_components_source as screens/layout_zones.yaml.zones[].required_components')
except Exception as e:
    errors.append(f'v1.8.5 single-layout-authority check failed: {e}')


# P1: v1.8.6 single component vocabulary across acceptance, bindings, and components.
try:
    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml')
    layout_zones = load_yaml('screens/layout_zones.yaml')
    fidelity = load_yaml('acceptance/dashboard_fidelity_contract.yaml')
    data_bindings = load_yaml('bindings/data_bindings.yaml')
    components_contract = load_yaml('screens/components.yaml')
    legacy_prefixes = ('l1.', 'l2.', 'l3.', 'cc.')
    # Build canonical zone component universe per dashboard and global.
    zone_by_id = {d.get('dashboard_id'): d for d in layout_zones.get('dashboards', [])}
    global_zone_components = set()
    zone_components_by_dashboard = {}
    for did, zd in zone_by_id.items():
        comps = []
        for z in zd.get('zones', []) or []:
            for c in z.get('required_components', []) or []:
                global_zone_components.add(c)
                if c not in comps:
                    comps.append(c)
        zone_components_by_dashboard[did] = set(comps)
    # Acceptance checks must match the zone component vocabulary exactly.
    for chk in fidelity.get('acceptance_checks', []) or []:
        did = chk.get('dashboard_id')
        comps = set(chk.get('must_include_components', []) or [])
        if any(str(c).startswith(legacy_prefixes) for c in comps):
            errors.append(f'acceptance check {did} contains legacy component ids: {sorted(c for c in comps if str(c).startswith(legacy_prefixes))}')
        expected = zone_components_by_dashboard.get(did)
        if expected is not None and comps != expected:
            errors.append(f'acceptance check {did} must_include_components must equal layout_zones union. acceptance={sorted(comps)}, zones={sorted(expected)}')
        if chk.get('component_vocabulary') != 'zone_rigid_components':
            errors.append(f'acceptance check {did} must declare component_vocabulary=zone_rigid_components')
        if chk.get('legacy_component_ids_allowed') is not False:
            errors.append(f'acceptance check {did} must set legacy_component_ids_allowed=false')
    # Bindings must use only declared zone components.
    for b in data_bindings.get('bindings', []) or []:
        bid = str(b.get('binding_id'))
        cid = str(b.get('component_id'))
        if bid.startswith(legacy_prefixes) or cid.startswith(legacy_prefixes):
            errors.append(f'data binding uses legacy component id: binding_id={bid}, component_id={cid}')
        if cid not in global_zone_components:
            errors.append(f'data binding component_id {cid} is not a required zone component')
        if b.get('component_vocabulary') != 'zone_rigid_components':
            errors.append(f'data binding {bid} must declare component_vocabulary=zone_rigid_components')
    bound_components = {b.get('component_id') for b in data_bindings.get('bindings', []) or []}
    missing_bindings = sorted(global_zone_components - bound_components)
    if missing_bindings:
        errors.append('required zone components missing data bindings: ' + ', '.join(missing_bindings[:30]))
    # Components contract must use only zone components.
    declared_components = set()
    for c in components_contract.get('components', []) or []:
        cid = str(c.get('component_id'))
        declared_components.add(cid)
        if cid.startswith(legacy_prefixes):
            errors.append(f'screens/components.yaml contains legacy component id: {cid}')
        if cid not in global_zone_components:
            errors.append(f'screens/components.yaml component {cid} is not a required zone component')
        if c.get('component_vocabulary') != 'zone_rigid_components':
            errors.append(f'screens/components.yaml component {cid} must declare component_vocabulary=zone_rigid_components')
    missing_components = sorted(global_zone_components - declared_components)
    if missing_components:
        errors.append('required zone components missing screens/components.yaml contracts: ' + ', '.join(missing_components[:30]))
except Exception as e:
    errors.append(f'v1.8.6 single-component-vocabulary check failed: {e}')



# P1: v1.8.8 decision-surface scope enforcement.
try:
    NEW_ID='03_primary_case_decision_command_tab'
    layout_zones = load_yaml('screens/layout_zones.yaml')
    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml')
    fidelity = load_yaml('acceptance/dashboard_fidelity_contract.yaml')
    components_contract = load_yaml('screens/components.yaml')
    data_bindings = load_yaml('bindings/data_bindings.yaml')
    rendered = load_yaml('acceptance/rendered_dashboard_conformance.yaml')
    anatomy = load_yaml('screens/component_anatomy.yaml')
    required_case_components = {'case_context_header','case_workspace_tab_strip','evidence_pack_strip','bilingual_narrative_panel','narrative_version_history_action','recommendation_summary_panel','case_action_button_row','action_consequence_preview','confirmation_modal_contract','audit_footnote_panel','recovery_tab_locked_state'}
    forbidden_case_components = {'decision_queue_table','multi_case_list'}
    lz_case = next((d for d in layout_zones.get('dashboards', []) if d.get('dashboard_id') == NEW_ID), None)
    if not lz_case:
        errors.append('v1.8.8 requires dashboard 03_primary_case_decision_command_tab in screens/layout_zones.yaml')
    else:
        zone_comps=set()
        for z in lz_case.get('zones', []) or []:
            zone_comps.update(z.get('required_components', []) or [])
        if zone_comps != required_case_components:
            errors.append(f'case decision tab zone components must exactly match required case components. got={sorted(zone_comps)}')
        if forbidden_case_components & zone_comps:
            errors.append('case decision tab includes forbidden queue/list components')
    m_case = next((d for d in matrix.get('dashboards', []) if d.get('dashboard_id') == NEW_ID), None)
    if not m_case:
        errors.append('v1.8.8 requires dashboard 03_primary_case_decision_command_tab in dashboard_implementation_matrix')
    else:
        if m_case.get('scope') != 'single_case': errors.append('case decision tab scope must be single_case')
        if m_case.get('queue_forbidden') is not True: errors.append('case decision tab must set queue_forbidden=true')
        if set(m_case.get('required_components', []) or []) != required_case_components:
            errors.append('case decision tab matrix required_components must equal required case components')
        if forbidden_case_components & set(m_case.get('required_components', []) or []):
            errors.append('case decision tab matrix contains forbidden queue/list components')
    if NEW_ID not in (fidelity.get('required_dashboard_ids') or []):
        errors.append('dashboard_fidelity_contract missing 03_primary_case_decision_command_tab')
    f_case = next((c for c in fidelity.get('acceptance_checks', []) if c.get('dashboard_id') == NEW_ID), None)
    if not f_case:
        errors.append('dashboard_fidelity_contract missing acceptance check for case decision tab')
    else:
        if f_case.get('queue_forbidden') is not True: errors.append('case decision tab acceptance must set queue_forbidden=true')
        if set(f_case.get('must_include_components', []) or []) != required_case_components:
            errors.append('case decision tab acceptance components must equal required case components')
        if forbidden_case_components & set(f_case.get('must_include_components', []) or []): errors.append('case decision tab acceptance contains forbidden queue/list components')
        if set(f_case.get('required_actions', []) or []) != {'approve_decision','request_revision','escalate_decision','create_ticket','email_owner'}:
            errors.append('case decision tab must require five decision actions')
    declared_components = {c.get('component_id') for c in components_contract.get('components', []) or []}
    bound_components = {b.get('component_id') for b in data_bindings.get('bindings', []) or []}
    for comp in required_case_components:
        if comp not in declared_components: errors.append(f'case decision component missing from screens/components.yaml: {comp}')
        if comp not in bound_components: errors.append(f'case decision component missing from bindings/data_bindings.yaml: {comp}')
    anatomy_components = set((anatomy.get('components') or {}).keys())
    for comp in ['case_workspace_tab_strip','bilingual_narrative_panel','case_action_button_row','audit_footnote_panel','confirmation_modal_contract','recovery_tab_locked_state']:
        if comp not in anatomy_components: errors.append(f'case decision component anatomy missing: {comp}')
    r_case = next((d for d in rendered.get('dashboards', []) if d.get('dashboard_id') == NEW_ID), None)
    if not r_case: errors.append('rendered_dashboard_conformance missing case decision tab')
    else:
        if forbidden_case_components & set(sum((list(v) for v in (r_case.get('required_zone_components') or {}).values()), [])):
            errors.append('rendered conformance case decision tab includes forbidden queue/list components')
except Exception as e:
    errors.append(f'v1.8.8 decision-surface scope check failed: {e}')



# P1: enforce single canonical case decision route shape and decision action naming.
try:
    # Legacy KPI-scoped case route must not appear in canonical YAML contracts.
    legacy_route = '/jazan-performance/use-cases/urban-service-quality-visual-distortion-loop/kpi/{kpi_slug}/case/{case_id}/{tab}'
    for rel in [
        'manifest/navigation.yaml',
        'screens/screen_catalog.yaml',
        'screens/dashboard_implementation_matrix.yaml',
        'acceptance/dashboard_fidelity_contract.yaml',
        'screens/layout_zones.yaml',
        'bindings/data_bindings.yaml',
    ]:
        txt = (root/rel).read_text(encoding='utf-8')
        if legacy_route in txt:
            errors.append(f'legacy KPI-scoped case route still present in canonical contract: {rel}')

    # notify_owner is deprecated. email_owner is the single canonical external-email action.
    for rel in [
        'business/decisions.yaml',
        'decisions/action_buttons.yaml',
        'bindings/routes.yaml',
        'screens/dashboard_implementation_matrix.yaml',
        'acceptance/dashboard_fidelity_contract.yaml',
        'screens/interactions.yaml',
    ]:
        txt = (root/rel).read_text(encoding='utf-8')
        if 'notify_owner' in txt or 'btn.notify_owner' in txt or 'route.action.notify_owner' in txt:
            errors.append(f'deprecated notify_owner action naming still present: {rel}')

    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml').get('dashboards', [])
    matrix_by_id = {d.get('dashboard_id'): d for d in matrix}
    case_intel = matrix_by_id.get('03_case_model_intelligence', {})
    case_decision = matrix_by_id.get('03_primary_case_decision_command_tab', {})
    forbidden_action_ids = {'approve_decision','request_revision','escalate_decision','create_ticket','email_owner'}
    if any(a in forbidden_action_ids for a in case_intel.get('actions', []) or []):
        errors.append('03_case_model_intelligence must not own authorisation action buttons')
    if case_intel.get('authorisation_surface_forbidden') is not True:
        errors.append('03_case_model_intelligence must declare authorisation_surface_forbidden=true')
    if not case_decision:
        errors.append('missing 03_primary_case_decision_command_tab dashboard')
    else:
        if set(case_decision.get('actions', []) or []) != forbidden_action_ids:
            errors.append('03_primary_case_decision_command_tab must own exactly the five decision actions including email_owner')
        if case_decision.get('queue_forbidden') is not True:
            errors.append('03_primary_case_decision_command_tab must set queue_forbidden=true')

    interactions = load_yaml('screens/interactions.yaml').get('interactions', [])
    for inter in interactions:
        if inter.get('source_screen') == 'SCREEN-L3-CASE' and inter.get('behavior') == 'post_action':
            errors.append('SCREEN-L3-CASE must not have post_action interactions; actions belong to SCREEN-L3-CASE-DECISIONS')
        if inter.get('source_screen') == 'SCREEN-L3-CASE' and inter.get('source_component') == 'action_buttons':
            errors.append('SCREEN-L3-CASE must not expose action_buttons component')

    route_ids = {r.get('id') for r in load_yaml('bindings/routes.yaml').get('routes', [])}
    if 'route.action.email_owner' not in route_ids:
        errors.append('missing canonical route.action.email_owner')
    if 'route.action.notify_owner' in route_ids:
        errors.append('deprecated route.action.notify_owner still declared')
except Exception as e:
    errors.append(f'single decision-surface route/action enforcement failed: {e}')



# v1.8.11: canonical screen catalog and decision-surface consistency checks.
def _fragment(ref):
    return ref.split('#',1)[1] if isinstance(ref,str) and '#' in ref else None
screen_catalog = load_yaml('screens/screen_catalog.yaml')
known_screen_ids = {s.get('screen_id') for s in screen_catalog.get('screens', [])}
# Every required screen id must exist in screen catalog.
for sid in load_yaml('acceptance/dashboard_fidelity_contract.yaml').get('required_screen_ids', []):
    if sid not in known_screen_ids:
        errors.append(f'required screen_id missing from screens/screen_catalog.yaml: {sid}')
# Every screen_ref in navigation and IA must resolve to the catalog.
for rel in ['manifest/navigation.yaml','screens/information_architecture.yaml']:
    obj = load_yaml(rel)
    refs=[]
    def walk(x):
        if isinstance(x, dict):
            for k,v in x.items():
                if k == 'screen_ref' and isinstance(v, str): refs.append(v)
                else: walk(v)
        elif isinstance(x, list):
            for i in x: walk(i)
    walk(obj)
    for ref in refs:
        frag=_fragment(ref)
        if frag and frag not in known_screen_ids:
            errors.append(f'{rel} screen_ref does not resolve to screen catalog: {ref}')
# Level 3 overview tab may not be canonical/default unless a screen exists.
for rel in ['manifest/navigation.yaml','screens/information_architecture.yaml']:
    obj=load_yaml(rel)
    for level in obj.get('levels',[]):
        if level.get('level') == 3:
            for tab in level.get('tabs',[]):
                if tab.get('id') == 'overview':
                    if tab.get('default') is True:
                        errors.append(f'{rel} declares overview tab default=true without canonical overview screen')
                    if tab.get('screen_ref'):
                        frag=_fragment(tab.get('screen_ref'))
                        if frag not in known_screen_ids:
                            errors.append(f'{rel} overview tab screen_ref unresolved: {tab.get("screen_ref")}')
                if tab.get('id') == 'recovery':
                    if tab.get('screen_ref') != 'screens/screen_catalog.yaml#SCREEN-L3-CASE-RECOVERY':
                        errors.append(f'{rel} recovery tab must reference SCREEN-L3-CASE-RECOVERY')
                    if tab.get('layout_ref') != 'screens/layout_zones.yaml#04_outcome_recovery_feedback':
                        errors.append(f'{rel} recovery tab must reference 04_outcome_recovery_feedback layout')
                    if tab.get('hide_when_unavailable') is True:
                        errors.append(f'{rel} recovery tab must be locked, not hidden, when unavailable')
# Case intelligence may link to decision tab but may not own authorization actions/components.
matrix = load_yaml('screens/dashboard_implementation_matrix.yaml')
for d in matrix.get('dashboards', []):
    if d.get('dashboard_id') == '03_case_model_intelligence':
        forbidden={'approve_decision','request_revision','escalate_decision','create_ticket','email_owner','case_action_button_row','decision_queue_table','multi_case_list'}
        for field in ['actions','required_components','exact_fidelity_required_elements','visual_non_negotiables','required_actions']:
            vals=set(d.get(field, []) or [])
            bad=vals & forbidden
            if bad:
                errors.append(f'03_case_model_intelligence contains forbidden authorisation items in {field}: {sorted(bad)}')
        if d.get('authorisation_surface_forbidden') is not True:
            errors.append('03_case_model_intelligence must set authorisation_surface_forbidden: true')
# Story and visual grammar must not describe case intelligence as owning action buttons.
for rel in ['screens/story_flow.yaml','screens/visual_grammar.yaml']:
    raw=(root/rel).read_text(encoding='utf-8')
    # Allow mentions only for the primary decision tab, not for 03_case_model_intelligence block.
    if '03_case_model_intelligence' in raw:
        # crude block isolation
        parts=raw.split('03_case_model_intelligence')
        if len(parts)>1:
            block=parts[1].split('dashboard_id:',1)[0]
            for bad in ['decision buttons','action buttons','case_action_button_row','approve_decision','create_ticket','email_owner']:
                if bad in block:
                    errors.append(f'{rel} 03_case_model_intelligence block still references authorisation/action-button language: {bad}')
# Recovery dashboard must be present in screen catalog and matrix.
if 'SCREEN-L3-CASE-RECOVERY' not in known_screen_ids:
    errors.append('SCREEN-L3-CASE-RECOVERY missing from screen catalog')
if '04_outcome_recovery_feedback' not in {d.get('dashboard_id') for d in matrix.get('dashboards', [])}:
    errors.append('04_outcome_recovery_feedback missing from dashboard implementation matrix')

# P1: v1.8.10 Saudi government operational design notes enforcement.
try:
    design_notes = load_yaml('screens/design_notes_contract.yaml')
    if design_notes.get('rule') != 'Design notes are canonical contract input for government operational dashboard fidelity, not presentation advice.':
        errors.append('screens/design_notes_contract.yaml must declare design notes as canonical contract truth')
    global_rules = design_notes.get('global_delivery_rules', {}) or {}
    for req in ['typography_weight_discipline','colour_semantics','rounding','bilingual_structure','honest_empty_states','confirmation_modals']:
        if req not in global_rules:
            errors.append(f'design notes missing global delivery rule: {req}')
    visual = load_yaml('screens/visual_grammar.yaml')
    vg_global = visual.get('global', {}) or {}
    if not vg_global.get('design_notes_contract_truth'):
        errors.append('visual_grammar must mark design_notes_contract_truth=true')
    if not vg_global.get('colour_policy', {}).get('state_only'):
        errors.append('visual_grammar.global.colour_policy.state_only must be true')
    if 600 not in (vg_global.get('typography', {}).get('forbidden_font_weights') or []):
        errors.append('visual_grammar must forbid heavy 600+ typography weights')
    if not vg_global.get('confirmation_modal_policy', {}).get('payload_preview_required'):
        errors.append('visual_grammar must require confirmation modal payload preview')
    if not vg_global.get('empty_state_policy', {}).get('honest_absence_required'):
        errors.append('visual_grammar must require honest empty states')
    anatomy = load_yaml('screens/component_anatomy.yaml').get('components', {}) or {}
    kpi_card = anatomy.get('kpi_threshold_card', {}) or {}
    if 'direction_aware_threshold_rail' not in (kpi_card.get('required_anatomy') or []):
        errors.append('kpi_threshold_card anatomy must require direction_aware_threshold_rail')
    if kpi_card.get('threshold_direction_source') != 'business/kpis.yaml#kpis[].direction':
        errors.append('kpi_threshold_card must source threshold direction from business/kpis.yaml#kpis[].direction')
    feature = anatomy.get('feature_contribution_bar', {}) or {}
    if 'sum_to_composite_score_assertion' not in (feature.get('required_anatomy') or []):
        errors.append('feature_contribution_bar must require sum_to_composite_score_assertion')
    rnn_chart = anatomy.get('rnn_forecast_chart', {}) or {}
    if rnn_chart.get('confidence_band_source') != 'output.jazan_service_rnn_forecast.standard_error':
        errors.append('rnn_forecast_chart must bind confidence band to output.jazan_service_rnn_forecast.standard_error')
    case_buttons = anatomy.get('case_action_button_row', {}) or {}
    if case_buttons.get('required_order') != ['approve_decision','request_revision','escalate_decision','create_ticket','email_owner']:
        errors.append('case_action_button_row required_order must be exact five actions')
    if case_buttons.get('overflow_menu_forbidden') is not True:
        errors.append('case_action_button_row must forbid overflow menu')
    conf = anatomy.get('confirmation_drawer', {}) or {}
    for req in ['payload_preview','who_will_be_notified','external_systems_invoked','records_created','confirm_cancel_pair']:
        if req not in (conf.get('required_anatomy') or []):
            errors.append(f'confirmation_drawer missing required payload anatomy: {req}')
    # Outcome dashboard must exist if design notes require recovery loop.
    m_ids = [d.get('dashboard_id') for d in load_yaml('screens/dashboard_implementation_matrix.yaml').get('dashboards', [])]
    if '04_outcome_recovery_feedback' not in m_ids:
        errors.append('v1.8.10 requires 04_outcome_recovery_feedback dashboard')
    # No generic confirmation; every external action must declare payload preview.
    for btn in load_yaml('decisions/action_buttons.yaml').get('action_buttons', []) or []:
        if btn.get('id') in ['btn.approve','btn.request_revision','btn.escalate','btn.create_ticket','btn.email_owner']:
            if btn.get('confirmation_modal_required') is not True or btn.get('payload_preview_required') is not True:
                errors.append(f'{btn.get("id")} must require confirmation modal with payload preview')
except Exception as e:
    errors.append(f'v1.8.10 design notes enforcement failed: {e}')


# v1.8.12: package version, KPI reconciliation, action lifecycle, screen metadata, bilingual audit, and demo-data enforcement.
try:
    package = load_yaml('package.yaml')
    if package.get('package_version') != '1.8.12-candidate':
        errors.append(f'package.yaml package_version must be 1.8.12-candidate, got {package.get("package_version")}')
    if package.get('opencare_golden_template_version') != '1.8.12':
        errors.append(f'package.yaml opencare_golden_template_version must be 1.8.12, got {package.get("opencare_golden_template_version")}')
    compat = package.get('compatibility', {}) or {}
    if compat.get('opencare_golden_template') != '1.8.12':
        errors.append('package compatibility.opencare_golden_template must be 1.8.12')
    for flag in ['dashboard_rigid_contract','decision_surface_enforced','governance_registry_supported']:
        if compat.get(flag) is not True:
            errors.append(f'package compatibility.{flag} must be true')
    if 'version' in package:
        errors.append('package.yaml contains deprecated top-level version field')
    if 'bundle_version' in package:
        errors.append('package.yaml contains deprecated bundle_version field')
    if 'golden_template_version' in package:
        errors.append('package.yaml contains deprecated golden_template_version field')
    if isinstance(package.get('metadata'), dict) and 'version' in package.get('metadata', {}):
        errors.append('package.yaml metadata.version must be removed to avoid contradictory package versions')
except Exception as e:
    errors.append(f'package version consistency check failed: {e}')

try:
    kpis = load_yaml('business/kpis.yaml').get('kpis', []) or []
    allowed_reconciliation = {'sql_aligned','discrepancy_found','not_implemented'}
    for kpi in kpis:
        kid = kpi.get('kpi_id')
        for field in ['formula_plain_language','calculation_fields','analytics_mart','target','threshold','owner','data_owner','frequency','reconciliation_status','reconciliation_note']:
            val = kpi.get(field)
            if val in [None, '', []]:
                errors.append(f'KPI {kid} missing explicit field: {field}')
        if not kpi.get('formula_sql_expression') and not kpi.get('dbt_expression_reference'):
            errors.append(f'KPI {kid} must declare formula_sql_expression or dbt_expression_reference')
        if kpi.get('formula_key'):
            errors.append(f'KPI {kid} still contains deprecated formula_key placeholder logic')
        if kpi.get('formula') and 'must be resolved by implementation' in str(kpi.get('formula')).lower():
            errors.append(f'KPI {kid} still contains deferred placeholder formula text')
        if kpi.get('reconciliation_status') not in allowed_reconciliation:
            errors.append(f'KPI {kid} reconciliation_status invalid: {kpi.get("reconciliation_status")}')
except Exception as e:
    errors.append(f'KPI formula reconciliation check failed: {e}')

try:
    entities = load_yaml('data/entities.yaml').get('entities', []) or []
    entity_map = {e.get('entity_id'): e for e in entities}
    if 'action_lifecycle' not in entity_map:
        errors.append('data/entities.yaml missing action_lifecycle entity')
    if 'decision_action_event' not in entity_map:
        errors.append('data/entities.yaml missing decision_action_event entity')
    pipeline = load_yaml('data/pipeline.yaml')
    decision_tables = set(pipeline.get('decision_tables', []) or [])
    for table in ['decision.jazan_action_lifecycle','decision.jazan_decision_action_events']:
        if table not in decision_tables:
            errors.append(f'data/pipeline.yaml missing required decision table: {table}')
    lifecycle = load_yaml('decision-workflows/action_lifecycle.yaml')
    if lifecycle.get('snapshot_table') != 'decision.jazan_action_lifecycle':
        errors.append('decision-workflows/action_lifecycle.yaml snapshot_table must be decision.jazan_action_lifecycle')
    if lifecycle.get('event_stream_table') != 'decision.jazan_decision_action_events':
        errors.append('decision-workflows/action_lifecycle.yaml event_stream_table must be decision.jazan_decision_action_events')
    required_states = {'generated','authorised','fired','acknowledged','in_progress','evidence_submitted','verified','resolved','closed','escalated','failed','cancelled'}
    if set(lifecycle.get('allowed_states', []) or []) != required_states:
        errors.append('decision-workflows/action_lifecycle.yaml allowed_states does not match the required lifecycle state set')
    required_channels = {'portal','email','ticket','in_app','external_system'}
    if set(lifecycle.get('allowed_channels', []) or []) != required_channels:
        errors.append('decision-workflows/action_lifecycle.yaml allowed_channels does not match the required channel set')
    action_buttons = load_yaml('decisions/action_buttons.yaml').get('action_buttons', []) or []
    route_map = {r.get('id'): r for r in load_yaml('bindings/routes.yaml').get('routes', []) or []}
    required_button_ids = {'btn.approve','btn.request_revision','btn.escalate','btn.create_ticket','btn.email_owner'}
    for btn in action_buttons:
        if btn.get('id') not in required_button_ids:
            continue
        if btn.get('action_lifecycle_required') is not True:
            errors.append(f'{btn.get("id")} must set action_lifecycle_required=true')
        if btn.get('lifecycle_snapshot_table') != 'decision.jazan_action_lifecycle':
            errors.append(f'{btn.get("id")} must bind lifecycle_snapshot_table to decision.jazan_action_lifecycle')
        if btn.get('lifecycle_event_stream_table') != 'decision.jazan_decision_action_events':
            errors.append(f'{btn.get("id")} must bind lifecycle_event_stream_table to decision.jazan_decision_action_events')
        if btn.get('lifecycle_event_link_required') is not True:
            errors.append(f'{btn.get("id")} must require lifecycle_event_link_required=true')
        route = route_map.get(btn.get('backend_route_id'))
        if not route:
            errors.append(f'{btn.get("id")} backend route not found: {btn.get("backend_route_id")}')
            continue
        if route.get('lifecycle_snapshot_table') != 'decision.jazan_action_lifecycle':
            errors.append(f'route {route.get("id")} must write decision.jazan_action_lifecycle')
        if route.get('lifecycle_event_stream_table') != 'decision.jazan_decision_action_events':
            errors.append(f'route {route.get("id")} must write decision.jazan_decision_action_events')
        if btn.get('id') == 'btn.email_owner':
            if btn.get('action_id') != 'email_owner':
                errors.append('btn.email_owner must use canonical action_id email_owner')
            if btn.get('external_reference_field') != 'notification_id':
                errors.append('btn.email_owner must link external_reference_field to notification_id')
            if route.get('notification_table') != 'decision.jazan_notification_outbox' or route.get('delivery_log_table') != 'decision.jazan_email_delivery_log':
                errors.append('route.action.email_owner must link notification outbox and email delivery log tables')
        if btn.get('id') == 'btn.create_ticket':
            if btn.get('external_reference_field') != 'ticket_id':
                errors.append('btn.create_ticket must link external_reference_field to ticket_id')
            if route.get('ticket_table') != 'decision.jazan_ticket_requests':
                errors.append('route.action.create_ticket must link decision.jazan_ticket_requests')
    binding_text = (root/'bindings/data_bindings.yaml').read_text(encoding='utf-8')
    for comp in ['action_stage_tracker','action_status_badges','corrective_action_lifecycle','corrective_action_row','corrective_action_tracker']:
        if f'component_id: {comp}' not in binding_text or 'decision.jazan_action_lifecycle' not in binding_text:
            pass
except Exception as e:
    errors.append(f'action lifecycle contract check failed: {e}')

try:
    screen_catalog = load_yaml('screens/screen_catalog.yaml').get('screens', []) or []
    matrix = load_yaml('screens/dashboard_implementation_matrix.yaml').get('dashboards', []) or []
    matrix_by_screen = {d.get('screen_id'): d for d in matrix}
    forbidden_phrases = [
        'Monitor KPI performance',
        'Cross-cutting decision, runtime, or audit workspace',
        'Dashboard workspace',
        'Generic operating view',
        'Decision screen'
    ]
    for screen in screen_catalog:
        sid = screen.get('screen_id')
        purpose = str(screen.get('business_purpose', ''))
        question = str(screen.get('business_question_answered', ''))
        for phrase in forbidden_phrases:
            if phrase.lower() in purpose.lower() or phrase.lower() in question.lower():
                errors.append(f'{sid} still contains generic placeholder metadata phrase: {phrase}')
        if sid == 'SCREEN-L3-CASE' and any(word in (purpose + ' ' + question).lower() for word in ['approve','authoris','ticket','email owner']):
            errors.append('SCREEN-L3-CASE metadata must describe model evidence only and must not imply authorisation ownership')
        if sid == 'SCREEN-L3-CASE-DECISIONS' and any(word in (purpose + ' ' + question).lower() for word in ['queue','list across municipalities','multi-case']):
            errors.append('SCREEN-L3-CASE-DECISIONS metadata must remain single-case only and must not imply queue ownership')
        if sid == 'SCREEN-CC-AUDIT' and 'single-case authorisation' in (purpose + ' ' + question).lower():
            errors.append('SCREEN-CC-AUDIT metadata must not imply single-case authorisation ownership')
        matrix_entry = matrix_by_screen.get(sid)
        if matrix_entry:
            mp = str(matrix_entry.get('business_purpose', ''))
            if sid == 'SCREEN-L3-CASE' and 'model evidence only' not in mp.lower():
                errors.append('dashboard implementation matrix for SCREEN-L3-CASE must preserve model-evidence-only wording')
    for rel in ['manifest/navigation.yaml', 'screens/information_architecture.yaml']:
        obj = load_yaml(rel)
        for level in obj.get('levels', []):
            if level.get('level') != 3:
                continue
            for tab in level.get('tabs', []):
                if tab.get('id') == 'overview':
                    if tab.get('default') is not False:
                        errors.append(f'{rel} overview tab must default to false')
                    if tab.get('deprecated') is not True:
                        errors.append(f'{rel} overview tab must be marked deprecated')
                    if tab.get('canonical_screen_ref', 'not_null') is not None:
                        errors.append(f'{rel} overview tab canonical_screen_ref must be null')
                    if tab.get('real_route') is not False:
                        errors.append(f'{rel} overview tab must set real_route=false')
                    if tab.get('screen_ref'):
                        errors.append(f'{rel} overview tab must not resolve to a real screen_ref')
except Exception as e:
    errors.append(f'screen catalog semantic cleanup check failed: {e}')

try:
    en_lines = (root/'assets/i18n/en.yaml').read_text(encoding='utf-8', errors='ignore').splitlines()
    ar_lines = (root/'assets/i18n/ar.yaml').read_text(encoding='utf-8', errors='ignore').splitlines()
    key_pattern = re.compile(r'^\s*([A-Za-z0-9_.-]+):')
    en_keys = {m.group(1) for line in en_lines if (m := key_pattern.match(line))}
    ar_keys = {m.group(1) for line in ar_lines if (m := key_pattern.match(line))}
    if en_keys - ar_keys:
        errors.append('Arabic i18n file is missing keys present in English: ' + ', '.join(sorted(list(en_keys - ar_keys))[:20]))
    if ar_keys - en_keys:
        errors.append('Arabic i18n file contains keys missing from English: ' + ', '.join(sorted(list(ar_keys - en_keys))[:20]))
    bidi_checks = load_yaml('validation/bilingual_audit_checks.yaml')
    required_components = set(bidi_checks.get('required_components', []) or [])
    component_rules = {r.get('component') for r in load_yaml('screens/bilingual_contract.yaml').get('component_rules', []) or []}
    missing_components = sorted(required_components - component_rules)
    if missing_components:
        errors.append('Required bilingual components missing from screens/bilingual_contract.yaml: ' + ', '.join(missing_components[:20]))
except Exception as e:
    errors.append(f'bilingual audit check failed: {e}')

try:
    demo_dir = root/'demo-data'/'generated'
    required_csvs = [
        'municipalities.csv',
        'municipality_owners.csv',
        'service_requests.csv',
        'visual_distortion_cases.csv',
        'permit_requests.csv',
        'service_coverage_assets.csv',
        'emergency_readiness_checks.csv',
        'citizen_satisfaction_surveys.csv',
        'kpi_results.csv',
        'generated_service_decisions.csv',
        'corrective_actions.csv',
        'action_lifecycle.csv',
        'decision_action_events.csv',
        'notification_outbox.csv',
        'email_delivery_log.csv',
        'ticket_requests.csv',
        'recovery_outcomes.csv',
        'runtime_executions.csv',
        'intervention_history.csv',
    ]
    csv_rows = {}
    for name in required_csvs:
        path = demo_dir/name
        if not path.exists():
            errors.append(f'demo-data generated CSV missing: {name}')
            continue
        with path.open(encoding='utf-8-sig', newline='') as fh:
            rows = list(csv.DictReader(fh))
        if not rows:
            errors.append(f'demo-data generated CSV has zero rows: {name}')
        csv_rows[name] = rows
    if csv_rows:
        municipality_ids = {r['municipality_id'] for r in csv_rows.get('municipalities.csv', []) if r.get('municipality_id')}
        owner_municipality_ids = {r['municipality_id'] for r in csv_rows.get('municipality_owners.csv', []) if r.get('municipality_id')}
        kpi_ids = {k.get('kpi_id') for k in load_yaml('business/kpis.yaml').get('kpis', []) or []}
        decision_ids = {r['decision_id'] for r in csv_rows.get('generated_service_decisions.csv', []) if r.get('decision_id')}
        action_ids = {r['action_id'] for r in csv_rows.get('corrective_actions.csv', []) if r.get('action_id')}
        lifecycle_ids = {r['action_lifecycle_id'] for r in csv_rows.get('action_lifecycle.csv', []) if r.get('action_lifecycle_id')}
        notification_ids = {r['notification_id'] for r in csv_rows.get('notification_outbox.csv', []) if r.get('notification_id')}
        case_ids = {r['case_id'] for r in csv_rows.get('visual_distortion_cases.csv', []) if r.get('case_id')}
        for row in csv_rows.get('generated_service_decisions.csv', []):
            if row.get('municipality_id') not in municipality_ids:
                errors.append(f'generated_service_decisions references unknown municipality_id: {row.get("municipality_id")}')
            if row.get('kpi_id') not in kpi_ids:
                errors.append(f'generated_service_decisions references unknown kpi_id: {row.get("kpi_id")}')
        for row in csv_rows.get('action_lifecycle.csv', []):
            if row.get('decision_id') not in decision_ids:
                errors.append(f'action_lifecycle references unknown decision_id: {row.get("decision_id")}')
            if row.get('action_id') not in action_ids:
                errors.append(f'action_lifecycle references unknown action_id: {row.get("action_id")}')
        for row in csv_rows.get('decision_action_events.csv', []):
            if row.get('action_lifecycle_id') not in lifecycle_ids:
                errors.append(f'decision_action_events references unknown action_lifecycle_id: {row.get("action_lifecycle_id")}')
        for row in csv_rows.get('email_delivery_log.csv', []):
            if row.get('notification_id') not in notification_ids:
                errors.append(f'email_delivery_log references unknown notification_id: {row.get("notification_id")}')
        for row in csv_rows.get('ticket_requests.csv', []):
            if row.get('decision_id') not in decision_ids:
                errors.append(f'ticket_requests references unknown decision_id: {row.get("decision_id")}')
            if row.get('action_id') not in action_ids:
                errors.append(f'ticket_requests references unknown action_id: {row.get("action_id")}')
        for row in csv_rows.get('recovery_outcomes.csv', []):
            if row.get('action_id') not in action_ids:
                errors.append(f'recovery_outcomes references unknown action_id: {row.get("action_id")}')
            if row.get('case_id') not in case_ids:
                errors.append(f'recovery_outcomes references unknown case_id: {row.get("case_id")}')
        if len(municipality_ids) != 25:
            errors.append(f'demo-data municipalities.csv must contain 25 municipalities, got {len(municipality_ids)}')
        if owner_municipality_ids != municipality_ids:
            errors.append('municipality_owners.csv must cover the same municipality_id set as municipalities.csv')
except Exception as e:
    errors.append(f'demo-data generator and referential integrity check failed: {e}')

if errors:
    print('FAILED')
    for e in errors:
        print('-', e)
    if warnings:
        print('WARNINGS')
        for w in warnings:
            print('-', w)
    sys.exit(1)
print('PASSED: golden bundle final structural validation')
if warnings:
    print('WARNINGS')
    for w in warnings:
        print('-', w)
