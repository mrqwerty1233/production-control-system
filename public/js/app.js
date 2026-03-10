let employeesCache = [];

document.addEventListener("DOMContentLoaded", () => {
  setupLoginForm();
  loadSessionInfo();
  setupLogout();
  loadDashboardStats();
  loadStores();
  setupJobOrderForm();
  setupEditJobOrderForm();
  setupJobOrderFilters();
  loadJobOrders();
  loadWorkflowJobOrders();
  loadEmployees();
  setupWorkflowControls();
  loadProductivityData();
  loadMovementJobOrders();
  setupMovementForm();
  loadStorageOverview();
  loadMovementLogs();
  loadReportsSummary();
  loadJobStatusReport();
  loadDelayedJobsReport();
  loadStoreVolumeReport();
  loadProductivitySummaryReport();
  setupEmployeeForm();
  loadEmployeesManagementTable();
});

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    loginMessage.textContent = "Logging in...";
    loginMessage.className = "form-message";

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        loginMessage.textContent = "Login successful. Redirecting...";
        loginMessage.className = "form-message success-message";

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 800);
      } else {
        loginMessage.textContent = result.message;
        loginMessage.className = "form-message error-message";
      }
    } catch (error) {
      loginMessage.textContent = "Something went wrong. Please try again.";
      loginMessage.className = "form-message error-message";
      console.error("Login error:", error);
    }
  });
}

async function loadSessionInfo() {
  const welcomeText = document.getElementById("welcomeText");

  if (!welcomeText) {
    return;
  }

  try {
    const response = await fetch("/api/session");
    const result = await response.json();

    if (!result.loggedIn) {
      window.location.href = "/login";
      return;
    }

    welcomeText.textContent = `Welcome, ${result.admin.full_name}`;
  } catch (error) {
    console.error("Session check error:", error);
    window.location.href = "/login";
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/logout", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        window.location.href = "/login";
      } else {
        alert("Logout failed.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("Something went wrong during logout.");
    }
  });
}

async function loadDashboardStats() {
  const totalJobOrders = document.getElementById("totalJobOrders");
  const inProduction = document.getElementById("inProduction");
  const completedToday = document.getElementById("completedToday");
  const delayedJobs = document.getElementById("delayedJobs");

  if (!totalJobOrders || !inProduction || !completedToday || !delayedJobs) {
    return;
  }

  try {
    const response = await fetch("/api/dashboard/stats");
    const result = await response.json();

    if (!result.success) {
      return;
    }

    totalJobOrders.textContent = result.stats.totalJobOrders;
    inProduction.textContent = result.stats.inProduction;
    completedToday.textContent = result.stats.completedToday;
    delayedJobs.textContent = result.stats.delayedJobs;
  } catch (error) {
    console.error("Dashboard stats error:", error);
  }
}

