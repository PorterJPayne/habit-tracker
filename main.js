// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBstpAtUtpV9JuVqWetD7FhpNDppgAYGCs",
  authDomain: "habit-tracker-7c16d.firebaseapp.com",
  projectId: "habit-tracker-7c16d",
  storageBucket: "habit-tracker-7c16d.appspot.com",
  messagingSenderId: "329214838371",
  appId: "1:329214838371:web:4d50e8ddedffc72defda56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM elements
const loginOverlay = document.getElementById('login-overlay');
const googleSignInBtn = document.getElementById('google-sign-in');
const signOutBtn = document.getElementById('sign-out');
const userNameSpan = document.getElementById('user-name');
const pageTitle = document.getElementById('page-title');
const currentDateSpan = document.getElementById('current-date');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const visionSpan = document.getElementById('identity-vision');
const editVisionBtn = document.getElementById('edit-vision');
const habitInput = document.getElementById('habit-input');
const habitNote = document.getElementById('habit-note');
const habitType = document.getElementById('habit-type');
const addHabitBtn = document.getElementById('add-habit');
const journalInput = document.getElementById('journal-entry');
const journalBtn = document.getElementById('save-journal');
const journalStatus = document.getElementById('journal-status');
const modal = document.getElementById('entry-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

// Quick add elements
const quickAddContainer = document.getElementById('quick-add-container');
const addPrompt = document.getElementById('add-prompt');
const addForm = document.getElementById('add-form');

// Container elements
const todaysItems = document.getElementById('todays-items');
const completedItems = document.getElementById('completed-items');
const allHabitsContainer = document.getElementById('all-habits-container');
const allTasksContainer = document.getElementById('all-tasks-container');

// Stats elements
const habitsCompletedSpan = document.getElementById('habits-completed');
const tasksCompletedSpan = document.getElementById('tasks-completed');
const streakCountSpan = document.getElementById('streak-count');
const completionRateSpan = document.getElementById('completion-rate');

let currentUser = null;
let allEntries = [];
let exercises = [];
let routines = [];
let currentCalendarDate = new Date();
let currentRoutine = null;
let routineHabits = [];

// Google Sign In
googleSignInBtn?.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('User signed in:', result.user);
  } catch (error) {
    console.error('Sign in error:', error);
    alert('Failed to sign in: ' + error.message);
  }
});

// Sign Out
signOutBtn?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign out error:', error);
    alert('Failed to sign out: ' + error.message);
  }
});

// Mobile menu toggle
mobileMenuBtn?.addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
});

sidebarOverlay?.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

// Update current date
function updateCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  if (currentDateSpan) {
    currentDateSpan.textContent = now.toLocaleDateString('en-US', options);
  }
}
updateCurrentDate();

// Authentication state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginOverlay.classList.add('hidden');
    userNameSpan.textContent = user.displayName || 'User';
    await loadUserData();
  } else {
    currentUser = null;
    loginOverlay.classList.remove('hidden');
    userNameSpan.textContent = 'Loading...';
    if (visionSpan) visionSpan.textContent = 'Loading...';
  }
});

// Navigation handling
document.querySelectorAll('.sidebar-nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetPage = item.dataset.page;
    showPage(targetPage);

    // Update active nav item
    document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // Update page title
    const pageTitles = {
      home: 'Dashboard',
      habits: 'All Habits',
      tasks: 'All Tasks',
      calendar: 'Calendar',
      exercise: 'Exercise Tracker',
      analytics: 'Analytics',
      routines: 'Routine Manager',
      journal: 'Daily Journal'
    };

    if (pageTitle) {
      pageTitle.textContent = pageTitles[targetPage] || 'Dashboard';
    }

    // Close mobile menu
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('show');
    }
  });
});

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(pageId + '-page').classList.add('active');

  // Load specific page content
  if (pageId === 'habits') loadAllHabits();
  if (pageId === 'tasks') loadAllTasks();
  if (pageId === 'calendar') loadCalendar();
  if (pageId === 'exercise') loadExercises();
  if (pageId === 'analytics') loadAnalytics();
  if (pageId === 'routines') loadRoutineManager();
  if (pageId === 'journal') loadTodayJournal();
}

// Toggle collapsible sections
window.toggleSection = function(sectionId) {
  const content = document.getElementById(sectionId + '-content');
  const icon = content.previousElementSibling.querySelector('.toggle-icon');

  content.classList.toggle('collapsed');
  icon.classList.toggle('rotated');
};

