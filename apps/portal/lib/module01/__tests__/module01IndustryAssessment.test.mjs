import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const directory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(directory, "../../package.json"));
const ts = require("typescript");
const ids = ["cross-industry", "healthcare", "manufacturing", "banking", "real-estate", "utilities"];
const terms = {
  "cross-industry": "shared services", healthcare: "patient", manufacturing: "production",
  banking: "deposit", "real-estate": "tenant", utilities: "outage",
};
const contaminationPatterns = {
  healthcare: /\b(?:patient appointments|clinical services|care coordination)\b/i,
  manufacturing: /\b(?:production lines?|production yield|factory floors?|material movement|equipment effectiveness)\b/i,
  banking: /\b(?:deposit accounts?|credit risk|payment reconciliation)\b/i,
  "real-estate": /\b(?:tenant services|lease reporting|property performance)\b/i,
  utilities: /\b(?:outage response|network maintenance|outage resolution)\b/i,
};
const fixture = {
  industryProfiles: ids.map((id) => ({ id, version: "test", labelEn: id, labelAr: id })),
  resolveIndustryQuestions(id) {
    return Array.from({ length: 97 }, (_, index) => {
      const key = `q${String(index + 1).padStart(3, "0")}`;
      const core = index < 80;
      return { id: key, number: index + 1, domainId: 1 + index % 13, variantKey: core ? `${key}:core` : `${key}:${id}`,
        questionEn: core ? "Is ownership defined?" : `Are ${terms[id]} records governed?` };
    });
  },
};

// Compile in memory, resolving the portal alias without altering the global module loader.
function loadTs(path, profiles, cache = new Map()) {
  if (cache.has(path)) return cache.get(path).exports;
  const loaded = new Module(path);
  cache.set(path, loaded);
  loaded.filename = path;
  loaded.paths = Module._nodeModulePaths(dirname(path));
  loaded.require = (request) => {
    if (request.endsWith("module01IndustryProfiles") && profiles) return profiles;
    if (request.startsWith(".") || request.startsWith("@/")) {
      const target = request.startsWith("@/")
        ? resolve(directory, "../..", request.slice(2)) : resolve(dirname(path), request);
      return loadTs(`${target}.ts`, profiles, cache);
    }
    return require(request);
  };
  loaded._compile(ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, path);
  return loaded.exports;
}

