import {
  dataAiDiagnosticDomains,
  dataAiDiagnosticQuestions,
  type DataAiDiagnosticDomain,
  type DataAiDiagnosticQuestion,
} from "../data-ai-diagnostic";

export type IndustryProfileId = "cross-industry" | "healthcare" | "manufacturing" | "banking" | "real-estate" | "utilities";
export const INDUSTRY_PROFILE_VERSION = "1.0.0";

type IndustryProfile = Readonly<{ id: IndustryProfileId; version: string; labelEn: string; labelAr: string }>;
export const industryProfiles: readonly IndustryProfile[] = Object.freeze([
  { id: "cross-industry", labelEn: "Cross-industry", labelAr: "عابر للقطاعات" },
  { id: "healthcare", labelEn: "Healthcare", labelAr: "الرعاية الصحية" },
  { id: "manufacturing", labelEn: "Manufacturing", labelAr: "التصنيع" },
  { id: "banking", labelEn: "Banking", labelAr: "الخدمات المصرفية" },
  { id: "real-estate", labelEn: "Real Estate", labelAr: "العقارات" },
  { id: "utilities", labelEn: "Utilities", labelAr: "المرافق" },
].map((profile) => Object.freeze({ ...profile, id: profile.id as IndustryProfileId, version: INDUSTRY_PROFILE_VERSION })));

export function isIndustryProfileId(value: unknown): value is IndustryProfileId {
  return typeof value === "string" && industryProfiles.some((profile) => profile.id === value);
}

export function getIndustryProfile(id: IndustryProfileId): IndustryProfile {
  if (!isIndustryProfileId(id)) throw new RangeError("Unknown industry profile");
  return Object.freeze({ ...industryProfiles.find((profile) => profile.id === id)! });
}

type Variant = Readonly<{
  questionEn: string; questionAr: string; evidenceRequired: string; evidenceRequiredAr: string;
}>;
const variant = (questionEn: string, questionAr: string, evidenceRequired: string, evidenceRequiredAr: string): Variant =>
  Object.freeze({ questionEn, questionAr, evidenceRequired, evidenceRequiredAr });

