const API_ROOT = "/users/me";
const TOKEN_KEY = "daymark_access_token";

const elements = {
  notice: document.querySelector("#notice"),
  authView: document.querySelector("#authView"),
  appView: document.querySelector("#appView"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  welcomeHeading: document.querySelector("#welcomeHeading"),
  userEmail: document.querySelector("#userEmail"),
  profilePictureButton: document.querySelector("#profilePictureButton"),
  profilePictureInput: document.querySelector("#profilePictureInput"),
  profilePicture: document.querySelector("#profilePicture"),
  profileInitials: document.querySelector("#profileInitials"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskDueDate: document.querySelector("#taskDueDate"),
  taskPriority: document.querySelector("#taskPriority"),
  taskList: document.querySelector("#taskList"),
  taskCount: document.querySelector("#taskCount"),
  footerSummary: document.querySelector("#footerSummary"),
  emptyState: document.querySelector("#emptyState"),
  emptyHeading: document.querySelector("#emptyHeading"),
  emptyCopy: document.querySelector("#emptyCopy"),
  editDialog: document.querySelector("#editDialog"),
  editForm: document.querySelector("#editForm"),
  editTitle: document.querySelector("#editTitle"),
  editDueDate: document.querySelector("#editDueDate"),
  editPriority: document.querySelector("#editPriority"),
  priorityFilter: document.querySelector("#priorityFilter"),
  dueFilter: document.querySelector("#dueFilter"),
  sortTasks: document.querySelector("#sortTasks"),
  workspaceNav: document.querySelector("#workspaceNav"),
  overviewPanel: document.querySelector("#overviewPanel"),
  recordsPanel: document.querySelector("#recordsPanel"),
  recordsTitle: document.querySelector("#recordsTitle"),
  recordsDescription: document.querySelector("#recordsDescription"),
  recordsList: document.querySelector("#recordsList"),
  recordsEmpty: document.querySelector("#recordsEmpty"),
  recordDialog: document.querySelector("#recordDialog"),
  recordForm: document.querySelector("#recordForm"),
  recordFields: document.querySelector("#recordFields"),
  recordContent: document.querySelector("#recordContent"),
  recordContentLabel: document.querySelector("#recordContentLabel"),
  galleryUploadField: document.querySelector("#galleryUploadField"),
  galleryImage: document.querySelector("#galleryImage"),
};

let accessToken = localStorage.getItem(TOKEN_KEY);
let currentUser = null;
let tasks = [];
let workspaceEntries = [];
let activeFilter = "all";
let activeWorkspaceView = "overview";
let galleryObjectUrls = [];
let profilePictureUrl = null;
const priorityOrder = { high: 0, medium: 1, low: 2 };

const workspaceSections = {
  work: {
    title: "Work experience",
    description: "Keep your roles, achievements, and career history together.",
    contentLabel: "Role notes and accomplishments",
    fields: [
      { key: "organization", label: "Organization" },
      { key: "role", label: "Role or title" },
      { key: "location", label: "Location" },
      { key: "start_date", label: "Started", type: "date" },
      { key: "end_date", label: "Ended", type: "date" },
    ],
  },
  education: {
    title: "Education",
    description:
      "Track schools, qualifications, courses, and learning milestones.",
    contentLabel: "Study notes",
    fields: [
      { key: "institution", label: "School or institution" },
      { key: "level", label: "Level or qualification" },
      { key: "field_of_study", label: "Field of study" },
      { key: "start_date", label: "Started", type: "date" },
      { key: "end_date", label: "Completed", type: "date" },
    ],
  },
  family: {
    title: "Family",
    description: "Remember important details about the people close to you.",
    contentLabel: "Notes and memories",
    fields: [
      { key: "relationship", label: "Relationship" },
      { key: "birthday", label: "Birthday", type: "date" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "email", label: "Email", type: "email" },
    ],
  },
  contacts: {
    title: "Important contacts",
    description: "Store family and emergency contact details privately.",
    contentLabel: "Address and useful notes",
    fields: [
      { key: "relationship", label: "Relationship" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "is_emergency", label: "Emergency contact", type: "checkbox" },
    ],
  },
  journal: {
    title: "Journal & personal history",
    description:
      "Write personal stories, reflections, and milestones for yourself.",
    contentLabel: "Your entry",
    fields: [
      { key: "entry_date", label: "Date", type: "date" },
      {
        key: "mood",
        label: "Mood",
        type: "select",
        options: [
          "",
          "Reflective",
          "Hopeful",
          "Grateful",
          "Challenged",
          "Excited",
        ],
      },
      { key: "tags", label: "Tags" },
    ],
  },
  activities: {
    title: "Future plans",
    description:
      "Gather upcoming activities and things you are looking forward to.",
    contentLabel: "Plan details",
    fields: [
      { key: "scheduled_for", label: "When", type: "date" },
      { key: "location", label: "Location" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Planned", "Booked", "Done"],
      },
    ],
  },
  hobbies: {
    title: "Hobbies & interests",
    description:
      "Keep your interests, practice notes, and things you want to explore.",
    contentLabel: "What you enjoy or want to learn",
    fields: [
      { key: "started_on", label: "Started", type: "date" },
      {
        key: "frequency",
        label: "How often",
        type: "select",
        options: ["", "Most days", "Weekly", "Monthly", "Whenever I can"],
      },
    ],
  },
  development: {
    title: "Personal growth",
    description: "Set intentions, build skills, and make progress visible.",
    contentLabel: "Next steps and reflections",
    fields: [
      { key: "target_date", label: "Target date", type: "date" },
      {
        key: "progress",
        label: "Progress (%)",
        type: "number",
        min: 0,
        max: 100,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Not started", "In progress", "On hold", "Achieved"],
      },
    ],
  },
  gallery: {
    title: "Private gallery",
    description: "Save personal photos and the stories behind them.",
    contentLabel: "Caption or memory",
    fields: [
      { key: "taken_on", label: "Date", type: "date" },
      { key: "location", label: "Location" },
    ],
  },
};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function showNotice(message, kind = "error") {
  elements.notice.textContent = message;
  elements.notice.className = `notice notice-${kind}`;
  elements.notice.hidden = false;
}

function clearNotice() {
  elements.notice.hidden = true;
  elements.notice.textContent = "";
}

function apiErrorMessage(payload, fallback) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((item) => item.msg).join(" ");
  }
  return fallback;
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (
    options.body &&
    !(options.body instanceof URLSearchParams) &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers });
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && accessToken) signOut(false);
    throw new Error(
      apiErrorMessage(payload, `Request failed (${response.status})`),
    );
  }
  return payload;
}

