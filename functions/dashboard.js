const firebaseConfig = {
  apiKey: "AIzaSyABomqBTkkti8Wzxu2H0UKX1s-UZBoFN0c",
  authDomain: "eshim-edu-eclipse.firebaseapp.com",
  projectId: "eshim-edu-eclipse",
  storageBucket: "eshim-edu-eclipse.firebasestorage.app",
  messagingSenderId: "499244396754",
  appId: "1:499244396754:web:b8add55832b41b1ee5bd0b",
  measurementId: "G-RKW9CEM3NQ",
};

function showCustomAlert(message, type) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `custom-alert ${type}`;
  alertDiv.textContent = message;
  document.body.prepend(alertDiv);

  setTimeout(() => {
    alertDiv.classList.add("show");
  }, 100);

  setTimeout(() => {
    alertDiv.classList.remove("show");
    setTimeout(() => {
      alertDiv.remove();
    }, 500);
  }, 200000);
}

if (typeof firebase === "undefined") {
  showCustomAlert(
    "Error: Firebase SDK failed to load. Please check your internet connection or CDN URLs.",
    "error"
  );
} else {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (error) {
    showCustomAlert(`Error initializing Firebase: ${error.message}`, "error");
    document.querySelector(".main-content").innerHTML =
      "<h2>Error</h2><p>Failed to initialize the application. Please try again later.</p>";
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged((user) => {
    if (user) {
      db.collection("users")
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const userData = doc.data();
            userData.uid = user.uid; // Store Firebase UID
            userData.accID = userData.accID || user.uid; // Use accID if available, fallback to uid
            document.getElementById("user-name").textContent = userData.name;
            renderDashboard(userData);
          } else {
            showCustomAlert("User data not found", "error");
          }
        })
        .catch((error) => {
          showCustomAlert(
            `Error fetching user data: ${error.message}`,
            "error"
          );
        });
    } else {
      showCustomAlert("Please log in to continue", "error");
      setTimeout(() => {
        window.location.href = "../src/login.html";
      }, 1500);
    }
  });

  function renderDashboard(userData) {
    const mainContent = document.querySelector(".main-content");
    const resourcesLink = document.getElementById("resources-link");
    const userManagementLink = document.getElementById("user-management-link");
    const sellerPassLink = document.getElementById("seller-pass-link");

    if (userData.status === "Admin") {
      resourcesLink.style.display = "none";
      userManagementLink.style.display = "block";
      sellerPassLink.style.display = "block";
      mainContent.innerHTML = getAdminHomeView();
    } else {
      resourcesLink.style.display = "block";
      userManagementLink.style.display = "none";
      sellerPassLink.style.display = "block";
      mainContent.innerHTML = getStudentHomeView(userData);
    }

    setupNavigation(userData);
  }

  function getStudentHomeView(userData) {
    return `
      <h2>Welcome, ${userData.name}!</h2>
      <div class="profile-card">
        <h3>Profile Information</h3>
        <p><strong>Name:</strong> ${userData.name}</p>
        <p><strong>Class:</strong> ${userData.class}</p>
      </div>
      <div class="quick-links">
        <h3>Quick Links</h3>
        <a href="#" data-view="resources">View Resources</a>
        <a href="#" data-view="eshim-pay">Eshim Pay</a>
        <a href="#" data-view="seller-pass">SellerPASS</a>
      </div>
    `;
  }

  function getAdminHomeView() {
    return `
      <h2>Admin Dashboard</h2>
      <p>Welcome, Admin! Here you can manage users and view system statistics.</p>
      <a href="#" data-view="user-management">Manage Users</a>
      <a href="#" data-view="eshim-pay">Eshim Pay</a>
      <a href="#" data-view="seller-pass">Manage SellerPASS</a>
    `;
  }

  function getEshimPayView(userData) {
    return `
      <h2>Eshim Pay</h2>
      <div class="transfer-card">
        <h3>Send Money</h3>
        <form id="transfer-form">
          <div class="form-group">
            <label for="recipient-email">Recipient Email:</label>
            <input type="email" id="recipient-email" name="recipient-email" placeholder="Enter recipient email" required>
          </div>
          <div class="form-group">
            <label for="transfer-amount">Amount:</label>
            <input type="number" id="transfer-amount" name="transfer-amount" min="0.01" step="0.01" placeholder="Enter amount" required>
          </div>
          <div class="form-group">
            <label for="transfer-description">Description (Optional):</label>
            <textarea id="transfer-description" name="transfer-description" placeholder="Enter description"></textarea>
          </div>
          <button type="submit" class="transfer-btn">Send Money</button>
        </form>
      </div>
      <div class="qr-card">
        <h3>Your Payment QR Code</h3>
        <p>Scan this QR code with another device to process a payment.</p>
        <div id="qr-code"></div>
      </div>
    `;
  }

  function getSellerPassView(userData) {
    return `
      <h2>SellerPASS</h2>
      <div id="seller-pass-container">
        <div id="seller-pass-status"></div>
        <div id="seller-pass-form-container" style="display: none;">
          <h3>Create Business Request</h3>
          <form id="seller-pass-form">
            <div class="form-group">
              <label for="company-name">Company Name:</label>
              <input type="text" id="company-name" name="company-name" required>
            </div>
            <div class="form-group">
              <label for="company-description">What does your company do?</label>
              <textarea id="company-description" name="company-description" required></textarea>
            </div>
            <div class="form-group">
              <label>Employees (minimum 2, including yourself):</label>
              <div id="employees-container">
                <div class="employee-entry">
                  <input type="email" class="employee-email" placeholder="Employee email" required>
                  <select class="employee-role" required>
                    <option value="">Select role</option>
                    <option value="CEO">CEO</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                  </select>
                  <button type="button" class="remove-employee">Remove</button>
                </div>
                <div class="employee-entry">
                  <input type="email" class="employee-email" placeholder="Employee email" required>
                  <select class="employee-role" required>
                    <option value="">Select role</option>
                    <option value="CEO">CEO</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                  </select>
                  <button type="button" class="remove-employee">Remove</button>
                </div>
              </div>
              <button type="button" id="add-employee">Add Employee</button>
            </div>
            <button type="submit" class="submit-btn">Submit Request</button>
          </form>
        </div>
        <div id="seller-pass-requests" style="display: none;">
          <h3>Pending Requests</h3>
          <table id="requests-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Description</th>
                <th>Applicant</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="requests-body"></tbody>
          </table>
        </div>
        <div id="seller-pass-active" style="display: none;">
          <h3>Your SellerPASS</h3>
          <div id="active-pass-details"></div>
        </div>
      </div>
    `;
  }

  function renderSellerPassContent(userData) {
    const container = document.getElementById("seller-pass-container");
    const statusDiv = document.getElementById("seller-pass-status");
    const formContainer = document.getElementById("seller-pass-form-container");
    const requestsContainer = document.getElementById("seller-pass-requests");
    const activePassContainer = document.getElementById("seller-pass-active");

    // Check if season is open
    db.collection("settings")
      .doc("sellerPass")
      .get()
      .then((doc) => {
        const settings = doc.exists ? doc.data() : { seasonOpen: false };
        
        if (userData.status === "Admin") {
          statusDiv.innerHTML = `
            <h3>Admin Controls</h3>
            <p>SellerPASS Season is currently: <strong>${settings.seasonOpen ? "OPEN" : "CLOSED"}</strong></p>
            <button id="toggle-season-btn" class="${settings.seasonOpen ? "close-btn" : "open-btn"}">
              ${settings.seasonOpen ? "Close Season" : "Open Season"}
            </button>
          `;

          // Show pending requests for admin
          requestsContainer.style.display = "block";
          loadPendingRequests(userData);

          document.getElementById("toggle-season-btn").addEventListener("click", () => {
            const newStatus = !settings.seasonOpen;
            db.collection("settings")
              .doc("sellerPass")
              .set({ seasonOpen: newStatus }, { merge: true })
              .then(() => {
                showCustomAlert(`Season ${newStatus ? "opened" : "closed"} successfully`, "success");
                renderSellerPassContent(userData);
              })
              .catch(error => {
                showCustomAlert(`Error updating season status: ${error.message}`, "error");
              });
          });
        } else {
          if (!settings.seasonOpen) {
            statusDiv.innerHTML = "<p>SellerPASS season has not started yet. Please check back later.</p>";
            formContainer.style.display = "none";
            requestsContainer.style.display = "none";
          } else {
            // Check if user already has an active pass
            db.collection("sellerPasses")
              .where("ownerId", "==", userData.uid)
              .where("status", "==", "approved")
              .get()
              .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                  // User has an active pass
                  const passData = querySnapshot.docs[0].data();
                  activePassContainer.style.display = "block";
                  activePassContainer.innerHTML = `
                    <h3>Your SellerPASS</h3>
                    <div class="pass-details">
                      <p><strong>Company Name:</strong> ${passData.companyName}</p>
                      <p><strong>Description:</strong> ${passData.companyDescription}</p>
                      <p><strong>Status:</strong> ${passData.status}</p>
                      <h4>Employees:</h4>
                      <ul>
                        ${passData.employees.map(emp => 
                          `<li>${emp.email} (${emp.role}) ${emp.role === "CEO" ? "(You)" : ""}</li>`
                        ).join("")}
                      </ul>
                    </div>
                  `;
                  formContainer.style.display = "none";
                } else {
                  // Check if user has a pending request
                  db.collection("sellerPasses")
                    .where("ownerId", "==", userData.uid)
                    .where("status", "in", ["pending", "under_review"])
                    .get()
                    .then((querySnapshot) => {
                      if (!querySnapshot.empty) {
                        statusDiv.innerHTML = "<p>Your SellerPASS request is pending approval.</p>";
                        formContainer.style.display = "none";
                      } else {
                        // User can apply
                        statusDiv.innerHTML = "<p>SellerPASS season is open! You can apply now.</p>";
                        formContainer.style.display = "block";
                        setupSellerPassForm(userData);
                      }
                    });
                }
              });
          }
        }

        // Check if user is an employee in any company
        if (userData.status !== "Admin") {
          db.collection("sellerPasses")
            .where("employees", "array-contains", { email: userData.email })
            .where("status", "==", "approved")
            .get()
            .then((querySnapshot) => {
              if (!querySnapshot.empty) {
                const passData = querySnapshot.docs[0].data();
                const employeeRole = passData.employees.find(emp => emp.email === userData.email).role;
                
                activePassContainer.style.display = "block";
                activePassContainer.innerHTML = `
                  <h3>Your SellerPASS</h3>
                  <div class="pass-details">
                    <p><strong>Company Name:</strong> ${passData.companyName}</p>
                    <p><strong>Description:</strong> ${passData.companyDescription}</p>
                    <p><strong>Your Role:</strong> ${employeeRole}</p>
                    <p><strong>Status:</strong> ${passData.status}</p>
                  </div>
                `;
              }
            });
        }
      });

    // Setup form if it's visible
    if (formContainer.style.display !== "none") {
      setupSellerPassForm(userData);
    }
  }

  function setupSellerPassForm(userData) {
    const form = document.getElementById("seller-pass-form");
    const employeesContainer = document.getElementById("employees-container");
    const addEmployeeBtn = document.getElementById("add-employee");

    // Add employee row
    addEmployeeBtn.addEventListener("click", () => {
      const newEmployeeDiv = document.createElement("div");
      newEmployeeDiv.className = "employee-entry";
      newEmployeeDiv.innerHTML = `
        <input type="email" class="employee-email" placeholder="Employee email" required>
        <select class="employee-role" required>
          <option value="">Select role</option>
          <option value="CEO">CEO</option>
          <option value="Manager">Manager</option>
          <option value="Employee">Employee</option>
        </select>
        <button type="button" class="remove-employee">Remove</button>
      `;
      employeesContainer.appendChild(newEmployeeDiv);
      
      // Add remove functionality
      newEmployeeDiv.querySelector(".remove-employee").addEventListener("click", () => {
        if (employeesContainer.children.length > 2) {
          newEmployeeDiv.remove();
        } else {
          showCustomAlert("A company must have at least 2 employees", "error");
        }
      });
    });

    // Add remove functionality to existing employees
    document.querySelectorAll(".remove-employee").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (employeesContainer.children.length > 2) {
          e.target.closest(".employee-entry").remove();
        } else {
          showCustomAlert("A company must have at least 2 employees", "error");
        }
      });
    });

    // Form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const companyName = document.getElementById("company-name").value.trim();
      const companyDescription = document.getElementById("company-description").value.trim();
      
      // Collect employees
      const employees = [];
      let ceoCount = 0;
      
      document.querySelectorAll(".employee-entry").forEach(entry => {
        const email = entry.querySelector(".employee-email").value.trim();
        const role = entry.querySelector(".employee-role").value;
        
        if (role === "CEO") ceoCount++;
        
        employees.push({
          email: email,
          role: role
        });
      });
      
      // Validate
      if (ceoCount !== 1) {
        showCustomAlert("There must be exactly one CEO in the company", "error");
        return;
      }
      
      if (employees.length < 2) {
        showCustomAlert("A company must have at least 2 employees", "error");
        return;
      }
      
      // Check if CEO is the current user
      const ceo = employees.find(emp => emp.role === "CEO");
      if (ceo.email !== userData.email) {
        showCustomAlert("You must be the CEO of the company", "error");
        return;
      }
      
      // Check if employees exist in the system
      const emailPromises = employees.map(emp => 
        db.collection("users").where("email", "==", emp.email).get()
      );
      
      Promise.all(emailPromises)
        .then(results => {
          const allExist = results.every(snapshot => !snapshot.empty);
          if (!allExist) {
            showCustomAlert("One or more employees are not registered in the system", "error");
            return;
          }
          
          // Create the request
          const requestData = {
            companyName: companyName,
            companyDescription: companyDescription,
            employees: employees,
            ownerId: userData.uid,
            ownerEmail: userData.email,
            ownerName: userData.name,
            status: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          
          db.collection("sellerPasses")
            .add(requestData)
            .then(() => {
              showCustomAlert("SellerPASS request submitted successfully!", "success");
              renderSellerPassContent(userData);
            })
            .catch(error => {
              showCustomAlert(`Error submitting request: ${error.message}`, "error");
            });
        })
        .catch(error => {
          showCustomAlert(`Error verifying employees: ${error.message}`, "error");
        });
    });
  }

  function loadPendingRequests(userData) {
    const requestsBody = document.getElementById("requests-body");
    
    db.collection("sellerPasses")
      .where("status", "in", ["pending", "under_review"])
      .orderBy("createdAt", "desc")
      .get()
      .then(querySnapshot => {
        if (querySnapshot.empty) {
          requestsBody.innerHTML = "<tr><td colspan='5'>No pending requests</td></tr>";
          return;
        }
        
        requestsBody.innerHTML = "";
        querySnapshot.forEach(doc => {
          const request = doc.data();
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${request.companyName}</td>
            <td>${request.companyDescription}</td>
            <td>${request.ownerName} (${request.ownerEmail})</td>
            <td>${request.status}</td>
            <td>
              <button class="approve-btn" data-id="${doc.id}">Approve</button>
              <button class="reject-btn" data-id="${doc.id}">Reject</button>
            </td>
          `;
          requestsBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll(".approve-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            updateRequestStatus(e.target.dataset.id, "approved", userData);
          });
        });
        
        document.querySelectorAll(".reject-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            updateRequestStatus(e.target.dataset.id, "rejected", userData);
          });
        });
      })
      .catch(error => {
        showCustomAlert(`Error loading requests: ${error.message}`, "error");
        requestsBody.innerHTML = "<tr><td colspan='5'>Error loading requests</td></tr>";
      });
  }

  function updateRequestStatus(requestId, status, userData) {
    db.collection("sellerPasses")
      .doc(requestId)
      .update({
        status: status,
        reviewedBy: userData.name,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
        showCustomAlert(`Request ${status} successfully`, "success");
        loadPendingRequests(userData);
      })
      .catch(error => {
        showCustomAlert(`Error updating request: ${error.message}`, "error");
      });
  }

  function setupNavigation(userData) {
    const navLinks = document.querySelectorAll(".sidebar a[data-view]");
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.target.getAttribute("data-view");
        switchView(view, userData);
      });
    });

    document.getElementById("logout").addEventListener("click", () => {
      auth
        .signOut()
        .then(() => {
          showCustomAlert("Logged out successfully", "success");
          setTimeout(() => {
            window.location.href = "../src/login.html";
          }, 1500);
        })
        .catch((error) => {
          showCustomAlert(`Error logging out: ${error.message}`, "error");
        });
    });
  }

  function switchView(view, userData) {
    const mainContent = document.querySelector(".main-content");
    switch (view) {
      case "home":
        mainContent.innerHTML =
          userData.status === "Admin"
            ? getAdminHomeView()
            : getStudentHomeView(userData);
        break;
      case "profile":
        mainContent.innerHTML = getProfileView(userData);
        break;
      case "resources":
        if (userData.status !== "Admin") {
          mainContent.innerHTML = getResourcesView();
        }
        break;
      case "user-management":
        if (userData.status === "Admin") {
          fetchAllUsers()
            .then((users) => {
              mainContent.innerHTML = getUserManagementView(users);
              setupEditListeners(users);
            })
            .catch((error) => {
              showCustomAlert(
                `Error fetching users: ${error.message}`,
                "error"
              );
            });
        }
        break;
      case "seller-pass":
        mainContent.innerHTML = getSellerPassView(userData);
        renderSellerPassContent(userData);
        break;
      case "eshim-pay":
        mainContent.innerHTML = getEshimPayView(userData);
        renderEshimPayContent(userData);
        break;
      default:
        mainContent.innerHTML = "<h2>Page Not Found</h2>";
    }
  }

  function renderEshimPayContent(userData) {
    const qrData = JSON.stringify({ accID: userData.accID });
    const qrCodeDiv = document.getElementById("qr-code");
    qrCodeDiv.innerHTML = "";
    if (typeof QRCode === "undefined") {
      showCustomAlert(
        "Error: QR code library failed to load. Please ensure the library is included.",
        "error"
      );
      qrCodeDiv.innerHTML =
        "<p>Unable to generate QR code. Please try again later.</p>";
      return;
    }
    try {
      new QRCode(qrCodeDiv, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: "#2d3e50",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (error) {
      showCustomAlert(`Error generating QR code: ${error.message}`, "error");
      qrCodeDiv.innerHTML =
        "<p>Unable to generate QR code. Please try again later.</p>";
    }

    const transferForm = document.getElementById("transfer-form");
    if (transferForm) {
      transferForm.addEventListener("submit", (e) => {
        e.preventDefault();
        sendMoney(userData);
      });
    }
  }

  function sendMoney(userData) {
    const recipientEmail = document.getElementById("recipient-email").value.trim();
    const amount = parseFloat(document.getElementById("transfer-amount").value);
    const description = document.getElementById("transfer-description").value.trim();
    const senderId = userData.accID;

    if (!recipientEmail) {
      showCustomAlert("Please enter a recipient email", "error");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showCustomAlert("Please enter a valid amount", "error");
      return;
    }

    // Prevent sending money to self
    if (recipientEmail === userData.email) {
      showCustomAlert("You cannot send money to yourself", "error");
      return;
    }

    // Fetch sender's balance
    db.collection("users")
      .where("email", "==", userData.email)
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) {
          showCustomAlert("Sender data not found", "error");
          return;
        }
        const senderDoc = querySnapshot.docs[0];
        const senderBalance = senderDoc.data().balance || 0;
        if (senderBalance < amount) {
          showCustomAlert("Insufficient balance", "error");
          return;
        }

        // Find recipient by email
        db.collection("users")
          .where("email", "==", recipientEmail)
          .get()
          .then((querySnapshot) => {
            if (querySnapshot.empty) {
              showCustomAlert("Recipient not found", "error");
              return;
            }

            const recipientDoc = querySnapshot.docs[0];
            const recipientId = recipientDoc.data().accID || recipientDoc.id;

            // Perform transaction in a batch
            const batch = db.batch();
            const senderRef = db.collection("users").doc(senderDoc.id);
            const recipientRef = db.collection("users").doc(recipientDoc.id);
            const transactionRef = db.collection("transactions").doc();

            // Update sender and recipient balances
            batch.update(senderRef, { balance: senderBalance - amount });
            batch.update(recipientRef, {
              balance: (recipientDoc.data().balance || 0) + amount,
            });

            // Create transaction record
            batch.set(transactionRef, {
              senderId: senderId,
              receiverId: recipientId,
              amount: amount,
              description: description || "N/A",
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Commit the batch
            batch
              .commit()
              .then(() => {
                showCustomAlert("Money sent successfully", "success");
                // Clear form
                document.getElementById("transfer-form").reset();
              })
              .catch((error) => {
                showCustomAlert(
                  `Error processing transaction: ${error.message}`,
                  "error"
                );
              });
          })
          .catch((error) => {
            showCustomAlert(
              `Error finding recipient: ${error.message}`,
              "error"
            );
          });
      })
      .catch((error) => {
        showCustomAlert(`Error fetching sender data: ${error.message}`, "error");
      });
  }

  function getProfileView(userData) {
    // Check if user has a SellerPASS
    let sellerPassHtml = "";
    
    db.collection("sellerPasses")
      .where("ownerId", "==", userData.uid)
      .where("status", "==", "approved")
      .get()
      .then(querySnapshot => {
        if (!querySnapshot.empty) {
          const passData = querySnapshot.docs[0].data();
          sellerPassHtml = `
            <div class="seller-pass-card">
              <h3>Your SellerPASS</h3>
              <p><strong>Company:</strong> ${passData.companyName}</p>
              <p><strong>Description:</strong> ${passData.companyDescription}</p>
              <p><strong>Your Role:</strong> CEO</p>
            </div>
          `;
        } else {
          // Check if user is an employee in any company
          return db.collection("sellerPasses")
            .where("employees", "array-contains", { email: userData.email })
            .where("status", "==", "approved")
            .get();
        }
      })
      .then(querySnapshot => {
        if (querySnapshot && !querySnapshot.empty) {
          const passData = querySnapshot.docs[0].data();
          const employeeRole = passData.employees.find(emp => emp.email === userData.email).role;
          
          sellerPassHtml = `
            <div class="seller-pass-card">
              <h3>Your SellerPASS</h3>
              <p><strong>Company:</strong> ${passData.companyName}</p>
              <p><strong>Description:</strong> ${passData.companyDescription}</p>
              <p><strong>Your Role:</strong> ${employeeRole}</p>
            </div>
          `;
        }
        
        // Update the profile view with the SellerPASS information
        document.querySelector(".profile-card").innerHTML += sellerPassHtml;
      })
      .catch(error => {
        console.error("Error fetching SellerPASS data:", error);
      });

    return `
      <h2>Profile</h2>
      <div class="profile-card">
        <p><strong>Name:</strong> ${userData.name}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p><strong>Class:</strong> ${userData.class}</p>
        <p><strong>Status:</strong> ${userData.status}</p>
        <p><strong>Balance:</strong> ${userData.balance || 0}</p>
      </div>
    `;
  }

  function getResourcesView() {
    return `
      <h2>Resources</h2>
      <p>Here you can find educational materials and assignments.</p>
      <ul>
        <li><a href="#">Math Resources</a></li>
        <li><a href="#">Science Resources</a></li>
        <li><a href="#">History Resources</a></li>
      </ul>
    `;
  }

  function fetchAllUsers() {
    return db
      .collection("users")
      .get()
      .then((querySnapshot) => {
        const users = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          data.id = doc.id;
          data.accID = data.accID || doc.id; // Fallback to doc ID if accID is missing
          users.push(data);
        });
        return users;
      })
      .catch((error) => {
        showCustomAlert(`Error fetching users: ${error.message}`, "error");
        throw error;
      });
  }

  function getUserManagementView(users) {
    let tableHtml = `
      <h2>User Management</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Class</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    users.forEach((user) => {
      tableHtml += `
        <tr data-user-id="${user.id}">
          <td class="display-name">${user.name}</td>
          <td class="display-email">${user.email}</td>
          <td class="display-class">${user.class}</td>
          <td class="display-balance">${user.balance}</td>
          <td class="display-status">${user.status}</td>
          <td><button class="edit-btn">Edit</button></td>
        </tr>
        <tr class="edit-row" style="display: none;">
          <td colspan="6">
            <form class="edit-user-form">
              <div class="form-group">
                <label>Name:</label>
                <input type="text" name="name" value="${user.name}" required>
              </div>
              <div class="form-group">
                <label>Email:</label>
                <input type="email" name="email" value="${user.email}" required>
              </div>
              <div class="form-group">
                <label>Class:</label>
                <select name="class" required>
                  ${generateClassOptions(user.class)}
                </select>
              </div>
              <div class="form-group">
                <label>Balance:</label>
                <input type="number" name="balance" value="${
                  user.balance
                }" required>
              </div>
              <div class="form-group">
                <label>Status:</label>
                <select name="status" required>
                  <option value="User" ${
                    user.status === "User" ? "selected" : ""
                  }>User</option>
                  <option value="Admin" ${
                    user.status === "Admin" ? "selected" : ""
                  }>Admin</option>
                </select>
              </div>
              <button type="submit" class="save-btn">Save</button>
              <button type="button" class="cancel-btn">Cancel</button>
            </form>
          </td>
        </tr>
      `;
    });
    tableHtml += `
        </tbody>
      </table>
    `;
    return tableHtml;
  }

  function generateClassOptions(selectedClass) {
    const classes = [
      "1-A",
      "1-B",
      "1-D",
      "1-V",
      "1-G",
      "2-A",
      "2-B",
      "2-D",
      "2-V",
      "2-G",
      "3-A",
      "3-B",
      "3-D",
      "3-V",
      "3-G",
      "4-A",
      "4-B",
      "4-D",
      "4-V",
      "4-G",
      "5-A",
      "5-B",
      "5-D",
      "5-V",
      "5-G",
      "6-A",
      "6-B",
      "6-D",
      "6-V",
      "6-G",
      "7-A",
      "7-B",
      "7-D",
      "7-V",
      "7-G",
      "8-A",
      "8-B",
      "8-D",
      "8-V",
      "8-G",
      "9-A",
      "9-B",
      "9-D",
      "9-V",
      "9-G",
      "10-A",
      "10-B",
      "10-D",
      "10-V",
      "10-G",
      "11-A",
      "11-B",
      "11-D",
      "11-V",
      "11-G",
    ];
    return classes
      .map(
        (cls) =>
          `<option value="${cls}" ${
            cls === selectedClass ? "selected" : ""
          }>${cls}</option>`
      )
      .join("");
  }

  function setupEditListeners(users) {
    const editButtons = document.querySelectorAll(".edit-btn");
    editButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const row = e.target.closest("tr");
        const userId = row.dataset.userId;
        const editRow = row.nextElementSibling;
        row.style.display = "none";
        editRow.style.display = "table-row";

        const form = editRow.querySelector(".edit-user-form");
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const updatedData = {
            name: formData.get("name"),
            email: formData.get("email"),
            class: formData.get("class"),
            balance: parseFloat(formData.get("balance")),
            status: formData.get("status"),
            accID: users.find(u => u.id === userId).accID || userId, // Preserve accID
          };

          db.collection("users")
            .doc(userId)
            .update(updatedData)
            .then(() => {
              showCustomAlert("User updated successfully", "success");
              row.querySelector(".display-name").textContent = updatedData.name;
              row.querySelector(".display-email").textContent =
                updatedData.email;
              row.querySelector(".display-class").textContent =
                updatedData.class;
              row.querySelector(".display-balance").textContent =
                updatedData.balance;
              row.querySelector(".display-status").textContent =
                updatedData.status;
              row.style.display = "table-row";
              editRow.style.display = "none";
            })
            .catch((error) => {
              showCustomAlert(`Error updating user: ${error.message}`, "error");
            });
        });

        const cancelButton = editRow.querySelector(".cancel-btn");
        cancelButton.addEventListener("click", () => {
          row.style.display = "table-row";
          editRow.style.display = "none";
        });
      });
    });
  }
}