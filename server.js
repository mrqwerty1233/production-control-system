const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { initializeDatabase, db } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

initializeDatabase();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "production-control-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, "public")));

function requireLogin(req, res, next) {
  if (req.session && req.session.admin) {
    next();
  } else {
    res.redirect("/login");
  }
}

function generateJobOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `JO-${year}-${timestamp}`;
}

function calculateTimeSpentMinutes(startTime, endTime) {
  if (!startTime || !endTime) {
    return 0;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffMilliseconds = end.getTime() - start.getTime();

  if (diffMilliseconds <= 0) {
    return 0;
  }

  return Math.round(diffMilliseconds / 60000);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/job-orders", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "job-orders.html"));
});

app.get("/workflow", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "workflow.html"));
});

app.get("/productivity", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "productivity.html"));
});

app.get("/storage-movement", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "storage-movement.html"));
});

app.get("/reports", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reports.html"));
});

app.get("/employees", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "employees.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required.",
    });
  }

  db.get(
    `SELECT * FROM admins WHERE username = ?`,
    [username],
    async (err, admin) => {
      if (err) {
        console.error("Login database error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Server error. Please try again.",
        });
      }

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password.",
        });
      }

      try {
        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message: "Invalid username or password.",
          });
        }

        req.session.admin = {
          id: admin.id,
          username: admin.username,
          full_name: admin.full_name,
        };

        return res.json({
          success: true,
          message: "Login successful.",
        });
      } catch (compareError) {
        console.error("Password comparison error:", compareError.message);
        return res.status(500).json({
          success: false,
          message: "Server error. Please try again.",
        });
      }
    }
  );
});

app.get("/api/session", (req, res) => {
  if (req.session && req.session.admin) {
    return res.json({
      loggedIn: true,
      admin: req.session.admin,
    });
  }

  return res.json({
    loggedIn: false,
  });
});

