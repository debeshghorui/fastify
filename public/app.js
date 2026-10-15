const $ = (selector) => document.querySelector(selector);

const state = {
    view: "overview",
    records: [],
    documents: [],
    logs: [],
};

let notificationTimer;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character];
    });
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function formatDuration(value) {
    const duration = Number(value);

    return Number.isFinite(duration)
        ? `${duration.toFixed(2)} ms`
        : "—";
}

function showNotification(message, type = "success") {
    const element = $("#notification");

    clearTimeout(notificationTimer);

    element.textContent = message;
    element.className = `notification ${type}`;
    element.hidden = false;

    notificationTimer = setTimeout(() => {
        element.hidden = true;
    }, 5000);
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
        },
    });

    const text = await response.text();

    let result;

    try {
        result = text ? JSON.parse(text) : null;
    } catch {
        result = text;
    }

    if (!response.ok) {
        throw new Error(
            result?.error?.message ??
            result?.error ??
            result?.message ??
            `Request failed with status ${response.status}`,
        );
    }

    return result;
}

function setView(view) {
    state.view = view;

    document.querySelectorAll(".view").forEach((section) => {
        section.classList.toggle("active", section.id === `view-${view}`);
    });

    document.querySelectorAll(".nav-link").forEach((button) => {
        button.classList.toggle("active", button.dataset.view === view);
    });

    const titles = {
        overview: "Overview",
        cockroach: "CockroachDB",
        couch: "CouchDB",
        analytics: "ClickHouse Logs",
    };

    $("#page-title").textContent = titles[view];
    $("#breadcrumb").textContent = titles[view];

    if (view === "overview") {
        loadOverview();
    }

    if (view === "cockroach") {
        loadRecords();
    }

    if (view === "couch") {
        loadDocuments();
    }

    if (view === "analytics") {
        loadAnalytics();
    }
}

async function loadRecords() {
    const table = $("#records-table");

    table.innerHTML = `
    <tr><td colspan="6" class="empty-state">Loading records...</td></tr>
  `;

    try {
        const result = await api("/api/records");

        state.records = result.data ?? [];

        $("#record-count").textContent =
            `${state.records.length} record${state.records.length === 1 ? "" : "s"}`;

        if (!state.records.length) {
            table.innerHTML = `
        <tr><td colspan="6" class="empty-state">No records yet. Create your first record.</td></tr>
      `;

            return;
        }

        table.innerHTML = state.records
            .map(
                (record) => `
          <tr>
            <td>${escapeHTML(record.id)}</td>
            <td>${escapeHTML(record.name)}</td>
            <td>${escapeHTML(record.email)}</td>
            <td>${escapeHTML(record.description || "—")}</td>
            <td>${escapeHTML(formatDate(record.createdAt ?? record.created_at))}</td>
            <td>
              <div class="action-group">
                <button class="action-button" data-edit-record="${escapeHTML(record.id)}">Edit</button>
                <button class="action-button danger" data-delete-record="${escapeHTML(record.id)}">Delete</button>
              </div>
            </td>
          </tr>
        `,
            )
            .join("");
    } catch (error) {
        table.innerHTML = `
      <tr><td colspan="6" class="empty-state">Could not load records: ${escapeHTML(error.message)}</td></tr>
    `;

        showNotification(error.message, "error");
    }
}

function openRecordForm(record = null) {
    $("#record-form").hidden = false;

    $("#record-id").value = record?.id ?? "";
    $("#record-name").value = record?.name ?? "";
    $("#record-email").value = record?.email ?? "";
    $("#record-description").value = record?.description ?? "";

    $("#record-form-title").textContent = record ? "Edit record" : "Create record";
    $("#save-record").textContent = record ? "Save changes" : "Create record";

    $("#record-form").scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
}