// Translations are keyed by canonical ID, never by array position or a generic fallback.
const evidenceAr: Readonly<Record<string, string>> = Object.freeze({
  q001: "وثيقة الاستراتيجية، خارطة الطريق، الربط بالمبادرات ومؤشرات الأداء",
  q002: "محاضر اللجان، مصفوفة المسؤوليات، أطر تفويض الصلاحيات",
  q003: "خارطة الطريق، خطة الموارد، سجل المبادرات",
  q004: "مؤشرات الأداء، تحقق المنافع، النتائج التشغيلية",
  q005: "مصفوفة القيمة والتعقيد والمخاطر، سجل حالات الاستخدام",
  q006: "قائمة الأنظمة، خرائط تدفق البيانات، تقييم التكامل",
  q007: "تقييم جاهزية التحول، تحليل الفجوات",
  q008: "قاموس البيانات، سجل التصنيف",
  q009: "ميثاق الحوكمة، السياسات المعتمدة",
  q010: "مصفوفة ملكية البيانات، مصفوفة المسؤوليات",
  q011: "ميثاق الحوكمة، الأدوار المحددة، اللجان",
  q012: "مسرد مصطلحات الأعمال، سجل اعتماد التعريفات",
  q013: "سجلات القرارات، مسار التصعيد، سجل المشكلات",
  q014: "قائمة الأنظمة، وثائق المعمارية",
  q015: "خريطة التكامل، سجلات المهام الآلية",
  q016: "وثائق البنية التحتية، سياسة المصدر المعتمد",
  q017: "مخططات المعمارية، مخططات تدفق البيانات",
  q018: "وثائق البيئات، ضوابط الوصول، إدارة التغيير",
  q019: "خطط التعافي من الكوارث، أهداف نقطة التعافي وزمن التعافي، تقارير النسخ الاحتياطي",
  q020: "أبعاد الجودة، قواعد التحقق، نتائج القياس",
  q021: "تقارير إدارة البيانات الرئيسية، تحليلات جودة البيانات",
  q022: "قواعد جودة البيانات، سجلات التحقق، موافقات المالكين",
  q023: "سجل المشكلات، تحليل الأسباب الجذرية، اتفاقية مستوى الخدمة",
  q024: "قواعد إدارة البيانات الرئيسية، جداول البيانات المرجعية، منطق السجل المعتمد",
  q025: "نظام إدارة الهوية، قواعد الربط",
  q026: "تقارير الأثر، تكاليف إعادة العمل، حالات الأخطاء التشغيلية",
  q027: "كتالوج البيانات، مستودع البيانات الوصفية، بيانات النسب",
  q028: "البيانات الوصفية التقنية، مسرد الأعمال، البيانات الوصفية التشغيلية",
  q029: "مخطط نسب البيانات، قواعد التحويل، مسار التدقيق",
  q030: "خرائط تدفق البيانات ونسبها، وثائق التحويل",
  q031: "قاموس البيانات الموحد، مسرد مصطلحات الأعمال",
  q032: "عقود البيانات، وثائق اتفاقيات مستوى الخدمة، تقارير حداثة البيانات",
  q033: "لوحة المؤشرات الموحدة، وثائق ذكاء الأعمال",
  q034: "عينات التقارير، أمثلة التحليل، أوصاف المخرجات",
  q035: "تقارير تحليل التعلم، مصفوفات الكفاءات",
  q036: "قائمة التقارير، حوكمة ذكاء الأعمال، مجموعات البيانات المعتمدة داخلياً",
  q037: "قاموس المؤشرات، المقاييس المعتمدة داخلياً، قواعد التسوية",
  q038: "خرائط العمليات، توثيق الخطوات اليدوية، سجلات الأخطاء",
  q039: "قائمة التقارير التنفيذية، أزمنة الاستجابة، مستوى الأتمتة",
  q040: "كتالوج المؤشرات، قواعد الحساب، اعتماد مالك البيانات",
  q041: "تقييم جاهزية البيانات، تحليل الفجوات",
  q042: "تقارير توافر البيانات التاريخية، تغطية الفترات الزمنية",
  q043: "قائمة حالات الاستخدام المقترحة، الأولويات المبدئية",
  q044: "محفظة حالات استخدام الذكاء الاصطناعي، تصنيف المخاطر، درجة الجاهزية",
  q045: "مصفوفة التقييم، دراسة الجدوى، تقييم المخاطر",
  q046: "سجل النماذج، لوحة المراقبة، اختبارات التحيز، مسار الاعتماد",
  q047: "تقييم جاهزية النماذج التنبؤية، الحد الأدنى لمتطلبات البيانات",
  q048: "مؤشرات أداء النماذج، تقرير أثر الأعمال، لوحة المراقبة",
  q049: "قائمة الأدوات، قائمة التراخيص، خريطة المعمارية",
  q050: "خريطة التكامل، واجهات برمجة التطبيقات، أدلة سير العمل",
  q051: "تقارير استخدام التراخيص، خطة ترشيد الأدوات",
  q052: "سجلات الوصول، سجلات التدقيق، التحكم بالوصول القائم على الأدوار، إنفاذ السياسات",
  q053: "معايير الاختيار، مراجعة المعمارية، حوكمة المشتريات",
  q054: "الهيكل التنظيمي، أوصاف الأدوار، مصفوفة القدرات",
  q055: "تقييم المهارات، خطة التوظيف، خطة تنمية مهارات الموظفين",
  q056: "مصفوفة المسؤوليات، نموذج التسليم، ملكية المنتج",
  q057: "كتالوج منتجات البيانات، المالكون، قائمة الأعمال المتراكمة، مقاييس الخدمة",
  q058: "أدلة التشغيل، قاموس البيانات، مستودع المعمارية",
  q059: "ضوابط الأمن، سياسات الوصول، سجلات الحماية",
  q060: "سياسة التصنيف، وسوم التصنيف، قواعد التعامل",
  q061: "سجلات الوصول، سجلات التدقيق، أدلة المراقبة",
  q062: "سجل الامتثال، السياسات، ربط الضوابط بالمتطلبات",
  q063: "إشعارات الخصوصية، سجلات الموافقة، تقييم أثر حماية البيانات، سياسة الاحتفاظ",
  q064: "اتفاقيات مشاركة البيانات، مسار الموافقات، مسار التدقيق",
  q065: "ضوابط نظام إدارة أمن المعلومات، مراجعات الوصول، أدلة التشفير، سجلات التدقيق",
  q066: "قائمة المصادر الكاملة، خريطة المعمارية، سجل المالكين",
  q067: "قائمة المصادر الرسمية، تصنيف المصادر",
  q068: "تحليل مصادر البيانات، خريطة المصادر الداخلية والخارجية",
  q069: "اتفاقيات التبادل، وثائق التكامل، بروتوكولات الاتصال",
  q070: "قائمة المصادر الحرجة، تقييم الأثر، خطط الاستمرارية",
  q071: "تقييم قيمة البيانات، تحليل الفجوات، قائمة البيانات غير المستخدمة",
  q072: "مخططات تدفق البيانات، توثيق آليات النقل",
  q073: "سياسة تحديث البيانات، جداول المهام الآلية",
  q074: "خرائط العمليات، تقييم المخاطر التشغيلية، معدلات الأخطاء اليدوية",
  q075: "تقارير أثر تنمية القدرات، نماذج قياس الأثر",
  q076: "قائمة مستهلكي البيانات، تحليل أنماط الاستخدام، طلبات البيانات المتكررة",
  q077: "سجل القرارات المعتمدة على البيانات، تحليل الاعتماديات",
  q078: "تقارير دورة الخدمة الكاملة، نظام تتبع الأثر",
  q079: "تقييم بنية البيانات، تصنيف البيانات المنظمة وغير المنظمة",
  q080: "خارطة الطريق، المعالم الرئيسية، الميزانية، المالكون",
  q081: "سجل المخاطر، الاعتماديات، خطط المعالجة",
  q082: "خطة إدارة التغيير، مقاييس التبني، تنمية مهارات الموظفين، رواد التغيير",
  q083: "خريطة المنافع، مؤشرات الأداء، تقارير الأداء",
  q084: "تقييم جاهزية بيانات الذكاء الاصطناعي، درجة الجاهزية، تحليل الفجوات",
  q085: "دراسات القيمة، سجل المنافع، مؤشرات الأداء المعتمدة، أوراق لجنة الاستثمار",
  q086: "مصفوفة حقوق القرار، ميثاق الحوكمة، سجل الاستثناءات، مسار الموافقات",
  q087: "معمارية الوضع الحالي، مخطط الوضع المستهدف، كتالوج التكامل، تصميم طبقة التقارير",
  q088: "سجل عناصر البيانات الحرجة، قواعد الجودة، حدود القبول، سجل المشكلات والتصعيد",
  q089: "خرائط النسب، تتبع المصدر إلى التقرير، تعريفات المؤشرات، مقتطفات الكتالوج",
  q090: "قائمة اللوحات المعتمدة داخلياً، اعتماد المؤشرات، اتفاقية مستوى خدمة التحديث، ملاحظات القيود المعروفة",
  q091: "قائمة تحقق جاهزية الذكاء الاصطناعي، تقييم مخاطر النماذج، مراجعة الخصوصية، سجل الاعتماد",
  q092: "تقييم قدرات المنصات، قائمة الأدوات، خريطة تغطية دورة الحياة، ضوابط التكامل",
  q093: "كتالوج الأدوار، مصفوفة المسؤوليات، الأوصاف الوظيفية، أهداف الأداء، خطة القدرات",
  q094: "سجل الضوابط، سجلات الوصول، تقييمات الخصوصية، أدلة التدقيق، سجلات المعالجة",
  q095: "سجل التدفقات الحرجة، مالكو المصادر، جدول التحديث، خريطة الاعتماديات، تقييم الاستمرارية",
  q096: "محفظة حالات الاستخدام، لوحة التبني، مقاييس القيمة، أدلة أثر القرارات",
  q097: "عملية بوابات المراحل، موافقات التمويل، اعتماد الأدلة، لوحة متابعة المنافع",
});

