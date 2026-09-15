import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = join(process.cwd(), "apps", "portal", "lib");
const tempDir = mkdtempSync(join(tmpdir(), "module01-seed-data-"));

function compileTs(sourcePath, outputName) {
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  }).outputText;
  const outputPath = join(tempDir, outputName);
  writeFileSync(outputPath, transpiled);
  return require(outputPath);
}

const diagnosticModule = compileTs(join(root, "data-ai-diagnostic.ts"), "data-ai-diagnostic.cjs");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@/lib/data-ai-diagnostic") return diagnosticModule;
  return originalLoad.call(this, request, parent, isMain);
};

let seedModule;
try {
  seedModule = compileTs(join(root, "module01", "module01SeedData.ts"), "module01SeedData.cjs");
} finally {
  Module._load = originalLoad;
}

const {
  seedDatasetOptions,
  seedProfiles,
  seededState,
  seedScoreForQuestion,
  evidenceStrengthForSeed,
  seededQuestionText,
  seededEvidenceRequired,
  seededDomainName,
} = seedModule;
const { dataAiDiagnosticQuestions } = diagnosticModule;

assert.equal(dataAiDiagnosticQuestions.length, 97);
assert.equal(new Set(dataAiDiagnosticQuestions.map((question) => question.id)).size, dataAiDiagnosticQuestions.length);
assert.equal(new Set(dataAiDiagnosticQuestions.map((question) => question.number)).size, dataAiDiagnosticQuestions.length);

assert.equal(seedProfiles.length, 3);
assert.deepEqual(
  seedProfiles.map((profile) => profile.id),
  ["nawah-real-estate", "hayat-health-network", "amana-utilities-group"],
);
assert.deepEqual(
  seedDatasetOptions.map((dataset) => dataset.id),
  ["interview-light", "evidence-enriched", "board-ready"],
);

for (const profile of seedProfiles) {
  assert.equal(profile.context.customerName, profile.label);
  assert(profile.context.businessDomain.length > 0);
  assert(profile.context.operatingScope.length > 40);
  assert(profile.context.strategicPriorities.length > 40);
  assert(profile.context.currentPainPoints.length > 40);
  assert(profile.context.targetAudience.length > 20);
  assert(profile.context.reportPurpose.length > 40);

  for (const domainId of Array.from({ length: 13 }, (_, index) => index + 1)) {
    assert(Number.isInteger(profile.domainScores[domainId]), `${profile.id} missing score for domain ${domainId}`);
    assert(profile.domainEvidence[domainId]?.length > 20, `${profile.id} missing evidence for domain ${domainId}`);
    assert(profile.domainActions[domainId]?.length > 20, `${profile.id} missing action for domain ${domainId}`);
  }

  for (const dataset of seedDatasetOptions) {
    const state = seededState(profile, dataset);
    assert.equal(Object.keys(state).length, dataAiDiagnosticQuestions.length);

    for (const question of dataAiDiagnosticQuestions) {
      const seededQuestion = state[question.id];
      assert(seededQuestion, `${profile.id}/${dataset.id} missing question ${question.id}`);
      assert(seededQuestion.score >= 0 && seededQuestion.score <= 4);
      assert.equal(seededQuestion.score, seedScoreForQuestion(profile, dataset, question));
      assert.equal(seededQuestion.evidenceStrength, evidenceStrengthForSeed(seededQuestion.score, dataset));
      assert(seededQuestion.evidenceAvailable.includes(seededDomainName(profile, question.domainId, question.domainEn)));
      assert(seededQuestion.evidenceAvailable.includes(seededEvidenceRequired(profile, question)));
      assert(seededQuestion.notes.includes(dataset.label));
      assert(seededQuestion.notes.includes(profile.label));
      assert(seededQuestion.actionPlan.length > 40);

      if (dataset.id === "interview-light") {
        assert.equal(seededQuestion.evidenceStrength === "system" || seededQuestion.evidenceStrength === "audited", false);
        assert(seededQuestion.evidenceAvailable.startsWith("Interview seed:"));
        assert(seededQuestion.actionPlan.startsWith("Confirm evidence and ownership first:"));
      }
      if (dataset.id === "evidence-enriched") {
        assert(seededQuestion.evidenceAvailable.startsWith("Evidence-enriched seed:"));
        assert(seededQuestion.actionPlan.startsWith("Prioritise the next remediation wave:"));
      }
      if (dataset.id === "board-ready") {
        assert(seededQuestion.evidenceAvailable.startsWith("Board-ready seed:"));
        assert(seededQuestion.evidenceAvailable.includes("owner sign-off"));
        assert(seededQuestion.actionPlan.startsWith("Move from diagnostic to governed execution:"));
      }
    }
  }
}

const firstQuestion = dataAiDiagnosticQuestions[0];
for (const profile of seedProfiles) {
  const light = seededState(profile, seedDatasetOptions[0])[firstQuestion.id].score;
  const enriched = seededState(profile, seedDatasetOptions[1])[firstQuestion.id].score;
  const boardReady = seededState(profile, seedDatasetOptions[2])[firstQuestion.id].score;
  assert(light <= enriched, `${profile.id} interview-light should not exceed evidence-enriched`);
  assert(enriched <= boardReady, `${profile.id} evidence-enriched should not exceed board-ready`);
}

const source = readFileSync(join(root, "module01", "module01SeedData.ts"), "utf8");
for (const forbidden of ["Sample Client Organisation", "CRTVTA", "LEDAR"]) {
  assert(!source.includes(forbidden), `Seed data should not include ${forbidden}`);
}

const realEstateProfile = seedProfiles.find((profile) => profile.id === "nawah-real-estate");
assert(realEstateProfile);
const realEstateForbidden = /\b(training|trainee|trainer|programmes?|registration|attendance|certifications?)\b/i;
for (const question of dataAiDiagnosticQuestions) {
  const profileQuestion = seededQuestionText(realEstateProfile, question);
  const profileEvidence = seededEvidenceRequired(realEstateProfile, question);
  if (realEstateForbidden.test(question.questionEn) || realEstateForbidden.test(question.evidenceRequired)) {
    assert(!realEstateForbidden.test(profileQuestion), `Real-estate override still contains training wording for ${question.id}`);
    assert(!realEstateForbidden.test(profileEvidence), `Real-estate evidence override still contains training wording for ${question.id}`);
  }
}

console.log("module01 seed data tests passed");