function setAuthMode(mode) {
  const registering = mode === "register";
  elements.loginForm.hidden = registering;
  elements.registerForm.hidden = !registering;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    const selected = button.dataset.authMode === mode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  clearNotice();
}

function showWorkspace(user) {
  currentUser = user;
  elements.authView.hidden = true;
  elements.appView.hidden = false;
  elements.welcomeHeading.textContent = `Good to see you, ${user.name}.`;
  elements.userEmail.textContent = user.email;
  elements.profileInitials.textContent = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  setWorkspaceView(workspaceRouteFromLocation());
}

function showAuth() {
  currentUser = null;
  tasks = [];
  workspaceEntries = [];
  galleryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  galleryObjectUrls = [];
  if (profilePictureUrl) URL.revokeObjectURL(profilePictureUrl);
  profilePictureUrl = null;
  elements.profilePicture.removeAttribute("src");
  elements.profilePicture.hidden = true;
  elements.profileInitials.hidden = false;
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  setAuthMode("login");
  elements.appView.hidden = true;
  elements.authView.hidden = false;
  elements.taskList.replaceChildren();
}

function signOut(showMessage = true) {
  accessToken = null;
  localStorage.removeItem(TOKEN_KEY);
  showAuth();
  if (showMessage) showNotice("You have signed out.", "success");
}

async function loadWorkspace() {
  clearNotice();
  const user = await apiRequest("/users/me");
  showWorkspace(user);
  await loadProfilePicture(user.has_profile_picture);
  await loadTasks();
  await loadWorkspaceEntries();
}