const core: Readonly<Record<string, Variant>> = {
  q006: variant("Can data needed for the selected operating scope be accessed and combined with documented controls?", "هل يمكن الوصول إلى البيانات اللازمة لنطاق التشغيل المحدد ودمجها بضوابط موثقة؟", "Systems list, data flow maps, integration assessment", evidenceAr.q006),
  q014: variant("Which systems support the selected operating scope, and where are authoritative records and material handoffs documented?", "ما الأنظمة التي تدعم نطاق التشغيل المحدد، وأين توثق السجلات المعتمدة ونقاط تسليم البيانات المهمة؟", "Dated system inventory, process-to-system map, owners, interface samples", "قائمة أنظمة مؤرخة، خريطة ربط العمليات بالأنظمة، المالكون، عينات الواجهات"),
  q015: variant("How are automated and manual data exchanges controlled and reconciled?", "كيف تضبط عمليات تبادل البيانات الآلية واليدوية وتتم تسويتها؟", "Integration map, transfer logs, reconciliation samples", "خريطة التكامل، سجلات النقل، عينات التسوية"),
  q016: variant("Are authoritative data sources designated and reconciled across the architecture?", "هل تحدد مصادر البيانات المعتمدة وتتم تسويتها عبر المعمارية؟", "Architecture documents, source ownership, reconciliation rules", "وثائق المعمارية، ملكية المصادر، قواعد التسوية"),
  q022: variant("Are validation rules applied to data sources and KPIs with reviewed results?", "هل تطبق قواعد التحقق على مصادر البيانات والمؤشرات مع مراجعة النتائج؟", "Data quality rules, validation logs, owner approvals", evidenceAr.q022),
  q024: variant("Are governed master records and reference lists maintained for priority business entities and classifications?", "هل تدار السجلات الرئيسية والقوائم المرجعية بحوكمة للكيانات والتصنيفات ذات الأولوية؟", "Master-data rules, reference tables, authoritative-record logic, change approvals", "قواعد البيانات الرئيسية، الجداول المرجعية، منطق السجل المعتمد، موافقات التغيير"),
  q025: variant("How are priority entities consistently identified and reconciled across relevant systems, including changes over time?", "كيف تحدد هوية الكيانات ذات الأولوية وتتم تسويتها باتساق بين الأنظمة المعنية، بما يشمل التغيرات عبر الزمن؟", "Identifier rules, crosswalks, sampled matched and unmatched records, exception resolutions", "قواعد المعرفات، جداول الربط، عينات السجلات المتطابقة وغير المتطابقة، معالجة الاستثناءات"),
  q028: variant("Are technical, business and operational metadata maintained consistently across relevant repositories?", "هل تحفظ البيانات الوصفية التقنية والتجارية والتشغيلية باتساق عبر المستودعات المعنية؟", "Technical metadata, business glossary, operational metadata", evidenceAr.q028),
  q033: variant("Do executive dashboards present agreed operational, quality and outcome indicators for priority decisions?", "هل تعرض اللوحات التنفيذية مؤشرات تشغيلية ومؤشرات جودة ونتائج متفقاً عليها للقرارات ذات الأولوية؟", "Executive dashboard samples, indicator definitions, decision-use records", "عينات اللوحات التنفيذية، تعريفات المؤشرات، سجلات الاستخدام في القرارات"),
  q035: variant("Can data reveal operational capability gaps to support planning decisions?", "هل تكشف البيانات فجوات القدرات التشغيلية لدعم قرارات التخطيط؟", "Capability gap analysis, capacity measures, planning decision records", "تحليل فجوات القدرات، مقاييس الطاقة الاستيعابية، سجلات قرارات التخطيط"),
  q047: variant("For a named predictive use case, what demonstrates adequate data coverage, target quality and representative validation?", "لحالة استخدام تنبؤية محددة، ما الذي يثبت كفاية تغطية البيانات وجودة المتغير المستهدف وتمثيل بيانات التحقق؟", "Dataset profile, provenance, label assessment, temporal and site validation splits, leakage checks, baseline results", "ملف مجموعة البيانات، مصدرها، تقييم التسميات، تقسيمات التحقق الزمنية والمكانية، فحوص تسرب البيانات، نتائج خط الأساس"),
  q055: variant("Is there a skills gap between data strategy requirements and current team capabilities?", "هل توجد فجوة مهارية بين متطلبات استراتيجية البيانات وقدرات الفريق الحالية؟", "Skills assessment, hiring plan, workforce learning plan", evidenceAr.q055),
  q059: variant("How are personal and commercially sensitive records protected through purpose-based access controls and reviews?", "كيف تحمى السجلات الشخصية والحساسة تجارياً بضوابط وصول ومراجعات مرتبطة بالغرض؟", "Classification, purpose and access matrix, access reviews, protection records", "التصنيف، مصفوفة الأغراض والوصول، مراجعات الوصول، سجلات الحماية"),
  q062: variant("How is regulatory applicability determined for the selected jurisdiction and activities, and how are confirmed obligations mapped to controls?", "كيف يحدد انطباق المتطلبات التنظيمية وفق الولاية القضائية والأنشطة المحددة، وكيف تربط الالتزامات المؤكدة بالضوابط؟", "Applicability assessment, reviewer rationale, confirmed obligations, control mapping", "تقييم الانطباق، مبررات المراجع، الالتزامات المؤكدة، ربط الضوابط"),
  q069: variant("What data is exchanged with external parties, for which approved purposes and under whose accountability?", "ما البيانات المتبادلة مع الأطراف الخارجية، ولأي أغراض معتمدة، وتحت مسؤولية من؟", "Exchange agreements, integration documents, communication protocols, accountable owners", "اتفاقيات التبادل، وثائق التكامل، بروتوكولات الاتصال، المالكون المسؤولون"),
  q075: variant("Can use of data in decisions be linked to operational performance and outcome quality?", "هل يمكن ربط استخدام البيانات في القرارات بالأداء التشغيلي وجودة النتائج؟", "Decision-impact reports, outcome measures, attribution methods", "تقارير أثر القرارات، مقاييس النتائج، أساليب إسناد الأثر"),
  q078: variant("Can an in-scope service or operational lifecycle be traced from initiation to outcome measurement?", "هل يمكن تتبع دورة خدمة أو عملية ضمن النطاق من بدايتها إلى قياس نتائجها؟", "Lifecycle maps, linked event records, outcome tracking reports", "خرائط دورة الحياة، سجلات الأحداث المترابطة، تقارير تتبع النتائج"),
  q082: variant("How is adoption of new data assets, dashboards and policies ensured across business units?", "كيف يضمن تبني أصول البيانات واللوحات والسياسات الجديدة عبر وحدات الأعمال؟", "Change management plan, adoption metrics, workforce learning, champions", evidenceAr.q082),
  q086: variant("Who approves definitions, authoritative sources and quality exceptions, and can a recent decision demonstrate those rights operating?", "من يعتمد التعريفات والمصادر المعتمدة واستثناءات الجودة، وهل يثبت قرار حديث ممارسة هذه الصلاحيات؟", "Approved responsibility matrix, decision record, exception owner and closure trail", "مصفوفة مسؤوليات معتمدة، سجل قرار، مالك الاستثناء ومسار إغلاقه"),
  q090: variant("For a priority decision, how is its report validated for definitions, lineage, freshness and limitations before use?", "لقرار ذي أولوية، كيف يتحقق من تعريفات تقريره ونسب بياناته وحداثته وقيوده قبل الاستخدام؟", "Signed metric definition, source-to-output reconciliation, refresh history, limitation notice", "تعريف مؤشر معتمد، تسوية المصدر بالمخرجات، سجل التحديث، بيان القيود"),
};

