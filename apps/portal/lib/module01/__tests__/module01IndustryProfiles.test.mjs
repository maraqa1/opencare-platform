import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const temp = mkdtempSync(join(tmpdir(), "module01-industry-profiles-"));
function compile(source, output) {
  const result = ts.transpileModule(readFileSync(source, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics?.length ?? 0, 0);
  writeFileSync(join(temp, output), result.outputText);
}

try {
  compile(join(root, "data-ai-diagnostic.ts"), "data-ai-diagnostic.js");
  compile(join(root, "module01", "module01FunctionalDomains.ts"), "module01FunctionalDomains.js");
  // Resolve the real relative import without a process-wide loader patch.
  const source = join(root, "module01", "module01IndustryProfiles.ts");
  const compiled = ts.transpileModule(readFileSync(source, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace('require("../data-ai-diagnostic")', 'require("./data-ai-diagnostic.js")');
  writeFileSync(join(temp, "profiles.cjs"), compiled);
  const bank = require(join(temp, "data-ai-diagnostic.js"));
  const before = JSON.stringify(bank);
  const api = require(join(temp, "profiles.cjs"));
  const { industryProfiles, INDUSTRY_PROFILE_VERSION, isIndustryProfileId, getIndustryProfile,
    resolveIndustryQuestions, resolveIndustryDomains } = api;
  const ids = ["cross-industry", "healthcare", "manufacturing", "banking", "real-estate", "utilities"];
  assert.deepEqual(industryProfiles.map((profile) => profile.id), ids);
  assert.equal(typeof INDUSTRY_PROFILE_VERSION, "string");
  assert(INDUSTRY_PROFILE_VERSION.length > 0);
  assert(Object.isFrozen(industryProfiles));
  const arabic = /[\u0600-\u06ff]/u;
  const forbidden = /\b(training|trainees?|trainers?|attendance|certifications?|enrolment|Ministry of Justice)\b|متدرب|مدرب|التدريب|التدريبية|وزارة العدل|الشهادات/iu;
  const stable = ["id", "number", "domainId", "isoReference", "score", "target", "gap", "priority", "notes", "actionPlan", "evidenceAvailable"];
  const packs = new Map();
  for (const id of ids) {
    assert(isIndustryProfileId(id));
    const profile = getIndustryProfile(id);
    assert.equal(profile.version, INDUSTRY_PROFILE_VERSION);
    assert(profile.labelEn.length && arabic.test(profile.labelAr));
    assert(Object.isFrozen(profile));
    assert.notEqual(profile, getIndustryProfile(id));
    assert.throws(() => { profile.labelEn = "changed"; }, TypeError);
    const questions = resolveIndustryQuestions(id);
    packs.set(id, questions);
    assert.equal(questions.length, 97);
    assert.equal(new Set(questions.map((q) => q.id)).size, 97);
    assert.equal(new Set(questions.map((q) => q.number)).size, 97);
    assert.equal(new Set(questions.map((q) => q.variantKey)).size, 97);
    assert(Object.isFrozen(questions));
    assert.throws(() => questions.pop(), TypeError);
    const again = resolveIndustryQuestions(id);
    assert.notEqual(questions, again);
    assert.deepEqual(questions, again);
    const domains = resolveIndustryDomains(id);
    assert.equal(domains.length, 13);
    assert.equal(new Set(domains.map((d) => d.id)).size, 13);
    assert(Object.isFrozen(domains));
    assert.throws(() => domains.push({}), TypeError);
    assert.notEqual(domains, resolveIndustryDomains(id));
    for (const domain of domains) {
      assert(Object.isFrozen(domain));
      assert(arabic.test(domain.nameAr));
      assert(!forbidden.test(`${domain.nameEn} ${domain.nameAr}`));
      assert.throws(() => { domain.nameEn = "changed"; }, TypeError);
      assert.notEqual(domain, resolveIndustryDomains(id).find((d) => d.id === domain.id));
    }
    assert.equal(domains.find((d) => d.id === 12).nameEn, "Decision Enablement & Data Adoption");
    for (const [index, q] of questions.entries()) {
      const original = bank.dataAiDiagnosticQuestions[index];
      assert(Object.isFrozen(q));
      assert.notEqual(q, original);
      assert.notEqual(q, again[index]);
      for (const field of stable) assert.deepEqual(q[field], original[field], `${id}/${q.id}/${field}`);
      assert.equal(q.score, null);
      assert.equal(q.gap, null);
      for (const field of ["questionEn", "questionAr", "evidenceRequired", "evidenceRequiredAr", "domainEn", "domainAr", "variantKey"]) {
        assert.equal(typeof q[field], "string");
        assert(q[field].trim().length > 0, `${id}/${q.id}/${field}`);
      }
      assert(arabic.test(q.questionAr));
      assert(arabic.test(q.evidenceRequiredAr));
      assert.notEqual(q.evidenceRequiredAr, q.evidenceRequired);
      assert(!forbidden.test([q.questionEn, q.questionAr, q.evidenceRequired, q.evidenceRequiredAr, q.domainEn, q.domainAr].join(" ")), `${id}/${q.id} contamination`);
      const domain = domains.find((d) => d.id === q.domainId);
      assert.equal(q.domainEn, domain.nameEn);
      assert.equal(q.domainAr, domain.nameAr);
      assert.throws(() => { q.score = 4; }, TypeError);
      assert.throws(() => { q.questionAr = "changed"; }, TypeError);
    }
  }
  const sectorIds = {
    healthcare: ["q014", "q025", "q059", "q090", "q091"],
    manufacturing: ["q014", "q025", "q088", "q090", "q091"],
    banking: ["q014", "q088", "q089", "q091", "q094"],
    "real-estate": ["q014", "q025", "q090", "q047", "q059"],
    utilities: ["q014", "q025", "q088", "q090", "q047"],
  };
  const core = packs.get("cross-industry");
  for (const [id, changedIds] of Object.entries(sectorIds)) {
    for (const [index, q] of packs.get(id).entries()) {
      if (changedIds.includes(q.id)) {
        assert.notEqual(q.variantKey, core[index].variantKey);
        for (const field of ["questionEn", "questionAr", "evidenceRequired", "evidenceRequiredAr"]) {
          assert.notEqual(q[field], core[index][field], `${id}/${q.id}/${field} must be paired variant`);
        }
      } else {
        assert.deepEqual(q, core[index], `${id}/${q.id} shared core must be equivalent`);
      }
    }
  }
  for (const qid of ["q014", "q024", "q025", "q033", "q035", "q047", "q059", "q069", "q075", "q078", "q086", "q090"]) {
    const q = core.find((entry) => entry.id === qid);
    const original = bank.dataAiDiagnosticQuestions.find((entry) => entry.id === qid);
    assert.notEqual(q.questionEn, original.questionEn);
    assert.notEqual(q.questionAr, original.questionAr);
    assert.notEqual(q.evidenceRequired, original.evidenceRequired);
  }
  // Equal semantic keys must imply equal bilingual wording, evidence and defaults.
  const byKey = new Map();
  for (const pack of packs.values()) for (const q of pack) {
    if (byKey.has(q.variantKey)) assert.deepEqual(q, byKey.get(q.variantKey));
    else byKey.set(q.variantKey, q);
  }
  for (const unknown of [undefined, null, "", "Healthcare", "unknown", "toString", "__proto__", 0, {}, [], new String("healthcare")]) {
    assert.equal(isIndustryProfileId(unknown), false);
    for (const fn of [getIndustryProfile, resolveIndustryQuestions, resolveIndustryDomains]) {
      assert.throws(() => fn(unknown), RangeError);
    }
  }
  assert.equal(JSON.stringify(bank), before, "Original bank must remain unchanged");
  console.log("module01 industry profiles: all 6 x 97 bilingual questions passed");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