async function saveRecord(event) {
    event.preventDefault();

    const id = $("#record-id").value;

    const data = {
        name: $("#record-name").value.trim(),
        email: $("#record-email").value.trim(),
        description: $("#record-description").value.trim() || null,
    };

    const button = $("#save-record");
    button.disabled = true;

    try {
        await api(id ? `/api/records/${encodeURIComponent(id)}` : "/api/records", {
            method: id ? "PATCH" : "POST",
            body: JSON.stringify(data),
        });

        $("#record-form").hidden = true;

        showNotification(id ? "Record updated successfully." : "Record created successfully.");

        await loadRecords();
    } catch (error) {
        showNotification(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function deleteRecord(id) {
    if (!confirm(`Delete record ${id}? This cannot be undone.`)) {
        return;
    }

    try {
        await api(`/api/records/${encodeURIComponent(id)}`, {
            method: "DELETE",
        });

        showNotification("Record deleted successfully.");

        await loadRecords();
    } catch (error) {
        showNotification(error.message, "error");
    }
}

async function loadDocuments() {
    const table = $("#documents-table");

    table.innerHTML = `
    <tr><td colspan="6" class="empty-state">Loading documents...</td></tr>
  `;

    try {
        // CouchDB requires a listing endpoint; we add it below.
        const result = await api("/api/documents");

        state.documents = result.data ?? [];

        $("#document-count").textContent =
            `${state.documents.length} document${state.documents.length === 1 ? "" : "s"}`;

        if (!state.documents.length) {
            table.innerHTML = `
        <tr><td colspan="6" class="empty-state">No documents yet. Create your first document.</td></tr>
      `;

            return;
        }

        table.innerHTML = state.documents
            .map(
                (document) => `
          <tr>
            <td title="${escapeHTML(document._id)}">${escapeHTML(document._id)}</td>
            <td>${escapeHTML(document.title)}</td>
            <td>${escapeHTML(document.category || "—")}</td>
            <td>${escapeHTML((document.tags ?? []).join(", ") || "—")}</td>
            <td>${escapeHTML(formatDate(document.updatedAt))}</td>
            <td>
              <div class="action-group">
                <button class="action-button" data-edit-document="${escapeHTML(document._id)}">Edit</button>
                <button class="action-button danger" data-delete-document="${escapeHTML(document._id)}">Delete</button>
              </div>
            </td>
          </tr>
        `,
            )
            .join("");
    } catch (error) {
        table.innerHTML = `
      <tr><td colspan="6" class="empty-state">Could not load documents: ${escapeHTML(error.message)}</td></tr>
    `;

        showNotification(error.message, "error");
    }
}

function openDocumentForm(document = null) {
    $("#document-form").hidden = false;

    $("#document-id").value = document?._id ?? "";
    $("#document-title").value = document?.title ?? "";
    $("#document-category").value = document?.category ?? "";
    $("#document-content").value = document?.content ?? "";
    $("#document-tags").value = (document?.tags ?? []).join(", ");

    $("#document-form-title").textContent =
        document ? "Edit document" : "Create document";

    $("#save-document").textContent =
        document ? "Save changes" : "Create document";

    $("#document-form").scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
}

async function saveDocument(event) {
    event.preventDefault();

    const id = $("#document-id").value;

    const data = {
        title: $("#document-title").value.trim(),
        category: $("#document-category").value.trim(),
        content: $("#document-content").value,
        tags: $("#document-tags").value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
    };

    const button = $("#save-document");
    button.disabled = true;

    try {
        await api(
            id ? `/api/documents/${encodeURIComponent(id)}` : "/api/documents",
            {
                method: id ? "PATCH" : "POST",
                body: JSON.stringify(data),
            },
        );

        $("#document-form").hidden = true;

        showNotification(
            id ? "Document updated successfully." : "Document created successfully.",
        );

        await loadDocuments();
    } catch (error) {
        showNotification(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function deleteDocument(id) {
    if (!confirm(`Delete document ${id}? This cannot be undone.`)) {
        return;
    }

    try {
        await api(`/api/documents/${encodeURIComponent(id)}`, {
            method: "DELETE",
        });

        showNotification("Document deleted successfully.");

        await loadDocuments();
    } catch (error) {
        showNotification(error.message, "error");
    }
}

async function loadLogs({ database = "", status = "", limit = 25 } = {}) {
    const params = new URLSearchParams({
        limit: String(limit),
    });

    if (database) params.set("database", database);
    if (status) params.set("status", status);

    return api(`/api/analytics/logs?${params}`);
}

function renderLogs(logs, target, columns = 7) {
    if (!logs.length) {
        target.innerHTML = `
      <tr><td colspan="${columns}" class="empty-state">No operation logs found.</td></tr>
    `;

        return;
    }

    target.innerHTML = logs
        .map((log) => {
            const status = log.status === "SUCCESS" ? "success" : "failure";

            return `
        <tr>
          <td>${escapeHTML(formatDate(log.created_at))}</td>
          <td class="database-label">${escapeHTML(log.database_name)}</td>
          <td>${escapeHTML(log.operation_type)}</td>
          <td>${escapeHTML(log.function_name)}</td>
          <td><span class="status-badge ${status}">${escapeHTML(log.status)}</span></td>
          <td class="duration">${escapeHTML(formatDuration(log.duration_ms))}</td>
          <td title="${escapeHTML(log.request_id)}">${escapeHTML(log.request_id || "—")}</td>
        </tr>
      `;
        })
        .join("");
}

async function loadRecentLogs() {
    const table = $("#recent-logs");

    try {
        const result = await loadLogs({ limit: 8 });
        const logs = result.data ?? [];

        if (!logs.length) {
            table.innerHTML = `
        <tr><td colspan="6" class="empty-state">No operations logged yet. Perform a CRUD operation to generate events.</td></tr>
      `;

            return;
        }

        table.innerHTML = logs
            .map(
                (log) => `
          <tr>
            <td class="database-label">${escapeHTML(log.database_name)}</td>
            <td>${escapeHTML(log.operation_type)}</td>
            <td>${escapeHTML(log.function_name)}</td>
            <td>
              <span class="status-badge ${log.status === "SUCCESS" ? "success" : "failure"}">
                ${escapeHTML(log.status)}
              </span>
            </td>
            <td class="duration">${escapeHTML(formatDuration(log.duration_ms))}</td>
            <td>${escapeHTML(formatDate(log.created_at))}</td>
          </tr>
        `,
            )
            .join("");
    } catch (error) {
        table.innerHTML = `
      <tr><td colspan="6" class="empty-state">ClickHouse logs unavailable: ${escapeHTML(error.message)}</td></tr>
    `;
    }
}

async function loadSummary() {
    const result = await api("/api/analytics/summary");
    const summary = result.data ?? [];

    const total = summary.reduce(
        (sum, row) => sum + Number(row.total_operations ?? 0),
        0,
    );

    const success = summary.reduce(
        (sum, row) => sum + Number(row.successful_operations ?? 0),
        0,
    );

    const failed = summary.reduce(
        (sum, row) => sum + Number(row.failed_operations ?? 0),
        0,
    );

    const average = total
        ? summary.reduce(
            (sum, row) =>
                sum +
                Number(row.average_duration_ms ?? 0) *
                Number(row.total_operations ?? 0),
            0,
        ) / total
        : 0;

    $("#metric-total").textContent = total.toLocaleString();
    $("#metric-success").textContent = success.toLocaleString();
    $("#metric-failed").textContent = failed.toLocaleString();
    $("#metric-duration").textContent = `${average.toFixed(2)} ms`;

    $("#analytics-success").textContent = success.toLocaleString();
    $("#analytics-failed").textContent = failed.toLocaleString();
    $("#analytics-average").textContent = `${average.toFixed(2)} ms`;

    $("#summary-table").innerHTML = summary.length
        ? summary
            .map(
                (row) => `
            <tr>
              <td>${escapeHTML(row.database_name)}</td>
              <td>${escapeHTML(row.operation_type)}</td>
              <td>${escapeHTML(row.total_operations)}</td>
              <td>${escapeHTML(row.successful_operations)}</td>
              <td>${escapeHTML(row.failed_operations)}</td>
              <td class="duration">${escapeHTML(formatDuration(row.average_duration_ms))}</td>
              <td>${escapeHTML(formatDuration(row.maximum_duration_ms))}</td>
              <td>${escapeHTML(formatDuration(row.p95_duration_ms))}</td>
            </tr>
          `,
            )
            .join("")
        : `
      <tr><td colspan="8" class="empty-state">No summary data yet.</td></tr>
    `;

    return summary;
}

async function loadAnalytics() {
    $("#analytics-table").innerHTML = `
    <tr><td colspan="7" class="empty-state">Loading logs...</td></tr>
  `;

    try {
        const summary = await loadSummary();

        const maximum = Math.max(
            0,
            ...summary.map((row) => Number(row.maximum_duration_ms ?? 0)),
        );

        $("#analytics-slowest").textContent = `${maximum.toFixed(2)} ms`;

        await applyLogFilters();
    } catch (error) {
        showNotification(error.message, "error");

        $("#summary-table").innerHTML = `
      <tr><td colspan="8" class="empty-state">Could not load summary: ${escapeHTML(error.message)}</td></tr>
    `;

        $("#analytics-table").innerHTML = `
      <tr><td colspan="7" class="empty-state">Could not load logs.</td></tr>
    `;
    }
}

async function applyLogFilters() {
    try {
        const result = await loadLogs({
            database: $("#filter-database").value,
            status: $("#filter-status").value,
            limit: Number($("#filter-limit").value),
        });

        state.logs = result.data ?? [];

        renderLogs(state.logs, $("#analytics-table"), 7);
    } catch (error) {
        showNotification(error.message, "error");
    }
}

async function loadOverview() {
    await Promise.all([
        loadSummary().catch((error) => {
            showNotification(error.message, "error");
        }),
        loadRecentLogs(),
    ]);
}

async function checkServer() {
    try {
        const response = await fetch("/");

        $("#server-status").textContent = response.ok
            ? "Server reachable"
            : `HTTP ${response.status}`;
    } catch {
        $("#server-status").textContent = "Server unavailable";
    }
}

// Navigation
document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
        setView(button.dataset.view);
    });
});

document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
        setView(button.dataset.go);
    });
});