// First release keeps all 97 concepts. Scope qualifiers do not activate or hide questions.
const sectors: Record<Exclude<IndustryProfileId, "cross-industry">, Readonly<Record<string, Variant>>> = {
  healthcare: {
    q014: variant("Which systems support the healthcare services and administrative workflows in scope, and who owns their data and interfaces?", "ما الأنظمة التي تدعم الخدمات الصحية وسير العمل الإداري ضمن النطاق، ومن يملك مسؤولية بياناتها وواجهاتها؟", "System inventory, workflow map, interface catalogue, accountable owners; redacted artefacts only", "قائمة الأنظمة، خريطة سير العمل، كتالوج الواجهات، المالكون المسؤولون؛ وثائق منقحة لحجب البيانات الحساسة فقط"),
    q025: variant("For patient records in scope, how are identifiers linked across systems with duplicate, incorrect-match and merge-reversal controls?", "لسجلات المرضى ضمن النطاق، كيف تربط المعرفات بين الأنظمة بضوابط التكرار والمطابقة الخاطئة والتراجع عن الدمج؟", "Redacted identifier mappings, matching rules, reviewed exceptions, merge and reversal audit samples", "خرائط معرفات منقحة لحجب الهوية، قواعد المطابقة، الاستثناءات المراجعة، عينات تدقيق الدمج والتراجع عنه"),
    q059: variant("For patient-identifiable data in scope, how is access restricted, reviewed and audited for each approved purpose?", "للبيانات المحددة لهوية المرضى ضمن النطاق، كيف يقيد الوصول ويراجع ويدقق لكل غرض معتمد؟", "Purpose and access matrix, access reviews, redacted audit samples, exception approvals", "مصفوفة الأغراض والوصول، مراجعات الوصول، عينات تدقيق منقحة لحجب الهوية، موافقات الاستثناءات"),
    q090: variant("Are healthcare dashboards approved for indicator definitions, denominators, exclusions, freshness and limitations before use?", "هل تعتمد لوحات المؤشرات الصحية من حيث تعريفات المؤشرات ومقاماتها والاستبعادات وحداثة البيانات والقيود قبل الاستخدام؟", "Indicator specifications, source reconciliation, owner approval, refresh records, limitation notices", "مواصفات المؤشرات، تسوية المصادر، موافقة المالك، سجلات التحديث، بيانات القيود"),
    q091: variant("Does each proposed healthcare AI use case have documented intended use, data suitability, validation, human oversight and stop criteria?", "هل لكل حالة استخدام مقترحة للذكاء الاصطناعي في الرعاية الصحية غرض موثق وتقييم لملاءمة البيانات وتحقق من الأداء وإشراف بشري ومعايير للإيقاف؟", "Use-case dossier, population and site validation, leakage checks, oversight responsibilities, monitoring and rollback records", "ملف حالة الاستخدام، تحقق على الفئات والمواقع، فحوص التسرب، مسؤوليات الإشراف، سجلات المراقبة والتراجع"),
  },
  manufacturing: {
    q014: variant("What systems and manual records support in-scope production planning, execution, quality, maintenance and material movement, and who owns their data?", "ما الأنظمة والسجلات اليدوية التي تدعم تخطيط الإنتاج وتنفيذه والجودة والصيانة وحركة المواد ضمن النطاق، ومن يملك بياناتها؟", "Site-scoped inventory, ownership register, architecture diagrams, sample interfaces for systems present", "قائمة حسب نطاق المواقع، سجل الملكية، مخططات المعمارية، عينات واجهات الأنظمة الموجودة"),
    q025: variant("Are governed identifiers and cross-system mappings maintained for materials, equipment, production orders and applicable lots, batches or serialised units?", "هل تحفظ معرفات محكومة وروابط بين الأنظمة للمواد والمعدات وأوامر الإنتاج وما ينطبق من دفعات أو وحدات ذات أرقام تسلسلية؟", "Identifier rules, mapping tables, duplicate checks, sampled source reconciliation", "قواعد المعرفات، جداول الربط، فحوص التكرار، عينات تسوية المصادر"),
    q088: variant("Are critical production and quality data governed by thresholds, owners and escalation paths, including units, timestamps, missing readings and measurement validity where relevant?", "هل تحكم بيانات الإنتاج والجودة الحرجة حدود قبول ومالكون ومسارات تصعيد، بما يشمل الوحدات والطوابع الزمنية والقراءات المفقودة وصلاحية القياس عند الاقتضاء؟", "Critical-element register, validation rules, sampled exceptions, resolution logs, applicable calibration records", "سجل العناصر الحرجة، قواعد التحقق، عينات الاستثناءات، سجلات المعالجة، سجلات المعايرة المنطبقة"),
    q090: variant("Are production dashboards approved for KPI definitions, source reconciliation, refresh timing and limitations, including yield, scrap, downtime or equipment effectiveness where relevant?", "هل تعتمد لوحات الإنتاج لتعريفات المؤشرات وتسوية المصادر وتوقيت التحديث والقيود، بما يشمل المردود والهدر والتوقف أو فعالية المعدات عند الاقتضاء؟", "KPI dictionary, calculation versions, planned-time and exclusion rules where relevant, reconciliation samples, refresh monitoring, owner sign-off", "قاموس المؤشرات، إصدارات الحساب، قواعد الوقت المخطط والاستبعادات عند الاقتضاء، عينات التسوية، مراقبة التحديث، اعتماد المالك"),
    q091: variant("Before an industrial AI use case advances, are data suitability, lineage, relevant privacy, operating risks, human approval and rollback arrangements assessed?", "قبل تقدم حالة استخدام للذكاء الاصطناعي الصناعي، هل تقيم ملاءمة البيانات ونسبها والخصوصية ذات الصلة والمخاطر التشغيلية والموافقة البشرية وترتيبات التراجع؟", "Use-case gate record, dataset lineage, machine/product/time validation, error-impact assessment, approval, rollback test", "سجل بوابة حالة الاستخدام، نسب مجموعة البيانات، تحقق حسب الآلة والمنتج والزمن، تقييم أثر الخطأ، الاعتماد، اختبار التراجع"),
  },
  banking: {
    q014: variant("Which systems create, maintain and exchange customer, account, transaction, finance and risk data within the selected banking scope?", "ما الأنظمة التي تنشئ بيانات العملاء والحسابات والمعاملات والمالية والمخاطر وتحفظها وتتبادلها ضمن النطاق المصرفي المحدد؟", "System inventory, accountable owners, architecture diagrams, interface register, authoritative sources", "قائمة الأنظمة، المالكون المسؤولون، مخططات المعمارية، سجل الواجهات، المصادر المعتمدة"),
    q088: variant("Are in-scope critical customer, account, transaction and balance data governed by quality rules, acceptance thresholds, reconciliation controls and exception escalation?", "هل تحكم بيانات العملاء والحسابات والمعاملات والأرصدة الحرجة ضمن النطاق قواعد جودة وحدود قبول وضوابط تسوية وتصعيد للاستثناءات؟", "Critical-element register, completeness and duplication rules, currency and business-date definitions, reconciliation results, dated exception resolutions", "سجل العناصر الحرجة، قواعد الاكتمال والتكرار، تعريفات العملات وتاريخ الأعمال، نتائج التسوية، معالجة الاستثناءات المؤرخة"),
    q089: variant("Can a critical banking management, finance or risk metric be traced from report to source records, including transformations, aggregation and manual adjustments?", "هل يمكن تتبع مؤشر مصرفي حرج للإدارة أو المالية أو المخاطر من التقرير إلى سجلات المصدر، بما يشمل التحويلات والتجميع والتعديلات اليدوية؟", "Source-to-report mapping, metric definitions, versioned transformation logic, adjustment approvals, reproducible sample trace", "خريطة المصدر إلى التقرير، تعريفات المؤشرات، إصدارات منطق التحويل، موافقات التعديلات، عينة تتبع قابلة لإعادة التنفيذ"),
    q091: variant("Before a banking AI use case progresses to pilot or production, is there a documented gate for data suitability, privacy, lineage, model risk, independent challenge and accountable human approval?", "قبل انتقال حالة استخدام للذكاء الاصطناعي المصرفي إلى التجربة أو الإنتاج، هل توجد بوابة موثقة لملاءمة البيانات والخصوصية والنسب ومخاطر النماذج والمراجعة النقدية المستقلة والموافقة البشرية المسؤولة؟", "Use-case inventory, stage checklist, validation findings, limitations, approval records, monitoring thresholds, fallback arrangements", "قائمة حالات الاستخدام، قائمة تحقق المرحلة، نتائج التحقق، القيود، سجلات الاعتماد، حدود المراقبة، ترتيبات البديل"),
    q094: variant("Are access, segregation of duties, permitted use, retention and extraction controls for customer and transaction data evidenced in reporting and analytics operations?", "هل تثبت ضوابط الوصول وفصل المهام والاستخدام المسموح والاحتفاظ والاستخراج لبيانات العملاء والمعاملات في عمليات التقارير والتحليلات؟", "Access reviews, role matrix, masked test-data records, extraction logs, retention implementation records, remediation samples", "مراجعات الوصول، مصفوفة الأدوار، سجلات بيانات الاختبار المحجوبة الهوية، سجلات الاستخراج، سجلات تطبيق الاحتفاظ، عينات المعالجة"),
  },
  "real-estate": {
    q014: variant("Which systems hold in-scope property, unit, lease, tenant, project and maintenance data, and which is authoritative for each?", "ما الأنظمة التي تحتفظ ببيانات العقارات والوحدات والعقود الإيجارية والمستأجرين والمشروعات والصيانة ضمن النطاق، وما المصدر المعتمد لكل منها؟", "System inventory, business owners, source-of-record decisions, integration map", "قائمة الأنظمة، مالكو الأعمال، قرارات المصادر المعتمدة، خريطة التكامل"),
    q025: variant("Are stable identifiers and controlled cross-system mappings maintained for each in-scope property, unit, lease and party?", "هل توجد معرفات ثابتة وروابط مضبوطة بين الأنظمة لكل عقار ووحدة وعقد إيجار وطرف ضمن النطاق؟", "Identifier rules, sampled mappings, duplicate-resolution records, effective-dated property and unit changes", "قواعد المعرفات، عينات الربط، سجلات معالجة التكرار، تغييرات العقارات والوحدات المؤرخة بتاريخ السريان"),
    q090: variant("For property-management reporting in scope, are dashboards approved against reporting dates, occupancy measures, area conventions, source reconciliations and limitations?", "لتقارير إدارة العقارات ضمن النطاق، هل تعتمد اللوحات وفق تواريخ التقارير ومقاييس الإشغال وأسس قياس المساحات وتسويات المصادر والقيود؟", "KPI glossary, denominator definitions, reconciliation samples, refresh records, owner approval", "مسرد المؤشرات، تعريفات المقامات، عينات التسوية، سجلات التحديث، موافقة المالك"),
    q047: variant("For each proposed occupancy or maintenance prediction in scope, is historical data sufficiently complete, representative and time-correct for independent validation?", "لكل تنبؤ مقترح بالإشغال أو الصيانة ضمن النطاق، هل البيانات التاريخية مكتملة وممثلة بالقدر الكافي وصحيحة زمنياً للتحقق المستقل؟", "Use-case specification, target definitions, timestamp audit, missingness analysis, property/time-separated validation plan", "مواصفات حالة الاستخدام، تعريفات المتغير المستهدف، تدقيق الطوابع الزمنية، تحليل البيانات المفقودة، خطة تحقق مفصولة حسب العقار والزمن"),
    q059: variant("How are personal and commercially sensitive property records protected across in-scope owners, managing agents, contractors and analytics users?", "كيف تحمى السجلات العقارية الشخصية والحساسة تجارياً بين الملاك ووكلاء الإدارة والمقاولين ومستخدمي التحليلات ضمن النطاق؟", "Classification, access matrix, segregation tests, sharing approvals, retention decisions, access-review logs", "التصنيف، مصفوفة الوصول، اختبارات الفصل، موافقات المشاركة، قرارات الاحتفاظ، سجلات مراجعة الوصول"),
  },
  utilities: {
    q014: variant("Which systems support your declared customer, asset, network and operational responsibilities, including outsourced activities?", "ما الأنظمة التي تدعم مسؤولياتكم المعلنة تجاه العملاء والأصول والشبكات والعمليات، بما يشمل الأنشطة المسندة خارجياً؟", "Dated system inventory, process-to-system map, interface boundaries, accountable owners", "قائمة أنظمة مؤرخة، خريطة ربط العمليات بالأنظمة، حدود الواجهات، المالكون المسؤولون"),
    q025: variant("How are applicable customers, accounts, service points, meters and physical assets uniquely identified and linked across systems over time?", "كيف تحدد هوية ما ينطبق من عملاء وحسابات ونقاط خدمة وعدادات وأصول مادية بصورة فريدة وتربط عبر الأنظمة بمرور الزمن؟", "Identifier rules, crosswalks, sampled reconciliations, duplicate resolution, replacement history", "قواعد المعرفات، جداول الربط، عينات التسوية، معالجة التكرار، سجل الاستبدال"),
    q088: variant("Who approves and monitors thresholds for critical operational data, including applicable asset relationships, locations, timestamps, measurements and work-order states?", "من يعتمد ويراقب حدود قبول البيانات التشغيلية الحرجة، بما يشمل ما ينطبق من علاقات الأصول والمواقع والطوابع الزمنية والقياسات وحالات أوامر العمل؟", "Owner-approved rules, units and time conventions, recent test results, exception logs, remediation closure", "قواعد معتمدة من المالك، أسس الوحدات والزمن، نتائج اختبارات حديثة، سجلات الاستثناءات، إغلاق المعالجة"),
    q090: variant("Are decision dashboards approved against defined sources, calculation rules, freshness and limitations for applicable service, reliability, maintenance or customer outcomes?", "هل تعتمد لوحات القرار وفق مصادر وقواعد حساب وحداثة وقيود محددة لما ينطبق من نتائج الخدمة والاعتمادية والصيانة والعملاء؟", "KPI definitions, reconciliation samples, refresh records, owner sign-off, decision-use records", "تعريفات المؤشرات، عينات التسوية، سجلات التحديث، اعتماد المالك، سجلات الاستخدام في القرارات"),
    q047: variant("For each proposed prediction, is historical data representative of the operating conditions and outcomes the model must support?", "لكل تنبؤ مقترح، هل تمثل البيانات التاريخية ظروف التشغيل والنتائج التي يجب أن يدعمها النموذج؟", "Dataset profile, provenance, missingness, event counts, label definitions, temporal holdout results, baseline comparison", "ملف مجموعة البيانات، مصدرها، البيانات المفقودة، أعداد الأحداث، تعريفات التسميات، نتائج التحقق ببيانات زمنية محجوزة، مقارنة خط الأساس"),
  },
};