function assessmentTests(label, profiles, api) {
  const { buildIndustrySeed, emptyIndustryAnswers, migrateIndustryAnswers, validateIndustryAnswers } = api;
  test(`${label}: all six fictional seeds, three levels, scoped text and independent evidence`, () => {
    const names = new Set();
    for (const id of ids) {
      const totals = [];
      for (const level of ["interview-light", "evidence-enriched", "board-ready"]) {
        const seed = buildIndustrySeed(id, level);
        names.add(seed.customerContext.customerName);
        assert.match(seed.customerContext.customerName, /fictional/i);
        assert.equal(Object.keys(seed.answers).length, 97);
        assert.deepEqual(validateIndustryAnswers(id, seed.answers), seed.answers);
        const serialized = JSON.stringify(seed);
        assert.doesNotMatch(serialized, /Dallah|Ledar/i);
        for (const [other, pattern] of Object.entries(contaminationPatterns)) {
          if (id !== other) assert.doesNotMatch(serialized, pattern);
        }
        const strengths = new Set();
        for (const state of Object.values(seed.answers)) {
          assert.match(state.evidenceAvailable, /synthetic fictional/i);
          assert.ok(state.score >= 0 && state.score <= 4);
          assert.notEqual(state.evidenceStrength, "audited");
          for (const text of [state.evidenceAvailable, state.notes, state.actionPlan]) {
            assert.doesNotMatch(text, /[?]|this question's stated requirement|\b(?:act as|you are|ignore previous|replace with)\b/i);
          }
          assert.match(state.evidenceAvailable, /No independent assurance is asserted/);
          assert.match(state.actionPlan, /^Synthetic action plan:/);
          strengths.add(state.evidenceStrength);
        }
        assert.ok(strengths.size >= 2);
        if (level === "interview-light") assert.deepEqual([...strengths].sort(), ["interview", "none"]);
        totals.push(Object.values(seed.answers).reduce((sum, state) => sum + state.score, 0));
        const again = buildIndustrySeed(id, level);
        assert.deepEqual(seed, again);
        assert.notEqual(seed.answers.q001, again.answers.q001);
      }
      assert.ok(totals[0] < totals[1] && totals[1] < totals[2]);
    }
    assert.equal(names.size, 6);
    const profileQuestions = ids.map((id) => new Map(profiles.resolveIndustryQuestions(id).map((q) => [q.id, q.variantKey])));
    const universal = profiles.resolveIndustryQuestions(ids[0]).filter((q) => profileQuestions.every((keys) => keys.get(q.id) === q.variantKey));
    assert.ok(universal.length > 0, "profiles must retain reusable core questions");
    const baseline = buildIndustrySeed(ids[0], "evidence-enriched").answers;
    for (const id of ids.slice(1)) {
      const answers = buildIndustrySeed(id, "evidence-enriched").answers;
      for (const q of universal) assert.deepEqual(answers[q.id], baseline[q.id], "core seed content must remain sector-neutral");
    }
  });

  test(`${label}: pairwise migration preserves only identical variants and archives complete originals`, () => {
    for (const from of ids) for (const to of ids) {
      const original = buildIndustrySeed(from, "board-ready").answers;
      const snapshot = structuredClone(original);
      const source = new Map(profiles.resolveIndustryQuestions(from).map((q) => [q.id, q.variantKey]));
      const migration = migrateIndustryAnswers(from, to, original);
      const empty = emptyIndustryAnswers(to);
      for (const q of profiles.resolveIndustryQuestions(to)) {
        if (source.get(q.id) === q.variantKey) {
          assert.deepEqual(migration.answers[q.id], original[q.id]);
          assert.notEqual(migration.answers[q.id], original[q.id]);
          assert.ok(migration.retainedIds.includes(q.id));
          assert.ok(!migration.reviewIds.includes(q.id));
          assert.deepEqual(original[q.id], buildIndustrySeed(to, "board-ready").answers[q.id], "shared variants must have sector-neutral seed content");
        } else {
          assert.deepEqual(migration.answers[q.id], empty[q.id]);
          assert.deepEqual(migration.archivedAnswers[q.id], original[q.id]);
          assert.notEqual(migration.archivedAnswers[q.id], original[q.id]);
          assert.ok(migration.reviewIds.includes(q.id));
        }
      }
      assert.deepEqual(original, snapshot);
      assert.equal(migrateIndustryAnswers(from, to, emptyIndustryAnswers(from)).reviewIds.length, 0);
    }
  });

  test(`${label}: notes-only and zero-score changed answers need review`, () => {
    const source = profiles.resolveIndustryQuestions("healthcare");
    const target = new Map(profiles.resolveIndustryQuestions("manufacturing").map((q) => [q.id, q.variantKey]));
    const changed = source.find((q) => target.get(q.id) !== q.variantKey);
    assert.ok(changed);
    for (const patch of [{ score: 0 }, { notes: "old sector notes" }, { actionPlan: "old action" }, { evidenceAvailable: "old evidence" }, { evidenceStrength: "interview" }]) {
      const input = emptyIndustryAnswers("healthcare");
      Object.assign(input[changed.id], patch);
      const result = migrateIndustryAnswers("healthcare", "manufacturing", input);
      assert.deepEqual(result.reviewIds, [changed.id]);
      assert.deepEqual(result.answers[changed.id], emptyIndustryAnswers("manufacturing")[changed.id]);
      assert.deepEqual(result.archivedAnswers[changed.id], input[changed.id]);
    }
  });

  test(`${label}: restored state rejects invalid and legacy shapes without inference`, () => {
    const empty = emptyIndustryAnswers("healthcare");
    for (const raw of [null, undefined, [], "legacy", 3, { answers: { q001: { score: 4 } } }]) {
      assert.deepEqual(validateIndustryAnswers("healthcare", raw), empty);
    }
    for (const score of [NaN, Infinity, -Infinity, -1, 5, "4", {}, []]) {
      const restored = validateIndustryAnswers("healthcare", { q001: { score, evidenceStrength: "invalid", notes: 42, actionPlan: {}, evidenceAvailable: [] }, unknown: { score: 3 } });
      assert.deepEqual(restored, empty);
    }
    for (const score of [null, 0, 2.5, 4]) {
      const restored = validateIndustryAnswers("healthcare", { q001: { score, notes: "Preserved", extra: "ignored" } });
      assert.deepEqual(restored.q001, { ...empty.q001, score, notes: "Preserved" });
      assert.equal(restored.q001.evidenceStrength, "none");
    }
    for (const strength of ["none", "interview", "documented", "system", "audited"]) {
      assert.equal(validateIndustryAnswers("healthcare", { q001: { evidenceStrength: strength } }).q001.evidenceStrength, strength);
    }
    assert.deepEqual(validateIndustryAnswers("healthcare", Object.create({ q001: { score: 4 } })), empty);
    const inherited = Object.create({ score: 4, notes: "inherited" });
    assert.deepEqual(validateIndustryAnswers("healthcare", { q001: inherited }), empty);
    const answers = emptyIndustryAnswers("healthcare");
    answers.q001.notes = "Changed";
    assert.equal(answers.q002.notes, "");
    assert.equal(emptyIndustryAnswers("healthcare").q001.notes, "");
  });
}

test("manufacturing contamination checks permit model production deployment", () => {
  assert.doesNotMatch("Banking model production deployment requires approval.", contaminationPatterns.manufacturing);
  for (const text of ["production lines", "production yield", "factory floor", "material movement", "equipment effectiveness"]) {
    assert.match(text, contaminationPatterns.manufacturing);
  }
});

assessmentTests("contract fixture", fixture, loadTs(resolve(directory, "module01IndustryAssessment.ts"), fixture));
const profilePath = resolve(directory, "module01IndustryProfiles.ts");
if (existsSync(profilePath)) {
  assessmentTests("real profiles", loadTs(profilePath), loadTs(resolve(directory, "module01IndustryAssessment.ts")));
} else {
  test("real profiles integration", { skip: "module01IndustryProfiles.ts has not landed yet" }, () => {});
}
