// main.js - SEOSiri Desktop Taskbar Sentinel Daemon
const { app, Tray, Menu, nativeImage, shell, Notification, dialog } = require('electron');
const https = require('https');
const path = require('path');
const fs = require('fs');

let tray = null;
let pollTimer = null;
const CONFIG_FILE = path.join(app.getPath('userData'), 'sentinel-config.json');

// Default client configuration
let config = {
  employeeId: 'ETM-AG-EMP-R62',
  apiGateway: 'https://tasks.seosiri.com',
  boardUrl: 'https://board.seosiri.com',
  pollIntervalSec: 15,
  notificationsEnabled: true
};

// Load persistent local configuration if exists
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    config = { ...config, ...saved };
  }
} catch (e) {}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {}
}

let state = {
  urgent: 0,
  progress: 0,
  pending: 0,
  complete: 0,
  unreadPings: 0,
  lastPingTitle: '',
  tenantId: 'ETM',
  role: 'EMPLOYEE',
  isOnline: true,
  lastSync: 'Connecting...'
};

// Seen notification IDs to avoid duplicate OS popups
const seenNotificationIds = new Set();

function fetchTelemetry() {
  const url = `${config.apiGateway}/v1/tasks`;
  const options = {
    headers: {
      'X-Employee-ID': config.employeeId,
      'User-Agent': 'SEOSiri-Desktop-Sentinel/1.0'
    }
  };

  https.get(url, options, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        const data = JSON.parse(raw);
        if (data.tasks) {
          const tasks = data.tasks;
          state.urgent = tasks.filter(t => t.status === 'URGENT').length;
          state.progress = tasks.filter(t => t.status === 'PROGRESS').length;
          state.pending = tasks.filter(t => t.status === 'PENDING').length;
          state.complete = tasks.filter(t => t.status === 'COMPLETE').length;
          state.tenantId = data.tenant || 'ETM';
          state.role = data.role || 'EMPLOYEE';
          state.isOnline = true;
          state.lastSync = new Date().toLocaleTimeString();

          updateTray();
          checkPings();
        }
      } catch (err) {
        handleOffline();
      }
    });
  }).on('error', () => {
    handleOffline();
  });
}

function checkPings() {
  const pingUrl = `${config.apiGateway}/v1/notifications/ping`;
  const options = {
    headers: { 'X-Employee-ID': config.employeeId }
  };

  https.get(pingUrl, options, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(raw);
        if (json.notifications && Array.isArray(json.notifications)) {
          state.unreadPings = json.unread_pings_count || json.notifications.length;
          
          // Trigger native OS notification for new unseen pings
          json.notifications.forEach(notif => {
            if (!seenNotificationIds.has(notif.notification_id)) {
              seenNotificationIds.add(notif.notification_id);
              
              if (config.notificationsEnabled && Notification.isSupported()) {
                const osNotification = new Notification({
                  title: `🚨 SEOSiri Sentinel: ${notif.title}`,
                  body: notif.message,
                  icon: path.join(__dirname, 'icon.png'),
                  urgency: notif.type === 'URGENT_TASK' ? 'critical' : 'normal'
                });
                osNotification.on('click', () => {
                  shell.openExternal(config.boardUrl);
                });
                osNotification.show();
              }
            }
          });
          updateTray();
        }
      } catch (e) {}
    });
  }).on('error', () => {});
}

function handleOffline() {
  state.isOnline = false;
  state.lastSync = 'Offline';
  updateTray();
}

function updateTray() {
  if (!tray) return;

  const titleSummary = state.urgent > 0 
    ? `🚨 (${state.urgent}) Urgent` 
    : `Tasks: ${state.progress + state.pending}`;

  tray.setToolTip(
    `SEOSiri Task Sentinel\n` +
    `User: ${config.employeeId} (${state.role})\n` +
    `Status: ${state.isOnline ? 'ONLINE' : 'DEGRADED'}\n` +
    `Urgent: ${state.urgent} | Progress: ${state.progress} | Pending: ${state.pending}\n` +
    `Last Sync: ${state.lastSync}`
  );

  const contextMenu = Menu.buildFromTemplate([
    { label: `🚀 SEOSiri Task Sentinel Desktop`, enabled: false },
    { type: 'separator' },
    { label: `👤 Identity: ${config.employeeId}`, enabled: false },
    { label: `🏢 Tenant: ${state.tenantId} (${state.role})`, enabled: false },
    { type: 'separator' },
    { 
      label: `🔴 Urgent Tasks: ${state.urgent}`, 
      click: () => shell.openExternal(config.boardUrl) 
    },
    { 
      label: `🔵 In Progress: ${state.progress}`, 
      click: () => shell.openExternal(config.boardUrl) 
    },
    { 
      label: `🟡 Pending Review: ${state.pending}`, 
      click: () => shell.openExternal(config.boardUrl) 
    },
    { 
      label: `🟢 Finished Tasks: ${state.complete}`, 
      enabled: false 
    },
    { type: 'separator' },
    {
      label: `🔔 Unread Pings: ${state.unreadPings}`,
      click: () => shell.openExternal(config.boardUrl)
    },
    {
      label: `🌐 Open Command Board (${config.boardUrl})`,
      click: () => shell.openExternal(config.boardUrl)
    },
    {
      label: `🔗 Open Developer Portal`,
      click: () => shell.openExternal('https://developers.seosiri.com')
    },
    { type: 'separator' },
    {
      label: `⚙️ Switch Employee ID`,
      click: async () => {
        const { response } = await dialog.showMessageBox({
          type: 'question',
          buttons: ['Switch to Admin (ETMAGJUMR62)', 'Switch to Employee (ETM-AG-EMP-R62)', 'Cancel'],
          title: 'Switch Sentinel Identity',
          message: 'Select identity profile to mount:'
        });
        if (response === 0) {
          config.employeeId = 'ETMAGJUMR62';
          saveConfig();
          fetchTelemetry();
        } else if (response === 1) {
          config.employeeId = 'ETM-AG-EMP-R62';
          saveConfig();
          fetchTelemetry();
        }
      }
    },
    {
      label: `🔄 Sync Now (${state.lastSync})`,
      click: () => fetchTelemetry()
    },
    { type: 'separator' },
    {
      label: `❌ Exit Sentinel Daemon`,
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Single Instance Lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    const iconPath = path.join(__dirname, 'icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath);

    tray = new Tray(trayIcon);
    updateTray();

    // Start background polling loop
    fetchTelemetry();
    pollTimer = setInterval(fetchTelemetry, config.pollIntervalSec * 1000);
  });
}

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