function workspaceRouteFromLocation() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const pathRoute = pathParts[0] === "workspace" ? pathParts[1] : "";
  const hashRoute = window.location.hash.replace(/^#\/?/, "");
  const route = pathRoute || hashRoute;
  if (route === "overview" || route === "tasks" || workspaceSections[route]) {
    return route;
  }
  return "overview";
}

function setWorkspaceView(view) {
  const route =
    view === "overview" || view === "tasks" || workspaceSections[view]
      ? view
      : "overview";

  activeWorkspaceView = route;
  elements.appView.dataset.currentPage = route;
  const activePanel = workspaceSections[route] ? "records" : route;
  document.querySelectorAll("[data-workspace-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.workspacePanel !== activePanel;
  });
  elements.workspaceNav
    .querySelectorAll("[data-workspace-view]")
    .forEach((link) => {
      const selected = link.dataset.workspaceView === route;
      link.classList.toggle("is-active", selected);
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  if (workspaceSections[route]) {
    elements.recordsTitle.textContent = workspaceSections[route].title;
    elements.recordsDescription.textContent =
      workspaceSections[route].description;
    renderWorkspaceEntries(route);
  }
  if (route === "overview") renderWorkspaceOverview();
}

async function loadProfilePicture(hasProfilePicture) {
  if (profilePictureUrl) URL.revokeObjectURL(profilePictureUrl);
  profilePictureUrl = null;
  elements.profilePicture.removeAttribute("src");
  elements.profilePicture.hidden = true;
  elements.profileInitials.hidden = false;
  if (!hasProfilePicture || !accessToken) return;

  try {
    const response = await fetch("/users/me/profile-picture", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return;
    profilePictureUrl = URL.createObjectURL(await response.blob());
    elements.profilePicture.src = profilePictureUrl;
    elements.profilePicture.hidden = false;
    elements.profileInitials.hidden = true;
  } catch {
    showNotice("Profile picture could not be loaded.");
  }
}

async function loadTasks() {
  const loadedTasks = await apiRequest(`${API_ROOT}/tasks`);
  tasks = loadedTasks;
  renderTasks();
}

async function loadWorkspaceEntries() {
  workspaceEntries = await apiRequest("/users/me/workspace/entries");
  renderWorkspaceOverview();
  if (workspaceSections[activeWorkspaceView]) {
    renderWorkspaceEntries(activeWorkspaceView);
  }
}

function renderWorkspaceOverview() {
  const activeTasks = tasks.filter((task) => !task.completed).length;
  const galleryCount = workspaceEntries.filter(
    (entry) => entry.section === "gallery",
  ).length;
  document.querySelector("#overviewRecordCount").textContent =
    workspaceEntries.length;
  document.querySelector("#overviewTaskCount").textContent = activeTasks;
  document.querySelector("#overviewGalleryCount").textContent = galleryCount;
  Object.keys(workspaceSections).forEach((section) => {
    const count = workspaceEntries.filter(
      (entry) => entry.section === section,
    ).length;
    const countElement = document.querySelector(`#count-${section}`);
    if (countElement) {
      countElement.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;
    }
  });
}

function createRecordField(field, value) {
  const wrapper = document.createElement("div");
  wrapper.className = `form-field${field.type === "checkbox" ? " checkbox-field" : ""}`;
  const label = document.createElement("label");
  const id = `record-${field.key}`;
  label.htmlFor = id;
  label.textContent = field.label;

  let control;
  if (field.type === "select") {
    control = document.createElement("select");
    field.options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.toLowerCase();
      optionElement.textContent = option || "Choose an option";
      control.append(optionElement);
    });
    control.value = value || "";
  } else {
    control = document.createElement("input");
    control.type = field.type || "text";
    if (field.type === "checkbox") {
      control.checked = value === true;
    } else {
      control.value = value ?? "";
    }
    if (field.min !== undefined) control.min = field.min;
    if (field.max !== undefined) control.max = field.max;
  }
  control.id = id;
  control.name = field.key;
  wrapper.append(label, control);
  return wrapper;
}

