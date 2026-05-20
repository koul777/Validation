const sampleRequirements = `전자 배치기록은 제조 단계별 입력값을 저장하고 수정 이력을 남겨야 한다.
작업자는 개인 계정으로 로그인하고 역할에 따라 메뉴와 기능 접근이 제한되어야 한다.
QA 검토자는 배치기록 검토 완료 시 전자서명으로 승인해야 한다.
시스템은 중요 마스터 데이터 변경 시 변경 전후 값, 변경자, 변경일시, 사유를 감사추적에 기록해야 한다.
제조번호, 품목코드, 유효기간 등 필수 항목은 누락 시 저장할 수 없어야 한다.
LIMS 시험 결과를 인터페이스로 수신하여 해당 배치기록에 연결해야 한다.
일일 백업이 수행되고 복구 테스트 결과가 문서화되어야 한다.
승인된 배치기록은 PDF로 출력되어 장기 보관되어야 한다.`;

const sampleReference = `SOP-QA-CSV-001: CSV 산출물은 URS, 위험평가, IQ/OQ/PQ, 추적성 매트릭스, 최종보고서를 포함한다.
SOP-DI-003: 전자기록은 ALCOA+ 원칙에 따라 귀속성, 가독성, 동시성, 원본성, 정확성을 확보해야 한다.
SOP-IT-BCP-010: GxP 시스템 백업은 매일 수행하며 연 1회 이상 복구 테스트를 수행한다.
템플릿: 테스트 스크립트는 목적, 전제조건, 절차, 기대결과, 실제결과, 증거, 판정 항목을 포함한다.`;

const categoryRules = [
  {
    name: "전자서명",
    keywords: ["전자서명", "서명", "승인", "approval", "sign"],
    risk: "승인 책임과 기록 귀속성이 불명확해져 전자기록 신뢰성이 저하될 수 있다.",
    mitigation: "고유 사용자 계정, 비밀번호 재확인, 서명 의미 표시, 서명 로그 보존을 검증한다.",
    testType: "OQ",
  },
  {
    name: "감사추적",
    keywords: ["감사추적", "audit", "이력", "변경 전후", "수정 이력"],
    risk: "중요 데이터 변경 근거가 남지 않아 데이터 무결성 위반 가능성이 있다.",
    mitigation: "생성, 수정, 삭제, 승인 이벤트의 감사추적 항목과 조회 권한을 검증한다.",
    testType: "OQ",
  },
  {
    name: "접근권한",
    keywords: ["권한", "로그인", "role", "역할", "계정", "접근"],
    risk: "권한 없는 사용자가 GxP 데이터를 생성, 변경 또는 승인할 수 있다.",
    mitigation: "역할 기반 접근제어, 계정 잠금, 퇴사자 계정 비활성화 절차를 검증한다.",
    testType: "OQ",
  },
  {
    name: "데이터 무결성",
    keywords: ["필수", "누락", "저장", "데이터", "ALCOA", "입력값", "마스터"],
    risk: "부정확하거나 불완전한 데이터가 저장되어 품질 의사결정에 영향을 줄 수 있다.",
    mitigation: "필수값, 형식, 범위, 중복 입력 제한과 오류 메시지를 검증한다.",
    testType: "OQ",
  },
  {
    name: "인터페이스",
    keywords: ["인터페이스", "수신", "전송", "LIMS", "ERP", "연계", "API"],
    risk: "시스템 간 데이터 누락, 중복 또는 변환 오류로 기록 불일치가 발생할 수 있다.",
    mitigation: "정상, 오류, 재처리, 중복 수신 시나리오와 인터페이스 로그를 검증한다.",
    testType: "OQ",
  },
  {
    name: "백업복구",
    keywords: ["백업", "복구", "보관", "장기", "retention", "restore"],
    risk: "장애 발생 시 전자기록을 복구하지 못해 기록 보존 요구사항을 충족하지 못할 수 있다.",
    mitigation: "백업 스케줄, 백업 결과 확인, 복구 절차, 복구 증거를 검증한다.",
    testType: "IQ",
  },
  {
    name: "출력보고서",
    keywords: ["PDF", "출력", "보고서", "인쇄", "export"],
    risk: "출력물이 원본 전자기록과 불일치하거나 승인 상태를 명확히 표시하지 못할 수 있다.",
    mitigation: "출력 필드, 버전, 승인 정보, 페이지 정보, 보관 형식을 검증한다.",
    testType: "PQ",
  },
];