// Quick add functionality
addPrompt?.addEventListener('click', () => {
  addPrompt.style.display = 'none';
  addForm.classList.add('active');
  quickAddContainer.classList.add('active');
  habitInput.focus();
});

// Click outside to close quick add
document.addEventListener('click', (e) => {
  if (!quickAddContainer?.contains(e.target)) {
    closeQuickAdd();
  }
});

function closeQuickAdd() {
  addForm?.classList.remove('active');
  quickAddContainer?.classList.remove('active');
  if (addPrompt) addPrompt.style.display = 'block';
  if (habitInput) habitInput.value = '';
  if (habitNote) habitNote.value = '';
}

// Edit vision handler
editVisionBtn?.addEventListener('click', async () => {
  if (!currentUser) return;

  const currentVision = visionSpan.textContent;
  const newVision = prompt('What is your updated vision?', currentVision);
  if (newVision && newVision !== currentVision) {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { vision: newVision });
      visionSpan.textContent = newVision;
    } catch (error) {
      console.error('Error updating vision:', error);
      alert('Failed to update vision. Please try again.');
    }
  }
});

// Add habit/task handler
addHabitBtn?.addEventListener('click', async () => {
  if (!currentUser) return;

  const name = habitInput.value.trim();
  const note = habitNote.value.trim();
  const type = habitType.value;

  if (!name) {
    alert('Please enter a title');
    return;
  }

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'entries'), {
      name,
      note,
      type,
      completed: false,
      createdAt: Timestamp.now(),
      history: [],
      streak: 0
    });

    closeQuickAdd();
    await loadEntries();
  } catch (error) {
    console.error('Error adding entry:', error);
    alert('Failed to add entry. Please try again.');
  }
});

// Journal handler
journalBtn?.addEventListener('click', async () => {
  if (!currentUser || !journalInput.value.trim()) {
    alert('Please write something in your journal');
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'journal', today), {
      content: journalInput.value.trim(),
      date: today,
      timestamp: Timestamp.now()
    });

    journalStatus.textContent = 'Journal saved successfully!';
    journalStatus.className = 'text-sm text-green-600';

    setTimeout(() => {
      journalStatus.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Error saving journal:', error);
    journalStatus.textContent = 'Failed to save journal';
    journalStatus.className = 'text-sm text-red-600';
  }
});

// Exercise logging
document.getElementById('log-exercise')?.addEventListener('click', async () => {
  if (!currentUser) return;

  const type = document.getElementById('exercise-type')?.value;
  const duration = parseInt(document.getElementById('exercise-duration')?.value);
  const notes = document.getElementById('exercise-notes')?.value.trim();

  if (!duration || duration <= 0) {
    alert('Please enter a valid duration');
    return;
  }

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'exercises'), {
      type,
      duration,
      notes,
      date: new Date().toISOString().split('T')[0],
      timestamp: Timestamp.now()
    });

    // Clear form
    const durationEl = document.getElementById('exercise-duration');
    const notesEl = document.getElementById('exercise-notes');
    if (durationEl) durationEl.value = '';
    if (notesEl) notesEl.value = '';

    await loadExercises();
    alert('Exercise logged successfully!');
  } catch (error) {
    console.error('Error logging exercise:', error);
    alert('Failed to log exercise. Please try again.');
  }
});

// Calendar navigation
document.getElementById('prev-month')?.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  loadCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  loadCalendar();
});

// Routine management
document.getElementById('save-routine')?.addEventListener('click', saveRoutine);

// Drag and drop functionality
function initializeDragAndDrop() {
  const availableHabits = document.getElementById('available-habits');
  const dropZone = document.getElementById('routine-drop-zone');
  const routineHabitsList = document.getElementById('routine-habits-list');

  // Make habits draggable
  if (availableHabits) {
    availableHabits.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-habit')) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          id: e.target.dataset.habitId,
          name: e.target.dataset.habitName
        }));
      }
    });
  }

  // Drop zone handlers
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      addHabitToRoutine(data.id, data.name);
    });
  }

  // Make routine habits sortable
  if (routineHabitsList) {
    routineHabitsList.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('routine-habit-item')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.index);
      }
    });

    routineHabitsList.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    routineHabitsList.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const targetElement = e.target.closest('.routine-habit-item');

      if (targetElement) {
        const targetIndex = parseInt(targetElement.dataset.index);
        reorderRoutineHabits(draggedIndex, targetIndex);
      }
    });
  }
}