function openRecordEditor(section, entry = null) {
  const config = workspaceSections[section];
  elements.recordForm.dataset.entryId = entry?.id || "";
  elements.recordForm.dataset.section = section;
  document.querySelector("#recordDialogTitle").textContent = entry
    ? "Edit record"
    : "Add record";
  document.querySelector("#saveRecordButton").textContent = entry
    ? "Save changes"
    : "Save record";

  elements.recordFields.replaceChildren();
  const titleWrapper = document.createElement("div");
  titleWrapper.className = "form-field full-field";
  const titleLabel = document.createElement("label");
  titleLabel.htmlFor = "recordTitle";
  titleLabel.textContent =
    section === "contacts"
      ? "Contact name"
      : section === "family"
        ? "Person's name"
        : section === "gallery"
          ? "Photo title"
          : "Title";
  const titleInput = document.createElement("input");
  titleInput.id = "recordTitle";
  titleInput.name = "title";
  titleInput.type = "text";
  titleInput.maxLength = 200;
  titleInput.required = true;
  titleInput.value = entry?.title || "";
  titleWrapper.append(titleLabel, titleInput);
  elements.recordFields.append(titleWrapper);

  config.fields.forEach((field) => {
    elements.recordFields.append(
      createRecordField(field, entry?.fields?.[field.key]),
    );
  });
  elements.recordContent.value = entry?.content || "";
  elements.recordContentLabel.textContent = config.contentLabel;
  elements.galleryUploadField.hidden = section !== "gallery";
  elements.galleryImage.value = "";
  elements.galleryImage.required = section === "gallery" && !entry?.has_image;
  elements.recordDialog.showModal();
  titleInput.focus();
}

function readableFieldName(key) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRecordValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDueDate(value);
  }
  return String(value);
}

function createRecordCard(entry) {
  const card = document.createElement("article");
  card.className = "record-card";
  const heading = document.createElement("div");
  heading.className = "record-card-heading";
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = entry.title;
  titleGroup.append(title);
  if (entry.section === "contacts" && entry.fields.is_emergency) {
    const emergency = document.createElement("span");
    emergency.className = "record-flag";
    emergency.textContent = "Emergency contact";
    titleGroup.append(emergency);
  }
  const actions = document.createElement("div");
  actions.className = "record-actions";
  const editButton = document.createElement("button");
  editButton.className = "text-button";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () =>
    openRecordEditor(entry.section, entry),
  );
  const deleteButton = document.createElement("button");
  deleteButton.className = "text-button delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteWorkspaceEntry(entry));
  actions.append(editButton, deleteButton);
  heading.append(titleGroup, actions);
  card.append(heading);

  if (entry.section === "gallery" && entry.has_image) {
    const image = document.createElement("img");
    image.className = "gallery-image";
    image.alt = entry.title;
    image.loading = "lazy";
    card.append(image);
    loadPrivateGalleryImage(entry.id, image);
  }

  const fieldRows = Object.entries(entry.fields || {}).filter(
    ([key, value]) => value !== "" && value !== null && key !== "is_emergency",
  );
  if (fieldRows.length) {
    const list = document.createElement("dl");
    list.className = "record-facts";
    fieldRows.forEach(([key, value]) => {
      const term = document.createElement("dt");
      term.textContent = readableFieldName(key);
      const description = document.createElement("dd");
      description.textContent = formatRecordValue(value);
      list.append(term, description);
    });
    card.append(list);
  }
  if (entry.content) {
    const content = document.createElement("p");
    content.className = "record-content";
    content.textContent = entry.content;
    card.append(content);
  }
  return card;
}

async function loadPrivateGalleryImage(entryId, imageElement) {
  try {
    const response = await fetch(
      `/users/me/workspace/entries/${entryId}/image`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok || !imageElement.isConnected) return;
    const imageUrl = URL.createObjectURL(await response.blob());
    galleryObjectUrls.push(imageUrl);
    imageElement.src = imageUrl;
  } catch {
    imageElement.alt = "Gallery photo could not be loaded";
  }
}

function renderWorkspaceEntries(section) {
  galleryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  galleryObjectUrls = [];
  const entries = workspaceEntries.filter((entry) => entry.section === section);
  elements.recordsList.replaceChildren(...entries.map(createRecordCard));
  elements.recordsEmpty.hidden = entries.length > 0;
}