const defaultRequirements = [
  "시스템은 GxP 중요 데이터를 정확하고 완전하게 저장해야 한다.",
  "시스템은 사용자 역할에 따라 접근 권한을 제한해야 한다.",
  "시스템은 중요 데이터 변경에 대한 감사추적을 제공해야 한다.",
  "시스템은 승인 완료된 기록을 조회하고 출력할 수 있어야 한다.",
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const emptyAiReview = () => ({
  status: "idle",
  text: "",
  error: "",
  model: "",
  requestedAt: "",
});

let generated = {
  context: {},
  requirements: [],
  risks: [],
  tests: [],
  trace: [],
  report: "",
  prompt: "",
  aiReview: emptyAiReview(),
};

let aiRunning = false;

function init() {
  $("#requirementInput").value = sampleRequirements;
  $("#referenceInput").value = sampleReference;
  loadOpenAiSettings();
  bindEvents();
  updateLineCount();
  generateAll();
}

function bindEvents() {
  $("#generateBtn").addEventListener("click", generateAll);
  $("#runOpenAiBtn").addEventListener("click", runOpenAiReview);
  $("#loadSampleBtn").addEventListener("click", () => {
    $("#requirementInput").value = sampleRequirements;
    $("#referenceInput").value = sampleReference;
    updateLineCount();
    generateAll();
    showToast("예제 시나리오를 불러왔습니다.");
  });
  $("#copyPromptBtn").addEventListener("click", copyPrompt);
  $("#downloadMdBtn").addEventListener("click", downloadMarkdown);
  $("#exportCsvBtn").addEventListener("click", exportTraceCsv);
  $("#requirementInput").addEventListener("input", updateLineCount);
  $("#openaiApiKey").addEventListener("input", persistOpenAiSettings);
  $("#openaiModel").addEventListener("input", persistOpenAiSettings);
  $("#openaiMaxTokens").addEventListener("input", persistOpenAiSettings);
  $("#rememberOpenAiKey").addEventListener("change", persistOpenAiSettings);
  $("#toggleApiKeyBtn").addEventListener("click", toggleApiKeyVisibility);
  $("#clearApiKeyBtn").addEventListener("click", clearApiKey);
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
}

function loadOpenAiSettings() {
  try {
    $("#openaiApiKey").value = sessionStorage.getItem("csvOpenAiApiKey") || "";
    $("#openaiModel").value = sessionStorage.getItem("csvOpenAiModel") || $("#openaiModel").value;
    $("#openaiMaxTokens").value = sessionStorage.getItem("csvOpenAiMaxTokens") || $("#openaiMaxTokens").value;
  } catch (error) {
    // 일부 브라우저의 보안 설정에서 sessionStorage가 차단될 수 있다.
  }
}

function persistOpenAiSettings() {
  try {
    sessionStorage.setItem("csvOpenAiModel", $("#openaiModel").value.trim());
    sessionStorage.setItem("csvOpenAiMaxTokens", $("#openaiMaxTokens").value.trim());
    if ($("#rememberOpenAiKey").checked) {
      sessionStorage.setItem("csvOpenAiApiKey", $("#openaiApiKey").value.trim());
    } else {
      sessionStorage.removeItem("csvOpenAiApiKey");
    }
  } catch (error) {
    showToast("브라우저 세션 저장을 사용할 수 없습니다.");
  }
}

function toggleApiKeyVisibility() {
  const input = $("#openaiApiKey");
  input.type = input.type === "password" ? "text" : "password";
}

function clearApiKey() {
  $("#openaiApiKey").value = "";
  try {
    sessionStorage.removeItem("csvOpenAiApiKey");
  } catch (error) {
    // 저장소 접근 실패는 입력값 초기화에 영향이 없다.
  }
  showToast("API 키를 지웠습니다.");
}

function readContext() {
  const standards = $$(".check-grid input:checked").map((input) => input.value);
  return {
    systemName: $("#systemName").value.trim() || "GxP 컴퓨터 시스템",
    processName: $("#processName").value.trim() || "GxP 업무 프로세스",
    systemType: $("#systemType").value,
    gampCategory: $("#gampCategory").value,
    standards,
    riskBasedTesting: $("#riskBasedTesting").checked,
    dataIntegrityFocus: $("#dataIntegrityFocus").checked,
    includePrompt: $("#includePrompt").checked,
    references: splitLines($("#referenceInput").value),
  };
}

function splitLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean);
}

function cleanLine(line) {
  return line
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .trim();
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  return (
    categoryRules.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) ||
    {
      name: "일반 기능",
      risk: "요구사항이 명확하지 않거나 검증 범위에서 누락되어 의도한 사용을 입증하지 못할 수 있다.",
      mitigation: "업무 시나리오와 수용기준을 명확히 정의하고 정상 및 예외 테스트를 수행한다.",
      testType: "PQ",
    }
  );
}

function inferPriority(categoryName, text, dataIntegrityFocus) {
  const highCategories = ["전자서명", "감사추적", "접근권한", "데이터 무결성", "인터페이스"];
  const lower = text.toLowerCase();
  if (dataIntegrityFocus && highCategories.includes(categoryName)) return "High";
  if (["백업복구", "출력보고서"].includes(categoryName)) return "Medium";
  if (lower.includes("should") || lower.includes("must") || text.includes("해야")) return "Medium";
  return "Low";
}