function addHabitToRoutine(habitId, habitName) {
  // Check if habit is already in routine
  if (routineHabits.find(h => h.id === habitId)) {
    alert('This habit is already in the routine');
    return;
  }
  routineHabits.push({ id: habitId, name: habitName });
  updateRoutineHabitsDisplay();
  updateDropZone();
}

function removeHabitFromRoutine(index) {
  routineHabits.splice(index, 1);
  updateRoutineHabitsDisplay();
  updateDropZone();
}

function reorderRoutineHabits(fromIndex, toIndex) {
  const habit = routineHabits.splice(fromIndex, 1)[0];
  routineHabits.splice(toIndex, 0, habit);
  updateRoutineHabitsDisplay();
}

function updateRoutineHabitsDisplay() {
  const container = document.getElementById('routine-habits-list');
  if (!container) return;

  container.innerHTML = routineHabits.map((habit, index) => `
    <div class="routine-habit-item" draggable="true" data-index="${index}">
      <div class="routine-habit-order">${index + 1}</div>
      <div class="flex-grow">
        <span class="drag-handle">⋮⋮</span>
        ${habit.name}
      </div>
      <button class="remove-habit-btn" onclick="removeHabitFromRoutine(${index})">×</button>
    </div>
  `).join('');
}

function updateDropZone() {
  const dropZone = document.getElementById('routine-drop-zone');
  if (!dropZone) return;
  dropZone.innerHTML = `
    <div class="text-lg mb-2">🎯</div>
    <div>Drag more habits here to add to your routine</div>
    <div class="text-sm mt-2 opacity-75">Current habits: ${routineHabits.length}</div>
  `;
  dropZone.style.display = 'block';
}

// Load user data
async function loadUserData() {
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        vision: 'Define your future self vision here - what do you want to become?',
        createdAt: Timestamp.now()
      });
      if (visionSpan) visionSpan.textContent = 'Define your future self vision here - what do you want to become?';
    } else {
      if (visionSpan) visionSpan.textContent = userDoc.data().vision;
    }

    await loadEntries();
    await loadExercises();
    await loadRoutines();
    await updateDashboardWithRoutines();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load routines
async function loadRoutines() {
  if (!currentUser) return;

  try {
    const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'routines'));
    routines = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      routines.push({ id: docSnap.id, ...data });
    });

    // Sort routines by start time for today
    const today = new Date().getDay();
    routines = routines.filter(routine => routine.days.includes(today))
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  } catch (error) {
    console.error('Error loading routines:', error);
  }
}

// Save routine
async function saveRoutine() {
  if (!currentUser) return;

  const name = document.getElementById('routine-name')?.value.trim();
  const startTime = document.getElementById('routine-start-time')?.value;
  const selectedDays = Array.from(document.querySelectorAll('.routine-day:checked')).map(cb => parseInt(cb.value));

  if (!name || !startTime || selectedDays.length === 0 || routineHabits.length === 0) {
    alert('Please fill in all fields and add at least one habit');
    return;
  }

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'routines'), {
      name,
      startTime,
      days: selectedDays,
      habits: routineHabits,
      createdAt: Timestamp.now()
    });

    // Clear form
    const nameEl = document.getElementById('routine-name');
    const timeEl = document.getElementById('routine-start-time');
    if (nameEl) nameEl.value = '';
    if (timeEl) timeEl.value = '';
    document.querySelectorAll('.routine-day').forEach(cb => cb.checked = false);
    routineHabits = [];
    updateRoutineHabitsDisplay();
    updateDropZone();

    await loadRoutines();
    loadRoutineManager();
    alert('Routine saved successfully!');
  } catch (error) {
    console.error('Error saving routine:', error);
    alert('Failed to save routine. Please try again.');
  }
}

// Load routine manager
function loadRoutineManager() {
  loadAvailableHabits();
  loadExistingRoutines();
  initializeDragAndDrop();
}