async function deleteWorkspaceEntry(entry) {
  if (!window.confirm(`Delete “${entry.title}” and its saved information?`))
    return;
  try {
    await apiRequest(`/users/me/workspace/entries/${entry.id}`, {
      method: "DELETE",
    });
    workspaceEntries = workspaceEntries.filter((item) => item.id !== entry.id);
    renderWorkspaceEntries(activeWorkspaceView);
    renderWorkspaceOverview();
    showNotice("Record deleted.", "success");
  } catch (error) {
    showNotice(error.message);
  }
}

function renderTasks() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const today = localDateString();
  const visibleTasks = tasks
    .filter((task) => {
      if (activeFilter === "active") return !task.completed;
      if (activeFilter === "completed") return task.completed;
      return true;
    })
    .filter((task) => {
      if (
        elements.priorityFilter.value !== "all" &&
        task.priority !== elements.priorityFilter.value
      )
        return false;
      if (elements.dueFilter.value === "scheduled" && !task.due_date)
        return false;
      if (elements.dueFilter.value === "no-date" && task.due_date) return false;
      if (
        elements.dueFilter.value === "overdue" &&
        (!task.due_date || task.due_date >= today || task.completed)
      )
        return false;
      return true;
    });

  if (elements.sortTasks.value === "due-date") {
    visibleTasks.sort((left, right) =>
      (left.due_date || "9999-12-31").localeCompare(
        right.due_date || "9999-12-31",
      ),
    );
  } else if (elements.sortTasks.value === "priority") {
    visibleTasks.sort(
      (left, right) =>
        priorityOrder[left.priority] - priorityOrder[right.priority],
    );
  }

  elements.taskList.replaceChildren(...visibleTasks.map(createTaskRow));
  elements.taskCount.textContent = `${activeCount} to do / ${completedCount} done`;
  elements.footerSummary.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} in your list`;
  renderWorkspaceOverview();
  elements.emptyState.hidden = visibleTasks.length > 0;

  if (tasks.length === 0) {
    elements.emptyHeading.textContent = "A clear start.";
    elements.emptyCopy.textContent =
      "Add a task above and make today your own.";
  } else if (visibleTasks.length === 0) {
    elements.emptyHeading.textContent = "Nothing in this view.";
    elements.emptyCopy.textContent = "Choose another filter to see your tasks.";
  }
}

function createTaskRow(task, index) {
  const item = document.createElement("li");
  item.className = `task-row${task.completed ? " is-complete" : ""}`;
  item.style.setProperty("--row-index", index);

  const label = document.createElement("label");
  label.className = "task-check-label";
  label.setAttribute(
    "aria-label",
    `${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`,
  );

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () =>
    updateCompletion(task, checkbox.checked),
  );

  const checkmark = document.createElement("span");
  checkmark.className = "custom-check";
  checkmark.setAttribute("aria-hidden", "true");
  label.append(checkbox, checkmark);

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  const details = document.createElement("div");
  details.className = "task-details";
  details.append(title);

  const metadata = document.createElement("div");
  metadata.className = "task-metadata";
  const priority = document.createElement("span");
  priority.className = `priority-badge priority-${task.priority}`;
  priority.textContent = `${task.priority} priority`;
  metadata.append(priority);
  if (task.due_date) {
    const dueDate = document.createElement("span");
    const overdue = !task.completed && task.due_date < localDateString();
    dueDate.className = `due-date${overdue ? " is-overdue" : ""}`;
    dueDate.textContent = `${overdue ? "Overdue · " : "Due · "}${formatDueDate(task.due_date)}`;
    metadata.append(dueDate);
  }
  details.append(metadata);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.className = "text-button";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);
  editButton.addEventListener("click", () => openEditor(task.id));

  const deleteButton = document.createElement("button");
  deleteButton.className = "text-button delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.addEventListener("click", () => deleteTask(task));

  actions.append(editButton, deleteButton);
  item.append(label, details, actions);
  return item;
}

async function updateCompletion(task, completed) {
  clearNotice();
  try {
    const updatedTask = await apiRequest(`${API_ROOT}/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    replaceTask(updatedTask);
    renderTasks();
  } catch (error) {
    showNotice(error.message);
    renderTasks();
  }
}