import { functionalQuestions, type FunctionalQuestion } from "./module01FunctionalDomains";
type ResolvedQuestion = FunctionalQuestion;
// Snapshot defaults so neither callers nor later bank edits can alter an already loaded catalogue.
const questions = dataAiDiagnosticQuestions.map((question) => Object.freeze({ ...question }));
const domains = dataAiDiagnosticDomains.map((domain) => Object.freeze({
  ...domain,
  ...(domain.id === 12 ? { nameEn: "Decision Enablement & Data Adoption", nameAr: "تمكين القرار وتبني البيانات" } : {}),
}));

export function resolveIndustryDomains(id: IndustryProfileId): DataAiDiagnosticDomain[] {
  getIndustryProfile(id);
  // Keep the required Array API while enforcing immutable results at runtime.
  return Object.freeze(domains.map((domain) => Object.freeze({ ...domain }))) as DataAiDiagnosticDomain[];
}

export function resolveIndustryQuestions(id: IndustryProfileId, functions: string[] = []): Array<ResolvedQuestion> {
  getIndustryProfile(id);
  const overrides: Readonly<Record<string, Variant>> = id === "cross-industry" ? {} : sectors[id];
  return Object.freeze(questions.map<ResolvedQuestion>((question) => {
    const specific = overrides[question.id];
    const text = specific ?? core[question.id];
    const translation = text?.evidenceRequiredAr ?? evidenceAr[question.id];
    if (!translation) throw new Error(`Missing Arabic evidence: ${question.id}`);
    const domain = domains.find((entry) => entry.id === question.domainId)!;
    return Object.freeze({
      ...question,
      ...text,
      domainEn: domain.nameEn,
      domainAr: domain.nameAr,
      evidenceRequiredAr: translation,
      // Bump the catalogue version whenever meaning, evidence, scope or rubric changes.
      variantKey: `${INDUSTRY_PROFILE_VERSION}:${specific ? id : "core"}:${question.id}`,
    });
  }).concat(functionalQuestions(id, functions).map((question) => {
    const domain = domains.find((entry) => entry.id === question.domainId)!;
    return Object.freeze({ ...question, domainEn: domain.nameEn, domainAr: domain.nameAr });
  }))) as ResolvedQuestion[];
}
