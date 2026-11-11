function isQuantity(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function quantityText(value) {
  return isQuantity(value) ? value.toLocaleString("ko-KR") + "개" : "확인 불가";
}

function progressText(completed, target) {
  if (!isQuantity(completed) || !isQuantity(target) || target === 0) {
    return "목표를 확인해 주세요";
  }
  return (completed / target * 100).toFixed(1) + "%";
}

const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});
const hourFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  hourCycle: "h23"
});

function dateText(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? dateFormat.format(new Date(value))
    : "기록 없음";
}

function hourText(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? hourFormat.format(new Date(value)) + "시"
    : "기록 없음";
}

const statusNames = {
  normal: "정상",
  warning: "확인 필요",
  error: "오류",
  sent: "전송 성공",
  failed: "실패",
  unknown: "확인 불가",
  waiting: "대기"
};

function setBadge(node, value) {
  const tone = ["normal", "sent"].includes(value)
    ? "good"
    : ["error", "failed"].includes(value)
      ? "danger"
      : "warning";
  node.className = "badge " + tone;
  node.textContent = statusNames[value] || "확인 필요";
}

function isTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function ageText(value, now) {
  if (!isTime(value) || Date.parse(value) > now) return "시각 확인 필요";
  return Math.floor((now - Date.parse(value)) / 60000) + "분 전";
}

function freshness(value, now) {
  if (!isTime(value) || Date.parse(value) > now) return "missing";
  return now - Date.parse(value) > 30 * 60 * 1000 ? "stale" : "fresh";
}