function replaceTask(updatedTask) {
  tasks = tasks.map((task) =>
    task.id === updatedTask.id ? updatedTask : task,
  );
}

async function openEditor(taskId) {
  clearNotice();
  try {
    const task = await apiRequest(`${API_ROOT}/tasks/${taskId}`);
    replaceTask(task);
    elements.editForm.dataset.taskId = task.id;
    elements.editTitle.value = task.title;
    elements.editDueDate.value = task.due_date || "";
    elements.editPriority.value = task.priority;
    elements.editDialog.showModal();
    elements.editTitle.focus();
  } catch (error) {
    showNotice(error.message);
  }
}

async function deleteTask(task) {
  if (!window.confirm(`Delete “${task.title}”?`)) return;
  clearNotice();
  try {
    await apiRequest(`${API_ROOT}/tasks/${task.id}`, { method: "DELETE" });
    tasks = tasks.filter((item) => item.id !== task.id);
    renderTasks();
    showNotice("Task deleted.", "success");
  } catch (error) {
    showNotice(error.message);
  }
}

document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

window.addEventListener("hashchange", () => {
  if (accessToken) setWorkspaceView(workspaceRouteFromLocation());
});

document.querySelectorAll("[data-workspace-view]").forEach((button) => {
  button.addEventListener("click", () =>
    setWorkspaceView(button.dataset.workspaceView),
  );
});

document.querySelectorAll("[data-go-section]").forEach((button) => {
  button.addEventListener("click", () =>
    setWorkspaceView(button.dataset.goSection),
  );
});

document.querySelector("#addRecordButton").addEventListener("click", () => {
  openRecordEditor(activeWorkspaceView);
});

elements.profilePictureButton.addEventListener("click", () => {
  elements.profilePictureInput.click();
});

elements.profilePictureInput.addEventListener("change", async () => {
  const image = elements.profilePictureInput.files[0];
  if (!image) return;
  if (image.size > 5 * 1024 * 1024) {
    showNotice("Profile pictures must be 5 MB or smaller.");
    elements.profilePictureInput.value = "";
    return;
  }

  const uploadData = new FormData();
  uploadData.append("image", image);
  elements.profilePictureButton.disabled = true;
  try {
    await apiRequest("/users/me/profile-picture", {
      method: "PUT",
      body: uploadData,
    });
    await loadProfilePicture(true);
    showNotice("Profile picture updated.", "success");
  } catch (error) {
    showNotice(error.message);
  } finally {
    elements.profilePictureButton.disabled = false;
    elements.profilePictureInput.value = "";
  }
});