// Forms
$("#new-record-button").addEventListener("click", () => openRecordForm());
$("#record-form").addEventListener("submit", saveRecord);
$("#reload-records").addEventListener("click", loadRecords);

$("#new-document-button").addEventListener("click", () => openDocumentForm());
$("#document-form").addEventListener("submit", saveDocument);
$("#reload-documents").addEventListener("click", loadDocuments);

// Event delegation for edit/delete actions.
document.addEventListener("click", (event) => {
    const target = event.target.closest("button");

    if (!target) return;

    if (target.dataset.editRecord !== undefined) {
        const record = state.records.find(
            (item) => String(item.id) === target.dataset.editRecord,
        );

        if (record) openRecordForm(record);
    }

    if (target.dataset.deleteRecord !== undefined) {
        deleteRecord(target.dataset.deleteRecord);
    }

    if (target.dataset.editDocument !== undefined) {
        const document = state.documents.find(
            (item) => item._id === target.dataset.editDocument,
        );

        if (document) openDocumentForm(document);
    }

    if (target.dataset.deleteDocument !== undefined) {
        deleteDocument(target.dataset.deleteDocument);
    }

    if (target.dataset.close) {
        $(`#${target.dataset.close}`).hidden = true;
    }
});

$("#reload-analytics").addEventListener("click", loadAnalytics);
$("#apply-filters").addEventListener("click", applyLogFilters);

$("#refresh-button").addEventListener("click", async () => {
    if (state.view === "overview") {
        await loadOverview();
    } else if (state.view === "cockroach") {
        await loadRecords();
    } else if (state.view === "couch") {
        await loadDocuments();
    } else {
        await loadAnalytics();
    }
});

async function initializeUI() {
    await checkServer();
    await loadOverview();
}

initializeUI();