function generateRequirements(context) {
  const inputLines = splitLines($("#requirementInput").value);
  const lines = inputLines.length ? inputLines : defaultRequirements;

  return lines.map((line, index) => {
    const category = detectCategory(line);
    const id = `URS-${String(index + 1).padStart(3, "0")}`;
    const priority = inferPriority(category.name, line, context.dataIntegrityFocus);
    return {
      id,
      source: `사용자 입력 ${index + 1}`,
      process: context.processName,
      category: category.name,
      requirement: normalizeRequirement(line),
      priority,
      acceptance: makeAcceptanceCriteria(category.name, line),
    };
  });
}

function normalizeRequirement(line) {
  if (line.startsWith("시스템은")) return line;
  if (line.endsWith("해야 한다.") || line.endsWith("해야 한다")) return `시스템은 ${line}`;
  return `시스템은 ${line.replace(/[.。]$/, "")}해야 한다.`;
}

function makeAcceptanceCriteria(category, text) {
  const criteria = {
    전자서명: "전자서명 수행 시 사용자, 일시, 서명 의미, 대상 기록이 저장되고 승인 후 변경이 통제된다.",
    감사추적: "중요 데이터 변경 시 변경 전 값, 변경 후 값, 변경자, 일시, 사유가 조회 가능하다.",
    접근권한: "역할별 허용 기능과 금지 기능이 권한 매트릭스와 일치한다.",
    "데이터 무결성": "필수값, 형식, 범위 오류 입력 시 저장이 차단되고 사용자에게 명확한 메시지가 표시된다.",
    인터페이스: "정상 데이터는 정확히 수신되고 오류 데이터는 거부 또는 보류되며 로그와 재처리 절차가 남는다.",
    백업복구: "백업 작업 결과가 확인 가능하고 지정된 복구 절차로 전자기록을 복구할 수 있다.",
    출력보고서: "출력물은 원본 기록의 핵심 필드, 승인 상태, 출력일시, 페이지 정보를 포함한다.",
    "일반 기능": "정의된 업무 시나리오에 따라 정상 처리되고 예외 상황은 통제된다.",
  };
  if (text.includes("장기 보관")) return "보관 기간, 접근 권한, 읽기 가능성, 출력 가능성이 보존 정책과 일치한다.";
  return criteria[category] || criteria["일반 기능"];
}

function scoreRisk(requirement, context) {
  const severityMap = {
    전자서명: 5,
    감사추적: 5,
    "데이터 무결성": 5,
    접근권한: 4,
    인터페이스: 4,
    백업복구: 4,
    출력보고서: 3,
    "일반 기능": 3,
  };
  const occurrenceMap = {
    전자서명: 3,
    감사추적: 3,
    "데이터 무결성": 4,
    접근권한: 3,
    인터페이스: 4,
    백업복구: 2,
    출력보고서: 2,
    "일반 기능": 2,
  };
  const detectabilityMap = {
    전자서명: 3,
    감사추적: 4,
    "데이터 무결성": 3,
    접근권한: 3,
    인터페이스: 4,
    백업복구: 3,
    출력보고서: 2,
    "일반 기능": 2,
  };

  let severity = severityMap[requirement.category] || 3;
  let occurrence = occurrenceMap[requirement.category] || 2;
  let detectability = detectabilityMap[requirement.category] || 2;

  if (!context.riskBasedTesting) {
    occurrence = Math.max(2, occurrence - 1);
    detectability = Math.max(2, detectability - 1);
  }

  const rpn = severity * occurrence * detectability;
  const level = rpn >= 60 ? "High" : rpn >= 24 ? "Medium" : "Low";
  return { severity, occurrence, detectability, rpn, level };
}

function generateRisks(requirements, context) {
  return requirements.map((requirement, index) => {
    const category = detectCategory(requirement.requirement);
    const score = scoreRisk(requirement, context);
    return {
      id: `RA-${String(index + 1).padStart(3, "0")}`,
      requirementId: requirement.id,
      category: requirement.category,
      risk: category.risk,
      impact: makeImpact(requirement.category),
      mitigation: category.mitigation,
      owner: ownerFor(requirement.category),
      ...score,
    };
  });
}

function makeImpact(category) {
  const impacts = {
    전자서명: "품질 승인 책임 불명확, Part 11 / Annex 11 부적합 가능",
    감사추적: "데이터 변경 이력 부재, 데이터 무결성 위반 가능",
    접근권한: "권한 없는 데이터 변경 또는 승인 가능",
    "데이터 무결성": "제조 또는 품질 판정 오류 가능",
    인터페이스: "배치기록과 시험결과 간 불일치 가능",
    백업복구: "전자기록 손실 및 업무 연속성 저하 가능",
    출력보고서: "최종 보관 기록의 신뢰성 저하 가능",
    "일반 기능": "의도한 사용 입증 불충분 가능",
  };
  return impacts[category] || impacts["일반 기능"];
}