app.get("/api/dashboard/stats", requireLogin, (req, res) => {
  const stats = {
    totalJobOrders: 0,
    inProduction: 0,
    completedToday: 0,
    delayedJobs: 0,
  };

  db.get(
    `SELECT COUNT(*) AS count
     FROM job_orders
     WHERE current_status != 'Archived'`,
    (err, totalRow) => {
      if (err) {
        console.error("Dashboard total error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load dashboard stats.",
        });
      }

      stats.totalJobOrders = totalRow.count;

      db.get(
        `SELECT COUNT(*) AS count
         FROM job_orders
         WHERE current_status IN ('Inspection', 'Cleaning', 'Drying', 'Restoration', 'Quality Check', 'In Production', 'Ready for Pickup')`,
        (err2, productionRow) => {
          if (err2) {
            console.error("Dashboard production error:", err2.message);
            return res.status(500).json({
              success: false,
              message: "Failed to load dashboard stats.",
            });
          }

          stats.inProduction = productionRow.count;

          db.get(
            `SELECT COUNT(*) AS count
             FROM job_orders
             WHERE DATE(date_received) = DATE('now')
               AND current_status = 'Completed'`,
            (err3, completedRow) => {
              if (err3) {
                console.error("Dashboard completed error:", err3.message);
                return res.status(500).json({
                  success: false,
                  message: "Failed to load dashboard stats.",
                });
              }

              stats.completedToday = completedRow.count;

              db.get(
                `SELECT COUNT(*) AS count
                 FROM job_orders
                 WHERE due_date IS NOT NULL
                   AND DATE(due_date) < DATE('now')
                   AND current_status NOT IN ('Completed', 'Archived')`,
                (err4, delayedRow) => {
                  if (err4) {
                    console.error("Dashboard delayed error:", err4.message);
                    return res.status(500).json({
                      success: false,
                      message: "Failed to load dashboard stats.",
                    });
                  }

                  stats.delayedJobs = delayedRow.count;

                  return res.json({
                    success: true,
                    stats,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.get("/api/stores", requireLogin, (req, res) => {
  db.all(
    `SELECT id, store_name, mall_location FROM stores ORDER BY store_name ASC`,
    (err, rows) => {
      if (err) {
        console.error("Stores fetch error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load stores.",
        });
      }

      return res.json({
        success: true,
        stores: rows,
      });
    }
  );
});

app.get("/api/employees", requireLogin, (req, res) => {
  db.all(
    `SELECT id, employee_code, full_name, role
     FROM employees
     WHERE status = 'Active'
     ORDER BY full_name ASC`,
    (err, rows) => {
      if (err) {
        console.error("Employees fetch error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load employees.",
        });
      }

      return res.json({
        success: true,
        employees: rows,
      });
    }
  );
});

app.get("/api/employees-management", requireLogin, (req, res) => {
  db.all(
    `SELECT id, employee_code, full_name, role, status
     FROM employees
     ORDER BY id DESC`,
    (err, rows) => {
      if (err) {
        console.error("Employees management fetch error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load employee records.",
        });
      }

      return res.json({
        success: true,
        employees: rows,
      });
    }
  );
});

app.post("/api/employees", requireLogin, (req, res) => {
  const { employee_code, full_name, role, status } = req.body;

  if (!employee_code || !full_name || !role) {
    return res.status(400).json({
      success: false,
      message: "Employee code, full name, and role are required.",
    });
  }

  db.run(
    `INSERT INTO employees (employee_code, full_name, role, status)
     VALUES (?, ?, ?, ?)`,
    [
      employee_code.trim(),
      full_name.trim(),
      role.trim(),
      status || "Active",
    ],
    function (err) {
      if (err) {
        console.error("Create employee error:", err.message);

        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({
            success: false,
            message: "Employee code already exists.",
          });
        }

        return res.status(500).json({
          success: false,
          message: "Failed to create employee.",
        });
      }

      return res.json({
        success: true,
        message: "Employee added successfully.",
        employeeId: this.lastID,
      });
    }
  );
});

app.put("/api/employees/:id", requireLogin, (req, res) => {
  const { id } = req.params;
  const { employee_code, full_name, role, status } = req.body;

  if (!employee_code || !full_name || !role || !status) {
    return res.status(400).json({
      success: false,
      message: "Employee code, full name, role, and status are required.",
    });
  }

  db.run(
    `UPDATE employees
     SET employee_code = ?, full_name = ?, role = ?, status = ?
     WHERE id = ?`,
    [employee_code.trim(), full_name.trim(), role.trim(), status.trim(), id],
    function (err) {
      if (err) {
        console.error("Update employee error:", err.message);

        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({
            success: false,
            message: "Employee code already exists.",
          });
        }

        return res.status(500).json({
          success: false,
          message: "Failed to update employee.",
        });
      }

      if (!this.changes) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      return res.json({
        success: true,
        message: "Employee updated successfully.",
      });
    }
  );
});

app.get("/api/productivity", requireLogin, (req, res) => {
  const sql = `
    SELECT
      employees.id,
      employees.employee_code,
      employees.full_name,
      employees.role,
      COUNT(workflow_steps.id) AS total_assigned_steps,
      SUM(CASE WHEN workflow_steps.status = 'Completed' THEN 1 ELSE 0 END) AS completed_steps,
      COALESCE(SUM(workflow_steps.time_spent_minutes), 0) AS total_time_spent,
      CASE
        WHEN SUM(CASE WHEN workflow_steps.status = 'Completed' THEN 1 ELSE 0 END) > 0
        THEN ROUND(
          CAST(COALESCE(SUM(workflow_steps.time_spent_minutes), 0) AS REAL) /
          SUM(CASE WHEN workflow_steps.status = 'Completed' THEN 1 ELSE 0 END),
          2
        )
        ELSE 0
      END AS average_time_per_completed_step
    FROM employees
    LEFT JOIN workflow_steps
      ON employees.id = workflow_steps.assigned_employee_id
    WHERE employees.status = 'Active'
    GROUP BY employees.id, employees.employee_code, employees.full_name, employees.role
    ORDER BY completed_steps DESC, total_time_spent DESC, employees.full_name ASC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("Productivity fetch error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load productivity data.",
      });
    }

    return res.json({
      success: true,
      productivity: rows,
    });
  });
});

app.post("/api/job-orders", requireLogin, (req, res) => {
  const {
    customer_name,
    store_id,
    item_name,
    service_type,
    priority_level,
    due_date,
    storage_location,
    notes,
  } = req.body;

  if (!customer_name || !store_id || !item_name || !service_type) {
    return res.status(400).json({
      success: false,
      message: "Customer name, store, item name, and service type are required.",
    });
  }

  const jobOrderNumber = generateJobOrderNumber();

  db.run(
    `INSERT INTO job_orders (
      job_order_number,
      customer_name,
      store_id,
      item_name,
      service_type,
      current_status,
      priority_level,
      due_date,
      storage_location,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jobOrderNumber,
      customer_name,
      store_id,
      item_name,
      service_type,
      "Received",
      priority_level || "Normal",
      due_date || null,
      storage_location || "",
      notes || "",
    ],
    function (err) {
      if (err) {
        console.error("Create job order error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to create job order.",
        });
      }

      return res.json({
        success: true,
        message: "Job order created successfully.",
        jobOrderId: this.lastID,
        jobOrderNumber,
      });
    }
  );
});

app.get("/api/job-orders", requireLogin, (req, res) => {
  const { search = "", status = "" } = req.query;

  let sql = `
    SELECT
      job_orders.id,
      job_orders.job_order_number,
      job_orders.customer_name,
      job_orders.store_id,
      job_orders.item_name,
      job_orders.service_type,
      job_orders.current_status,
      job_orders.priority_level,
      job_orders.date_received,
      job_orders.due_date,
      job_orders.storage_location,
      job_orders.notes,
      stores.store_name
    FROM job_orders
    LEFT JOIN stores ON job_orders.store_id = stores.id
    WHERE job_orders.current_status != 'Archived'
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        job_orders.job_order_number LIKE ?
        OR job_orders.customer_name LIKE ?
        OR job_orders.item_name LIKE ?
        OR job_orders.service_type LIKE ?
        OR stores.store_name LIKE ?
      )
    `;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (status) {
    sql += ` AND job_orders.current_status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY job_orders.id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Fetch job orders error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load job orders.",
      });
    }

    return res.json({
      success: true,
      jobOrders: rows,
    });
  });
});

app.get("/api/job-orders/:id", requireLogin, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT
      id,
      job_order_number,
      customer_name,
      store_id,
      item_name,
      service_type,
      current_status,
      priority_level,
      due_date,
      storage_location,
      notes
     FROM job_orders
     WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error("Fetch single job order error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load job order details.",
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message: "Job order not found.",
        });
      }

      return res.json({
        success: true,
        jobOrder: row,
      });
    }
  );
});

app.put("/api/job-orders/:id", requireLogin, (req, res) => {
  const { id } = req.params;
  const {
    customer_name,
    store_id,
    item_name,
    service_type,
    current_status,
    priority_level,
    due_date,
    storage_location,
    notes,
  } = req.body;

  if (!customer_name || !store_id || !item_name || !service_type || !current_status) {
    return res.status(400).json({
      success: false,
      message: "Customer name, store, item name, service type, and status are required.",
    });
  }

  db.run(
    `UPDATE job_orders
     SET customer_name = ?,
         store_id = ?,
         item_name = ?,
         service_type = ?,
         current_status = ?,
         priority_level = ?,
         due_date = ?,
         storage_location = ?,
         notes = ?
     WHERE id = ?`,
    [
      customer_name.trim(),
      store_id,
      item_name.trim(),
      service_type.trim(),
      current_status.trim(),
      priority_level || "Normal",
      due_date || null,
      storage_location || "",
      notes || "",
      id,
    ],
    function (err) {
      if (err) {
        console.error("Update job order error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to update job order.",
        });
      }

      if (!this.changes) {
        return res.status(404).json({
          success: false,
          message: "Job order not found.",
        });
      }

      return res.json({
        success: true,
        message: "Job order updated successfully.",
      });
    }
  );
});

app.put("/api/job-orders/:id/archive", requireLogin, (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE job_orders
     SET current_status = 'Archived'
     WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error("Archive job order error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to archive job order.",
        });
      }

      if (!this.changes) {
        return res.status(404).json({
          success: false,
          message: "Job order not found.",
        });
      }

      return res.json({
        success: true,
        message: "Job order archived successfully.",
      });
    }
  );
});

app.get("/api/job-orders-simple", requireLogin, (req, res) => {
  db.all(
    `SELECT id, job_order_number, customer_name, item_name, current_status
     FROM job_orders
     WHERE current_status != 'Archived'
     ORDER BY id DESC`,
    (err, rows) => {
      if (err) {
        console.error("Simple job orders fetch error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load job orders.",
        });
      }

      return res.json({
        success: true,
        jobOrders: rows,
      });
    }
  );
});

app.get("/api/storage-overview", requireLogin, (req, res) => {
  const sql = `
    SELECT
      job_orders.id,
      job_orders.job_order_number,
      job_orders.customer_name,
      job_orders.item_name,
      job_orders.current_status,
      job_orders.storage_location,
      stores.store_name,
      COALESCE(latest_logs.to_location, stores.store_name) AS current_location,
      latest_logs.movement_status AS latest_movement_status,
      latest_logs.moved_at AS last_moved_at
    FROM job_orders
    LEFT JOIN stores ON job_orders.store_id = stores.id
    LEFT JOIN (
      SELECT ml1.job_order_id, ml1.to_location, ml1.movement_status, ml1.moved_at
      FROM movement_logs ml1
      INNER JOIN (
        SELECT job_order_id, MAX(id) AS max_id
        FROM movement_logs
        GROUP BY job_order_id
      ) latest ON ml1.id = latest.max_id
    ) latest_logs ON latest_logs.job_order_id = job_orders.id
    WHERE job_orders.current_status != 'Archived'
    ORDER BY job_orders.id DESC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("Storage overview fetch error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load storage overview.",
      });
    }

    return res.json({
      success: true,
      storageOverview: rows,
    });
  });
});

app.get("/api/movement-logs", requireLogin, (req, res) => {
  const sql = `
    SELECT
      movement_logs.id,
      movement_logs.job_order_id,
      movement_logs.from_location,
      movement_logs.to_location,
      movement_logs.movement_status,
      movement_logs.moved_at,
      movement_logs.received_at,
      movement_logs.notes,
      job_orders.job_order_number,
      job_orders.customer_name,
      job_orders.item_name
    FROM movement_logs
    INNER JOIN job_orders ON movement_logs.job_order_id = job_orders.id
    WHERE job_orders.current_status != 'Archived'
    ORDER BY movement_logs.id DESC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("Movement logs fetch error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load movement logs.",
      });
    }

    return res.json({
      success: true,
      movementLogs: rows,
    });
  });
});

app.post("/api/movement-logs", requireLogin, (req, res) => {
  const {
    job_order_id,
    from_location,
    to_location,
    movement_status,
    received_at,
    storage_location,
    notes,
  } = req.body;

  if (!job_order_id || !from_location || !to_location) {
    return res.status(400).json({
      success: false,
      message: "Job order, from location, and to location are required.",
    });
  }

  db.run(
    `INSERT INTO movement_logs (
      job_order_id,
      from_location,
      to_location,
      movement_status,
      received_at,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      job_order_id,
      from_location,
      to_location,
      movement_status || "In Transit",
      received_at || null,
      notes || "",
    ],
    function (err) {
      if (err) {
        console.error("Create movement log error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to create movement log.",
        });
      }

      db.run(
        `UPDATE job_orders
         SET storage_location = ?
         WHERE id = ?`,
        [storage_location || "", job_order_id],
        (updateErr) => {
          if (updateErr) {
            console.error("Update storage location error:", updateErr.message);
            return res.status(500).json({
              success: false,
              message: "Movement log created, but storage location update failed.",
            });
          }

          return res.json({
            success: true,
            message: "Movement log created successfully.",
            movementLogId: this.lastID,
          });
        }
      );
    }
  );
});

