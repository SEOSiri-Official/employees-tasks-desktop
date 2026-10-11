const API_URL = "https://tasks.seosiri.com";
let currentEmployeeId = localStorage.getItem("seosiri_desktop_employee_id") || "ETM-AG-EMP-R62";
let currentTab = "ALL";
let activeTaskIdForChat = null;
let allTasks = [];

document.getElementById("currentIdLabel").textContent = currentEmployeeId;

// Switch Employee ID
document.getElementById("switchIdBtn").addEventListener("click", () => {
  const newId = prompt("Enter your Employee ID (e.g. ETM-AG-EMP-R62, Sam Gail):", currentEmployeeId);
  if (newId && newId.trim()) {
    currentEmployeeId = newId.trim();
    localStorage.setItem("seosiri_desktop_employee_id", currentEmployeeId);
    document.getElementById("currentIdLabel").textContent = currentEmployeeId;
    fetchTasks();
  }
});

// Tab Switchers
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    renderTasks();
  });
});

async function fetchTasks() {
  try {
    const res = await fetch(`${API_URL}/v1/tasks`, {
      headers: { "X-Employee-ID": currentEmployeeId }
    });
    const data = await res.json();
    if (data.tasks) {
      allTasks = data.tasks;
      updateMetrics();
      renderTasks();
    }
  } catch (err) {
    document.getElementById("slaBadge").textContent = "OFFLINE";
    document.getElementById("slaBadge").style.color = "#f43f5e";
  }
}

function updateMetrics() {
  const urgent = allTasks.filter(t => t.status === "URGENT").length;
  const progress = allTasks.filter(t => t.status === "PROGRESS").length;
  const complete = allTasks.filter(t => t.status === "COMPLETE").length;

  document.getElementById("urgentCount").textContent = urgent;
  document.getElementById("progressCount").textContent = progress;
  document.getElementById("completedCount").textContent = complete;

  // Inform Tauri Rust core to update system tray tooltip
  if (window.__TAURI__ && window.__TAURI__.core) {
    window.__TAURI__.core.invoke("update_tray_status", { urgent, progress });
  }
}

function renderTasks() {
  const container = document.getElementById("taskListContainer");
  let filtered = allTasks;
  if (currentTab !== "ALL") {
    filtered = allTasks.filter(t => t.status === currentTab);
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 40px 0;">No tasks in this view.</div>`;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isJira = t.source === "JIRA" || t.title.includes("[Jira");
    const taskIdShort = t.task_id ? t.task_id.substring(0, 8).toUpperCase() : "";
    const dateFormatted = t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    return `
      <div class="task-item" style="border-left: 3px solid ${t.status === 'URGENT' ? '#f43f5e' : t.status === 'PROGRESS' ? '#38bdf8' : t.status === 'PENDING' ? '#d97706' : '#10b981'}">
        <div class="task-meta">
          <span style="color: #64748b; font-weight: bold;">#${taskIdShort}</span>
          <div style="display: flex; gap: 4px;">
            ${isJira ? '<span style="color: #38bdf8; background: rgba(56,189,248,0.1); padding: 1px 4px; border-radius: 4px;">Jira</span>' : ''}
            <span style="color: ${t.status === 'URGENT' ? '#f43f5e' : '#38bdf8'}; font-weight: bold;">${t.status}</span>
            <span>&bull; ${t.priority}</span>
          </div>
        </div>
        <div class="task-title">${t.title}</div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; font-family: monospace;">
          <span>Dept: ${t.dept_id || 'GENERAL'}</span>
          <span>${dateFormatted}</span>
        </div>
        <div class="task-actions">
          ${t.status === 'URGENT' ? `
            <button class="action-btn btn-accept" onclick="acknowledgeUrgent('${t.task_id}')">Accept &amp; Start &rarr;</button>
          ` : ''}
          ${t.status === 'PROGRESS' ? `
            <button class="action-btn btn-finish" onclick="updateTaskStatus('${t.task_id}', 'COMPLETE')">Finish &#10003;</button>
            <button class="action-btn btn-blocker" onclick="flagBlocker('${t.task_id}')">Blocker</button>
          ` : ''}
          ${t.status === 'PENDING' ? `
            <button class="action-btn btn-resume" onclick="updateTaskStatus('${t.task_id}', 'PROGRESS')">Resume &rarr;</button>
          ` : ''}
          <button class="action-btn btn-chat" onclick="openChat('${t.task_id}', '${escape(t.title)}')">Chat</button>
        </div>
      </div>
    `;
  }).join('');
}