function ownerFor(category) {
  if (["전자서명", "감사추적", "데이터 무결성", "출력보고서"].includes(category)) return "QA";
  if (["접근권한", "백업복구", "인터페이스"].includes(category)) return "IT / CSV";
  return "Business Owner";
}

function generateTests(requirements, risks, context) {
  const tests = [];
  tests.push({
    id: "IQ-001",
    type: "IQ",
    requirementId: "공통",
    riskId: "공통",
    title: "설치 환경 및 버전 확인",
    precondition: "승인된 설치 절차와 시스템 구성정보가 준비되어 있다.",
    steps: "서버, DB, 애플리케이션 버전, 주요 설정, 접근 URL을 설치기록과 대조한다.",
    expected: "설치 결과가 승인된 구성 기준과 일치하며 편차가 없다.",
    evidence: "설치 점검표, 설정 화면, 버전 캡처",
  });

  tests.push({
    id: "IQ-002",
    type: "IQ",
    requirementId: "공통",
    riskId: "공통",
    title: "백업 스케줄 및 로그 확인",
    precondition: "백업 정책과 스케줄이 등록되어 있다.",
    steps: "백업 작업 설정, 최근 수행 결과, 실패 알림 설정을 확인한다.",
    expected: "정해진 주기와 보관 정책에 따라 백업이 수행되고 결과 로그가 남는다.",
    evidence: "백업 설정 화면, 작업 로그",
  });

  requirements.forEach((requirement) => {
    const risk = risks.find((item) => item.requirementId === requirement.id);
    const baseId = tests.length + 1;
    tests.push(makeFunctionalTest(`OQ-${String(baseId).padStart(3, "0")}`, requirement, risk));

    if (context.riskBasedTesting && risk && risk.level === "High") {
      tests.push(makeNegativeTest(`OQ-${String(baseId + 1).padStart(3, "0")}`, requirement, risk));
    }

    if (["출력보고서", "일반 기능", "데이터 무결성", "인터페이스"].includes(requirement.category)) {
      tests.push(makeProcessTest(`PQ-${String(tests.length + 1).padStart(3, "0")}`, requirement, risk, context));
    }
  });

  return renumberTests(tests);
}

function makeFunctionalTest(id, requirement, risk) {
  return {
    id,
    type: detectCategory(requirement.requirement).testType,
    requirementId: requirement.id,
    riskId: risk ? risk.id : "",
    title: `${requirement.category} 요구사항 정상 동작 확인`,
    precondition: "테스트 사용자가 승인된 역할과 테스트 데이터로 로그인되어 있다.",
    steps: `${requirement.requirement} 요구사항을 수행하는 대표 업무 시나리오를 실행하고 처리 결과와 로그를 확인한다.`,
    expected: requirement.acceptance,
    evidence: "화면 캡처, 로그, 생성 기록",
  };
}

function makeNegativeTest(id, requirement, risk) {
  return {
    id,
    type: "OQ",
    requirementId: requirement.id,
    riskId: risk ? risk.id : "",
    title: `${requirement.category} 예외 처리 및 통제 확인`,
    precondition: "권한 제한 사용자 또는 오류 데이터가 준비되어 있다.",
    steps: "허용되지 않은 입력, 권한, 변경, 재처리 조건을 실행하고 시스템 차단 여부를 확인한다.",
    expected: "부적절한 처리는 차단되고 오류 메시지, 감사추적 또는 로그가 남는다.",
    evidence: "오류 메시지 캡처, 감사추적, 시스템 로그",
  };
}

function makeProcessTest(id, requirement, risk, context) {
  return {
    id,
    type: "PQ",
    requirementId: requirement.id,
    riskId: risk ? risk.id : "",
    title: `${context.processName} 실제 업무 시나리오 확인`,
    precondition: "업무 담당자, QA 검토자, 승인된 절차와 실제와 유사한 테스트 데이터가 준비되어 있다.",
    steps: `${context.processName} 흐름에서 ${requirement.category} 관련 업무를 end-to-end로 수행한다.`,
    expected: "업무 절차, 역할, 기록 생성, 승인, 보관 결과가 SOP와 일치한다.",
    evidence: "업무 시나리오 기록, 승인 기록, 최종 산출물",
  };
}

function renumberTests(tests) {
  const counters = { IQ: 0, OQ: 0, PQ: 0 };
  return tests.map((test) => {
    counters[test.type] += 1;
    return { ...test, id: `${test.type}-${String(counters[test.type]).padStart(3, "0")}` };
  });
}