app.get("/api/workflow/:jobOrderId", requireLogin, (req, res) => {
  const { jobOrderId } = req.params;

  db.all(
    `SELECT
      workflow_steps.id,
      workflow_steps.job_order_id,
      workflow_steps.step_name,
      workflow_steps.assigned_employee_id,
      workflow_steps.status,
      workflow_steps.start_time,
      workflow_steps.end_time,
      workflow_steps.time_spent_minutes,
      workflow_steps.notes,
      employees.full_name AS employee_name,
      employees.employee_code
     FROM workflow_steps
     LEFT JOIN employees ON workflow_steps.assigned_employee_id = employees.id
     WHERE workflow_steps.job_order_id = ?
     ORDER BY workflow_steps.id ASC`,
    [jobOrderId],
    (err, rows) => {
      if (err) {
        console.error("Workflow fetch error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load workflow steps.",
        });
      }

      return res.json({
        success: true,
        workflowSteps: rows,
      });
    }
  );
});

app.post("/api/workflow/initialize/:jobOrderId", requireLogin, (req, res) => {
  const { jobOrderId } = req.params;

  const standardSteps = [
    "Received from Store",
    "Inspection",
    "Cleaning",
    "Drying",
    "Restoration",
    "Quality Check",
    "Ready for Pickup",
    "Returned to Store",
  ];

  db.get(
    `SELECT COUNT(*) AS count FROM workflow_steps WHERE job_order_id = ?`,
    [jobOrderId],
    (err, row) => {
      if (err) {
        console.error("Workflow check error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to check workflow steps.",
        });
      }

      if (row.count > 0) {
        return res.json({
          success: true,
          message: "Workflow already initialized for this job order.",
        });
      }

      const stmt = db.prepare(
        `INSERT INTO workflow_steps (job_order_id, step_name, status, time_spent_minutes, notes)
         VALUES (?, ?, 'Pending', 0, '')`
      );

      standardSteps.forEach((stepName) => {
        stmt.run(jobOrderId, stepName);
      });

      stmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          console.error("Workflow initialization error:", finalizeErr.message);
          return res.status(500).json({
            success: false,
            message: "Failed to initialize workflow steps.",
          });
        }

        return res.json({
          success: true,
          message: "Workflow steps initialized successfully.",
        });
      });
    }
  );
});