function loadAvailableHabits() {
  const container = document.getElementById('available-habits');
  if (!container) return;

  const habits = allEntries.filter(e => e.type === 'habit');

  if (habits.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No habits available. Create some habits first!</p>';
    return;
  }

  container.innerHTML = habits.map(habit => `
    <div class="draggable-habit" draggable="true" data-habit-id="${habit.id}" data-habit-name="${habit.name}">
      <span class="drag-handle">⋮⋮</span>
      <span>${habit.name}</span>
    </div>
  `).join('');
}

function loadExistingRoutines() {
  const container = document.getElementById('existing-routines');
  if (!container) return;

  if (routines.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No routines created yet. Create your first routine above!</p>';
    return;
  }

  container.innerHTML = routines.map(routine => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysText = routine.days.map(d => dayNames[d]).join(', ');

    return `
      <div class="p-4 border rounded-lg">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold">${routine.name}</h3>
          <button onclick="deleteRoutine('${routine.id}')" class="text-red-500 text-sm">Delete</button>
        </div>
        <p class="text-sm text-gray-600 mb-2">
          ${routine.startTime} • ${daysText} • ${routine.habits.length} habits
        </p>
        <div class="text-xs text-gray-500">
          ${routine.habits.map(h => h.name).join(' → ')}
        </div>
      </div>
    `;
  }).join('');
}

// Delete routine
window.deleteRoutine = async function(routineId) {
  if (!currentUser || !confirm('Are you sure you want to delete this routine?')) return;

  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'routines', routineId));
    await loadRoutines();
    loadRoutineManager();
  } catch (error) {
    console.error('Error deleting routine:', error);
    alert('Failed to delete routine. Please try again.');
  }
};

// Update dashboard with routines
async function updateDashboardWithRoutines() {
  const currentRoutineContainer = document.getElementById('current-routine-container');
  const upcomingRoutinesList = document.getElementById('upcoming-routines-list');
  const originalDashboard = document.getElementById('original-dashboard');

  if (!currentRoutineContainer || !upcomingRoutinesList || !originalDashboard) return;

  // Get current time and day
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const currentDay = now.getDay();

  // Get today's routines
  const todaysRoutines = routines.filter(routine => routine.days.includes(currentDay))
                               .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Find current active routine
  let activeRoutine = null;
  for (const routine of todaysRoutines) {
    if (currentTime >= routine.startTime && !routine.completed) {
      activeRoutine = routine;
      break;
    }
  }

  if (activeRoutine) {
    // Show current routine AT THE TOP, but keep everything else visible
    currentRoutine = activeRoutine;
    currentRoutineContainer.innerHTML = await createRoutineCard(activeRoutine);

    // Show upcoming routines
    const upcomingRoutines = todaysRoutines.filter(r => 
      r.startTime > currentTime || (r.startTime <= currentTime && r.completed)
    );

    if (upcomingRoutines.length > 0) {
      upcomingRoutinesList.innerHTML = upcomingRoutines.map(routine => `
        <div class="upcoming-routine">
          <span class="upcoming-routine-name">${routine.name}</span>
          <span class="upcoming-routine-count">${routine.habits.length} habits</span>
        </div>
      `).join('');
    } else {
      upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">No more routines for today</p>';
    }

    // KEEP ORIGINAL DASHBOARD VISIBLE - This is the key fix!
    originalDashboard.style.display = 'grid';
    loadOriginalDashboard();
  } else {
    // No active routine, just clear the routine container
    currentRoutineContainer.innerHTML = '';

    if (todaysRoutines.length > 0) {
      const nextRoutines = todaysRoutines.filter(r => r.startTime > currentTime);
      if (nextRoutines.length > 0) {
        upcomingRoutinesList.innerHTML = nextRoutines.map(routine => `
          <div class="upcoming-routine">
            <span class="upcoming-routine-name">${routine.name} (starts at ${routine.startTime})</span>
            <span class="upcoming-routine-count">${routine.habits.length} habits</span>
          </div>
        `).join('');
      } else {
        upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">All routines completed for today! 🎉</p>';
      }
    } else {
      upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">No routines scheduled for today</p>';
    }

    // Show original dashboard content
    originalDashboard.style.display = 'grid';
    loadOriginalDashboard();
  }
}