function generateTrace(requirements, risks, tests) {
  return requirements.map((requirement) => {
    const risk = risks.find((item) => item.requirementId === requirement.id);
    const relatedTests = tests.filter((test) => test.requirementId === requirement.id);
    return {
      requirementId: requirement.id,
      requirement: requirement.requirement,
      riskId: risk ? risk.id : "",
      riskLevel: risk ? risk.level : "",
      testIds: relatedTests.map((test) => test.id).join(", "),
      coverage: relatedTests.length > 0 ? "Covered" : "Missing",
      document: "URS / RA / IQ-OQ-PQ / TM / VR",
    };
  });
}

function generateAll() {
  const context = readContext();
  const requirements = generateRequirements(context);
  const risks = generateRisks(requirements, context);
  const tests = generateTests(requirements, risks, context);
  const trace = generateTrace(requirements, risks, tests);
  const report = makeReport(context, requirements, risks, tests, trace);
  const prompt = context.includePrompt ? makePrompt(context, requirements, risks, tests) : "AI 검토 프롬프트 포함 옵션이 꺼져 있습니다.";

  generated = { context, requirements, risks, tests, trace, report, prompt, aiReview: emptyAiReview() };
  renderAll();
  showToast("CSV 문서 초안을 생성했습니다.");
}

function renderAll() {
  renderOverview();
  $("#tab-urs").innerHTML = tableHtml(generated.requirements, [
    ["id", "ID"],
    ["process", "프로세스"],
    ["category", "분류"],
    ["requirement", "요구사항"],
    ["priority", "우선순위"],
    ["acceptance", "수용기준"],
    ["source", "출처"],
  ]);
  $("#tab-risk").innerHTML = tableHtml(generated.risks, [
    ["id", "ID"],
    ["requirementId", "URS"],
    ["category", "분류"],
    ["risk", "위험"],
    ["impact", "영향"],
    ["mitigation", "완화 / 검증전략"],
    ["severity", "S"],
    ["occurrence", "O"],
    ["detectability", "D"],
    ["rpn", "RPN"],
    ["level", "등급"],
    ["owner", "Owner"],
  ]);
  $("#tab-tests").innerHTML = tableHtml(generated.tests, [
    ["id", "ID"],
    ["type", "유형"],
    ["requirementId", "URS"],
    ["riskId", "Risk"],
    ["title", "테스트명"],
    ["precondition", "전제조건"],
    ["steps", "절차"],
    ["expected", "기대결과"],
    ["evidence", "증거"],
  ]);
  $("#tab-trace").innerHTML = tableHtml(generated.trace, [
    ["requirementId", "URS"],
    ["requirement", "요구사항"],
    ["riskId", "Risk"],
    ["riskLevel", "위험등급"],
    ["testIds", "테스트"],
    ["coverage", "커버리지"],
    ["document", "문서"],
  ]);
  $("#tab-report").innerHTML = `<pre>${escapeHtml(generated.report)}</pre>`;
  $("#tab-prompt").innerHTML = `<pre>${escapeHtml(generated.prompt)}</pre>`;
  renderAiPanel();
  updateMetrics();
}

function renderOverview() {
  const highRisks = generated.risks.filter((risk) => risk.level === "High");
  const mediumRisks = generated.risks.filter((risk) => risk.level === "Medium");
  const standards = generated.context.standards.join(", ");
  $("#tab-overview").innerHTML = `
    <div class="notice">
      이 프로그램은 교육용 규칙 기반 생성기입니다. 실제 AI 도입 실습에서는 이 결과를 검토용 초안으로 사용하고,
      AI 프롬프트 탭의 지시문으로 LLM 검토, 보강, 문체 정리, 누락 항목 점검을 수행하는 흐름을 권장합니다.
    </div>
    <div class="overview-grid" style="margin-top:14px;">
      <article class="insight-card">
        <h3>적용 범위</h3>
        <p>${escapeHtml(generated.context.systemName)} / ${escapeHtml(generated.context.processName)} / ${escapeHtml(generated.context.gampCategory)}</p>
      </article>
      <article class="insight-card">
        <h3>규제 기준</h3>
        <p>${escapeHtml(standards || "선택된 기준 없음")}</p>
      </article>
      <article class="insight-card">
        <h3>위험 요약</h3>
        <p>High ${highRisks.length}건, Medium ${mediumRisks.length}건입니다. High 항목은 OQ 예외 테스트가 자동 보강됩니다.</p>
      </article>
      <article class="insight-card">
        <h3>AI 활용 포인트</h3>
        <p>요구사항 정규화, 테스트 항목 도출, 추적성 점검, 기존 SOP 문구 재사용, 최종보고서 초안 작성에 적용할 수 있습니다.</p>
      </article>
      <article class="insight-card">
        <h3>교육 실습 흐름</h3>
        <p>요구사항 입력 → 문서 생성 → High Risk 검토 → 프롬프트 복사 → AI 보완 결과와 비교 순서로 진행합니다.</p>
      </article>
      <article class="insight-card">
        <h3>검토 원칙</h3>
        <p>AI 산출물은 승인 문서가 아니라 초안입니다. SME, QA, CSV 담당자가 근거, 범위, 테스트 증거를 검토해야 합니다.</p>
      </article>
    </div>`;
}