app.put("/api/workflow/:stepId", requireLogin, (req, res) => {
  const { stepId } = req.params;
  const {
    assigned_employee_id,
    status,
    start_time,
    end_time,
    notes,
    job_order_id,
    step_name,
  } = req.body;

  const timeSpentMinutes = calculateTimeSpentMinutes(start_time, end_time);

  db.run(
    `UPDATE workflow_steps
     SET assigned_employee_id = ?,
         status = ?,
         start_time = ?,
         end_time = ?,
         time_spent_minutes = ?,
         notes = ?
     WHERE id = ?`,
    [
      assigned_employee_id || null,
      status || "Pending",
      start_time || null,
      end_time || null,
      timeSpentMinutes,
      notes || "",
      stepId,
    ],
    function (err) {
      if (err) {
        console.error("Workflow update error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to update workflow step.",
        });
      }

      if (!this.changes) {
        return res.status(404).json({
          success: false,
          message: "Workflow step not found.",
        });
      }

      const jobStatusMap = {
        "Received from Store": "Received",
        Inspection: "Inspection",
        Cleaning: "Cleaning",
        Drying: "Drying",
        Restoration: "Restoration",
        "Quality Check": "Quality Check",
        "Ready for Pickup": "Ready for Pickup",
        "Returned to Store": "Completed",
      };

      const mappedJobStatus =
        status === "Completed" ? jobStatusMap[step_name] || null : null;

      if (!mappedJobStatus || !job_order_id) {
        return res.json({
          success: true,
          message: "Workflow step updated successfully.",
          timeSpentMinutes,
        });
      }

      db.run(
        `UPDATE job_orders SET current_status = ? WHERE id = ?`,
        [mappedJobStatus, job_order_id],
        (jobUpdateErr) => {
          if (jobUpdateErr) {
            console.error("Job order status update error:", jobUpdateErr.message);
            return res.status(500).json({
              success: false,
              message: "Workflow step updated, but failed to update job order status.",
            });
          }

          return res.json({
            success: true,
            message: "Workflow step updated successfully.",
            timeSpentMinutes,
          });
        }
      );
    }
  );
});