async function loadStores() {
  const storeSelect = document.getElementById("store_id");
  const editStoreSelect = document.getElementById("edit_store_id");

  try {
    const response = await fetch("/api/stores");
    const result = await response.json();

    if (!result.success) {
      return;
    }

    if (storeSelect) {
      storeSelect.innerHTML = `<option value="">Select store</option>`;
      result.stores.forEach((store) => {
        const option = document.createElement("option");
        option.value = store.id;
        option.textContent = `${store.store_name} - ${store.mall_location}`;
        storeSelect.appendChild(option);
      });
    }

    if (editStoreSelect) {
      editStoreSelect.innerHTML = `<option value="">Select store</option>`;
      result.stores.forEach((store) => {
        const option = document.createElement("option");
        option.value = store.id;
        option.textContent = `${store.store_name} - ${store.mall_location}`;
        editStoreSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Load stores error:", error);
  }
}

function setupJobOrderForm() {
  const jobOrderForm = document.getElementById("jobOrderForm");
  const jobOrderMessage = document.getElementById("jobOrderMessage");

  if (!jobOrderForm) {
    return;
  }

  jobOrderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = {
      customer_name: document.getElementById("customer_name").value.trim(),
      store_id: document.getElementById("store_id").value,
      item_name: document.getElementById("item_name").value.trim(),
      service_type: document.getElementById("service_type").value.trim(),
      priority_level: document.getElementById("priority_level").value,
      due_date: document.getElementById("due_date").value,
      storage_location: document.getElementById("storage_location").value.trim(),
      notes: document.getElementById("notes").value.trim(),
    };

    jobOrderMessage.textContent = "Saving job order...";
    jobOrderMessage.className = "form-message";

    try {
      const response = await fetch("/api/job-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        jobOrderMessage.textContent = `Job order created successfully. Job Order No.: ${result.jobOrderNumber}`;
        jobOrderMessage.className = "form-message success-message";
        jobOrderForm.reset();
        refreshAllOperationalViews();
      } else {
        jobOrderMessage.textContent = result.message;
        jobOrderMessage.className = "form-message error-message";
      }
    } catch (error) {
      jobOrderMessage.textContent = "Failed to save job order.";
      jobOrderMessage.className = "form-message error-message";
      console.error("Create job order error:", error);
    }
  });
}

function setupEditJobOrderForm() {
  const editForm = document.getElementById("editJobOrderForm");
  const clearBtn = document.getElementById("clearEditJobOrderBtn");
  const editMessage = document.getElementById("editJobOrderMessage");

  if (editForm) {
    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const jobOrderId = document.getElementById("edit_job_order_id").value;

      if (!jobOrderId) {
        editMessage.textContent = "Please click Edit on a job order first.";
        editMessage.className = "form-message error-message";
        return;
      }

      const payload = {
        customer_name: document.getElementById("edit_customer_name").value.trim(),
        store_id: document.getElementById("edit_store_id").value,
        item_name: document.getElementById("edit_item_name").value.trim(),
        service_type: document.getElementById("edit_service_type").value.trim(),
        current_status: document.getElementById("edit_current_status").value,
        priority_level: document.getElementById("edit_priority_level").value,
        due_date: document.getElementById("edit_due_date").value,
        storage_location: document.getElementById("edit_storage_location").value.trim(),
        notes: document.getElementById("edit_notes").value.trim(),
      };

      editMessage.textContent = "Updating job order...";
      editMessage.className = "form-message";

      try {
        const response = await fetch(`/api/job-orders/${jobOrderId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          editMessage.textContent = result.message;
          editMessage.className = "form-message success-message";
          refreshAllOperationalViews();
        } else {
          editMessage.textContent = result.message;
          editMessage.className = "form-message error-message";
        }
      } catch (error) {
        console.error("Update job order error:", error);
        editMessage.textContent = "Failed to update job order.";
        editMessage.className = "form-message error-message";
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearEditJobOrderForm);
  }
}

function clearEditJobOrderForm() {
  const editMessage = document.getElementById("editJobOrderMessage");

  const fields = [
    "edit_job_order_id",
    "edit_job_order_number",
    "edit_customer_name",
    "edit_store_id",
    "edit_item_name",
    "edit_service_type",
    "edit_current_status",
    "edit_priority_level",
    "edit_due_date",
    "edit_storage_location",
    "edit_notes",
  ];

  fields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) {
      return;
    }

    if (field.tagName === "SELECT") {
      field.selectedIndex = 0;
    } else {
      field.value = "";
    }
  });

  if (editMessage) {
    editMessage.textContent = "";
    editMessage.className = "form-message";
  }
}

function setupJobOrderFilters() {
  const searchBtn = document.getElementById("searchBtn");
  const resetBtn = document.getElementById("resetBtn");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");

  if (!searchBtn || !resetBtn || !searchInput || !statusFilter) {
    return;
  }

  searchBtn.addEventListener("click", () => {
    loadJobOrders();
  });

  resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "";
    loadJobOrders();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadJobOrders();
    }
  });

  statusFilter.addEventListener("change", () => {
    loadJobOrders();
  });
}

async function loadJobOrders() {
  const tableBody = document.getElementById("jobOrdersTableBody");

  if (!tableBody) {
    return;
  }

  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");

  const search = searchInput ? searchInput.value.trim() : "";
  const status = statusFilter ? statusFilter.value : "";

  const params = new URLSearchParams();

  if (search) {
    params.append("search", search);
  }

  if (status) {
    params.append("status", status);
  }

  try {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-cell">Loading job orders...</td>
      </tr>
    `;

    const response = await fetch(`/api/job-orders?${params.toString()}`);
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="11" class="empty-cell">Failed to load job orders.</td>
        </tr>
      `;
      return;
    }

    if (result.jobOrders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="11" class="empty-cell">No job orders found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.jobOrders
      .map((job) => {
        return `
          <tr>
            <td>${job.job_order_number}</td>
            <td>${escapeHtml(job.customer_name)}</td>
            <td>${escapeHtml(job.store_name || "-")}</td>
            <td>${escapeHtml(job.item_name)}</td>
            <td>${escapeHtml(job.service_type)}</td>
            <td>${renderStatusBadge(job.current_status)}</td>
            <td>${renderPriorityBadge(job.priority_level || "Normal")}</td>
            <td>${formatDate(job.date_received)}</td>
            <td>${job.due_date ? formatDate(job.due_date) : "-"}</td>
            <td>${escapeHtml(job.storage_location || "-")}</td>
            <td>
              <div class="quick-actions">
                <button class="secondary-btn edit-job-order-btn" data-id="${job.id}" type="button">Edit</button>
                <button class="secondary-btn light-btn archive-job-order-btn" data-id="${job.id}" type="button">Archive</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    attachJobOrderActionEvents();
  } catch (error) {
    console.error("Load job orders error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" class="empty-cell">Error loading job orders.</td>
      </tr>
    `;
  }
}

function attachJobOrderActionEvents() {
  const editButtons = document.querySelectorAll(".edit-job-order-btn");
  const archiveButtons = document.querySelectorAll(".archive-job-order-btn");

  editButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const jobOrderId = button.dataset.id;
      await loadJobOrderForEdit(jobOrderId);
    });
  });

  archiveButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const jobOrderId = button.dataset.id;
      const confirmed = window.confirm("Are you sure you want to archive this job order?");

      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch(`/api/job-orders/${jobOrderId}/archive`, {
          method: "PUT",
        });

        const result = await response.json();
        const editMessage = document.getElementById("editJobOrderMessage");

        if (editMessage) {
          if (result.success) {
            editMessage.textContent = result.message;
            editMessage.className = "form-message success-message";
          } else {
            editMessage.textContent = result.message;
            editMessage.className = "form-message error-message";
          }
        }

        if (result.success) {
          clearEditJobOrderForm();
          refreshAllOperationalViews();
        }
      } catch (error) {
        console.error("Archive job order error:", error);
      }
    });
  });
}

async function loadJobOrderForEdit(jobOrderId) {
  const editMessage = document.getElementById("editJobOrderMessage");

  try {
    const response = await fetch(`/api/job-orders/${jobOrderId}`);
    const result = await response.json();

    if (!result.success) {
      if (editMessage) {
        editMessage.textContent = result.message;
        editMessage.className = "form-message error-message";
      }
      return;
    }

    const job = result.jobOrder;

    document.getElementById("edit_job_order_id").value = job.id;
    document.getElementById("edit_job_order_number").value = job.job_order_number || "";
    document.getElementById("edit_customer_name").value = job.customer_name || "";
    document.getElementById("edit_store_id").value = job.store_id || "";
    document.getElementById("edit_item_name").value = job.item_name || "";
    document.getElementById("edit_service_type").value = job.service_type || "";
    document.getElementById("edit_current_status").value = job.current_status || "Received";
    document.getElementById("edit_priority_level").value = job.priority_level || "Normal";
    document.getElementById("edit_due_date").value = job.due_date || "";
    document.getElementById("edit_storage_location").value = job.storage_location || "";
    document.getElementById("edit_notes").value = job.notes || "";

    if (editMessage) {
      editMessage.textContent = "Job order loaded for editing.";
      editMessage.className = "form-message success-message";
    }

    document.getElementById("edit_customer_name").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  } catch (error) {
    console.error("Load job order for edit error:", error);
    if (editMessage) {
      editMessage.textContent = "Failed to load job order for editing.";
      editMessage.className = "form-message error-message";
    }
  }
}

async function loadEmployees() {
  try {
    const response = await fetch("/api/employees");
    const result = await response.json();

    if (!result.success) {
      employeesCache = [];
      return;
    }

    employeesCache = result.employees;
  } catch (error) {
    console.error("Load employees error:", error);
    employeesCache = [];
  }
}

function setupEmployeeForm() {
  const employeeForm = document.getElementById("employeeForm");
  const employeeMessage = document.getElementById("employeeMessage");

  if (!employeeForm) {
    return;
  }

  employeeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      employee_code: document.getElementById("employee_code").value.trim(),
      full_name: document.getElementById("employee_full_name").value.trim(),
      role: document.getElementById("employee_role").value.trim(),
      status: document.getElementById("employee_status").value,
    };

    employeeMessage.textContent = "Saving employee...";
    employeeMessage.className = "form-message";

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        employeeMessage.textContent = result.message;
        employeeMessage.className = "form-message success-message";
        employeeForm.reset();
        refreshAllOperationalViews();
        loadEmployeesManagementTable();
      } else {
        employeeMessage.textContent = result.message;
        employeeMessage.className = "form-message error-message";
      }
    } catch (error) {
      console.error("Add employee error:", error);
      employeeMessage.textContent = "Failed to save employee.";
      employeeMessage.className = "form-message error-message";
    }
  });
}

async function loadEmployeesManagementTable() {
  const tableBody = document.getElementById("employeesTableBody");

  if (!tableBody) {
    return;
  }

  try {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">Loading employees...</td>
      </tr>
    `;

    const response = await fetch("/api/employees-management");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">Failed to load employee records.</td>
        </tr>
      `;
      return;
    }

    if (result.employees.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">No employees found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.employees
      .map((employee) => {
        return `
          <tr>
            <td>${employee.id}</td>
            <td>
              <input type="text" class="workflow-input employee-code-input" data-id="${employee.id}" value="${escapeAttribute(employee.employee_code)}" />
            </td>
            <td>
              <input type="text" class="workflow-input employee-name-input" data-id="${employee.id}" value="${escapeAttribute(employee.full_name)}" />
            </td>
            <td>
              <input type="text" class="workflow-input employee-role-input" data-id="${employee.id}" value="${escapeAttribute(employee.role)}" />
            </td>
            <td>
              <select class="workflow-input employee-status-input" data-id="${employee.id}">
                <option value="Active" ${employee.status === "Active" ? "selected" : ""}>Active</option>
                <option value="Inactive" ${employee.status === "Inactive" ? "selected" : ""}>Inactive</option>
              </select>
            </td>
            <td>
              <button class="secondary-btn employee-save-btn" data-id="${employee.id}" type="button">Save</button>
            </td>
          </tr>
        `;
      })
      .join("");

    attachEmployeeSaveEvents();
  } catch (error) {
    console.error("Load employees management table error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">Error loading employee records.</td>
      </tr>
    `;
  }
}

function attachEmployeeSaveEvents() {
  const saveButtons = document.querySelectorAll(".employee-save-btn");
  const employeeMessage = document.getElementById("employeeMessage");

  saveButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const employeeId = button.dataset.id;

      const codeInput = document.querySelector(`.employee-code-input[data-id="${employeeId}"]`);
      const nameInput = document.querySelector(`.employee-name-input[data-id="${employeeId}"]`);
      const roleInput = document.querySelector(`.employee-role-input[data-id="${employeeId}"]`);
      const statusInput = document.querySelector(`.employee-status-input[data-id="${employeeId}"]`);

      const payload = {
        employee_code: codeInput.value.trim(),
        full_name: nameInput.value.trim(),
        role: roleInput.value.trim(),
        status: statusInput.value,
      };

      if (employeeMessage) {
        employeeMessage.textContent = "Updating employee...";
        employeeMessage.className = "form-message";
      }

      try {
        const response = await fetch(`/api/employees/${employeeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (employeeMessage) {
          if (result.success) {
            employeeMessage.textContent = result.message;
            employeeMessage.className = "form-message success-message";
          } else {
            employeeMessage.textContent = result.message;
            employeeMessage.className = "form-message error-message";
          }
        }

        if (result.success) {
          refreshAllOperationalViews();
          loadEmployeesManagementTable();
        }
      } catch (error) {
        console.error("Update employee error:", error);
        if (employeeMessage) {
          employeeMessage.textContent = "Failed to update employee.";
          employeeMessage.className = "form-message error-message";
        }
      }
    });
  });
}

async function loadWorkflowJobOrders() {
  const jobOrderSelect = document.getElementById("workflowJobOrderSelect");

  if (!jobOrderSelect) {
    return;
  }

  try {
    const response = await fetch("/api/job-orders-simple");
    const result = await response.json();

    if (!result.success) {
      return;
    }

    jobOrderSelect.innerHTML = `<option value="">Select a job order</option>`;

    result.jobOrders.forEach((job) => {
      const option = document.createElement("option");
      option.value = job.id;
      option.textContent = `${job.job_order_number} - ${job.customer_name} - ${job.item_name} (${job.current_status})`;
      jobOrderSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Load workflow job orders error:", error);
  }
}

function setupWorkflowControls() {
  const initializeWorkflowBtn = document.getElementById("initializeWorkflowBtn");
  const loadWorkflowBtn = document.getElementById("loadWorkflowBtn");

  if (initializeWorkflowBtn) {
    initializeWorkflowBtn.addEventListener("click", async () => {
      const jobOrderId = document.getElementById("workflowJobOrderSelect").value;
      const workflowMessage = document.getElementById("workflowMessage");

      if (!jobOrderId) {
        workflowMessage.textContent = "Please select a job order first.";
        workflowMessage.className = "form-message error-message";
        return;
      }

      workflowMessage.textContent = "Initializing workflow...";
      workflowMessage.className = "form-message";

      try {
        const response = await fetch(`/api/workflow/initialize/${jobOrderId}`, {
          method: "POST",
        });

        const result = await response.json();

        if (result.success) {
          workflowMessage.textContent = result.message;
          workflowMessage.className = "form-message success-message";
          loadWorkflow(jobOrderId);
        } else {
          workflowMessage.textContent = result.message;
          workflowMessage.className = "form-message error-message";
        }
      } catch (error) {
        console.error("Initialize workflow error:", error);
        workflowMessage.textContent = "Failed to initialize workflow.";
        workflowMessage.className = "form-message error-message";
      }
    });
  }

  if (loadWorkflowBtn) {
    loadWorkflowBtn.addEventListener("click", () => {
      const jobOrderId = document.getElementById("workflowJobOrderSelect").value;
      const workflowMessage = document.getElementById("workflowMessage");

      if (!jobOrderId) {
        workflowMessage.textContent = "Please select a job order first.";
        workflowMessage.className = "form-message error-message";
        return;
      }

      workflowMessage.textContent = "";
      loadWorkflow(jobOrderId);
    });
  }
}

async function loadWorkflow(jobOrderId) {
  const tableBody = document.getElementById("workflowTableBody");

  if (!tableBody) {
    return;
  }

  try {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-cell">Loading workflow steps...</td>
      </tr>
    `;

    const response = await fetch(`/api/workflow/${jobOrderId}`);
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-cell">Failed to load workflow steps.</td>
        </tr>
      `;
      return;
    }

    if (result.workflowSteps.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-cell">
            No workflow steps found. Click "Initialize Standard Workflow" first.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.workflowSteps
      .map((step) => createWorkflowRow(step))
      .join("");

    attachWorkflowSaveEvents(jobOrderId);
  } catch (error) {
    console.error("Load workflow error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-cell">Error loading workflow steps.</td>
      </tr>
    `;
  }
}

function createWorkflowRow(step) {
  const employeeOptions = [
    `<option value="">Select employee</option>`,
    ...employeesCache.map((employee) => {
      const selected = String(employee.id) === String(step.assigned_employee_id) ? "selected" : "";
      return `<option value="${employee.id}" ${selected}>${escapeHtml(employee.full_name)} (${escapeHtml(employee.role)})</option>`;
    }),
  ].join("");

  return `
    <tr>
      <td>
        <strong>${escapeHtml(step.step_name)}</strong>
      </td>
      <td>
        <select class="workflow-input workflow-employee" data-step-id="${step.id}">
          ${employeeOptions}
        </select>
      </td>
      <td>
        <select class="workflow-input workflow-status" data-step-id="${step.id}">
          <option value="Pending" ${step.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="In Progress" ${step.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option value="Completed" ${step.status === "Completed" ? "selected" : ""}>Completed</option>
          <option value="Delayed" ${step.status === "Delayed" ? "selected" : ""}>Delayed</option>
        </select>
      </td>
      <td>
        <input
          type="datetime-local"
          class="workflow-input workflow-start"
          data-step-id="${step.id}"
          value="${formatDateTimeLocal(step.start_time)}"
        />
      </td>
      <td>
        <input
          type="datetime-local"
          class="workflow-input workflow-end"
          data-step-id="${step.id}"
          value="${formatDateTimeLocal(step.end_time)}"
        />
      </td>
      <td>
        <span>${step.time_spent_minutes || 0}</span>
      </td>
      <td>
        <input
          type="text"
          class="workflow-input workflow-notes"
          data-step-id="${step.id}"
          value="${escapeAttribute(step.notes || "")}"
          placeholder="Notes"
        />
      </td>
      <td>
        <button
          class="secondary-btn workflow-save-btn"
          data-step-id="${step.id}"
          data-job-order-id="${step.job_order_id}"
          data-step-name="${escapeAttribute(step.step_name)}"
          type="button"
        >
          Save
        </button>
      </td>
    </tr>
  `;
}

function attachWorkflowSaveEvents(currentJobOrderId) {
  const saveButtons = document.querySelectorAll(".workflow-save-btn");

  saveButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const stepId = button.dataset.stepId;
      const jobOrderId = button.dataset.jobOrderId;
      const stepName = button.dataset.stepName;
      const workflowMessage = document.getElementById("workflowMessage");

      const employeeSelect = document.querySelector(`.workflow-employee[data-step-id="${stepId}"]`);
      const statusSelect = document.querySelector(`.workflow-status[data-step-id="${stepId}"]`);
      const startInput = document.querySelector(`.workflow-start[data-step-id="${stepId}"]`);
      const endInput = document.querySelector(`.workflow-end[data-step-id="${stepId}"]`);
      const notesInput = document.querySelector(`.workflow-notes[data-step-id="${stepId}"]`);

      const payload = {
        assigned_employee_id: employeeSelect ? employeeSelect.value : "",
        status: statusSelect ? statusSelect.value : "Pending",
        start_time: startInput ? startInput.value : "",
        end_time: endInput ? endInput.value : "",
        notes: notesInput ? notesInput.value.trim() : "",
        job_order_id: jobOrderId,
        step_name: stepName,
      };

      workflowMessage.textContent = "Saving workflow step...";
      workflowMessage.className = "form-message";

      try {
        const response = await fetch(`/api/workflow/${stepId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          workflowMessage.textContent = "Workflow step updated successfully.";
          workflowMessage.className = "form-message success-message";
          loadWorkflow(currentJobOrderId);
          refreshAllOperationalViews();
        } else {
          workflowMessage.textContent = result.message;
          workflowMessage.className = "form-message error-message";
        }
      } catch (error) {
        console.error("Save workflow step error:", error);
        workflowMessage.textContent = "Failed to save workflow step.";
        workflowMessage.className = "form-message error-message";
      }
    });
  });
}

async function loadProductivityData() {
  const tableBody = document.getElementById("productivityTableBody");

  if (!tableBody) {
    return;
  }

  try {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">Loading productivity data...</td>
      </tr>
    `;

    const response = await fetch("/api/productivity");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-cell">Failed to load productivity data.</td>
        </tr>
      `;
      return;
    }

    if (result.productivity.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-cell">No productivity data found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.productivity
      .map((employee) => {
        return `
          <tr>
            <td>${escapeHtml(employee.employee_code)}</td>
            <td>${escapeHtml(employee.full_name)}</td>
            <td>${escapeHtml(employee.role)}</td>
            <td>${employee.total_assigned_steps || 0}</td>
            <td>${employee.completed_steps || 0}</td>
            <td>${employee.total_time_spent || 0}</td>
            <td>${employee.average_time_per_completed_step || 0}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Load productivity error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">Error loading productivity data.</td>
      </tr>
    `;
  }
}

async function loadMovementJobOrders() {
  const movementSelect = document.getElementById("movement_job_order_id");

  if (!movementSelect) {
    return;
  }

  try {
    const response = await fetch("/api/job-orders-simple");
    const result = await response.json();

    if (!result.success) {
      return;
    }

    movementSelect.innerHTML = `<option value="">Select a job order</option>`;

    result.jobOrders.forEach((job) => {
      const option = document.createElement("option");
      option.value = job.id;
      option.textContent = `${job.job_order_number} - ${job.customer_name} - ${job.item_name}`;
      movementSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Load movement job orders error:", error);
  }
}

function setupMovementForm() {
  const movementForm = document.getElementById("movementForm");
  const movementMessage = document.getElementById("movementMessage");

  if (!movementForm) {
    return;
  }

  movementForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      job_order_id: document.getElementById("movement_job_order_id").value,
      from_location: document.getElementById("from_location").value.trim(),
      to_location: document.getElementById("to_location").value.trim(),
      movement_status: document.getElementById("movement_status").value,
      received_at: document.getElementById("received_at").value,
      storage_location: document.getElementById("movement_storage_location").value.trim(),
      notes: document.getElementById("movement_notes").value.trim(),
    };

    movementMessage.textContent = "Saving movement log...";
    movementMessage.className = "form-message";

    try {
      const response = await fetch("/api/movement-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        movementMessage.textContent = "Movement log created successfully.";
        movementMessage.className = "form-message success-message";
        movementForm.reset();
        refreshAllOperationalViews();
      } else {
        movementMessage.textContent = result.message;
        movementMessage.className = "form-message error-message";
      }
    } catch (error) {
      console.error("Create movement log error:", error);
      movementMessage.textContent = "Failed to save movement log.";
      movementMessage.className = "form-message error-message";
    }
  });
}

async function loadStorageOverview() {
  const tableBody = document.getElementById("storageOverviewTableBody");

  if (!tableBody) {
    return;
  }

  try {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">Loading storage overview...</td>
      </tr>
    `;

    const response = await fetch("/api/storage-overview");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-cell">Failed to load storage overview.</td>
        </tr>
      `;
      return;
    }

    if (result.storageOverview.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-cell">No storage records found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.storageOverview
      .map((item) => {
        return `
          <tr>
            <td>${escapeHtml(item.job_order_number)}</td>
            <td>${escapeHtml(item.customer_name)}</td>
            <td>${escapeHtml(item.item_name)}</td>
            <td>${escapeHtml(item.store_name || "-")}</td>
            <td>${renderStatusBadge(item.current_status)}</td>
            <td>${escapeHtml(item.current_location || "-")}</td>
            <td>${escapeHtml(item.storage_location || "-")}</td>
            <td>${renderMovementBadge(item.latest_movement_status || "-")}</td>
            <td>${item.last_moved_at ? formatDateTimeDisplay(item.last_moved_at) : "-"}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Load storage overview error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">Error loading storage overview.</td>
      </tr>
    `;
  }
}

async function loadMovementLogs() {
  const tableBody = document.getElementById("movementLogsTableBody");

  if (!tableBody) {
    return;
  }

  try {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">Loading movement logs...</td>
      </tr>
    `;

    const response = await fetch("/api/movement-logs");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-cell">Failed to load movement logs.</td>
        </tr>
      `;
      return;
    }

    if (result.movementLogs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-cell">No movement logs found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.movementLogs
      .map((log) => {
        return `
          <tr>
            <td>${escapeHtml(log.job_order_number)}</td>
            <td>${escapeHtml(log.customer_name)}</td>
            <td>${escapeHtml(log.item_name)}</td>
            <td>${escapeHtml(log.from_location)}</td>
            <td>${escapeHtml(log.to_location)}</td>
            <td>${renderMovementBadge(log.movement_status)}</td>
            <td>${formatDateTimeDisplay(log.moved_at)}</td>
            <td>${log.received_at ? formatDateTimeDisplay(log.received_at) : "-"}</td>
            <td>${escapeHtml(log.notes || "-")}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Load movement logs error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">Error loading movement logs.</td>
      </tr>
    `;
  }
}

async function loadReportsSummary() {
  const totalJobOrders = document.getElementById("reportTotalJobOrders");
  const completedJobs = document.getElementById("reportCompletedJobs");
  const delayedJobs = document.getElementById("reportDelayedJobs");
  const movementLogs = document.getElementById("reportMovementLogs");
  const activeEmployees = document.getElementById("reportActiveEmployees");

  if (!totalJobOrders || !completedJobs || !delayedJobs || !movementLogs || !activeEmployees) {
    return;
  }

  try {
    const response = await fetch("/api/reports/summary");
    const result = await response.json();

    if (!result.success) {
      return;
    }

    totalJobOrders.textContent = result.summary.totalJobOrders;
    completedJobs.textContent = result.summary.completedJobs;
    delayedJobs.textContent = result.summary.delayedJobs;
    movementLogs.textContent = result.summary.totalMovementLogs;
    activeEmployees.textContent = result.summary.activeEmployees;
  } catch (error) {
    console.error("Load reports summary error:", error);
  }
}

async function loadJobStatusReport() {
  const tableBody = document.getElementById("jobStatusReportTableBody");

  if (!tableBody) {
    return;
  }

  try {
    const response = await fetch("/api/reports/job-status");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2" class="empty-cell">Failed to load job status report.</td>
        </tr>
      `;
      return;
    }

    if (result.jobStatusReport.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2" class="empty-cell">No job status data found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.jobStatusReport
      .map((row) => {
        return `
          <tr>
            <td>${renderStatusBadge(row.current_status || "-")}</td>
            <td>${row.total}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Load job status report error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="2" class="empty-cell">Error loading job status report.</td>
      </tr>
    `;
  }
}

async function loadDelayedJobsReport() {
  const tableBody = document.getElementById("delayedJobsReportTableBody");

  if (!tableBody) {
    return;
  }

  try {
    const response = await fetch("/api/reports/delayed-jobs");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">Failed to load delayed jobs report.</td>
        </tr>
      `;
      return;
    }

    if (result.delayedJobsReport.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">No delayed jobs found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.delayedJobsReport
      .map((job) => {
        return `
          <tr>
            <td>${escapeHtml(job.job_order_number)}</td>
            <td>${escapeHtml(job.customer_name)}</td>
            <td>${escapeHtml(job.item_name)}</td>
            <td>${escapeHtml(job.store_name || "-")}</td>
            <td>${renderStatusBadge(job.current_status)}</td>
            <td>${job.due_date ? formatDate(job.due_date) : "-"}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Load delayed jobs report error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">Error loading delayed jobs report.</td>
      </tr>
    `;
  }
}

async function loadStoreVolumeReport() {
  const tableBody = document.getElementById("storeVolumeReportTableBody");

  if (!tableBody) {
    return;
  }

  try {
    const response = await fetch("/api/reports/store-volume");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-cell">Failed to load store volume report.</td>
        </tr>
      `;
      return;
    }

    if (result.storeVolumeReport.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-cell">No store volume data found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.storeVolumeReport
      .map((store) => {
        return `
          <tr>
            <td>${escapeHtml(store.store_name)}</td>
            <td>${escapeHtml(store.mall_location)}</td>
            <td>${store.total_job_orders}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Load store volume report error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-cell">Error loading store volume report.</td>
      </tr>
    `;
  }
}

async function loadProductivitySummaryReport() {
  const tableBody = document.getElementById("productivitySummaryReportTableBody");

  if (!tableBody) {
    return;
  }

  try {
    const response = await fetch("/api/reports/productivity-summary");
    const result = await response.json();

    if (!result.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-cell">Failed to load productivity summary.</td>
        </tr>
      `;
      return;
    }

    if (result.productivitySummaryReport.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-cell">No productivity summary data found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = result.productivitySummaryReport
      .map((employee) => {
        return `
          <tr>
            <td>${escapeHtml(employee.employee_code)}</td>
            <td>${escapeHtml(employee.full_name)}</td>
            <td>${escapeHtml(employee.role)}</td>
            <td>${employee.completed_steps || 0}</td>
            <td>${employee.total_time_spent || 0}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Load productivity summary report error:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">Error loading productivity summary.</td>
      </tr>
    `;
  }
}

function refreshAllOperationalViews() {
  loadDashboardStats();
  loadJobOrders();
  loadWorkflowJobOrders();
  loadEmployees();
  loadProductivityData();
  loadMovementJobOrders();
  loadStorageOverview();
  loadMovementLogs();
  loadReportsSummary();
  loadJobStatusReport();
  loadDelayedJobsReport();
  loadStoreVolumeReport();
  loadProductivitySummaryReport();
  loadEmployeesManagementTable();
}

function renderStatusBadge(status) {
  const safeStatus = escapeHtml(status || "-");
  const badgeClass = getStatusBadgeClass(status);
  return `<span class="status-badge ${badgeClass}">${safeStatus}</span>`;
}

function renderPriorityBadge(priority) {
  const safePriority = escapeHtml(priority || "Normal");
  const badgeClass = getPriorityBadgeClass(priority);
  return `<span class="status-badge ${badgeClass}">${safePriority}</span>`;
}

function renderMovementBadge(status) {
  const safeStatus = escapeHtml(status || "-");
  const badgeClass = getMovementBadgeClass(status);
  return `<span class="status-badge ${badgeClass}">${safeStatus}</span>`;
}

function getStatusBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "received":
      return "badge-blue";
    case "inspection":
      return "badge-indigo";
    case "cleaning":
      return "badge-cyan";
    case "drying":
      return "badge-purple";
    case "restoration":
      return "badge-orange";
    case "quality check":
      return "badge-gold";
    case "ready for pickup":
      return "badge-green";
    case "completed":
      return "badge-green-strong";
    case "in progress":
      return "badge-cyan";
    case "pending":
      return "badge-gray";
    case "delayed":
      return "badge-red";
    case "active":
      return "badge-green";
    case "inactive":
      return "badge-gray";
    default:
      return "badge-gray";
  }
}

function getPriorityBadgeClass(priority) {
  switch ((priority || "").toLowerCase()) {
    case "urgent":
      return "badge-red";
    case "high":
      return "badge-orange";
    case "normal":
      return "badge-gray";
    default:
      return "badge-gray";
  }
}

function getMovementBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "in transit":
      return "badge-blue";
    case "received":
      return "badge-green";
    case "ready for dispatch":
      return "badge-orange";
    default:
      return "badge-gray";
  }
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString();
}

function formatDateTimeLocal(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTimeDisplay(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString();
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}