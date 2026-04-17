import { connectSessionSocket, fetchWithSession, initializeDashboard, navigateTo } from "/page-main.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const STAFF_ROLE_LABELS = {
  manager: "Manager",
  front_desk: "Front Desk",
  housekeeping: "Housekeeping",
  room_service: "Room Service",
  maintenance: "Maintenance",
  attendant: "Attendant",
  receptionist: "Receptionist",
  runner: "Runner",
};

const STATUS_COLORS = {
  received: "#2d6cdf",
  in_progress: "#c27b1d",
  partially_delivered: "#8f5e3b",
  delivered: "#23875d",
  rejected: "#b64636",
  cancelled: "#8b877e",
  blue: "#2d6cdf",
  orange: "#c27b1d",
  purple: "#8f5e3b",
  green: "#23875d",
  red: "#b64636",
  gray: "#8b877e",
};

const STOCKTAKING_REASON_LABELS = {
  damaged: "Damaged",
  theft: "Theft",
  miscounted: "Miscounted",
  supplier_error: "Supplier Error",
};

const STOCKTAKING_REASON_COLORS = {
  damaged: "#b64636",
  theft: "#6a3b56",
  miscounted: "#c27b1d",
  supplier_error: "#2d6cdf",
};

const session = await initializeDashboard({
  expectedUserType: "staff",
  resolveTitle() {
    return "Receptionist overview";
  },
  metaEntries(currentSession) {
    return [
      { label: "Receptionist", value: currentSession.displayName },
      { label: "Email", value: currentSession.email },
      { label: "Role", value: STAFF_ROLE_LABELS[currentSession.role] || currentSession.role },
    ];
  },
});