elements.recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.recordForm);
  const entryId = elements.recordForm.dataset.entryId;
  const section = elements.recordForm.dataset.section;
  const fields = {};
  elements.recordFields
    .querySelectorAll("input[name], select[name]")
    .forEach((control) => {
      if (control.name === "title") return;
      if (control.type === "checkbox") {
        fields[control.name] = control.checked;
      } else if (control.value !== "") {
        fields[control.name] =
          control.type === "number" ? Number(control.value) : control.value;
      }
    });

  const submitButton = document.querySelector("#saveRecordButton");
  submitButton.disabled = true;
  try {
    const payload = {
      section,
      title: formData.get("title").trim(),
      content: formData.get("content").trim() || null,
      fields,
    };
    let savedEntry = await apiRequest(
      entryId
        ? `/users/me/workspace/entries/${entryId}`
        : "/users/me/workspace/entries",
      {
        method: entryId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      },
    );

    const imageFile = elements.galleryImage.files[0];
    if (section === "gallery" && imageFile) {
      const uploadData = new FormData();
      uploadData.append("image", imageFile);
      try {
        savedEntry = await apiRequest(
          `/users/me/workspace/entries/${savedEntry.id}/image`,
          { method: "POST", body: uploadData },
        );
      } catch (error) {
        if (!entryId) {
          await apiRequest(`/users/me/workspace/entries/${savedEntry.id}`, {
            method: "DELETE",
          });
        }
        throw error;
      }
    }

    const existingIndex = workspaceEntries.findIndex(
      (entry) => entry.id === savedEntry.id,
    );
    if (existingIndex >= 0) workspaceEntries[existingIndex] = savedEntry;
    else workspaceEntries.unshift(savedEntry);
    elements.recordDialog.close();
    renderWorkspaceEntries(section);
    renderWorkspaceOverview();
    showNotice(entryId ? "Record updated." : "Record saved.", "success");
  } catch (error) {
    showNotice(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(elements.loginForm);
  const credentials = new URLSearchParams({
    username: form.get("email").trim(),
    password: form.get("password"),
  });
  const submitButton = elements.loginForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  clearNotice();
  try {
    const token = await apiRequest("/login", {
      method: "POST",
      body: credentials,
    });
    accessToken = token.access_token;
    localStorage.setItem(TOKEN_KEY, accessToken);
    await loadWorkspace();
    elements.loginForm.reset();
  } catch (error) {
    showNotice(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

elements.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(elements.registerForm);
  const submitButton = elements.registerForm.querySelector(
    "button[type=submit]",
  );
  submitButton.disabled = true;
  clearNotice();
  try {
    await apiRequest("/users", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name").trim(),
        email: form.get("email").trim(),
        password: form.get("password"),
      }),
    });
    const credentials = new URLSearchParams({
      username: form.get("email").trim(),
      password: form.get("password"),
    });
    const token = await apiRequest("/login", {
      method: "POST",
      body: credentials,
    });
    accessToken = token.access_token;
    localStorage.setItem(TOKEN_KEY, accessToken);
    elements.registerForm.reset();
    await loadWorkspace();
    showNotice("Your account is ready. Welcome to Daymark.", "success");
  } catch (error) {
    showNotice(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

elements.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.taskTitle.value.trim();
  if (!title) return;
  const submitButton = elements.taskForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  clearNotice();
  try {
    const task = await apiRequest(`${API_ROOT}/tasks`, {
      method: "POST",
      body: JSON.stringify({
        title,
        due_date: elements.taskDueDate.value || null,
        priority: elements.taskPriority.value,
      }),
    });
    tasks.push(task);
    activeFilter = "all";
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const selected = button.dataset.filter === activeFilter;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    renderTasks();
    elements.taskForm.reset();
    elements.taskTitle.focus();
  } catch (error) {
    showNotice(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

elements.editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const taskId = elements.editForm.dataset.taskId;
  const existingTask = tasks.find((task) => task.id === Number(taskId));
  if (!existingTask) return;
  const submitButton = elements.editForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  clearNotice();
  try {
    const task = await apiRequest(`${API_ROOT}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({
        title: elements.editTitle.value.trim(),
        completed: existingTask.completed,
        due_date: elements.editDueDate.value || null,
        priority: elements.editPriority.value,
      }),
    });
    replaceTask(task);
    renderTasks();
    elements.editDialog.close();
    showNotice("Task updated.", "success");
  } catch (error) {
    showNotice(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("is-active", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    renderTasks();
  });
});

[elements.priorityFilter, elements.dueFilter, elements.sortTasks].forEach(
  (control) => {
    control.addEventListener("change", renderTasks);
  },
);

document.querySelector("#refreshButton").addEventListener("click", async () => {
  try {
    await loadTasks();
    showNotice("Your list is up to date.", "success");
  } catch (error) {
    showNotice(error.message);
  }
});

document
  .querySelector("#logoutButton")
  .addEventListener("click", () => signOut());
document
  .querySelector("#cancelEditButton")
  .addEventListener("click", () => elements.editDialog.close());
document
  .querySelector("#closeDialogButton")
  .addEventListener("click", () => elements.editDialog.close());
document
  .querySelector("#cancelRecordButton")
  .addEventListener("click", () => elements.recordDialog.close());
document
  .querySelector("#closeRecordDialog")
  .addEventListener("click", () => elements.recordDialog.close());
elements.editDialog.addEventListener("click", (event) => {
  if (event.target === elements.editDialog) elements.editDialog.close();
});
elements.recordDialog.addEventListener("click", (event) => {
  if (event.target === elements.recordDialog) elements.recordDialog.close();
});

if (accessToken) {
  loadWorkspace().catch((error) => showNotice(error.message));
} else {
  showAuth();
}