app.get("/api/reports/summary", requireLogin, (req, res) => {
  const summary = {
    totalJobOrders: 0,
    completedJobs: 0,
    delayedJobs: 0,
    totalMovementLogs: 0,
    activeEmployees: 0,
  };

  db.get(
    `SELECT COUNT(*) AS count
     FROM job_orders
     WHERE current_status != 'Archived'`,
    (err1, totalJobsRow) => {
      if (err1) {
        console.error("Reports summary total jobs error:", err1.message);
        return res.status(500).json({
          success: false,
          message: "Failed to load reports summary.",
        });
      }

      summary.totalJobOrders = totalJobsRow.count;

      db.get(
        `SELECT COUNT(*) AS count FROM job_orders WHERE current_status = 'Completed'`,
        (err2, completedRow) => {
          if (err2) {
            console.error("Reports summary completed jobs error:", err2.message);
            return res.status(500).json({
              success: false,
              message: "Failed to load reports summary.",
            });
          }

          summary.completedJobs = completedRow.count;

          db.get(
            `SELECT COUNT(*) AS count
             FROM job_orders
             WHERE due_date IS NOT NULL
               AND DATE(due_date) < DATE('now')
               AND current_status NOT IN ('Completed', 'Archived')`,
            (err3, delayedRow) => {
              if (err3) {
                console.error("Reports summary delayed jobs error:", err3.message);
                return res.status(500).json({
                  success: false,
                  message: "Failed to load reports summary.",
                });
              }

              summary.delayedJobs = delayedRow.count;

              db.get(`SELECT COUNT(*) AS count FROM movement_logs`, (err4, movementRow) => {
                if (err4) {
                  console.error("Reports summary movement logs error:", err4.message);
                  return res.status(500).json({
                    success: false,
                    message: "Failed to load reports summary.",
                  });
                }

                summary.totalMovementLogs = movementRow.count;

                db.get(
                  `SELECT COUNT(*) AS count FROM employees WHERE status = 'Active'`,
                  (err5, employeeRow) => {
                    if (err5) {
                      console.error("Reports summary employees error:", err5.message);
                      return res.status(500).json({
                        success: false,
                        message: "Failed to load reports summary.",
                      });
                    }

                    summary.activeEmployees = employeeRow.count;

                    return res.json({
                      success: true,
                      summary,
                    });
                  }
                );
              });
            }
          );
        }
      );
    }
  );
});