function renderAiPanel() {
  const review = generated.aiReview || emptyAiReview();
  const target = $("#tab-ai");
  if (!target) return;

  if (review.status === "running") {
    target.innerHTML = `
      <div class="notice warning">
        OpenAI가 CSV 문서 초안을 검토하고 있습니다. 요구사항 수와 모델 상태에 따라 시간이 걸릴 수 있습니다.
      </div>`;
    return;
  }

  if (review.status === "error") {
    target.innerHTML = `
      <div class="notice error">
        OpenAI 호출에 실패했습니다. API 키, 모델명, 네트워크 상태를 확인하세요.
      </div>
      <pre>${escapeHtml(review.error)}</pre>`;
    return;
  }

  if (review.status === "done") {
    target.innerHTML = `
      <div class="ai-result-head">
        <h3>OpenAI 보강 결과</h3>
        <span class="badge info">${escapeHtml(review.model)} / ${escapeHtml(review.requestedAt)}</span>
      </div>
      <pre>${escapeHtml(review.text)}</pre>`;
    return;
  }

  target.innerHTML = `
    <div class="notice">
      왼쪽 OpenAI API 영역에 키를 입력한 뒤 상단의 OpenAI 보강 버튼을 누르면 현재 생성된 프롬프트가 Responses API로 전송되고,
      검토 결과가 이 탭에 표시됩니다.
    </div>`;
}