// Create routine card
async function createRoutineCard(routine) {
  const habitElements = routine.habits.map((habit, index) => `
    <div class="routine-habit" data-habit-id="${habit.id}" data-routine-id="${routine.id}">
      <div class="routine-habit-checkbox ${habit.completed ? 'checked' : ''} ${habit.wontComplete ? 'wont-complete' : ''}" onclick="toggleRoutineHabit('${routine.id}', '${habit.id}')">
        ${habit.completed ? '✓' : ''}
      </div>
      <div class="routine-habit-name">${habit.name}</div>
      <div class="routine-habit-actions">
        <button class="wont-complete-btn" onclick="markHabitWontComplete('${routine.id}', '${habit.id}')">
          Won't do
        </button>
      </div>
    </div>
  `).join('');

  const completedCount = routine.habits.filter(h => h.completed || h.wontComplete).length;
  const totalCount = routine.habits.length;

  return `
    <div class="routine-card">
      <div class="routine-content">
        <div class="routine-title">${routine.name}</div>
        <div class="routine-subtitle">${completedCount}/${totalCount} completed</div>
        <div class="routine-habits">
          ${habitElements}
        </div>
        <button class="complete-routine-btn" onclick="completeEntireRoutine('${routine.id}')">
          Complete All Remaining (${totalCount - completedCount})
        </button>
      </div>
    </div>
  `;
}

// Toggle routine habit
window.toggleRoutineHabit = async function(routineId, habitId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;

  const habit = routine.habits.find(h => h.id === habitId);
  if (!habit) return;

  habit.completed = !habit.completed;
  habit.wontComplete = false; // Reset won't complete if toggling

  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Mark habit as won't complete
window.markHabitWontComplete = async function(routineId, habitId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;

  const habit = routine.habits.find(h => h.id === habitId);
  if (!habit) return;

  habit.wontComplete = !habit.wontComplete;
  habit.completed = false; // Reset completed if marking won't complete

  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Complete entire routine
window.completeEntireRoutine = async function(routineId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;

  // Mark all incomplete habits as completed
  routine.habits.forEach(habit => {
    if (!habit.completed && !habit.wontComplete) {
      habit.completed = true;
    }
  });

  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Check if routine is complete and trigger celebration
async function checkRoutineCompletion(routine) {
  const allDone = routine.habits.every(h => h.completed || h.wontComplete);

  if (allDone) {
    // Trigger celebration
    playCompletionSound();
    showRoutineCelebration(routine.name);

    // Mark routine as completed
    routine.completed = true;
    await updateRoutineInDatabase(routine);

    // Update dashboard to show next routine
    setTimeout(() => {
      updateDashboardWithRoutines();
    }, 2000);
  } else {
    // Just update the current routine display
    const currentRoutineContainer = document.getElementById('current-routine-container');
    if (currentRoutineContainer) {
      currentRoutineContainer.innerHTML = await createRoutineCard(routine);
    }
  }
}

// Update routine in database
async function updateRoutineInDatabase(routine) {
  if (!currentUser) return;

  try {
    await updateDoc(doc(db, 'users', currentUser.uid, 'routines', routine.id), {
      habits: routine.habits,
      completed: routine.completed || false
    });
  } catch (error) {
    console.error('Error updating routine:', error);
  }
}

function loadOriginalDashboard() {
  // This function would render the main dashboard contents if you have specific logic.
  // If not necessary, you can leave this blank.
}

// Place this at the END of your existing main.js file, after all other code and event listeners

// --- SETTINGS PANEL & DARK MODE ---
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-modal');
const darkModeToggle = document.getElementById('dark-mode-toggle');

function openSettingsModal() {
  settingsModal.style.display = 'flex';
  // Set toggle based on theme
  const theme = localStorage.getItem('theme');
  darkModeToggle.checked = (theme === 'dark');
}
function closeSettingsModal() {
  settingsModal.style.display = 'none';
}

// Settings button opens modal
if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener('click', openSettingsModal);
}
if (closeSettingsBtn && settingsModal) {
  closeSettingsBtn.addEventListener('click', closeSettingsModal);
}

// Dark mode toggle logic
if (darkModeToggle) {
  darkModeToggle.addEventListener('change', function() {
    setTheme(this.checked ? 'dark' : 'light');
  });
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    if (darkModeToggle) darkModeToggle.checked = true;
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    if (darkModeToggle) darkModeToggle.checked = false;
  }
}

// On page load, apply theme
(function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    setTheme('dark');
  } else {
    setTheme('light');
  }
})();

// Close modal if clicking outside modal content
window.addEventListener('click', function(event) {
  if (event.target === settingsModal) {
    closeSettingsModal();
  }
});