function graphSvg(siteName, history) {
  const label = siteName === "factory" ? "텀블공장" : "물류창고";
  const sorted = [...history].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const firstTime = Date.parse(sorted[0].timestamp);
  const lastTime = Date.parse(sorted[sorted.length - 1].timestamp);
  const hour = 60 * 60 * 1000;
  const slotCount = Math.round((lastTime - firstTime) / hour) + 1;
  const width = 72 + slotCount * 90;
  const baseline = 154;
  const chartHeight = 112;
  const maxQuantity = Math.max(1, ...sorted.map(point => point.quantity));
  const pointsByHour = new Map(sorted.map(point => [Date.parse(point.timestamp), point]));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} 190`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", "190");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label + " 시간별 완료 수량: " + sorted.map(point => dateText(point.timestamp) + " " + quantityText(point.quantity)).join(", "));

  const addText = (x, y, text, anchor = "middle") => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
    node.setAttribute("x", String(x));
    node.setAttribute("y", String(y));
    node.setAttribute("text-anchor", anchor);
    node.textContent = text;
    svg.append(node);
  };

  addText(4, 14, "개", "start");
  for (let slot = 0; slot < slotCount; slot += 1) {
    const timestamp = firstTime + slot * hour;
    const point = pointsByHour.get(timestamp);
    const center = 54 + slot * 90;
    if (!point) continue;
    const validQuantity = isQuantity(point.quantity);
    const barHeight = validQuantity ? point.quantity / maxQuantity * chartHeight : 0;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(center - 20));
    rect.setAttribute("y", String(baseline - barHeight));
    rect.setAttribute("width", "40");
    rect.setAttribute("height", String(barHeight));
    rect.setAttribute("rx", "4");
    rect.setAttribute("fill", "#27834e");
    svg.append(rect);
    addText(center, Math.max(30, baseline - barHeight - 8), quantityText(point.quantity));
    addText(center, 178, hourText(point.timestamp));
  }

  return svg;
}

function fillGraph(siteName, site) {
  const graph = document.querySelector("#" + siteName + "-graph");
  const loading = graph.querySelector(".loading-graph");
  const empty = graph.querySelector(".graph-empty");
  const scroll = graph.querySelector(".graph-scroll");
  const caption = graph.querySelector(".graph-caption");
  const history = Array.isArray(site.history)
    ? site.history.filter(point => point && typeof point.timestamp === "string" && Number.isFinite(Date.parse(point.timestamp)) && isQuantity(point.quantity))
    : [];
  const scrollLeft = scroll.scrollLeft;

  if (history.length === 0) {
    loading.hidden = true;
    scroll.hidden = true;
    scroll.replaceChildren();
    empty.hidden = false;
    caption.hidden = true;
    return;
  }

  scroll.replaceChildren(graphSvg(siteName, history));
  scroll.hidden = false;
  scroll.scrollLeft = scrollLeft;
  loading.hidden = true;
  empty.hidden = true;
  caption.hidden = false;
}

function fillQuantity(siteName, site) {
  const quantity = document.querySelector("#" + siteName + "-quantity");
  const progressTextNode = document.querySelector("#" + siteName + "-progress-text");
  const progress = document.querySelector("#" + siteName + "-progress");
  const exceeded = document.querySelector("#" + siteName + "-exceeded");
  const completed = quantityText(site.completed);
  const target = isQuantity(site.target) ? "· 목표 " + quantityText(site.target) : "· 목표 확인 불가";
  const noun = siteName === "factory" ? "생산" : "출고";
  quantity.replaceChildren();

  const completedText = document.createElement("span");
  completedText.textContent = noun + " " + completed;
  const targetText = document.createElement("span");
  targetText.className = "quantity-goal";
  targetText.textContent = target;

  quantity.append(completedText, targetText);

  const validProgress = isQuantity(site.completed) && isQuantity(site.target) && site.target > 0;
  progressTextNode.textContent = validProgress
    ? "계획 대비 " + progressText(site.completed, site.target)
    : "목표를 확인해 주세요";
  progress.hidden = !validProgress;
  exceeded.hidden = !validProgress || site.completed <= site.target;
  if (validProgress) {
    progress.value = Math.min(site.completed / site.target * 100, 100);
  }
  fillGraph(siteName, site);
}

function fillStatus(siteName, site, now) {
  const age = freshness(site.lastEventAt, now);
  const status = age === "missing" ? "waiting" : age === "stale" ? "warning" : site.status;
  const card = document.querySelector("#" + siteName + "-status");
  card.className = "card status-card" + (status === "error" ? " danger" : "");
  setBadge(card.querySelector(".badge"), status);
  card.querySelector(".card-description").textContent = typeof site.note === "string" ? site.note : "확인 불가";
  card.querySelector(".meta").textContent = "기준 시각 대비: " + ageText(site.lastEventAt, now) + " · 발생 시각: " + dateText(site.lastEventAt);
}

function fillAlertsStatus(alerts) {
  const card = document.querySelector("#alerts-status");
  card.className = "card status-card" + (alerts.status === "failed" ? " danger" : "");
  setBadge(card.querySelector(".badge"), alerts.status);
  const description = alerts.status === "sent"
    ? "알림 전송이 완료됐습니다."
    : alerts.status === "failed"
      ? "담당자에게 알림을 전달하지 못했습니다."
      : "전송 기록을 확인할 수 없습니다.";
  card.querySelector(".card-description").textContent = description;
  card.querySelector(".meta").textContent = "마지막 전송 시도: " + dateText(alerts.lastAttemptAt);
}

function timelineContent(siteName, site, now) {
  const label = siteName === "factory" ? "텀블공장" : "물류창고";
  const age = freshness(site.lastEventAt, now);
  const status = age === "missing" ? "waiting" : age === "stale" ? "warning" : site.status;
  const top = document.createElement("div");
  top.className = "status-line";
  const title = document.createElement("h3");
  title.textContent = label;
  const badge = document.createElement("span");
  setBadge(badge, status);
  top.append(title, badge);

  const content = [top];
  const description = document.createElement("p");
  description.className = "card-description";
  description.textContent = typeof site.note === "string" ? site.note : "확인 불가";
  content.push(description);

  if (age === "stale" || age === "missing") {
    const notice = document.createElement("p");
    notice.className = "notice";
    notice.textContent = age === "stale"
      ? "기록이 30분 넘게 들어오지 않았습니다."
      : "현장 기록을 기다리고 있습니다.";
    content.push(notice);
  }

  const list = document.createElement("dl");
  list.className = "time-list";
  for (const [key, name] of [["lastEventAt", "기록 발생"], ["receivedAt", "서버 접수"], ["processedAt", "서버 처리"]]) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = name;
    const detail = document.createElement("dd");
    detail.textContent = isTime(site[key])
      ? dateText(site[key])
      : key === "processedAt" && site.processingState === "paused"
        ? "처리 중단"
        : "기록 대기";
    row.append(term, detail);
    list.append(row);
  }
  content.push(list);
  return content;
}

function fillFlow(siteName, site, now) {
  const card = document.querySelector("#" + siteName + "-flow");
  card.replaceChildren(...timelineContent(siteName, site, now));
}

function currentIssues(data) {
  const unique = new Map();
  for (const item of Array.isArray(data?.incidents) ? data.incidents : []) {
    if (!item || item.id === "PREDICTION-JOB") continue;
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  return [...unique.values()].sort((a, b) => (a.level === "error" ? 0 : 1) - (b.level === "error" ? 0 : 1));
}

function renderNotifications(issues) {
  const button = $("#header-alerts-link");
  const panel = $("#notification-dropdown");
  const countText = "알림 " + issues.length + "건";
  $("#header-alerts-text").textContent = countText;
  button.setAttribute("aria-label", countText);
  button.className = "alerts-link " + (issues.some(item => item.level === "error") ? "danger" : issues.length ? "warning" : "good");
  button.setAttribute("aria-expanded", String(notificationsOpen));
  panel.hidden = !notificationsOpen;

  const contentKey = JSON.stringify(issues);
  if (contentKey === renderedNotifications) return;
  renderedNotifications = contentKey;
  panel.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = "알림";
  panel.append(title);
  if (issues.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "확인할 알림이 없습니다.";
    panel.append(empty);
    return;
  }
  for (const item of issues) {
    const entry = document.createElement("article");
    entry.className = "notification-item";
    const heading = document.createElement("h3");
    heading.textContent = item.title;
    const owner = document.createElement("p");
    owner.textContent = "담당자: " + item.owner;
    const action = document.createElement("p");
    action.textContent = "할 일: " + item.action;
    entry.append(heading, owner, action);
    panel.append(entry);
  }
}

function toggleNotifications(force) {
  notificationsOpen = typeof force === "boolean" ? force : !notificationsOpen;
  $("#notification-dropdown").hidden = !notificationsOpen;
  $("#header-alerts-link").setAttribute("aria-expanded", String(notificationsOpen));
}

function renderHero(issues) {
  const hero = $("#hero");
  const title = $("#hero-title");
  const owner = $("#hero-owner");
  const action = $("#hero-action");
  const first = issues[0];
  hero.className = "hero" + (first ? "" : " neutral");
  owner.hidden = !first;

  if (!first) {
    title.textContent = "우선 확인할 문제가 없습니다.";
    action.textContent = "운영 담당자 · 기록 갱신 상태를 계속 확인해 주세요.";
    return;
  }

  let guide = "";
  if (first.scope === "factory" || first.id === "FACTORY-FEED") {
    guide = "생산 기록 보기에서 마지막 기록을 확인하세요. ";
  } else if (first.scope === "warehouse" || first.id === "WAREHOUSE-FEED") {
    guide = "출고 기록 보기에서 마지막 기록을 확인하세요. ";
  } else if (first.id === "ALERT-DELIVERY") {
    guide = "아래 알림 전송 기록에서 마지막 시도와 실패 여부를 확인하세요. ";
  }
  title.textContent = first.title;
  owner.textContent = "담당자: " + first.owner;
  action.textContent = "확인할 일: " + guide + first.action;
}

function closeHelp(button, popover) {
  popover.hidden = true;
  button.setAttribute("aria-expanded", "false");
  button.dataset.pinned = "false";
}

function openHelps() {
  return document.querySelectorAll(".help-popover:not([hidden])");
}

function positionHelpPopover(popover) {
  if (popover.hidden) return;
  popover.style.translate = "none";
  const bounds = popover.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  let min = 16;
  let max = viewportWidth - 16;
  const card = popover.closest(".card, .hero")?.getBoundingClientRect();
  if (card && Math.min(max, card.right) - Math.max(min, card.left) >= bounds.width) {
    min = Math.max(min, card.left);
    max = Math.min(max, card.right);
  }
  const left = Math.max(min, Math.min(bounds.left, max - bounds.width));
  popover.style.translate = (left - bounds.left) + "px 0";
}

function setupHelp(button) {
  const wrap = button.closest(".help-wrap");
  const popover = wrap.querySelector(".help-popover");
  const open = () => {
    for (const other of openHelps()) {
      if (other !== popover) {
        const otherButton = other.closest(".help-wrap").querySelector(".help-btn");
        closeHelp(otherButton, other);
      }
    }
    toggleNotifications(false);
    popover.hidden = false;
    button.setAttribute("aria-expanded", "true");
    positionHelpPopover(popover);
  };

  button.addEventListener("mouseenter", open);
  wrap.addEventListener("mouseleave", () => {
    if (document.activeElement !== button && button.dataset.pinned !== "true") {
      closeHelp(button, popover);
    }
  });
  button.addEventListener("focus", open);
  button.addEventListener("blur", () => {
    if (button.dataset.pinned !== "true") closeHelp(button, popover);
  });
  button.addEventListener("click", () => {
    if (button.dataset.pinned === "true") {
      closeHelp(button, popover);
      return;
    }
    open();
    button.dataset.pinned = "true";
  });
}

let lastData = window.SAMPLE_SNAPSHOT;
let renderedRoute = "";
let recordFrom = "";
let recordTo = "";
let renderedRecords = "";
let renderedQueries = "";
let lastRenderedRoute = "";
let notificationsOpen = false;
let renderedNotifications = "";
const $ = (selector) => document.querySelector(selector);

function resolveRoute(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  if (!raw || raw === "today") return { route: "today", id: null, isUnknown: false };
  const detail = /^(records|queries)\/(factory|warehouse)$/.exec(raw);
  if (detail) return { route: detail[1], id: detail[2], isUnknown: false };
  return { route: "today", id: null, isUnknown: true };
}

function renderRoute() {
  const { route, id, isUnknown } = resolveRoute(window.location.hash);
  const routeKey = route + "/" + (id || "");
  const sameScreen = routeKey === renderedRoute;
  renderedRoute = routeKey;
  const name = id === "factory" ? "생산" : "출고";
  $("#route-notice").hidden = !isUnknown;
  $("#back-link").hidden = route === "today" && !isUnknown;
  $("#today-view").hidden = route !== "today";
  $("#records-view").hidden = route !== "records";
  $("#queries-view").hidden = route !== "queries";
  $("#page-title").textContent = route === "records"
    ? "오늘 " + name + " 기록"
    : route === "queries"
      ? name + " 데이터 조회 기록"
      : "오늘 운영";
  $("#page-description").textContent = route === "records"
    ? "선택한 기준 시각까지의 기록입니다. 수량은 수정하지 않습니다."
    : route === "queries"
      ? "이 탭에서 대시보드가 서버에 요청한 기록입니다. 공장·창고는 같은 요청으로 조회합니다."
      : "생산·출고 실적과 운영 상태를 살펴봅니다.";

  if (route === "records" && !sameScreen) {
    const inputFrom = $("#record-from");
    const inputTo = $("#record-to");
    const viewTime = lastData.viewTime;
    const now = isTime(viewTime) ? new Date(viewTime) : new Date(lastData.serverTime);
    const localNow = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
    const localDate = localNow.slice(0, 10);
    const midnight = localDate + "T00:00:00";
    inputFrom.min = midnight;
    inputFrom.max = localNow;
    inputTo.min = midnight;
    inputTo.max = localNow;
    inputFrom.value = recordFrom || midnight;
    inputTo.value = recordTo || localNow;
  }
}

function localInputText(value) {
  const date = new Date(value);
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

function fromLocal(value) {
  return Date.parse(value + "+09:00");
}

function recordStatus(value) {
  return value === "completed" ? "완료" : value === "receipt-wait" ? "접수 대기" : "처리 대기";
}

function recordTable(rows) {
  const wrap = document.createElement("div");
  wrap.className = "table-scroll";
  wrap.tabIndex = 0;
  wrap.setAttribute("aria-label", "기록 표. 좌우로 이동할 수 있습니다.");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const title of ["발생 시각", "수량", "서버 접수", "서버 처리", "상태"]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = title;
    headerRow.append(th);
  }
  thead.append(headerRow);
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of row) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function keepScroll(box, draw, sameScreen) {
  const before = !sameScreen ? [] : [".table-scroll", ".history-strip"].map(selector => {
    const old = box.querySelector(selector);
    return old && [selector, old.scrollLeft, old === document.activeElement];
  }).filter(Boolean);
  draw();
  for (const [selector, left, focused] of before) {
    const next = box.querySelector(selector);
    if (!next) continue;
    next.scrollLeft = left;
    if (focused) next.focus({ preventScroll: true });
  }
}

function renderRecords(data, id, sameScreen) {
  const from = $("#record-from");
  const to = $("#record-to");
  const current = isTime(data.viewTime) ? data.viewTime : data.serverTime;
  const now = new Date(current);
  const localNow = localInputText(now);
  const dayStart = localNow.slice(0, 10) + "T00:00:00";
  from.min = to.min = dayStart;
  from.max = to.max = localNow;
  if (!sameScreen) {
    from.value = dayStart;
    to.value = localNow;
  }

  recordFrom = from.value;
  recordTo = to.value;
  const start = fromLocal(from.value);
  const end = fromLocal(to.value);
  const source = window.SAMPLE_RECORDS?.[id === "factory" ? "production" : "shipment"] || [];
  const records = Number.isFinite(start) && Number.isFinite(end) && start <= end
    ? source.filter(record => isTime(record.occurredAt) && Date.parse(record.occurredAt) >= start && Date.parse(record.occurredAt) <= end)
    : [];
  const rows = records.map(record => [
    dateText(record.occurredAt),
    quantityText(record.quantity),
    isTime(record.receivedAt) ? dateText(record.receivedAt) : "접수 대기",
    isTime(record.processedAt) ? dateText(record.processedAt) : "처리 대기",
    recordStatus(record.status)
  ]);
  const result = $("#records-result");
  const contentKey = JSON.stringify(rows);
  if (renderedRecords !== contentKey) {
    renderedRecords = contentKey;
    keepScroll(result, () => {
      result.replaceChildren();
      if (rows.length) {
        result.append(recordTable(rows));
      } else {
        const notice = document.createElement("p");
        notice.className = "notice";
        notice.textContent = "선택한 시간대에 기록이 없습니다.";
        result.append(notice);
      }
    }, sameScreen);
  }
}

function renderQueries(sameScreen) {
  const view = $("#queries-view");
  const contentKey = "empty";
  if (renderedQueries === contentKey) return;
  renderedQueries = contentKey;
  keepScroll(view, () => {
    const history = document.createElement("div");
    history.className = "history-strip";
    history.tabIndex = 0;
    history.setAttribute("aria-label", "조회 기록");
    const notice = document.createElement("p");
    notice.className = "notice";
    notice.textContent = "조회 기록이 없습니다.";
    history.append(notice);
    view.replaceChildren(history);
  }, sameScreen);
}

function render(data = lastData) {
  if (data) lastData = data;
  const snapshot = lastData;
  const routeInfo = resolveRoute(window.location.hash);
  const routeKey = routeInfo.route + "/" + (routeInfo.id || "");
  const sameScreen = routeKey === lastRenderedRoute;
  lastRenderedRoute = routeKey;
  const now = isTime(snapshot.viewTime) ? Date.parse(snapshot.viewTime) : Date.parse(snapshot.serverTime);

  fillQuantity("factory", snapshot.sites.factory);
  fillQuantity("warehouse", snapshot.sites.warehouse);
  fillStatus("factory", snapshot.sites.factory, now);
  fillStatus("warehouse", snapshot.sites.warehouse, now);
  fillAlertsStatus(snapshot.services.alerts);
  fillFlow("factory", snapshot.sites.factory, now);
  fillFlow("warehouse", snapshot.sites.warehouse, now);
  const issues = currentIssues(snapshot);
  renderNotifications(issues);
  renderHero(issues);
  renderRoute();
  if (routeInfo.route === "records") renderRecords(snapshot, routeInfo.id, sameScreen);
  if (routeInfo.route === "queries") renderQueries(sameScreen);
}

$("#record-filter").addEventListener("submit", (event) => {
  event.preventDefault();
  recordFrom = $("#record-from").value;
  recordTo = $("#record-to").value;
  render();
});

for (const button of document.querySelectorAll(".help-btn")) setupHelp(button);

$(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  $("#main").focus();
});

$("#header-alerts-link").addEventListener("click", () => toggleNotifications());
document.addEventListener("click", (event) => {
  if (!event.target.closest(".notification-wrap")) toggleNotifications(false);
  if (!event.target.closest(".help-wrap")) {
    for (const button of document.querySelectorAll(".help-btn")) {
      const popover = button.closest(".help-wrap").querySelector(".help-popover");
      if (!popover.hidden) closeHelp(button, popover);
    }
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (notificationsOpen) {
    toggleNotifications(false);
    $("#header-alerts-link").focus();
  }
  for (const popover of openHelps()) {
    const button = popover.closest(".help-wrap").querySelector(".help-btn");
    button.focus();
    closeHelp(button, popover);
  }
});
document.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const scroller = event.target.closest?.(".graph-scroll");
  if (!scroller) return;
  event.preventDefault();
  scroller.scrollLeft = event.key === "Home"
    ? 0
    : event.key === "End"
      ? scroller.scrollWidth
      : scroller.scrollLeft + (event.key === "ArrowRight" ? 90 : -90);
});
window.addEventListener("resize", () => {
  for (const popover of openHelps()) positionHelpPopover(popover);
});

window.addEventListener("hashchange", () => render());
render();