function tableHtml(rows, columns) {
  if (!rows.length) return `<p class="notice">생성된 항목이 없습니다.</p>`;
  const header = columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(([key]) => {
            const value = row[key] ?? "";
            return `<td>${formatCell(key, value)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  return `<div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function formatCell(key, value) {
  if (["level", "riskLevel", "priority"].includes(key)) {
    const level = String(value);
    const className = level === "High" ? "high" : level === "Medium" ? "medium" : level === "Low" ? "low" : "info";
    return `<span class="badge ${className}">${escapeHtml(level)}</span>`;
  }
  if (key === "coverage") {
    const className = value === "Covered" ? "low" : "high";
    return `<span class="badge ${className}">${escapeHtml(value)}</span>`;
  }
  return escapeHtml(String(value));
}

function updateMetrics() {
  const covered = generated.trace.filter((row) => row.coverage === "Covered").length;
  const coverage = generated.trace.length ? Math.round((covered / generated.trace.length) * 100) : 0;
  $("#metricReq").textContent = generated.requirements.length;
  $("#metricRisk").textContent = generated.risks.length;
  $("#metricTest").textContent = generated.tests.length;
  $("#metricCoverage").textContent = `${coverage}%`;
  $("#metricHigh").textContent = generated.risks.filter((risk) => risk.level === "High").length;
}

function updateLineCount() {
  const count = splitLines($("#requirementInput").value).length;
  $("#reqCount").textContent = `${count} lines`;
}

function makeReport(context, requirements, risks, tests, trace) {
  const highRisks = risks.filter((risk) => risk.level === "High");
  const coverage = trace.every((row) => row.coverage === "Covered") ? "모든 요구사항이 위험 및 테스트 항목과 연결됨" : "일부 요구사항의 테스트 연결 필요";
  const referenceText = context.references.length
    ? context.references.map((line) => `- ${line}`).join("\n")
    : "- 재사용 문서 조각이 입력되지 않음";

  return `# CSV 밸리데이션 문서 자동화 초안

## 1. 프로젝트 개요
- 시스템명: ${context.systemName}
- 업무 프로세스: ${context.processName}
- 시스템 유형: ${context.systemType}
- GAMP 분류: ${context.gampCategory}
- 적용 기준: ${context.standards.join(", ") || "미지정"}

## 2. 자동 생성 산출물 범위
- 사용자 요구사항 명세서(URS): ${requirements.length}건
- 위험평가(RA): ${risks.length}건
- IQ/OQ/PQ 테스트: ${tests.length}건
- 추적성 매트릭스(TM): ${trace.length}건
- 최종보고서 요약: 본 문서

## 3. 위험 기반 접근
High Risk는 ${highRisks.length}건입니다. High Risk 항목은 데이터 무결성, 전자서명, 감사추적, 인터페이스 등 품질 영향도가 큰 영역을 중심으로 도출되었으며, 정상 테스트 외 예외 처리 테스트를 추가하는 전략을 적용했습니다.

## 4. 추적성 요약
${coverage}

## 5. 기존 문서 재사용 근거
${referenceText}

## 6. 검토 및 승인 전 확인사항
- AI 또는 규칙 기반으로 생성된 문구가 실제 시스템 기능, SOP, 승인된 Validation Plan과 일치하는지 확인한다.
- 요구사항별 테스트 증거가 충분하고 재현 가능한지 확인한다.
- Part 11, Annex 11, ALCOA+ 적용 항목은 QA와 CSV 담당자가 독립적으로 검토한다.
- 최종 승인 문서에는 실제 수행 결과, 편차, CAPA, 승인 서명이 반영되어야 한다.

## 7. 교육 토의 질문
- 반복 작성 부담이 큰 산출물은 무엇이며 자동화 우선순위는 어떻게 정할 것인가?
- 기존 문서 조각을 AI가 재사용할 때 최신본, 승인본, 적용 범위를 어떻게 통제할 것인가?
- AI 생성 테스트 케이스의 누락과 과잉을 어떤 검토 기준으로 판단할 것인가?`;
}

function makePrompt(context, requirements, risks, tests) {
  const reqText = requirements.map((item) => `${item.id}: ${item.requirement} / 수용기준: ${item.acceptance}`).join("\n");
  const riskText = risks.map((item) => `${item.id}: ${item.risk} / RPN ${item.rpn} / ${item.level}`).join("\n");
  const testText = tests.map((item) => `${item.id}: ${item.title} / ${item.expected}`).join("\n");
  const referenceText = context.references.map((line) => `- ${line}`).join("\n") || "- 제공된 기존 문서 없음";

  return `아래 정보를 바탕으로 제약/바이오 CSV 문서 초안을 검토하고 보강해줘.

역할:
- 너는 Computer System Validation(CSV), GAMP 5, 데이터 무결성, 21 CFR Part 11, EU GMP Annex 11에 익숙한 문서 검토자다.
- 단, 허위 근거를 만들지 말고 입력된 정보에서 추론한 부분은 "추론"으로 표시한다.
- 최종 승인 문서가 아니라 SME/QA 검토용 초안으로 작성한다.

프로젝트:
- 시스템명: ${context.systemName}
- 프로세스: ${context.processName}
- 시스템 유형: ${context.systemType}
- GAMP 분류: ${context.gampCategory}
- 적용 기준: ${context.standards.join(", ")}

기존 문서 조각:
${referenceText}

요구사항:
${reqText}

위험평가:
${riskText}

테스트 초안:
${testText}

요청 작업:
1. URS 문구를 검증 가능하고 모호하지 않은 형태로 다듬어줘.
2. 위험평가에서 누락된 데이터 무결성, 전자서명, 감사추적, 접근권한, 백업복구 리스크를 찾아줘.
3. High Risk 항목에 대해 OQ 예외 테스트와 PQ 업무 시나리오를 보강해줘.
4. URS-RA-Test 추적성이 끊긴 항목을 표로 지적해줘.
5. 최종보고서 초안에 포함할 승인 전 확인사항을 작성해줘.

출력 형식:
- 섹션: 개선된 URS, 위험평가 보강, 테스트 보강, 추적성 점검, 최종보고서 문구
- 표에는 ID, 원문, 개선안, 근거, 검토 필요 여부를 포함`;
}

function activateTab(name) {
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${name}`));
}

function getOpenAiSettings() {
  return {
    apiKey: $("#openaiApiKey").value.trim(),
    model: $("#openaiModel").value.trim() || "gpt-5.2",
    maxOutputTokens: clamp(Number($("#openaiMaxTokens").value || 3500), 500, 12000),
  };
}

async function runOpenAiReview() {
  if (aiRunning) return;

  const settings = getOpenAiSettings();
  if (!settings.apiKey) {
    generated.aiReview = {
      ...emptyAiReview(),
      status: "error",
      error: "OpenAI API 키를 입력해야 합니다.",
    };
    renderAiPanel();
    activateTab("ai");
    showToast("OpenAI API 키를 입력하세요.");
    return;
  }

  if (!generated.prompt || generated.prompt.includes("옵션이 꺼져 있습니다")) {
    generated.prompt = makePrompt(generated.context, generated.requirements, generated.risks, generated.tests);
  }

  aiRunning = true;
  setOpenAiButtonState(true);
  generated.aiReview = {
    ...emptyAiReview(),
    status: "running",
    model: settings.model,
  };
  renderAiPanel();
  activateTab("ai");
  showToast("OpenAI 보강을 실행합니다.");

  try {
    persistOpenAiSettings();
    const response = await requestOpenAiReview(settings);
    const text = extractOpenAiText(response);
    generated.aiReview = {
      status: "done",
      text,
      error: "",
      model: settings.model,
      requestedAt: new Date().toLocaleString("ko-KR"),
    };
    renderAiPanel();
    showToast("OpenAI 보강 결과를 받았습니다.");
  } catch (error) {
    generated.aiReview = {
      ...emptyAiReview(),
      status: "error",
      error: error.message || String(error),
      model: settings.model,
      requestedAt: new Date().toLocaleString("ko-KR"),
    };
    renderAiPanel();
    showToast("OpenAI 호출에 실패했습니다.");
  } finally {
    aiRunning = false;
    setOpenAiButtonState(false);
  }
}

function setOpenAiButtonState(isRunning) {
  const button = $("#runOpenAiBtn");
  button.disabled = isRunning;
  button.textContent = isRunning ? "OpenAI 실행 중" : "OpenAI 보강";
}

async function requestOpenAiReview(settings) {
  const payload = {
    apiKey: settings.apiKey,
    model: settings.model,
    maxOutputTokens: settings.maxOutputTokens,
    instructions: makeOpenAiInstructions(),
    input: generated.prompt,
  };

  if (window.location.protocol !== "file:") {
    try {
      return await requestOpenAiViaProxy(payload);
    } catch (error) {
      if (!String(error.message || "").includes("404")) throw error;
    }
  }

  return requestOpenAiDirect(payload);
}

async function requestOpenAiViaProxy(payload) {
  const response = await fetch("/api/openai-response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await readJsonResponse(response);
  if (!response.ok) throw new Error(openAiErrorMessage(body, response));
  return body;
}

async function requestOpenAiDirect(payload) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.apiKey}`,
    },
    body: JSON.stringify({
      model: payload.model,
      instructions: payload.instructions,
      input: payload.input,
      max_output_tokens: payload.maxOutputTokens,
      store: false,
    }),
  });
  const body = await readJsonResponse(response);
  if (!response.ok) throw new Error(openAiErrorMessage(body, response));
  return body;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { error: text };
  }
}