async function acknowledgeUrgent(taskId) {
  try {
    await fetch(`${API_URL}/v1/tasks/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Employee-ID": currentEmployeeId },
      body: JSON.stringify({ taskId })
    });
    fetchTasks();
  } catch (e) {
    console.error(e);
  }
}

async function updateTaskStatus(taskId, newStatus, blockerReason = null) {
  try {
    await fetch(`${API_URL}/v1/tasks/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Employee-ID": currentEmployeeId },
      body: JSON.stringify({ taskId, newStatus, blockerReason })
    });
    fetchTasks();
  } catch (e) {
    console.error(e);
  }
}

function flagBlocker(taskId) {
  const reason = prompt("Enter dependency blocker details to escalate to management:");
  if (reason && reason.trim()) {
    updateTaskStatus(taskId, "PENDING", reason.trim());
  }
}

// Auto-Dispatch
document.getElementById("autoDispatchBtn").addEventListener("click", async () => {
  const notice = document.getElementById("dispatchNotice");
  notice.textContent = "Pulling backlog...";
  try {
    const res = await fetch(`${API_URL}/v1/tasks/auto-dispatch`, {
      method: "POST",
      headers: { "X-Employee-ID": currentEmployeeId }
    });
    const data = await res.json();
    if (data.status === "DISPATCHED") {
      notice.textContent = "Assigned ⚡";
      fetchTasks();
    } else {
      notice.textContent = data.message || "Queue clear.";
    }
    setTimeout(() => { notice.textContent = ""; }, 3000);
  } catch (e) {
    notice.textContent = "Error.";
  }
});

// Chat Drawer
window.openChat = async function(taskId, encodedTitle) {
  activeTaskIdForChat = taskId;
  document.getElementById("drawerTaskTitle").textContent = unescape(encodedTitle);
  document.getElementById("chatDrawer").style.display = "flex";
  loadComments(taskId);
};

document.getElementById("closeDrawerBtn").addEventListener("click", () => {
  document.getElementById("chatDrawer").style.display = "none";
  activeTaskIdForChat = null;
});

async function loadComments(taskId) {
  const container = document.getElementById("commentsContainer");
  try {
    const res = await fetch(`${API_URL}/v1/tasks/${taskId}/comments`, {
      headers: { "X-Employee-ID": currentEmployeeId }
    });
    const data = await res.json();
    if (data.comments && data.comments.length > 0) {
      container.innerHTML = data.comments.map(c => `
        <div class="comment-bubble">
          <div class="comment-meta">${c.author_id} (${c.author_role})</div>
          <div class="comment-text">${c.content}</div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px 0;">No review comments.</div>`;
    }
  } catch (e) {
    container.innerHTML = `<div style="color: #f43f5e; text-align: center;">Failed to load comments.</div>`;
  }
}

document.getElementById("commentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("commentInput");
  const content = input.value.trim();
  if (!content || !activeTaskIdForChat) return;

  try {
    await fetch(`${API_URL}/v1/tasks/${activeTaskIdForChat}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Employee-ID": currentEmployeeId },
      body: JSON.stringify({ content })
    });
    input.value = "";
    loadComments(activeTaskIdForChat);
  } catch (e) {
    console.error(e);
  }
});

// Launch Command Board
document.getElementById("openBoardLink").addEventListener("click", () => {
  if (window.__TAURI__ && window.__TAURI__.core) {
    window.__TAURI__.core.invoke("get_portal_url").then(url => {
      window.open(url, "_blank");
    });
  } else {
    window.open("https://board.seosiri.com", "_blank");
  }
});

fetchTasks();
setInterval(fetchTasks, 15000);