app.get("/api/reports/job-status", requireLogin, (req, res) => {
  const sql = `
    SELECT
      current_status,
      COUNT(*) AS total
    FROM job_orders
    WHERE current_status != 'Archived'
    GROUP BY current_status
    ORDER BY total DESC, current_status ASC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("Job status report error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load job status report.",
      });
    }

    return res.json({
      success: true,
      jobStatusReport: rows,
    });
  });
});

app.get("/api/reports/delayed-jobs", requireLogin, (req, res) => {
  const sql = `
    SELECT
      job_orders.job_order_number,
      job_orders.customer_name,
      job_orders.item_name,
      job_orders.current_status,
      job_orders.due_date,
      stores.store_name
    FROM job_orders
    LEFT JOIN stores ON job_orders.store_id = stores.id
    WHERE job_orders.due_date IS NOT NULL
      AND DATE(job_orders.due_date) < DATE('now')
      AND job_orders.current_status NOT IN ('Completed', 'Archived')
    ORDER BY job_orders.due_date ASC, job_orders.id DESC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("Delayed jobs report error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load delayed jobs report.",
      });
    }

    return res.json({
      success: true,
      delayedJobsReport: rows,
    });
  });
});

app.get("/api/reports/store-volume", requireLogin, (req, res) => {
  const sql = `
    SELECT
      stores.store_name,
      stores.mall_location,
      COUNT(job_orders.id) AS total_job_orders
    FROM stores
    LEFT JOIN job_orders
      ON stores.id = job_orders.store_id
     AND job_orders.current_status != 'Archived'
    GROUP BY stores.id, stores.store_name, stores.mall_location
    ORDER BY total_job_orders DESC, stores.store_name ASC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("Store volume report error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load store volume report.",
      });
    }

    return res.json({
      success: true,
      storeVolumeReport: rows,
    });
  });
});

app.get("/api/reports/productivity-summary", requireLogin, (req, res) => {
  const sql = `
    SELECT
      employees.employee_code,
      employees.full_name,
      employees.role,
      SUM(CASE WHEN workflow_steps.status = 'Completed' THEN 1 ELSE 0 END) AS completed_steps,
      COALESCE(SUM(workflow_steps.time_spent_minutes), 0) AS total_time_spent
    FROM employees
    LEFT JOIN workflow_steps
      ON employees.id = workflow_steps.assigned_employee_id
    WHERE employees.status = 'Active'
    GROUP BY employees.id, employees.employee_code, employees.full_name, employees.role
    ORDER BY completed_steps DESC, total_time_spent DESC, employees.full_name ASC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error("Productivity summary report error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to load productivity summary report.",
      });
    }

    return res.json({
      success: true,
      productivitySummaryReport: rows,
    });
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout failed.",
      });
    }

    res.clearCookie("connect.sid");
    return res.json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});