if (!session || session.role !== "receptionist") {
  navigateTo("/staff");
} else {
  const statusNode = document.querySelector("#status");
  const generatedAtNode = document.querySelector("#receptionist-generated-at");
  const backStaffButton = document.querySelector("#back-staff-button");
  const refreshButton = document.querySelector("#refresh-receptionist-button");

  const stocktakingForm = document.querySelector("#receptionist-stocktaking-form");
  const stocktakingItemField = document.querySelector("#receptionist-stocktaking-item");
  const stocktakingExpectedField = document.querySelector("#receptionist-stocktaking-expected");
  const stocktakingPhysicalField = document.querySelector("#receptionist-stocktaking-physical");
  const stocktakingDiscrepancyField = document.querySelector("#receptionist-stocktaking-discrepancy");
  const stocktakingReasonField = document.querySelector("#receptionist-stocktaking-reason");
  const stocktakingItemHintNode = document.querySelector("#receptionist-stocktaking-item-hint");
  const stocktakingNoteNode = document.querySelector("#receptionist-stocktaking-note");
  const stocktakingStatusNode = document.querySelector("#receptionist-stocktaking-status");
  const stocktakingSubmitButton = document.querySelector("#receptionist-stocktaking-submit");
  const stocktakingResetButton = document.querySelector("#receptionist-stocktaking-reset");
  const stocktakingMonthLabelNode = document.querySelector("#receptionist-stocktaking-month-label");
  const stocktakingTotalEntriesNode = document.querySelector("#receptionist-stocktaking-total-entries");
  const stocktakingMismatchEntriesNode = document.querySelector("#receptionist-stocktaking-mismatch-entries");
  const stocktakingTotalDifferenceNode = document.querySelector("#receptionist-stocktaking-total-difference");
  const stocktakingLastEntryNode = document.querySelector("#receptionist-stocktaking-last-entry");
  const stocktakingReasonChartNode = document.querySelector("#receptionist-stocktaking-reason-chart");
  const stocktakingReasonLegendNode = document.querySelector("#receptionist-stocktaking-reason-legend");
  const stocktakingActivityChartNode = document.querySelector("#receptionist-stocktaking-activity-chart");
  const stocktakingActivityCopyNode = document.querySelector("#receptionist-stocktaking-activity-copy");
  const stocktakingEntriesCountNode = document.querySelector("#receptionist-stocktaking-count");
  const stocktakingTableBody = document.querySelector("#receptionist-stocktaking-table-body");

  const summaryOccupiedRoomsNode = document.querySelector("#summary-occupied-rooms");
  const summaryArrivalsTodayNode = document.querySelector("#summary-arrivals-today");
  const summaryDeparturesTodayNode = document.querySelector("#summary-departures-today");
  const summaryDeparturesTomorrowNode = document.querySelector("#summary-departures-tomorrow");
  const summaryOpenRequestsNode = document.querySelector("#summary-open-requests");
  const summaryAwaitingResponsesNode = document.querySelector("#summary-awaiting-responses");

  const statusChartNode = document.querySelector("#receptionist-status-chart");
  const statusLegendNode = document.querySelector("#receptionist-status-legend");
  const volumeChartNode = document.querySelector("#receptionist-volume-chart");
  const volumeAxisNode = document.querySelector("#receptionist-volume-axis");
  const categoryBreakdownNode = document.querySelector("#receptionist-category-breakdown");
  const briefNode = document.querySelector("#receptionist-brief");
  const attentionRoomsNode = document.querySelector("#receptionist-attention-rooms");
  const attentionRoomCountNode = document.querySelector("#attention-room-count");

  const awaitingReplyCountNode = document.querySelector("#awaiting-reply-count");
  const awaitingReplyTableBody = document.querySelector("#awaiting-reply-table-body");

  const departureCountNode = document.querySelector("#departure-count");
  const departureTableBody = document.querySelector("#departure-table-body");

  const recentRequestCountNode = document.querySelector("#recent-request-count");
  const recentRequestTableBody = document.querySelector("#recent-request-table-body");

  let overview = null;
  let receptionistPollHandle = null;
  let receptionistRefreshHandle = null;
  let receptionistSocket = null;

  function setStatus(message, tone = "") {
    statusNode.textContent = message;
    statusNode.className = `status ${tone}`.trim();
  }

  function escapeEmpty(value) {
    return value || "-";
  }

  function setStocktakingStatus(message, tone = "") {
    stocktakingStatusNode.textContent = message;
    stocktakingStatusNode.className = `status ${tone}`.trim();
  }

  function setCount(node, count, singularLabel) {
    node.textContent = `${count} ${singularLabel}${count === 1 ? "" : "s"}`;
  }

  function parseDateValue(value) {
    if (!value) {
      return null;
    }

    const parsed = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatDateTime(value) {
    const parsed = parseDateValue(value);

    if (!parsed) {
      return value ? String(value).replace("T", " ").slice(0, 16) : "-";
    }

    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatRoomLabel(roomNumber, owner) {
    return owner ? `Room ${roomNumber} - ${owner}` : `Room ${roomNumber}`;
  }

  function formatSignedNumber(value) {
    const amount = Number(value || 0);
    return amount > 0 ? `+${amount}` : String(amount);
  }

  function getStatusColor(status) {
    return STATUS_COLORS[status?.code] || STATUS_COLORS[status?.color] || "#8b877e";
  }

  function formatStatusLabel(status) {
    return status?.label || status?.code || "-";
  }

  function formatStocktakingReason(reason) {
    return reason ? STOCKTAKING_REASON_LABELS[reason] || reason : "Matched";
  }

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);

    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, String(value));
    }

    return element;
  }

  function renderEmptyTableRow(body, colSpan, message) {
    body.innerHTML = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = colSpan;
    cell.className = "empty-state";
    cell.textContent = message;
    row.append(cell);
    body.append(row);
  }

  function requestJson(url, options = {}) {
    return fetchWithSession(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Request failed");
      }

      return payload;
    });
  }

  function getInventoryCatalog() {
    return overview?.inventoryItems || [];
  }

  function getSelectedStocktakingItem() {
    const inventoryItemId = Number(stocktakingItemField.value || 0);
    return getInventoryCatalog().find((item) => Number(item.id) === inventoryItemId) || null;
  }

  function renderStocktakingItemOptions() {
    const items = getInventoryCatalog();
    const selectedValue = stocktakingItemField.value;

    stocktakingItemField.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = items.length === 0 ? "No items available" : "Select item";
    stocktakingItemField.append(placeholder);

    for (const item of items) {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = `${item.name} (${item.quantityInStock} ${item.unit} in stock)`;
      stocktakingItemField.append(option);
    }

    if (selectedValue && items.some((item) => String(item.id) === selectedValue)) {
      stocktakingItemField.value = selectedValue;
    }
  }

  function updateStocktakingItemHint() {
    const selectedItem = getSelectedStocktakingItem();

    if (!selectedItem) {
      stocktakingItemHintNode.textContent = "Select an item and enter the expected and actual counts.";
      return;
    }

    stocktakingItemHintNode.textContent = `${selectedItem.name} currently shows ${selectedItem.quantityInStock} ${selectedItem.unit} in stock.`;
  }

  function syncStocktakingDiscrepancyState() {
    const expectedValue = stocktakingExpectedField.value;
    const physicalValue = stocktakingPhysicalField.value;
    const hasBothCounts = expectedValue !== "" && physicalValue !== "";
    const discrepancy = hasBothCounts ? Number(physicalValue) - Number(expectedValue) : 0;
    const requiresReason = hasBothCounts && discrepancy !== 0;

    stocktakingDiscrepancyField.value = hasBothCounts ? String(discrepancy) : "";
    stocktakingReasonField.disabled = !requiresReason;
    stocktakingReasonField.required = requiresReason;

    if (!requiresReason) {
      stocktakingReasonField.value = "";
      stocktakingNoteNode.textContent = "Reason becomes required when the difference is not zero.";
      return;
    }

    stocktakingNoteNode.textContent = discrepancy > 0
      ? "Actual count is higher than expected. Select a reason before saving."
      : "Actual count is lower than expected. Select a reason before saving.";
  }

  function resetStocktakingForm(clearStatus = true) {
    stocktakingForm.reset();
    renderStocktakingItemOptions();
    stocktakingDiscrepancyField.value = "";
    stocktakingReasonField.disabled = true;
    stocktakingReasonField.required = false;
    updateStocktakingItemHint();
    syncStocktakingDiscrepancyState();

    if (clearStatus) {
      setStocktakingStatus("");
    }
  }

  function getStocktakingPayload() {
    return {
      inventoryItemId: Number(stocktakingItemField.value || 0),
      expectedCount: Number(stocktakingExpectedField.value || 0),
      physicalCount: Number(stocktakingPhysicalField.value || 0),
      reason: stocktakingReasonField.disabled ? null : (stocktakingReasonField.value || null),
    };
  }

  function renderSummary() {
    summaryOccupiedRoomsNode.textContent = String(overview.summary.occupiedRooms);
    summaryArrivalsTodayNode.textContent = String(overview.summary.arrivalsToday);
    summaryDeparturesTodayNode.textContent = String(overview.summary.departuresToday);
    summaryDeparturesTomorrowNode.textContent = String(overview.summary.departuresTomorrow);
    summaryOpenRequestsNode.textContent = String(overview.summary.openRequests);
    summaryAwaitingResponsesNode.textContent = String(overview.summary.awaitingGuestResponses);
    generatedAtNode.textContent = `Updated ${formatDateTime(overview.generatedAt)}`;
  }

  function renderStocktakingSummary() {
    const stocktaking = overview.stocktaking;
    stocktakingMonthLabelNode.textContent = `${stocktaking.currentMonthLabel} audit report`;
    stocktakingTotalEntriesNode.textContent = String(stocktaking.summary.totalEntries);
    stocktakingMismatchEntriesNode.textContent = String(stocktaking.summary.mismatchEntries);
    stocktakingTotalDifferenceNode.textContent = String(stocktaking.summary.totalAbsoluteDifference);
    stocktakingLastEntryNode.textContent = stocktaking.summary.lastEntryAt ? formatDateTime(stocktaking.summary.lastEntryAt) : "-";
  }

  function renderStatusChart() {
    const items = overview.requestStatusBreakdown.filter((item) => item.count > 0);
    const total = items.reduce((sum, item) => sum + item.count, 0);

    statusChartNode.innerHTML = "";
    statusLegendNode.innerHTML = "";

    const baseRing = createSvgElement("circle", {
      cx: 110,
      cy: 110,
      r: 76,
      fill: "none",
      stroke: "rgba(73, 56, 39, 0.12)",
      "stroke-width": 18,
    });
    statusChartNode.append(baseRing);

    if (total === 0) {
      const centerText = createSvgElement("text", {
        x: 110,
        y: 104,
        "text-anchor": "middle",
        class: "receptionist-chart-total",
      });
      centerText.textContent = "0";

      const centerSubtext = createSvgElement("text", {
        x: 110,
        y: 128,
        "text-anchor": "middle",
        class: "receptionist-chart-subtext",
      });
      centerSubtext.textContent = "requests";

      statusChartNode.append(centerText, centerSubtext);

      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "No request history is available yet.";
      statusLegendNode.append(emptyState);
      return;
    }

    const circumference = 2 * Math.PI * 76;
    let consumedLength = 0;

    for (const item of items) {
      const segmentLength = (item.count / total) * circumference;
      const segment = createSvgElement("circle", {
        cx: 110,
        cy: 110,
        r: 76,
        fill: "none",
        stroke: getStatusColor(item),
        "stroke-width": 18,
        "stroke-linecap": "round",
        "stroke-dasharray": `${segmentLength} ${Math.max(circumference - segmentLength, 0)}`,
        "stroke-dashoffset": String(-consumedLength),
        transform: "rotate(-90 110 110)",
      });
      statusChartNode.append(segment);
      consumedLength += segmentLength;

      const legendItem = document.createElement("article");
      legendItem.className = "receptionist-legend-item";

      const legendLabelRow = document.createElement("div");
      legendLabelRow.className = "receptionist-legend-label-row";

      const swatch = document.createElement("span");
      swatch.className = "receptionist-swatch";
      swatch.style.backgroundColor = getStatusColor(item);

      const label = document.createElement("strong");
      label.textContent = item.label;

      legendLabelRow.append(swatch, label);

      const metrics = document.createElement("p");
      metrics.className = "muted";
      metrics.textContent = `${item.count} request${item.count === 1 ? "" : "s"} • ${item.share}%`;

      legendItem.append(legendLabelRow, metrics);
      statusLegendNode.append(legendItem);
    }

    const centerText = createSvgElement("text", {
      x: 110,
      y: 104,
      "text-anchor": "middle",
      class: "receptionist-chart-total",
    });
    centerText.textContent = String(total);

    const centerSubtext = createSvgElement("text", {
      x: 110,
      y: 128,
      "text-anchor": "middle",
      class: "receptionist-chart-subtext",
    });
    centerSubtext.textContent = "requests";

    statusChartNode.append(centerText, centerSubtext);
  }

  function renderVolumeChart() {
    const data = overview.requestVolume;
    const maxCount = Math.max(...data.map((item) => item.count), 1);
    const width = 560;
    const height = 240;
    const paddingLeft = 24;
    const paddingRight = 24;
    const paddingTop = 18;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    volumeChartNode.innerHTML = "";
    volumeAxisNode.innerHTML = "";

    const gridValues = [0, Math.ceil(maxCount / 2), maxCount];

    for (const value of gridValues) {
      const y = height - paddingBottom - (value / maxCount) * plotHeight;
      const line = createSvgElement("line", {
        x1: paddingLeft,
        y1: y,
        x2: width - paddingRight,
        y2: y,
        class: "receptionist-grid-line",
      });
      const label = createSvgElement("text", {
        x: paddingLeft,
        y: y - 6,
        class: "receptionist-grid-label",
      });
      label.textContent = String(value);
      volumeChartNode.append(line, label);
    }

    const points = data.map((item, index) => {
      const x = paddingLeft + (index * plotWidth) / Math.max(data.length - 1, 1);
      const y = height - paddingBottom - (item.count / maxCount) * plotHeight;
      return { x, y, label: item.label, count: item.count };
    });

    if (points.length > 0) {
      const areaPath = [
        `M ${points[0].x} ${height - paddingBottom}`,
        ...points.map((point) => `L ${point.x} ${point.y}`),
        `L ${points[points.length - 1].x} ${height - paddingBottom}`,
        "Z",
      ].join(" ");

      const area = createSvgElement("path", {
        d: areaPath,
        class: "receptionist-area-path",
      });
      volumeChartNode.append(area);

      const line = createSvgElement("polyline", {
        points: points.map((point) => `${point.x},${point.y}`).join(" "),
        class: "receptionist-line-path",
      });
      volumeChartNode.append(line);

      for (const point of points) {
        const dot = createSvgElement("circle", {
          cx: point.x,
          cy: point.y,
          r: 5,
          class: "receptionist-line-dot",
        });
        volumeChartNode.append(dot);

        const valueLabel = createSvgElement("text", {
          x: point.x,
          y: point.y - 12,
          "text-anchor": "middle",
          class: "receptionist-point-label",
        });
        valueLabel.textContent = String(point.count);
        volumeChartNode.append(valueLabel);
      }
    }

    for (const item of data) {
      const axisLabel = document.createElement("span");
      axisLabel.className = "receptionist-axis-label";
      axisLabel.textContent = item.label;
      volumeAxisNode.append(axisLabel);
    }
  }

  function renderCategoryBreakdown() {
    const items = overview.categoryBreakdown;
    categoryBreakdownNode.innerHTML = "";

    if (items.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "No category data is available yet.";
      categoryBreakdownNode.append(emptyState);
      return;
    }

    const maxCount = Math.max(...items.map((item) => item.count), 1);

    for (const item of items) {
      const wrapper = document.createElement("article");
      wrapper.className = "receptionist-bar-item";

      const header = document.createElement("div");
      header.className = "receptionist-bar-header";

      const label = document.createElement("strong");
      label.textContent = item.label;

      const value = document.createElement("span");
      value.className = "muted";
      value.textContent = `${item.count} • ${item.share}%`;

      header.append(label, value);

      const track = document.createElement("div");
      track.className = "receptionist-bar-track";

      const fill = document.createElement("div");
      fill.className = "receptionist-bar-fill";
      fill.style.width = `${Math.max((item.count / maxCount) * 100, 8)}%`;

      track.append(fill);
      wrapper.append(header, track);
      categoryBreakdownNode.append(wrapper);
    }
  }

  function renderStocktakingReasonChart() {
    const items = overview.stocktaking.reasonBreakdown.filter((item) => item.count > 0);
    const total = items.reduce((sum, item) => sum + item.count, 0);

    stocktakingReasonChartNode.innerHTML = "";
    stocktakingReasonLegendNode.innerHTML = "";

    const baseRing = createSvgElement("circle", {
      cx: 110,
      cy: 110,
      r: 76,
      fill: "none",
      stroke: "rgba(73, 56, 39, 0.12)",
      "stroke-width": 18,
    });
    stocktakingReasonChartNode.append(baseRing);

    if (total === 0) {
      const centerText = createSvgElement("text", {
        x: 110,
        y: 104,
        "text-anchor": "middle",
        class: "receptionist-chart-total",
      });
      centerText.textContent = "0";

      const centerSubtext = createSvgElement("text", {
        x: 110,
        y: 128,
        "text-anchor": "middle",
        class: "receptionist-chart-subtext",
      });
      centerSubtext.textContent = "mismatches";

      stocktakingReasonChartNode.append(centerText, centerSubtext);

      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "No mismatch reasons have been recorded this month.";
      stocktakingReasonLegendNode.append(emptyState);
      return;
    }

    const circumference = 2 * Math.PI * 76;
    let consumedLength = 0;

    for (const item of items) {
      const segmentLength = (item.count / total) * circumference;
      const color = STOCKTAKING_REASON_COLORS[item.code] || "#8b877e";
      const segment = createSvgElement("circle", {
        cx: 110,
        cy: 110,
        r: 76,
        fill: "none",
        stroke: color,
        "stroke-width": 18,
        "stroke-linecap": "round",
        "stroke-dasharray": `${segmentLength} ${Math.max(circumference - segmentLength, 0)}`,
        "stroke-dashoffset": String(-consumedLength),
        transform: "rotate(-90 110 110)",
      });
      stocktakingReasonChartNode.append(segment);
      consumedLength += segmentLength;

      const legendItem = document.createElement("article");
      legendItem.className = "receptionist-legend-item";

      const legendLabelRow = document.createElement("div");
      legendLabelRow.className = "receptionist-legend-label-row";

      const swatch = document.createElement("span");
      swatch.className = "receptionist-swatch";
      swatch.style.backgroundColor = color;

      const label = document.createElement("strong");
      label.textContent = item.label;

      legendLabelRow.append(swatch, label);

      const metrics = document.createElement("p");
      metrics.className = "muted";
      metrics.textContent = `${item.count} entries • ${item.share}%`;

      legendItem.append(legendLabelRow, metrics);
      stocktakingReasonLegendNode.append(legendItem);
    }

    const centerText = createSvgElement("text", {
      x: 110,
      y: 104,
      "text-anchor": "middle",
      class: "receptionist-chart-total",
    });
    centerText.textContent = String(total);

    const centerSubtext = createSvgElement("text", {
      x: 110,
      y: 128,
      "text-anchor": "middle",
      class: "receptionist-chart-subtext",
    });
    centerSubtext.textContent = "mismatches";

    stocktakingReasonChartNode.append(centerText, centerSubtext);
  }

  function renderStocktakingActivityChart() {
    const data = overview.stocktaking.dailyActivity;
    const maxCount = Math.max(...data.map((item) => item.count), 1);
    const totalEntries = overview.stocktaking.summary.totalEntries;
    const width = 560;
    const height = 240;
    const paddingLeft = 24;
    const paddingRight = 24;
    const paddingTop = 18;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    stocktakingActivityChartNode.innerHTML = "";
    stocktakingActivityCopyNode.textContent = totalEntries > 0
      ? `${totalEntries} stocktaking entries were recorded during ${overview.stocktaking.currentMonthLabel.toLowerCase()}.`
      : `No stocktaking entries have been recorded during ${overview.stocktaking.currentMonthLabel.toLowerCase()} yet.`;

    const gridValues = [0, Math.ceil(maxCount / 2), maxCount];

    for (const value of gridValues) {
      const y = height - paddingBottom - (value / maxCount) * plotHeight;
      const line = createSvgElement("line", {
        x1: paddingLeft,
        y1: y,
        x2: width - paddingRight,
        y2: y,
        class: "receptionist-grid-line",
      });
      const label = createSvgElement("text", {
        x: paddingLeft,
        y: y - 6,
        class: "receptionist-grid-label",
      });
      label.textContent = String(value);
      stocktakingActivityChartNode.append(line, label);
    }

    if (data.length === 0) {
      return;
    }

    const points = data.map((item, index) => {
      const x = paddingLeft + (index * plotWidth) / Math.max(data.length - 1, 1);
      const y = height - paddingBottom - (item.count / maxCount) * plotHeight;
      return { x, y, label: item.label, count: item.count };
    });

    const areaPath = [
      `M ${points[0].x} ${height - paddingBottom}`,
      ...points.map((point) => `L ${point.x} ${point.y}`),
      `L ${points[points.length - 1].x} ${height - paddingBottom}`,
      "Z",
    ].join(" ");

    const area = createSvgElement("path", {
      d: areaPath,
      class: "receptionist-area-path",
    });
    stocktakingActivityChartNode.append(area);

    const line = createSvgElement("polyline", {
      points: points.map((point) => `${point.x},${point.y}`).join(" "),
      class: "receptionist-line-path",
    });
    stocktakingActivityChartNode.append(line);

    const labelStep = Math.max(1, Math.ceil(points.length / 7));

    for (const [index, point] of points.entries()) {
      const dot = createSvgElement("circle", {
        cx: point.x,
        cy: point.y,
        r: 4,
        class: "receptionist-line-dot",
      });
      stocktakingActivityChartNode.append(dot);

      if (index % labelStep === 0 || index === points.length - 1) {
        const axisLabel = createSvgElement("text", {
          x: point.x,
          y: height - 8,
          "text-anchor": "middle",
          class: "receptionist-grid-label",
        });
        axisLabel.textContent = point.label;
        stocktakingActivityChartNode.append(axisLabel);
      }
    }
  }

  function renderStocktakingEntriesTable() {
    const items = overview.stocktaking.entries;
    stocktakingTableBody.innerHTML = "";
    setCount(stocktakingEntriesCountNode, items.length, "entry");

    if (items.length === 0) {
      renderEmptyTableRow(stocktakingTableBody, 6, "No current month stocktaking entries yet.");
      return;
    }

    for (const item of items) {
      const row = document.createElement("tr");

      const recordedCell = document.createElement("td");
      recordedCell.textContent = formatDateTime(item.createdAt);
      row.append(recordedCell);

      const itemCell = document.createElement("td");
      itemCell.textContent = `${item.inventoryItem.name} (${item.inventoryItem.unit})`;
      row.append(itemCell);

      const expectedCell = document.createElement("td");
      expectedCell.textContent = String(item.expectedCount);
      row.append(expectedCell);

      const actualCell = document.createElement("td");
      actualCell.textContent = String(item.physicalCount);
      row.append(actualCell);

      const differenceCell = document.createElement("td");
      const differenceValue = document.createElement("span");
      differenceValue.className = [
        "receptionist-discrepancy-value",
        item.discrepancy > 0
          ? "receptionist-discrepancy-positive"
          : item.discrepancy < 0
            ? "receptionist-discrepancy-negative"
            : "receptionist-discrepancy-neutral",
      ].join(" ");
      differenceValue.textContent = formatSignedNumber(item.discrepancy);
      differenceCell.append(differenceValue);
      row.append(differenceCell);

      const reasonCell = document.createElement("td");
      reasonCell.textContent = formatStocktakingReason(item.reason);
      row.append(reasonCell);

      stocktakingTableBody.append(row);
    }
  }

  function buildBriefItems() {
    const items = [];
    const summary = overview.summary;
    const busiestCategory = overview.categoryBreakdown[0] || null;
    const peakDay = overview.requestVolume.reduce((best, item) => (item.count > (best?.count || 0) ? item : best), null);

    if (summary.awaitingGuestResponses > 0) {
      items.push({
        tone: "warning",
        title: "Guest replies are waiting",
        body: `${summary.awaitingGuestResponses} conversation thread${summary.awaitingGuestResponses === 1 ? " is" : "s are"} still waiting on the desk.`,
      });
    }

    if (summary.departuresToday > 0 || summary.departuresTomorrow > 0) {
      items.push({
        tone: "neutral",
        title: "Checkout coordination matters",
        body: `${summary.departuresToday} departure${summary.departuresToday === 1 ? "" : "s"} today and ${summary.departuresTomorrow} tomorrow are already on the board.`,
      });
    }

    if (busiestCategory) {
      items.push({
        tone: "ok",
        title: `${busiestCategory.label} is leading demand`,
        body: `${busiestCategory.count} recent request${busiestCategory.count === 1 ? "" : "s"} came through that category window.`,
      });
    }

    if (overview.summary.lowStockItems > 0) {
      items.push({
        tone: "warning",
        title: "Inventory pressure is visible",
        body: `${overview.summary.lowStockItems} inventory item${overview.summary.lowStockItems === 1 ? " is" : "s are"} already at low-stock threshold.`,
      });
    }

    if (peakDay && peakDay.count > 0) {
      items.push({
        tone: "neutral",
        title: `Peak request load: ${peakDay.label}`,
        body: `${peakDay.count} request${peakDay.count === 1 ? "" : "s"} were logged that day.`,
      });
    }

    if (items.length === 0) {
      items.push({
        tone: "ok",
        title: "Desk is quiet right now",
        body: "No open request, conversation, or stock alerts are currently surfacing on this overview.",
      });
    }

    return items.slice(0, 4);
  }

  function renderBrief() {
    const items = buildBriefItems();
    briefNode.innerHTML = "";

    for (const item of items) {
      const article = document.createElement("article");
      article.className = `receptionist-brief-item receptionist-brief-${item.tone}`;

      const title = document.createElement("strong");
      title.textContent = item.title;

      const body = document.createElement("p");
      body.textContent = item.body;

      article.append(title, body);
      briefNode.append(article);
    }
  }

  function renderAttentionRooms() {
    const rooms = overview.attentionRooms;
    attentionRoomsNode.innerHTML = "";
    setCount(attentionRoomCountNode, rooms.length, "room");

    if (rooms.length === 0) {
      const emptyState = document.createElement("article");
      emptyState.className = "tile receptionist-empty-panel";
      emptyState.textContent = "No rooms currently need follow-up from reception.";
      attentionRoomsNode.append(emptyState);
      return;
    }

    const now = new Date();

    for (const room of rooms) {
      const article = document.createElement("article");
      article.className = "receptionist-attention-card";

      const heading = document.createElement("div");
      heading.className = "receptionist-attention-heading";

      const title = document.createElement("strong");
      title.textContent = formatRoomLabel(room.roomNumber, room.owner);

      const meta = document.createElement("span");
      meta.className = "conversation-item-tag";
      meta.textContent = room.dateOut ? `Checkout ${formatDateTime(room.dateOut)}` : "No checkout time";

      heading.append(title, meta);

      const tagRow = document.createElement("div");
      tagRow.className = "receptionist-tag-row";

      if (room.awaitingGuestResponse) {
        const tag = document.createElement("span");
        tag.className = "receptionist-tag receptionist-tag-warning";
        tag.textContent = "Guest waiting";
        tagRow.append(tag);
      }

      if (room.openRequestCount > 0) {
        const tag = document.createElement("span");
        tag.className = "receptionist-tag receptionist-tag-info";
        tag.textContent = `${room.openRequestCount} open request${room.openRequestCount === 1 ? "" : "s"}`;
        tagRow.append(tag);
      }

      const dateOut = parseDateValue(room.dateOut);

      if (dateOut && dateOut.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
        const tag = document.createElement("span");
        tag.className = "receptionist-tag receptionist-tag-neutral";
        tag.textContent = "Departure soon";
        tagRow.append(tag);
      }

      const note = document.createElement("p");
      note.className = "muted";

      if (room.awaitingGuestResponse && room.lastMessagePreview) {
        note.textContent = room.lastMessagePreview;
      } else if (room.openRequestCount > 0 && room.lastOpenRequestAt) {
        note.textContent = `Latest open request logged ${formatDateTime(room.lastOpenRequestAt)}.`;
      } else {
        note.textContent = "Reception follow-up is recommended for this room.";
      }

      const footer = document.createElement("div");
      footer.className = "receptionist-attention-footer";

      const staff = document.createElement("span");
      staff.className = "receptionist-muted-metric";
      staff.textContent = room.assignedStaffName ? `Assigned: ${room.assignedStaffName}` : "Unassigned conversation";

      const activity = document.createElement("span");
      activity.className = "receptionist-muted-metric";
      activity.textContent = room.lastGuestMessageAt
        ? `Guest update ${formatDateTime(room.lastGuestMessageAt)}`
        : room.lastOpenRequestAt
          ? `Request update ${formatDateTime(room.lastOpenRequestAt)}`
          : "Awaiting next update";

      footer.append(staff, activity);
      article.append(heading, tagRow, note, footer);
      attentionRoomsNode.append(article);
    }
  }

  function renderAwaitingReplies() {
    const items = overview.awaitingReplies;
    awaitingReplyTableBody.innerHTML = "";
    setCount(awaitingReplyCountNode, items.length, "thread");

    if (items.length === 0) {
      renderEmptyTableRow(awaitingReplyTableBody, 4, "No guest threads are waiting for a reply.");
      return;
    }

    for (const item of items) {
      const row = document.createElement("tr");

      const roomCell = document.createElement("td");
      roomCell.textContent = formatRoomLabel(item.roomNumber, item.owner);
      row.append(roomCell);

      const messageCell = document.createElement("td");
      messageCell.className = "runner-request-copy";
      messageCell.textContent = escapeEmpty(item.lastMessagePreview);
      row.append(messageCell);

      const assignedCell = document.createElement("td");
      assignedCell.textContent = escapeEmpty(item.assignedStaffName);
      row.append(assignedCell);

      const updatedCell = document.createElement("td");
      updatedCell.textContent = formatDateTime(item.lastMessageAt);
      row.append(updatedCell);

      awaitingReplyTableBody.append(row);
    }
  }

  function renderUpcomingDepartures() {
    const items = overview.upcomingDepartures;
    departureTableBody.innerHTML = "";
    setCount(departureCountNode, items.length, "room");

    if (items.length === 0) {
      renderEmptyTableRow(departureTableBody, 3, "No upcoming departures are scheduled.");
      return;
    }

    for (const item of items) {
      const row = document.createElement("tr");

      const roomCell = document.createElement("td");
      roomCell.textContent = `Room ${item.roomNumber}`;
      row.append(roomCell);

      const guestCell = document.createElement("td");
      guestCell.textContent = escapeEmpty(item.owner);
      row.append(guestCell);

      const departureCell = document.createElement("td");
      departureCell.textContent = formatDateTime(item.dateOut);
      row.append(departureCell);

      departureTableBody.append(row);
    }
  }

  function renderRecentRequests() {
    const items = overview.recentRequests;
    recentRequestTableBody.innerHTML = "";
    setCount(recentRequestCountNode, items.length, "request");

    if (items.length === 0) {
      renderEmptyTableRow(recentRequestTableBody, 5, "No recent request activity yet.");
      return;
    }

    for (const item of items) {
      const row = document.createElement("tr");

      const requestedCell = document.createElement("td");
      requestedCell.textContent = formatDateTime(item.requestDate);
      row.append(requestedCell);

      const roomCell = document.createElement("td");
      roomCell.textContent = formatRoomLabel(item.roomNumber, item.owner);
      row.append(roomCell);

      const categoryCell = document.createElement("td");
      categoryCell.textContent = item.categoryLabel;
      row.append(categoryCell);

      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `receptionist-status-badge receptionist-status-${item.status.code}`;
      badge.textContent = formatStatusLabel(item.status);
      statusCell.append(badge);
      row.append(statusCell);

      const assignedCell = document.createElement("td");
      assignedCell.textContent = escapeEmpty(item.staffName);
      row.append(assignedCell);

      recentRequestTableBody.append(row);
    }
  }

  function renderOverview() {
    renderStocktakingItemOptions();
    updateStocktakingItemHint();
    syncStocktakingDiscrepancyState();
    renderSummary();
    renderStocktakingSummary();
    renderStocktakingReasonChart();
    renderStocktakingActivityChart();
    renderStocktakingEntriesTable();
    renderStatusChart();
    renderVolumeChart();
    renderCategoryBreakdown();
    renderBrief();
    renderAttentionRooms();
    renderAwaitingReplies();
    renderUpcomingDepartures();
    renderRecentRequests();
  }

  async function loadOverview() {
    const payload = await requestJson("/api/receptionist/overview");
    overview = payload.item;
    renderOverview();
  }

  function scheduleOverviewRefresh() {
    if (receptionistRefreshHandle) {
      window.clearTimeout(receptionistRefreshHandle);
    }

    receptionistRefreshHandle = window.setTimeout(() => {
      receptionistRefreshHandle = null;
      loadOverview().catch(() => {
        // Polling stays active if a realtime refresh fails.
      });
    }, 150);
  }

  function startReceptionistPolling() {
    if (receptionistPollHandle) {
      window.clearInterval(receptionistPollHandle);
    }

    receptionistPollHandle = window.setInterval(() => {
      loadOverview().catch(() => {
        // Keep the current overview visible if a scheduled refresh fails.
      });
    }, 12000);
  }

  async function startRealtimeUpdates() {
    try {
      receptionistSocket = await connectSessionSocket();
      receptionistSocket.on("conversation:updated", () => {
        scheduleOverviewRefresh();
      });
      receptionistSocket.on("receptionist:overview-updated", () => {
        scheduleOverviewRefresh();
      });
    } catch {
      // Polling remains active if the realtime channel cannot connect.
    }
  }

  backStaffButton?.addEventListener("click", () => {
    navigateTo("/staff");
  });

  refreshButton?.addEventListener("click", async () => {
    try {
      setStatus("Refreshing receptionist overview...", "ok");
      await loadOverview();
      setStatus("Receptionist overview refreshed.", "ok");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  stocktakingItemField?.addEventListener("change", () => {
    updateStocktakingItemHint();
  });

  stocktakingExpectedField?.addEventListener("input", () => {
    syncStocktakingDiscrepancyState();
  });

  stocktakingPhysicalField?.addEventListener("input", () => {
    syncStocktakingDiscrepancyState();
  });

  stocktakingResetButton?.addEventListener("click", () => {
    resetStocktakingForm();
  });

  stocktakingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = getStocktakingPayload();

    if (!payload.inventoryItemId) {
      setStocktakingStatus("Select an item first.", "error");
      return;
    }

    stocktakingSubmitButton.disabled = true;
    setStocktakingStatus("Saving stocktaking entry...", "ok");

    try {
      await requestJson("/api/receptionist/stocktaking", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadOverview();
      resetStocktakingForm(false);
      setStocktakingStatus("Stocktaking entry saved.", "ok");
    } catch (error) {
      setStocktakingStatus(error.message, "error");
    } finally {
      stocktakingSubmitButton.disabled = false;
    }
  });

  if (session?.staffId) {
    try {
      await loadOverview();
      resetStocktakingForm(false);
      setStatus("Receptionist overview ready.", "ok");
      startReceptionistPolling();
      await startRealtimeUpdates();
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  window.addEventListener("beforeunload", () => {
    if (receptionistPollHandle) {
      window.clearInterval(receptionistPollHandle);
    }

    if (receptionistRefreshHandle) {
      window.clearTimeout(receptionistRefreshHandle);
    }

    if (receptionistSocket) {
      receptionistSocket.disconnect();
    }
  });
}