function openAiErrorMessage(body, response) {
  if (body && body.error && typeof body.error.message === "string") return body.error.message;
  if (body && typeof body.error === "string") return body.error;
  if (body && typeof body.message === "string") return body.message;
  return `HTTP ${response.status} ${response.statusText}`;
}

function extractOpenAiText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();

  const chunks = [];
  if (Array.isArray(data.output)) {
    data.output.forEach((item) => {
      if (Array.isArray(item.content)) {
        item.content.forEach((content) => {
          if (content.type === "output_text" && typeof content.text === "string") chunks.push(content.text);
          if (typeof content.output_text === "string") chunks.push(content.output_text);
        });
      }
    });
  }

  const text = chunks.join("\n").trim();
  return text || JSON.stringify(data, null, 2);
}

function makeOpenAiInstructions() {
  return [
    "너는 제약/바이오 CSV 문서 자동화 교육을 돕는 검토자다.",
    "GAMP 5, 데이터 무결성, 21 CFR Part 11, EU GMP Annex 11 관점에서 실무자가 검토할 수 있는 문서 초안을 보강한다.",
    "입력에 없는 사실은 단정하지 말고 추론 또는 검토 필요로 표시한다.",
    "출력은 한국어로 작성하고, 표와 짧은 근거 중심으로 구성한다.",
  ].join("\n");
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(generated.prompt || "");
    showToast("AI 검토 프롬프트를 복사했습니다.");
  } catch (error) {
    showToast("클립보드 복사에 실패했습니다.");
  }
}

function downloadMarkdown() {
  const content = [
    generated.report,
    "\n\n# URS\n",
    markdownTable(generated.requirements, ["id", "process", "category", "requirement", "priority", "acceptance"]),
    "\n\n# 위험평가\n",
    markdownTable(generated.risks, ["id", "requirementId", "category", "risk", "mitigation", "rpn", "level"]),
    "\n\n# IQ/OQ/PQ 테스트\n",
    markdownTable(generated.tests, ["id", "type", "requirementId", "riskId", "title", "expected", "evidence"]),
    "\n\n# 추적성 매트릭스\n",
    markdownTable(generated.trace, ["requirementId", "riskId", "riskLevel", "testIds", "coverage"]),
    "\n\n# AI 검토 프롬프트\n\n",
    generated.prompt,
    "\n\n# OpenAI 보강 결과\n\n",
    generated.aiReview.status === "done" ? generated.aiReview.text : "아직 OpenAI 보강을 실행하지 않았습니다.",
  ].join("");
  downloadText("csv-validation-ai-package.md", content, "text/markdown;charset=utf-8");
}

function exportTraceCsv() {
  const csv = toCsv(generated.trace, ["requirementId", "requirement", "riskId", "riskLevel", "testIds", "coverage", "document"]);
  downloadText("traceability-matrix.csv", csv, "text/csv;charset=utf-8");
}

function markdownTable(rows, keys) {
  if (!rows.length) return "";
  const header = `| ${keys.join(" | ")} |`;
  const divider = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${keys.map((key) => String(row[key] ?? "").replace(/\|/g, "/")).join(" | ")} |`)
    .join("\n");
  return `${header}\n${divider}\n${body}`;
}

function toCsv(rows, keys) {
  const header = keys.join(",");
  const body = rows.map((row) => keys.map((key) => csvEscape(row[key] ?? "")).join(",")).join("\n");
  return `\uFEFF${header}\n${body}`;
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`${filename} 파일을 생성했습니다.`);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", init);
