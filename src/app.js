const API_URL = "https://tasks.seosiri.com";
const EMPLOYEE_ID = "ETMAGJUMR62";

async function fetchTasks() {
  try {
    const res = await fetch(`${API_URL}/v1/tasks`, {
      headers: { "X-Employee-ID": EMPLOYEE_ID }
    });
    const data = await res.json();
    if (data.tasks) {
      renderTasks(data.tasks);
    }
  } catch (err) {
    document.getElementById("onlineBadge").textContent = "RECONNECTING";
    document.getElementById("onlineBadge").style.color = "#f43f5e";
  }
}

function renderTasks(tasks) {
  const active = tasks.filter(t => t.status === "PROGRESS" || t.status === "URGENT");
  const urgent = tasks.filter(t => t.status === "URGENT");

  document.getElementById("activeCount").textContent = active.length;
  document.getElementById("urgentCount").textContent = urgent.length;

  const container = document.getElementById("taskContainer");
  if (active.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 11px; padding: 40px 0;">All caught up! Zero urgent tasks.</div>`;
    return;
  }

  container.innerHTML = active.map(t => `
    <div class="task-item" style="border-color: ${t.status === 'URGENT' ? '#f43f5e40' : '#1e293b'}">
      <div class="task-meta">
        <span style="color: ${t.status === 'URGENT' ? '#f43f5e' : '#38bdf8'}; font-weight: bold;">${t.status}</span>
        <span>${t.dept_id || 'GENERAL'} &bull; ${t.priority}</span>
      </div>
      <div class="task-title">${t.title}</div>
      <div class="btn-row">
        ${t.status === 'URGENT' ? `
          <button class="btn btn-start" onclick="updateStatus('${t.task_id}', 'PROGRESS')">Start Task &rarr;</button>
        ` : `
          <button class="btn btn-done" onclick="updateStatus('${t.task_id}', 'COMPLETE')">Finish &#10003;</button>
        `}
      </div>
    </div>
  `).join('');
}

async function updateStatus(taskId, newStatus) {
  try {
    await fetch(`${API_URL}/v1/tasks/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Employee-ID": EMPLOYEE_ID
      },
      body: JSON.stringify({ taskId, newStatus })
    });
    fetchTasks();
  } catch (e) {
    console.error(e);
  }
}

document.getElementById("openBoardBtn").addEventListener("click", () => {
  if (window.__TAURI__) {
    window.__TAURI__.core.invoke("get_portal_url").then(url => {
      window.open(url, "_blank");
    });
  } else {
    window.open("https://board.seosiri.com", "_blank");
  }
});

fetchTasks();
setInterval(fetchTasks, 15000);
