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
  }, 1500);
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

    if (userData.status === "Admin") {
      resourcesLink.style.display = "none";
      userManagementLink.style.display = "block";
      mainContent.innerHTML = getAdminHomeView();
    } else {
      resourcesLink.style.display = "block";
      userManagementLink.style.display = "none";
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
      </div>
    `;
  }

  function getAdminHomeView() {
    return `
      <h2>Admin Dashboard</h2>
      <p>Welcome, Admin! Here you can manage users and view system statistics.</p>
      <a href="#" data-view="user-management">Manage Users</a>
      <a href="#" data-view="eshim-pay">Eshim Pay</a>
    `;
  }

  function getEshimPayView(userData) {
    return `
      <h2>Eshim Pay</h2>
      <div class="qr-card">
        <h3>Your Payment QR Code</h3>
        <p>Scan this QR code with another device to process a payment.</p>
        <div id="qr-code"></div>
      </div>
      <div class="transactions">
        <h3>Transaction History</h3>
        <table id="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody id="transactions-body"></tbody>
        </table>
      </div>
    `;
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
      case "eshim-pay":
        mainContent.innerHTML = getEshimPayView(userData);
        renderEshimPayContent(userData);
        break;
      case "settings":
        mainContent.innerHTML = getSettingsView();
        break;
      default:
        mainContent.innerHTML = "<h2>Page Not Found</h2>";
    }
  }

  function renderEshimPayContent(userData) {
    const qrData = JSON.stringify({ uid: auth.currentUser.uid });
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

    fetchTransactions(userData)
      .then((transactions) => {
        const transactionsBody = document.getElementById("transactions-body");
        if (transactions.length === 0) {
          transactionsBody.innerHTML =
            "<tr><td colspan='5'>No transactions found.</td></tr>";
          return;
        }
        transactionsBody.innerHTML = transactions
          .map(
            (transaction) => `
        <tr>
          <td>${new Date(
            transaction.timestamp.toMillis()
          ).toLocaleString()}</td>
          <td>${
            transaction.senderId === auth.currentUser.uid
              ? "You"
              : transaction.senderId
          }</td>
          <td>${
            transaction.receiverId === auth.currentUser.uid
              ? "You"
              : transaction.receiverId
          }</td>
          <td>${transaction.amount}</td>
          <td>${transaction.description || "N/A"}</td>
        </tr>
      `
          )
          .join("");
      })
      .catch((error) => {
        showCustomAlert(
          `Error fetching transactions: ${error.message}`,
          "error"
        );
        document.getElementById("transactions-body").innerHTML =
          "<tr><td colspan='5'>Failed to load transactions.</td></tr>";
      });
  }

  function fetchTransactions(userData) {
    let query = db.collection("transactions");
    if (userData.status !== "Admin") {
      query = query
        .where("senderId", "==", auth.currentUser.uid)
        .orWhere("receiverId", "==", auth.currentUser.uid);
    }
    return query
      .orderBy("timestamp", "desc")
      .get()
      .then((querySnapshot) => {
        const transactions = [];
        querySnapshot.forEach((doc) => {
          transactions.push(doc.data());
        });
        return transactions;
      });
  }

  function getProfileView(userData) {
    return `
      <h2>Profile</h2>
      <div class="profile-card">
        <p><strong>Name:</strong> ${userData.name}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p><strong>Class:</strong> ${userData.class}</p>
        <p><strong>Status:</strong> ${userData.status}</p>
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
          users.push({ id: doc.id, ...doc.data() });
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
